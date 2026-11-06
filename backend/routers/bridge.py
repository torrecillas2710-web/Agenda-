"""Puente (bridge) entre Comando (Muse) y la nube Supabase de Mi Agenda.

La app Mi Agenda guarda su documento en Supabase, tabla `agenda`,
fila id `datos`. Desde la máquina de Muse el host *.supabase.co no
resuelve (devuelve una IP de sinkhole y cierra la conexión), así que
este router hace de proxy desde el servidor en Render, que sí debe
poder llegar a Supabase.

PENDIENTE DE SEGURIDAD: este puente expone los datos de la agenda a
quien conozca la URL del servicio. Poner BRIDGE_TOKEN en Render
(Environment) para exigir el header X-Comando-Token. Si BRIDGE_TOKEN
no está definida, el acceso queda abierto (para no romper el primer
despliegue antes de poner la variable), igual que el resto de la app
hoy no tiene autenticación.

La URL y la anon key de Supabase se leen de las variables de entorno
SUPABASE_URL y SUPABASE_ANON_KEY si existen; si no, se extraen en
tiempo de arranque de backend/static/index.html (donde ya están
embebidas). Nunca se guardan en logs ni se devuelven en respuestas.
"""

import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException

router = APIRouter(prefix="/api/bridge", tags=["bridge"])

# Campos del documento `datos` que el puente acepta escribir.
_ROW_FIELDS = (
    "checks",
    "agendas",
    "notas",
    "diario",
    "habitos",
    "habitos_done",
    "habito_streak",
    "habito_lastday",
    "finanzas",
    "metas",
)

_SUPABASE_URL_RE = re.compile(r"https://[a-z0-9-]+\.supabase\.co")
_JWT_RE = re.compile(r"eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+")

_config: Optional[dict] = None


def _config_from_index_html() -> dict:
    """Extrae URL y anon key del index.html ya desplegado (fallback)."""
    here = os.path.dirname(os.path.abspath(__file__))
    index_path = os.path.join(here, "..", "static", "index.html")
    with open(index_path, encoding="utf-8") as f:
        text = f.read()
    url_match = _SUPABASE_URL_RE.search(text)
    key_match = _JWT_RE.search(text)
    if not url_match or not key_match:
        raise RuntimeError("No se encontró la configuración de Supabase en index.html")
    return {"url": url_match.group(0), "key": key_match.group(0)}


def get_supabase_config() -> dict:
    global _config
    if _config is not None:
        return _config
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    if url and key:
        _config = {"url": url.rstrip("/"), "key": key}
    else:
        cfg = _config_from_index_html()
        if url:
            cfg["url"] = url.rstrip("/")
        if key:
            cfg["key"] = key
        _config = cfg
    return _config


def _headers() -> dict:
    cfg = get_supabase_config()
    return {
        "apikey": cfg["key"],
        "Authorization": f"Bearer {cfg['key']}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _summarize_error(exc: Exception) -> str:
    """Mensaje de error resumido, sin credenciales ni trazas largas."""
    msg = str(exc) or type(exc).__name__
    return msg[:200]


async def _sb_get_row(select: str = "*") -> Optional[dict]:
    cfg = get_supabase_config()
    url = f"{cfg['url']}/rest/v1/agenda?id=eq.datos&select={select}"
    async with httpx.AsyncClient(timeout=15.0, trust_env=False) as client:
        resp = await client.get(url, headers=_headers())
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase respondió {resp.status_code}: {resp.text[:200]}",
        )
    rows = resp.json()
    if not rows:
        return None
    return rows[0]


async def _sb_upsert_row(row: dict) -> dict:
    cfg = get_supabase_config()
    url = f"{cfg['url']}/rest/v1/agenda"
    payload = dict(row)
    payload["id"] = "datos"
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    headers = dict(_headers())
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    async with httpx.AsyncClient(timeout=15.0, trust_env=False) as client:
        resp = await client.post(url, headers=headers, json=payload)
    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Supabase respondió {resp.status_code}: {resp.text[:200]}",
        )
    data = resp.json()
    if isinstance(data, list):
        return data[0] if data else payload
    return data


def require_bridge_token(
    x_comando_token: Optional[str] = Header(default=None, alias="X-Comando-Token"),
) -> None:
    """Si BRIDGE_TOKEN está definida, exige el header X-Comando-Token.

    Si no está definida, permite el acceso (primer despliegue) — ver el
    aviso de seguridad al inicio de este archivo: hay que poner
    BRIDGE_TOKEN en Render cuanto antes.
    """
    expected = os.getenv("BRIDGE_TOKEN", "").strip()
    if not expected:
        return
    if not x_comando_token or x_comando_token != expected:
        raise HTTPException(status_code=401, detail="Token no válido o ausente")


@router.get("/status")
async def bridge_status(_: None = Depends(require_bridge_token)):
    """¿Llega este servidor a Supabase? No devuelve la clave."""
    try:
        row = await _sb_get_row(select="id,updated_at")
    except HTTPException as e:
        return {"ok": False, "supabase_reachable": False, "error": str(e.detail)[:200]}
    except (httpx.HTTPError, OSError) as e:
        return {"ok": False, "supabase_reachable": False, "error": _summarize_error(e)}
    except Exception as e:  # noqa: BLE001 - no tumbar el endpoint
        return {"ok": False, "supabase_reachable": False, "error": _summarize_error(e)}
    if row is None:
        return {"ok": True, "supabase_reachable": True, "updated_at": None, "row_exists": False}
    return {
        "ok": True,
        "supabase_reachable": True,
        "updated_at": row.get("updated_at"),
        "row_exists": True,
    }


@router.get("/agenda")
async def get_agenda(_: None = Depends(require_bridge_token)):
    """Devuelve la fila completa `datos` de Supabase tal cual."""
    try:
        row = await _sb_get_row(select="*")
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError) as e:
        raise HTTPException(status_code=502, detail=_summarize_error(e))
    if row is None:
        raise HTTPException(status_code=404, detail="Fila 'datos' no encontrada en Supabase")
    return row


@router.post("/agenda")
async def save_agenda(payload: dict, _: None = Depends(require_bridge_token)):
    """Upsert del documento completo en Supabase (id `datos`).

    Recibe los campos de la fila (checks, agendas, notas, diario,
    habitos, habitos_done, habito_streak, habito_lastday, finanzas,
    metas). Los campos no enviados se conservan como estaban en la nube.
    """
    try:
        current = await _sb_get_row(select="*")
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError) as e:
        raise HTTPException(status_code=502, detail=_summarize_error(e))
    row: dict[str, Any] = dict(current) if current else {}
    for field in _ROW_FIELDS:
        if field in payload:
            row[field] = payload[field]
    try:
        saved = await _sb_upsert_row(row)
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError) as e:
        raise HTTPException(status_code=502, detail=_summarize_error(e))
    return saved


@router.post("/task")
async def add_task(payload: dict, _: None = Depends(require_bridge_token)):
    """Añade una tarea a `checks` y sube el documento completo.

    Acepta varios nombres de campo: text/title/titulo, date/fecha,
    time/hora, tag/etiqueta, desc/description/descripcion.
    El ítem queda como lo crea el frontend: id = str(milisegundos
    actuales), text, done=false, tag=''.
    """
    text = (
        payload.get("text")
        or payload.get("title")
        or payload.get("titulo")
        or payload.get("name")
        or ""
    )
    text = str(text).strip()
    if not text:
        raise HTTPException(status_code=400, detail="Falta el texto de la tarea (text/title)")
    try:
        current = await _sb_get_row(select="*")
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError) as e:
        raise HTTPException(status_code=502, detail=_summarize_error(e))
    row: dict[str, Any] = dict(current) if current else {}
    checks = row.get("checks")
    if not isinstance(checks, list):
        checks = []
    item: dict[str, Any] = {
        "id": str(int(time.time() * 1000)),
        "text": text,
        "done": False,
        "tag": str(payload.get("tag") or payload.get("etiqueta") or ""),
    }
    date = payload.get("date") or payload.get("fecha")
    if date:
        item["date"] = str(date)
    time_value = payload.get("time") or payload.get("hora")
    if time_value:
        item["time"] = str(time_value)
    desc = payload.get("desc") or payload.get("description") or payload.get("descripcion")
    if desc:
        item["desc"] = str(desc)
    # El frontend usa unshift: lo nuevo queda primero.
    checks.insert(0, item)
    row["checks"] = checks
    try:
        await _sb_upsert_row(row)
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError) as e:
        raise HTTPException(status_code=502, detail=_summarize_error(e))
    return item
