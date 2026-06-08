# JARVIS ULTRA

> *"Just A Rather Very Intelligent System"*

Asistente personal de IA de nivel ejecutivo, inspirado en JARVIS de Iron Man. Combina Claude Opus 4 con una interfaz HUD holográfica, control por voz, memoria persistente y gestión inteligente de tareas.

---

## Arquitectura

```
jarvis-ultra/
├── backend/              # Python FastAPI
│   ├── main.py           # Servidor principal
│   ├── database/         # SQLAlchemy + SQLite async
│   │   ├── database.py
│   │   └── models.py     # UserProfile, Memory, Task, ChatMessage
│   ├── routers/          # Endpoints REST
│   │   ├── chat.py       # /api/chat/*
│   │   ├── memory.py     # /api/memory/*
│   │   ├── tasks.py      # /api/tasks/*
│   │   └── profile.py    # /api/profile/*
│   └── services/
│       ├── ai_service.py     # Claude API + extracción auto de memoria/tareas
│       ├── memory_service.py # CRUD de memoria persistente
│       └── task_service.py   # CRUD de tareas
└── frontend/             # React 18 + TypeScript + Vite
    └── src/
        ├── components/
        │   ├── JarvisHUD.tsx      # Layout HUD holográfico
        │   ├── ChatInterface.tsx  # Chat con Markdown + voz
        │   ├── MemoryPanel.tsx    # Panel de memoria
        │   ├── TaskPanel.tsx      # Gestión de tareas
        │   └── Dashboard.tsx      # Panel de control
        ├── hooks/useVoice.ts      # Web Speech API (STT + TTS)
        ├── store/jarvisStore.ts   # Estado global (Zustand)
        └── services/api.ts        # Cliente HTTP Axios
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| IA | Claude Opus 4 (Anthropic API) |
| Backend | Python 3.11+, FastAPI, SQLAlchemy async |
| Base de datos | SQLite (migrable a PostgreSQL) |
| Frontend | React 18, TypeScript, Vite |
| Estado global | Zustand |
| Voz STT | Web Speech API (nativo en navegador) |
| Voz TTS | Web Speech Synthesis API (nativo) |
| HTTP Client | Axios |
| Markdown | react-markdown |

---

## Instalación Rápida

### 1. Requisitos

- Python 3.11+
- Node.js 18+
- API Key de Anthropic: https://console.anthropic.com

### 2. Setup automático

```bash
chmod +x setup.sh && ./setup.sh
```

### 3. Manual — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Editar .env y agregar ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

### 4. Manual — Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir: **http://localhost:5173**

---

## Variables de Entorno

Archivo `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...        # Requerido
JARVIS_OWNER_NAME=Tony              # Nombre del propietario
JARVIS_MODEL=claude-opus-4-8        # Modelo de Claude
DATABASE_URL=sqlite+aiosqlite:///./jarvis.db
CORS_ORIGINS=http://localhost:5173
SECRET_KEY=tu-clave-secreta
```

---

## Capacidades

### Conversación Inteligente
- Contexto completo de las últimas 20 conversaciones
- Personalidad ejecutiva estilo Jarvis
- Respuestas en Markdown con formato

### Memoria Persistente
- **Auto-detección**: JARVIS extrae automáticamente información relevante de conversaciones
- **Categorías**: preferencias, rutinas, objetivos, proyectos, contactos, hechos
- **CRUD manual**: añade o elimina memorias desde el panel

### Gestión de Tareas
- **Auto-creación**: JARVIS detecta y crea tareas automáticamente
- Prioridades: crítica, alta, media, baja
- Fechas de vencimiento y alertas

### Control por Voz
- Reconocimiento de voz en español (Web Speech API)
- Síntesis de voz natural para respuestas (toggle)
- Sin dependencias externas — nativo en Chrome/Edge

### Dashboard
- Estado del sistema en tiempo real
- Contador de tokens utilizados
- Progreso de tareas y agenda del día

---

## API REST

```
POST   /api/chat/message          # Enviar mensaje a JARVIS
GET    /api/chat/history/{id}     # Historial de conversación
DELETE /api/chat/history/{id}     # Limpiar historial

GET    /api/memory/{user_id}      # Listar memorias
POST   /api/memory/               # Crear memoria manual
DELETE /api/memory/{id}/{uid}     # Eliminar memoria

GET    /api/tasks/{user_id}       # Listar tareas
POST   /api/tasks/                # Crear tarea
PATCH  /api/tasks/{id}/{uid}      # Actualizar estado

GET    /api/profile/{user_id}     # Ver perfil del propietario
PATCH  /api/profile/{user_id}     # Actualizar perfil
```

Documentación interactiva: **http://localhost:8000/docs**

---

## Protocolo de JARVIS

JARVIS está configurado para:

1. **Nunca decir "no puedo"** — siempre propone alternativas viables
2. **Analizar el objetivo real** detrás de cada petición
3. **Extraer automáticamente** información relevante y guardarla en memoria
4. **Crear tareas automáticamente** cuando detecta to-dos o compromisos
5. **Anticipar necesidades** y sugerir optimizaciones proactivamente
6. **Explicar sus decisiones** con nivel de confianza cuando sea relevante

---

## Extensiones Futuras

| Módulo | Descripción |
|--------|-------------|
| Calendario | Google Calendar / Outlook API |
| Email | Gestión via IMAP/SMTP |
| Búsqueda web | Tavily / DuckDuckGo API |
| IoT | Control de dispositivos via MQTT |
| Biometría vocal | Identificación por huella de voz |
| Multi-usuario | Perfiles con autenticación JWT |
| App móvil | React Native |
| Modo offline | Ollama + Llama local |
| Notificaciones push | FCM / WebPush |

---

## Licencia

MIT — Proyecto personal de uso libre.
