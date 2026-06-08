from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from database.database import get_db
from services.memory_service import get_all_memories, upsert_memory, delete_memory

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryCreate(BaseModel):
    user_id: int = 1
    category: str
    key: str
    value: str


@router.get("/{user_id}")
async def list_memories(user_id: int, db: AsyncSession = Depends(get_db)):
    memories = await get_all_memories(user_id, db)
    return [
        {
            "id": m.id,
            "category": m.category,
            "key": m.key,
            "value": m.value,
            "source": m.source,
            "updated_at": m.updated_at.isoformat(),
        }
        for m in memories
    ]


@router.post("/")
async def create_memory(data: MemoryCreate, db: AsyncSession = Depends(get_db)):
    memory = await upsert_memory(
        user_id=data.user_id,
        category=data.category,
        key=data.key,
        value=data.value,
        db=db,
        source="user_manual",
    )
    return {"id": memory.id, "status": "saved"}


@router.delete("/{memory_id}/{user_id}")
async def remove_memory(
    memory_id: int, user_id: int, db: AsyncSession = Depends(get_db)
):
    success = await delete_memory(memory_id, user_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Memoria no encontrada")
    return {"status": "deleted"}
