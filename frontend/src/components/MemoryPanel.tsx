import { useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore'

const CATEGORIES = ['preference', 'routine', 'goal', 'project', 'contact', 'fact']

const CATEGORY_ICONS: Record<string, string> = {
  preference: '★',
  routine: '↻',
  goal: '◎',
  project: '▣',
  contact: '◉',
  fact: '◈',
}

export default function MemoryPanel() {
  const { memories, deleteMemory, addMemory, loadMemories } = useJarvisStore()
  const [newCat, setNewCat] = useState('fact')
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const grouped = memories
    .filter((m) =>
      !filter ||
      m.key.toLowerCase().includes(filter.toLowerCase()) ||
      m.value.toLowerCase().includes(filter.toLowerCase())
    )
    .reduce<Record<string, typeof memories>>((acc, m) => {
      acc[m.category] = [...(acc[m.category] || []), m]
      return acc
    }, {})

  const handleAdd = async () => {
    if (!newKey.trim() || !newVal.trim()) return
    setSaving(true)
    await addMemory(newCat, newKey.trim(), newVal.trim())
    setNewKey('')
    setNewVal('')
    setSaving(false)
  }

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">// MEMORIA PERSISTENTE</span>
        <span className="text-muted" style={{ fontSize: 10, fontFamily: 'var(--font-hud)' }}>
          {memories.length} REGISTROS
        </span>
      </div>

      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          className="input-field"
          style={{ width: '100%' }}
          placeholder="Buscar en memoria..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="memory-list">
        {Object.keys(grouped).length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <div>Sin registros de memoria aún</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              JARVIS aprenderá tus preferencias automáticamente
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="memory-category">
            <div className="memory-category-title">
              {CATEGORY_ICONS[category] || '○'} {category}
            </div>
            {items.map((m) => (
              <div key={m.id} className="memory-item">
                <div className="memory-content">
                  <div className="memory-key">{m.key}</div>
                  <div className="memory-value">{m.value}</div>
                  <div className="memory-source">
                    {m.source === 'ai_detected' ? '◈ Auto-detectado' : '◉ Manual'} ·{' '}
                    {new Date(m.updated_at).toLocaleDateString('es')}
                  </div>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => deleteMemory(m.id)}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-hud)', color: 'var(--primary)', letterSpacing: 2, marginBottom: 8 }}>
          + AGREGAR MEMORIA
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="select-field" value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ flex: '0 0 auto' }}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              className="input-field"
              placeholder="Clave (ej: idioma favorito)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="input-field"
              placeholder="Valor"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button className="btn-primary" onClick={handleAdd} disabled={saving || !newKey || !newVal}>
              {saving ? '...' : 'GUARDAR'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
