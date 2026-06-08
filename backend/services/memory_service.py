from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from database.models import Memory


async def get_all_memories(user_id: int, db: AsyncSession) -> list:
    result = await db.execute(
        select(Memory)
        .where(Memory.user_id == user_id)
        .order_by(Memory.category.asc(), Memory.updated_at.desc())
    )
    return result.scalars().all()


async def upsert_memory(
    user_id: int,
    category: str,
    key: str,
    value: str,
    db: AsyncSession,
    source: str = "ai_detected",
) -> Memory:
    result = await db.execute(
        select(Memory).where(
            Memory.user_id == user_id,
            Memory.key == key,
            Memory.category == category,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.value = value
        existing.updated_at = datetime.utcnow()
        existing.source = source
        await db.commit()
        await db.refresh(existing)
        return existing

    new_memory = Memory(
        user_id=user_id,
        category=category,
        key=key,
        value=value,
        source=source,
    )
    db.add(new_memory)
    await db.commit()
    await db.refresh(new_memory)
    return new_memory


async def delete_memory(memory_id: int, user_id: int, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Memory).where(Memory.id == memory_id, Memory.user_id == user_id)
    )
    memory = result.scalar_one_or_none()
    if memory:
        await db.delete(memory)
        await db.commit()
        return True
    return False


async def process_memory_updates(user_id: int, updates: list, db: AsyncSession):
    for item in updates:
        if item.get("key") and item.get("value"):
            await upsert_memory(
                user_id=user_id,
                category=item.get("category", "fact"),
                key=item["key"],
                value=item["value"],
                db=db,
                source="ai_detected",
            )
