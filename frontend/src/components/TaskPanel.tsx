import { useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore'
import type { Task } from '../types'
import { format, isPast, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

type FilterMode = 'all' | 'pending' | 'completed'

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
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 3
      const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 3
      return pa - pb
    })

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await updateTaskStatus(task.id, newStatus)
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    await createTask({ title: newTitle.trim(), priority: newPriority, due_date: newDue || undefined })
    setNewTitle('')
    setNewDue('')
    setAdding(false)
  }

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed') return false
    try { return isPast(parseISO(task.due_date)) } catch { return false }
  }

  const formatDue = (due: string) => {
    try { return format(parseISO(due), "dd MMM", { locale: es }) } catch { return due }
  }

  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const completed = tasks.filter((t) => t.status === 'completed').length

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">// GESTIÓN DE TAREAS</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-hud)' }}>
            {pending} PENDIENTES
          </span>
          <span style={{ fontSize: 10, color: 'var(--success)', fontFamily: 'var(--font-hud)' }}>
            {completed} COMPLETADAS
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['pending', 'all', 'completed'] as FilterMode[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: '8px 0',
              background: 'none',
              border: 'none',
              borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent',
              color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-hud)',
              fontSize: 9,
              letterSpacing: 2,
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
            }}
          >
            {f === 'pending' ? 'Pendientes' : f === 'completed' ? 'Completadas' : 'Todas'}
          </button>
        ))}
      </div>

      <div className="task-list">
        {sorted.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div>Sin tareas en esta categoría</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Agrega tareas o pídele a JARVIS que las cree
            </div>
          </div>
        )}

        {sorted.map((task) => (
          <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
            <div
              className={`task-check ${task.status === 'completed' ? 'done' : ''}`}
              onClick={() => handleToggle(task)}
              title={task.status === 'completed' ? 'Marcar pendiente' : 'Marcar completada'}
            >
              {task.status === 'completed' ? '✓' : ''}
            </div>

            <div className="task-content">
              <div className="task-title">{task.title}</div>
              {task.description && (
                <div className="task-desc">{task.description}</div>
              )}
              <div className="task-meta">
                <span className={`priority-badge ${task.priority}`}>
                  {task.priority}
                </span>
                {task.due_date && (
                  <span className={`task-due ${isOverdue(task) ? 'overdue' : ''}`}>
                    {isOverdue(task) ? '⚠ ' : ''}
                    {formatDue(task.due_date)}
                  </span>
                )}
                {task.category && (
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-hud)' }}>
                    {task.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-hud)', color: 'var(--primary)', letterSpacing: 2, marginBottom: 8 }}>
          + NUEVA TAREA
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
            <input
              className="input-field"
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleAdd} disabled={adding || !newTitle.trim()}>
              {adding ? '...' : 'CREAR'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
