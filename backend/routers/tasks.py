from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database.database import get_db
from services.task_service import get_all_tasks, create_task, update_task_status

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    user_id: int = 1
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    category: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: str


@router.get("/{user_id}")
async def list_tasks(
    user_id: int,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    tasks = await get_all_tasks(user_id, db, status)
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "category": t.category,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "created_at": t.created_at.isoformat(),
        }
        for t in tasks
    ]


@router.post("/")
async def create_new_task(data: TaskCreate, db: AsyncSession = Depends(get_db)):
    due_date = None
    if data.due_date:
        try:
            due_date = datetime.strptime(data.due_date, "%Y-%m-%d")
        except ValueError:
            pass

    task = await create_task(
        user_id=data.user_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        due_date=due_date,
        category=data.category,
        db=db,
    )
    return {"id": task.id, "status": "created"}


@router.patch("/{task_id}/{user_id}")
async def update_status(
    task_id: int,
    user_id: int,
    data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    task = await update_task_status(task_id, user_id, data.status, db)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"id": task.id, "status": task.status}
