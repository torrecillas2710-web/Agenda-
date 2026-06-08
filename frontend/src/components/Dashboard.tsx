import { useJarvisStore } from '../store/jarvisStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Dashboard() {
  const { memories, tasks, tokensUsed, profile, messages, isOnline } = useJarvisStore()

  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const completed = tasks.filter((t) => t.status === 'completed').length
  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const critical = tasks.filter((t) => t.priority === 'critical' && t.status !== 'completed')

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  const todayTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === 'completed') return false
    try { return new Date(t.due_date).toDateString() === new Date().toDateString() } catch { return false }
  })

  return (
    <>
      <div className="panel-title-bar">
        <span>Panel de control</span>
        <span className="panel-badge">{today}</span>
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-card-label">Estado</div>
          <div className="dash-value" style={{ fontSize: 18, color: isOnline ? 'var(--success)' : 'var(--danger)' }}>
            {isOnline ? '● En línea' : '○ Offline'}
          </div>
          <div className="dash-sublabel">{profile?.name || 'Propietario'}</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-label">Conversación</div>
          <div className="dash-value">{messages.length}</div>
          <div className="dash-sublabel">mensajes · {tokensUsed.toLocaleString()} tokens</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-label">Tareas</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
            <div>
              <div className="dash-value" style={{ color: 'var(--warning)' }}>{pending}</div>
              <div className="dash-sublabel">pendientes</div>
            </div>
            <div>
              <div className="dash-value" style={{ fontSize: 20, color: 'var(--success)' }}>{completed}</div>
              <div className="dash-sublabel">completadas</div>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${completionRate}%` }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{completionRate}% completado</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-label">Memoria</div>
          <div className="dash-value">{memories.length}</div>
          <div className="dash-sublabel">registros guardados</div>
        </div>

        {todayTasks.length > 0 && (
          <div className="dash-card full">
            <div className="dash-card-label">Agenda de hoy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {todayTasks.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <span className={`priority-pill ${t.priority}`}>{t.priority}</span>
                  <span style={{ fontSize: 14 }}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {critical.length > 0 && (
          <div className="dash-card full" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <div className="dash-card-label" style={{ color: 'var(--danger)' }}>⚠ Tareas críticas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {critical.map((t) => (
                <div key={t.id} style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>{t.title}</div>
              ))}
            </div>
          </div>
        )}

        <div className="dash-card full">
          <div className="dash-card-label">Capacidades activas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginTop: 8 }}>
            {['Conversación por voz', 'Respuesta con voz', 'Memoria persistente', 'Gestión de tareas', 'IA contextual', 'Modo oscuro/claro'].map((cap) => (
              <div key={cap} className="cap-row">
                <span style={{ color: 'var(--success)', fontSize: 8 }}>●</span>
                {cap}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
