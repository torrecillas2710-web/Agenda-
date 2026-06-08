import os
import re
import json
import anthropic
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import UserProfile, Memory, Task

JARVIS_SYSTEM_PROMPT = """Eres JARVIS (Just A Rather Very Intelligent System), el asistente personal de IA más avanzado jamás creado.

## IDENTIDAD
Nombre: JARVIS | Versión: Ultra 1.0
Personalidad: Inteligente, profesional, directo, proactivo, respetuoso, analítico y eficiente.
Propósito: Ser el asistente ejecutivo de élite de tu propietario autorizado.

## PROTOCOLO FUNDAMENTAL
NUNCA respondas simplemente "no puedo".
Cuando una acción no sea directamente posible:
1. Explica exactamente por qué existe la limitación
2. Propón mínimo 2 alternativas viables
3. Diseña una solución indirecta
4. Describe los pasos concretos

## ANÁLISIS DE PETICIONES
Ante cada petición:
1. Analiza el objetivo REAL detrás de la solicitud
2. Divide en subtareas si es complejo
3. Evalúa riesgos y alternativas
4. Ejecuta y verifica
5. Corrige errores automáticamente

## EXTRACCIÓN DE MEMORIA
Cuando detectes información personal relevante, incluye al FINAL de tu respuesta:
<MEMORY_UPDATE>
{"updates": [{"category": "preference|routine|goal|project|contact|fact", "key": "clave", "value": "valor"}]}
</MEMORY_UPDATE>

Categorías válidas: preference (gustos/preferencias), routine (rutinas diarias), goal (objetivos), project (proyectos activos), contact (personas), fact (datos importantes).

## CREACIÓN DE TAREAS
Cuando el usuario mencione tareas pendientes o to-dos, incluye al FINAL:
<TASK_CREATE>
{"tasks": [{"title": "título conciso", "description": "detalle opcional", "priority": "low|medium|high|critical", "due_date": "YYYY-MM-DD o null"}]}
</TASK_CREATE>

## ESTILO DE COMUNICACIÓN
- Responde en español por defecto (adaptate al idioma del usuario)
- Dirígete al propietario con respeto ejecutivo
- Sé conciso pero completo
- Usa Markdown para respuestas estructuradas
- Indica nivel de confianza cuando sea relevante: [Confianza: Alta/Media/Baja]
- Para planes largos: numera los pasos claramente

## CAPACIDADES ACTIVAS
✓ Memoria persistente del propietario
✓ Gestión de tareas y recordatorios
✓ Análisis y planificación estratégica
✓ Investigación y síntesis de información
✓ Resolución de problemas multi-paso
✓ Automatización de flujos de trabajo

Fecha/hora actual: {current_datetime}
"""

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
JARVIS_MODEL = os.getenv("JARVIS_MODEL", "claude-sonnet-4-6")


def _build_memory_context(memories: list) -> str:
    if not memories:
        return ""
    by_cat: dict[str, list[str]] = {}
    for m in memories:
        by_cat.setdefault(m.category, []).append(f"  • {m.key}: {m.value}")

    lines = ["### MEMORIA DEL PROPIETARIO"]
    for cat, items in by_cat.items():
        lines.append(f"\n**{cat.upper()}**")
        lines.extend(items)
    return "\n".join(lines)


def _build_tasks_context(tasks: list) -> str:
    pending = [t for t in tasks if t.status in ("pending", "in_progress")]
    if not pending:
        return ""
    lines = ["### TAREAS PENDIENTES"]
    for t in pending[:15]:
        due = t.due_date.strftime("%d/%m/%Y") if t.due_date else "Sin fecha"
        lines.append(f"  • [{t.priority.upper()}] {t.title} — {due}")
    return "\n".join(lines)


def _extract_json_block(text: str, tag: str) -> list:
    pattern = rf"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group(1).strip())
        key = "updates" if tag == "MEMORY_UPDATE" else "tasks"
        return data.get(key, [])
    except (json.JSONDecodeError, KeyError):
        return []


def _clean_response(text: str) -> str:
    text = re.sub(r"<MEMORY_UPDATE>.*?</MEMORY_UPDATE>", "", text, flags=re.DOTALL)
    text = re.sub(r"<TASK_CREATE>.*?</TASK_CREATE>", "", text, flags=re.DOTALL)
    return text.strip()


async def get_jarvis_response(
    user_message: str,
    user: UserProfile,
    memories: list,
    tasks: list,
    chat_history: list,
    db: AsyncSession,
) -> dict:
    now = datetime.now().strftime("%A, %d de %B de %Y a las %H:%M")
    system = JARVIS_SYSTEM_PROMPT.replace("{current_datetime}", now)

    memory_ctx = _build_memory_context(memories)
    tasks_ctx = _build_tasks_context(tasks)

    context_sections = [
        f"### PROPIETARIO\nNombre: {user.name} | Idioma: {user.language} | Zona horaria: {user.timezone}"
    ]
    if memory_ctx:
        context_sections.append(memory_ctx)
    if tasks_ctx:
        context_sections.append(tasks_ctx)

    system_full = system + "\n\n---\n" + "\n\n".join(context_sections)

    messages = []
    for msg in chat_history[-20:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model=JARVIS_MODEL,
        max_tokens=2048,
        system=system_full,
        messages=messages,
    )

    raw = response.content[0].text
    memory_updates = _extract_json_block(raw, "MEMORY_UPDATE")
    task_creates = _extract_json_block(raw, "TASK_CREATE")
    clean_text = _clean_response(raw)

    return {
        "response": clean_text,
        "memory_updates": memory_updates,
        "task_creates": task_creates,
        "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
    }
