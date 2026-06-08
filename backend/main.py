import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from database.database import init_db, AsyncSessionLocal
from database.models import UserProfile
from routers import chat, memory, tasks, profile


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(tasks.router)
app.include_router(profile.router)


@app.get("/")
async def root():
    return {
        "system": "JARVIS ULTRA",
        "status": "online",
        "version": "1.0.0",
        "message": "Sistema operativo. Listo para servir.",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
