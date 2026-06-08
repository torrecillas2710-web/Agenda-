import { useJarvisStore } from '../store/jarvisStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Dashboard() {
  const { memories, tasks, tokensUsed, profile, messages, isOnline } = useJarvisStore()

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const criticalTasks = tasks.filter((t) => t.priority === 'critical' && t.status !== 'completed')
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  const memoryByCategory = memories.reduce<Record<string, number>>((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1
    return acc
  }, {})

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  const todayTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === 'completed') return false
    try {
      const due = new Date(t.due_date)
      const now = new Date()
      return due.toDateString() === now.toDateString()
    } catch { return false }
  })

  const CATEGORY_COLORS: Record<string, string> = {
    preference: 'var(--primary)',
    routine: 'var(--success)',
    goal: 'var(--accent)',
    project: 'var(--secondary)',
    contact: '#cc44ff',
    fact: 'var(--text-muted)',
  }

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">// PANEL DE CONTROL</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-hud)' }}>
          {today}
        </span>
      </div>

      <div className="dashboard-grid">
        {/* Status */}
        <div className="dash-card">
          <div className="dash-card-title">
            <span style={{ color: isOnline ? 'var(--success)' : 'var(--danger)' }}>◉</span>
            ESTADO DEL SISTEMA
          </div>
          <div className="dash-value" style={{ color: isOnline ? 'var(--success)' : 'var(--danger)', fontSize: 16 }}>
            {isOnline ? 'OPERATIVO' : 'OFFLINE'}
          </div>
          <div className="dash-label">
            Propietario: <strong style={{ color: 'var(--text)' }}>{profile?.name || 'Desconocido'}</strong>
          </div>
          <div className="dash-label" style={{ marginTop: 4 }}>
            Modelo: <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-hud)', fontSize: 10 }}>CLAUDE OPUS 4</span>
          </div>
        </div>

        {/* Tokens */}
        <div className="dash-card">
          <div className="dash-card-title">⊛ TOKENS PROCESADOS</div>
          <div className="dash-value">{tokensUsed.toLocaleString()}</div>
          <div className="dash-label">Sesión actual · {messages.length} mensajes</div>
        </div>

        {/* Tasks */}
        <div className="dash-card">
          <div className="dash-card-title">▣ TAREAS</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
            <div>
              <div className="dash-value" style={{ color: 'var(--accent)' }}>{pendingTasks.length}</div>
              <div className="dash-label">Pendientes</div>
            </div>
            <div>
              <div className="dash-value" style={{ color: 'var(--success)', fontSize: 20 }}>{completedTasks.length}</div>
              <div className="dash-label">Completadas</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="dash-label" style={{ marginBottom: 4 }}>
              Tasa de completado: {completionRate}%
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="dash-card">
          <div className="dash-card-title">🧠 MEMORIA</div>
          <div className="dash-value">{memories.length}</div>
          <div className="dash-label">Registros totales</div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(memoryByCategory).map(([cat, count]) => (
              <span key={cat} style={{
                fontSize: 9,
                fontFamily: 'var(--font-hud)',
                padding: '2px 6px',
                borderRadius: 2,
                border: `1px solid ${CATEGORY_COLORS[cat] || 'var(--border)'}`,
                color: CATEGORY_COLORS[cat] || 'var(--text-muted)',
                background: `${CATEGORY_COLORS[cat] || 'var(--primary)'}12`,
                letterSpacing: 1,
              }}>
                {cat}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* Today's tasks */}
        <div className="dash-card full">
          <div className="dash-card-title">◎ AGENDA DE HOY</div>
          {todayTasks.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              Sin tareas programadas para hoy
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayTasks.map((t) => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', background: 'var(--bg-card2)',
                  border: '1px solid var(--border)', borderRadius: 4,
                }}>
                  <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
                  <span style={{ fontSize: 13 }}>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Critical */}
        {criticalTasks.length > 0 && (
          <div className="dash-card full" style={{ borderColor: 'rgba(255,51,85,0.4)' }}>
            <div className="dash-card-title" style={{ color: 'var(--danger)' }}>
              ⚠ TAREAS CRÍTICAS
            </div>
            {criticalTasks.map((t) => (
              <div key={t.id} style={{
                padding: '6px 10px',
                border: '1px solid rgba(255,51,85,0.3)',
                borderRadius: 4,
                marginBottom: 4,
                fontSize: 13,
                color: 'var(--text)',
              }}>
                {t.title}
              </div>
            ))}
          </div>
        )}

        {/* Memory categories */}
        <div className="dash-card full">
          <div className="dash-card-title">◈ CAPACIDADES DEL SISTEMA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Reconocimiento de Voz', status: true },
              { label: 'Síntesis de Voz', status: true },
              { label: 'Memoria Persistente', status: true },
              { label: 'Gestión de Tareas', status: true },
              { label: 'IA Contextual', status: true },
              { label: 'Auto-aprendizaje', status: true },
            ].map(({ label, status }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: 'var(--text-muted)',
              }}>
                <span style={{ color: status ? 'var(--success)' : 'var(--danger)', fontSize: 8 }}>◉</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
