import { useEffect, useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore'
import ChatInterface from './ChatInterface'
import MemoryPanel from './MemoryPanel'
import TaskPanel from './TaskPanel'
import Dashboard from './Dashboard'
import type { ActivePanel } from '../types'

const NAV = [
  { id: 'chat' as ActivePanel, icon: '💬', label: 'Chat' },
  { id: 'tasks' as ActivePanel, icon: '✓', label: 'Tareas' },
  { id: 'memory' as ActivePanel, icon: '🧠', label: 'Memoria' },
  { id: 'dashboard' as ActivePanel, icon: '📊', label: 'Panel' },
]

export default function JarvisHUD() {
  const { initialize, isOnline, activePanel, setActivePanel, profile } = useJarvisStore()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => { initialize() }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const ActiveComponent = {
    chat: ChatInterface,
    memory: MemoryPanel,
    tasks: TaskPanel,
    dashboard: Dashboard,
  }[activePanel]

  const activeNav = NAV.find((n) => n.id === activePanel)

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">J</div>
          JARVIS
        </div>

        <div className="sidebar-status">
          <div className={`status-dot${isOnline ? '' : ' offline'}`} />
          {isOnline ? 'En línea' : 'Desconectado'}
          {profile ? ` · ${profile.name}` : ''}
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item${activePanel === item.id ? ' active' : ''}`}
              onClick={() => setActivePanel(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-btn" onClick={toggleTheme}>
            <span className="nav-item-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        {/* Mobile header */}
        <header className="mobile-header">
          <div className="mobile-header-title">
            <div className="sidebar-logo-icon" style={{ width: 24, height: 24, fontSize: 12 }}>J</div>
            {activeNav?.label || 'JARVIS'}
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="Cambiar tema">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        {/* Panel content */}
        <div className="panel">
          <ActiveComponent />
        </div>

        {/* Mobile bottom tabs */}
        <nav className="bottom-tabs">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`bottom-tab${activePanel === item.id ? ' active' : ''}`}
              onClick={() => setActivePanel(item.id)}
            >
              <span className="tab-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
