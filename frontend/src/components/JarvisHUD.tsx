import { useEffect, useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore'
import ChatInterface from './ChatInterface'
import MemoryPanel from './MemoryPanel'
import TaskPanel from './TaskPanel'
import Dashboard from './Dashboard'
import type { ActivePanel } from '../types'

const NAV_ITEMS: { id: ActivePanel; icon: string; label: string }[] = [
  { id: 'chat', icon: '⬡', label: 'Chat' },
  { id: 'memory', icon: '🧠', label: 'Memoria' },
  { id: 'tasks', icon: '▣', label: 'Tareas' },
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
]

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="topbar-clock">
      {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
    </span>
  )
}

function SystemStatus() {
  const { memories, tasks, isProcessing, isOnline, tokensUsed } = useJarvisStore()
  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const completionPct =
    tasks.length > 0
      ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100)
      : 0

  return (
    <div className="right-panel">
      <div className="system-card">
        <div className="system-card-title">◉ ESTADO JARVIS</div>
        <div className="stat-row">
          <span className="stat-label">Sistema</span>
          <span className={`stat-value ${isOnline ? 'green' : ''}`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">IA</span>
          <span className={`stat-value ${isProcessing ? 'orange' : 'green'}`}>
            {isProcessing ? 'PROCESANDO' : 'LISTO'}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Tokens</span>
          <span className="stat-value">{tokensUsed.toLocaleString()}</span>
        </div>
      </div>

      <div className="system-card">
        <div className="system-card-title">▣ TAREAS</div>
        <div className="stat-row">
          <span className="stat-label">Pendientes</span>
          <span className="stat-value orange">{pending}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total</span>
          <span className="stat-value">{tasks.length}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 3, fontFamily: 'var(--font-hud)', textAlign: 'right' }}>
            {completionPct}% COMPLETADO
          </div>
        </div>
      </div>

      <div className="system-card">
        <div className="system-card-title">🧠 MEMORIA</div>
        <div className="stat-row">
          <span className="stat-label">Registros</span>
          <span className="stat-value">{memories.length}</span>
        </div>
        {['preference', 'goal', 'project'].map((cat) => {
          const count = memories.filter((m) => m.category === cat).length
          return count > 0 ? (
            <div key={cat} className="stat-row">
              <span className="stat-label">{cat}</span>
              <span className="stat-value">{count}</span>
            </div>
          ) : null
        })}
      </div>

      <div className="system-card" style={{ marginTop: 'auto' }}>
        <div className="system-card-title">⊙ MÓDULOS ACTIVOS</div>
        {['Claude Opus', 'Web Speech', 'SQLite DB', 'REST API'].map((mod) => (
          <div key={mod} className="stat-row">
            <span className="stat-label" style={{ fontSize: 10 }}>{mod}</span>
            <span className="stat-value green" style={{ fontSize: 8 }}>◉ OK</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JarvisHUD() {
  const { initialize, isOnline, activePanel, setActivePanel, profile, isProcessing } =
    useJarvisStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <div className="jarvis-root">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="arc-reactor" />
          JARVIS ULTRA
          <span className="version">v1.0</span>
        </div>

        <div className="topbar-center">
          <div className="status-badge">
            <div className={`status-dot ${isOnline ? '' : 'offline'}`} />
            <span style={{ color: isOnline ? 'var(--success)' : 'var(--danger)' }}>
              {isOnline ? 'SISTEMA OPERATIVO' : 'DESCONECTADO'}
            </span>
          </div>
          <Clock />
          {isProcessing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'var(--font-hud)', color: 'var(--accent)', letterSpacing: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 0.8s ease-in-out infinite' }} />
              PROCESANDO
            </div>
          )}
        </div>

        <div className="topbar-right">
          {profile && (
            <span style={{ color: 'var(--text)', fontSize: 11 }}>
              {profile.name}
            </span>
          )}
          <div className="token-counter">
            <span style={{ color: 'var(--primary)', fontSize: 8 }}>⊛</span>
            <span>JARVIS ULTRA</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="main-layout">
        {/* Nav sidebar */}
        <nav className="nav-sidebar">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activePanel === item.id ? 'active' : ''}`}
              onClick={() => setActivePanel(item.id)}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
          <div className="nav-spacer" />
          <span className="nav-version">JARVIS ULTRA</span>
        </nav>

        {/* Content */}
        <main className="content-panel">
          {activePanel === 'chat' && <ChatInterface />}
          {activePanel === 'memory' && <MemoryPanel />}
          {activePanel === 'tasks' && <TaskPanel />}
          {activePanel === 'dashboard' && <Dashboard />}
        </main>

        {/* Right panel */}
        <SystemStatus />
      </div>
    </div>
  )
}
