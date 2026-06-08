from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from database.database import get_db
from database.models import UserProfile, Memory, Task, ChatMessage
from services.ai_service import get_jarvis_response
from services.memory_service import process_memory_updates
from services.task_service import process_task_creates

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    user_id: int = 1


@router.post("/message")
async def send_message(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserProfile).where(UserProfile.id == request.user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    memories_result = await db.execute(
        select(Memory).where(Memory.user_id == request.user_id)
    )
    memories = memories_result.scalars().all()

    tasks_result = await db.execute(
        select(Task).where(
            Task.user_id == request.user_id,
            Task.status.in_(["pending", "in_progress"]),
        )
    )
    tasks = tasks_result.scalars().all()

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == request.user_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(20)
    )
    chat_history = list(reversed(history_result.scalars().all()))

    user_msg = ChatMessage(
        user_id=request.user_id, role="user", content=request.message
    )
    db.add(user_msg)
    await db.commit()

    try:
        result_data = await get_jarvis_response(
            user_message=request.message,
            user=user,
            memories=memories,
            tasks=tasks,
            chat_history=chat_history,
            db=db,
        )
    except Exception as e:
        err_str = str(e)
        if "api_key" in err_str.lower() or "authentication" in err_str.lower() or "api key" in err_str.lower():
            raise HTTPException(
                status_code=401,
                detail="GOOGLE_API_KEY inválida o no configurada. Ve a Railway → Variables y verifica GOOGLE_API_KEY."
            )
        if "quota" in err_str.lower() or "billing" in err_str.lower() or "rate_limit" in err_str.lower():
            raise HTTPException(
                status_code=429,
                detail="Límite de uso de Gemini alcanzado. Intenta de nuevo en unos minutos."
            )
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")

    assistant_msg = ChatMessage(
        user_id=request.user_id,
        role="assistant",
        content=result_data["response"],
    )
    db.add(assistant_msg)
    await db.commit()

    await process_memory_updates(request.user_id, result_data["memory_updates"], db)
    await process_task_creates(request.user_id, result_data["task_creates"], db)

    return {
        "response": result_data["response"],
        "timestamp": datetime.utcnow().isoformat(),
        "memory_updates_count": len(result_data["memory_updates"]),
        "tasks_created_count": len(result_data["task_creates"]),
        "tokens_used": result_data["tokens_used"],
    }


@router.get("/history/{user_id}")
async def get_chat_history(
    user_id: int, limit: int = 50, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    return [
        {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat()}
        for m in messages
    ]


@router.delete("/history/{user_id}")
async def clear_history(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == user_id)
    )
    msgs = result.scalars().all()
    for m in msgs:
        await db.delete(m)
    await db.commit()
    return {"status": "cleared", "count": len(msgs)}
