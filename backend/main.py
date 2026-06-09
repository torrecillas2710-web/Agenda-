import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from database.database import init_db, AsyncSessionLocal
from database.models import UserProfile
from routers import chat, memory, tasks, profile, voice


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        result = await db.execute(select(UserProfile).where(UserProfile.id == 1))
        user = result.scalar_one_or_none()
        if not user:
            owner_name = os.getenv("JARVIS_OWNER_NAME", "Señor")
            owner = UserProfile(
                id=1,
                name=owner_name,
                timezone="UTC",
                language="es",
                is_owner=True,
            )
            db.add(owner)
            await db.commit()
            print(f"✓ Perfil creado: {owner_name}")
    print("✓ JARVIS ULTRA — Sistema operativo")
    yield
    print("JARVIS ULTRA apagado")


app = FastAPI(
    title="JARVIS ULTRA",
    description="API del asistente personal avanzado",
    version="1.0.0",
    lifespan=lifespan,
)

_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
_cors_origins: list[str] = ["*"] if _cors_env == "*" else _cors_env.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_env != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(tasks.router)
app.include_router(profile.router)
app.include_router(voice.router)


_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")


@app.get("/manifest.json")
async def manifest():
    return FileResponse(os.path.join(_static_dir, "manifest.json"), media_type="application/manifest+json")

@app.get("/sw.js")
async def service_worker():
    return FileResponse(os.path.join(_static_dir, "sw.js"), media_type="application/javascript")

@app.get("/icon-192.png")
async def icon192():
    return FileResponse(os.path.join(_static_dir, "icon-192.png"), media_type="image/png")

@app.get("/icon-512.png")
async def icon512():
    return FileResponse(os.path.join(_static_dir, "icon-512.png"), media_type="image/png")

@app.get("/apple-touch-icon.png")
async def apple_touch_icon():
    return FileResponse(os.path.join(_static_dir, "apple-touch-icon.png"), media_type="image/png")


@app.get("/")
async def root():
    index = os.path.join(_static_dir, "index.html")
    if os.path.exists(index):
        return FileResponse(index, media_type="text/html")
    return {"system": "JARVIS ULTRA", "status": "online"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
