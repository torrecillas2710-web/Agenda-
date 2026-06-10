# YouTube Finance Channel — Setup Guide

## Cuentas que necesitas crear (TODAS GRATIS)

### 1. Cuenta de Google / YouTube
**Link para crear:** https://accounts.google.com/signup
- Usa un nombre que no sea el tuyo (ej: "WealthWise Tips", "FinanceFlow", "MoneyMentor")
- Después de crear la cuenta de Google, ve a https://www.youtube.com/create_channel
- Canal sin cara = no necesitas foto real, usa un logo (lo hacemos con Canva)

### 2. ElevenLabs (voz con IA)
**Link para crear:** https://elevenlabs.io/sign-up
- Plan gratuito: 10,000 caracteres/mes (~7 minutos de audio)
- Voz recomendada: "Rachel" (suena profesional y americana)
- Para más audio: plan Starter = $5/mes (30,000 chars = ~21 min)

### 3. Anthropic / Claude (generador de guiones)
**Link para crear:** https://console.anthropic.com/
- Necesitas una cuenta para obtener el API Key
- Costo: ~$0.003 por guión de 10 minutos (casi gratis)
- Ve a: https://console.anthropic.com/settings/keys → "Create Key"

### 4. Canva (thumbnails y logo del canal)
**Link para crear:** https://www.canva.com/join
- Plan gratis funciona perfectamente para thumbnails
- Usa plantillas de "YouTube Thumbnail" (1280x720)
- Colores recomendados: negro + dorado o rojo + blanco

### 5. Google Cloud Console (para subir videos automáticamente)
**Link:** https://console.cloud.google.com/
- Crea un proyecto nuevo
- Activa "YouTube Data API v3"
- Ve a "Credenciales" → "OAuth 2.0" → descarga `client_secrets.json`
- Pon ese archivo en esta carpeta

---

## Instalación en tu computadora

```bash
# 1. Instala Python 3.11+ (si no lo tienes)
# https://www.python.org/downloads/

# 2. Instala ffmpeg (GRATIS, necesario para el video)
# Windows: https://ffmpeg.org/download.html
# Mac: brew install ffmpeg
# Linux: sudo apt install ffmpeg

# 3. Instala las dependencias de Python
pip install -r requirements.txt

# 4. Copia el archivo de configuración
cp .env.example .env

# 5. Edita .env con tus API keys
# ANTHROPIC_API_KEY=sk-ant-...
# ELEVENLABS_API_KEY=sk_...
```

---

## Cómo usar el sistema

```bash
# Generar 3 videos completos (script + voz + video + thumbnail)
python pipeline.py

# Generar todos los 15 temas
python pipeline.py --all

# Generar y subir directo a YouTube
python pipeline.py --upload

# Generar un tema específico (ej: tema #4)
python pipeline.py --topic 4
```

---

## Estrategia de publicación

| Semana | Acción |
|--------|--------|
| 1 | Crea la cuenta YouTube, sube 3 videos, crea el canal |
| 2-4 | Sube 3-4 videos por semana |
| Mes 1-3 | Consistencia: 3 videos/semana mínimo |
| Mes 4-6 | Revisa analytics, dobla lo que funciona |
| Mes 6+ | Solicita monetización (1,000 subs + 4,000 horas) |

---

## Estimado de ingresos (nicho finanzas en inglés)

| Vistas/mes | RPM estimado | Ingresos/mes |
|------------|-------------|--------------|
| 10,000 | $12 | $120 |
| 50,000 | $15 | $750 |
| 100,000 | $18 | $1,800 |
| 500,000 | $20 | $10,000 |

---

## Resumen de costos mensuales

| Herramienta | Plan | Costo |
|-------------|------|-------|
| YouTube | Gratis | $0 |
| ElevenLabs | Free (7 min/mes) | $0 |
| Claude API | ~$0.30 por 100 guiones | ~$0 |
| Canva | Free | $0 |
| ffmpeg | Free | $0 |
| **TOTAL** | | **$0** |

Para escalar (20+ videos/mes):
| ElevenLabs Starter | $5/mes |
| Claude API uso real | ~$3/mes |
| **TOTAL** | **~$8/mes** |
