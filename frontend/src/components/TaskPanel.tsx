import { useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore'
import type { Task } from '../types'
import { format, isPast, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
type FilterMode = 'pending' | 'all' | 'completed'

export default function TaskPanel() {
  const { tasks, updateTaskStatus, createTask } = useJarvisStore()
  const [filter, setFilter] = useState<FilterMode>('pending')
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newDue, setNewDue] = useState('')
  const [adding, setAdding] = useState(false)

  const sorted = [...tasks]
    .filter((t) => {
      if (filter === 'pending') return t.status === 'pending' || t.status === 'in_progress'
      if (filter === 'completed') return t.status === 'completed'
      return true
    })
    .sort((a, b) => (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 3) - (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 3))

  const handleToggle = async (task: Task) => {
    await updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    await createTask({ title: newTitle.trim(), priority: newPriority, due_date: newDue || undefined })
    setNewTitle('')
    setNewDue('')
    setAdding(false)
  }

  const isOverdue = (t: Task) => {
    if (!t.due_date || t.status === 'completed') return false
    try { return isPast(parseISO(t.due_date)) } catch { return false }
  }

  const formatDue = (due: string) => {
    try { return format(parseISO(due), 'dd MMM', { locale: es }) } catch { return due }
  }

  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const completed = tasks.filter((t) => t.status === 'completed').length

  return (
    <>
      <div className="panel-title-bar">
        <span>Tareas</span>
        <span className="panel-badge">{pending} pendientes · {completed} completadas</span>
      </div>

      <div className="task-tabs">
        {(['pending', 'all', 'completed'] as FilterMode[]).map((f) => (
          <button key={f} className={`task-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'pending' ? 'Pendientes' : f === 'completed' ? 'Completadas' : 'Todas'}
          </button>
        ))}
      </div>

      <div className="list-area">
        {sorted.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div>Sin tareas aquí</div>
            <div style={{ fontSize: 12 }}>Agrega una o pídesela a JARVIS</div>
          </div>
        )}
        {sorted.map((task) => (
          <div key={task.id} className={`task-item${task.status === 'completed' ? ' completed' : ''}`}>
            <div className={`task-check${task.status === 'completed' ? ' done' : ''}`} onClick={() => handleToggle(task)}>
              {task.status === 'completed' ? '✓' : ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="task-title">{task.title}</div>
              {task.description && <div className="task-desc">{task.description}</div>}
              <div className="task-meta">
                <span className={`priority-pill ${task.priority}`}>{task.priority}</span>
                {task.due_date && (
                  <span className={`task-due${isOverdue(task) ? ' overdue' : ''}`}>
                    {isOverdue(task) ? '⚠ ' : ''}{formatDue(task.due_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="add-form">
        <div className="add-form-title">Nueva tarea</div>
        <input
          className="input-field"
          placeholder="Título de la tarea..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <select className="select-field" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
          <input className="input-field" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={handleAdd} disabled={adding || !newTitle.trim()}>
            {adding ? '...' : 'Crear'}
          </button>
        </div>
      </div>
    </>
  )
}
