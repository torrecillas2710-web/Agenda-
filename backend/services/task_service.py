from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from database.models import Task


async def get_all_tasks(
    user_id: int, db: AsyncSession, status: Optional[str] = None
) -> list:
    query = select(Task).where(Task.user_id == user_id)
    if status:
        query = query.where(Task.status == status)
    query = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def create_task(
    user_id: int,
    title: str,
    db: AsyncSession,
    description: Optional[str] = None,
    priority: str = "medium",
    due_date: Optional[datetime] = None,
    category: Optional[str] = None,
) -> Task:
    task = Task(
        user_id=user_id,
        title=title,
        description=description,
        priority=priority,
        due_date=due_date,
        category=category,
        status="pending",
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task_status(
    task_id: int, user_id: int, status: str, db: AsyncSession
) -> Optional[Task]:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    if task:
        task.status = status
        task.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(task)
    return task


async def process_task_creates(user_id: int, task_creates: list, db: AsyncSession):
    created = []
    for tc in task_creates:
        due_date = None
        if tc.get("due_date"):
            try:
                due_date = datetime.strptime(tc["due_date"], "%Y-%m-%d")
            except ValueError:
                pass

        task = await create_task(
            user_id=user_id,
            title=tc.get("title", "Tarea sin título"),
            description=tc.get("description"),
            priority=tc.get("priority", "medium"),
            due_date=due_date,
            db=db,
        )
        created.append(task)
    return created
