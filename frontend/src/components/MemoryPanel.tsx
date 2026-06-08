import { useState } from 'react'
import { useJarvisStore } from '../store/jarvisStore'

const CATEGORIES = ['preference', 'routine', 'goal', 'project', 'contact', 'fact']

export default function MemoryPanel() {
  const { memories, deleteMemory, addMemory } = useJarvisStore()
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
      <div className="panel-title-bar">
        <span>Memoria</span>
        <span className="panel-badge">{memories.length} registros</span>
      </div>

      <div className="search-bar">
        <input
          className="input-field"
          placeholder="Buscar en memoria..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="list-area">
        {Object.keys(grouped).length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <div>Sin registros aún</div>
            <div style={{ fontSize: 12 }}>JARVIS aprende tus preferencias automáticamente</div>
          </div>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="section-header">{category}</div>
            {items.map((m) => (
              <div key={m.id} className="memory-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="memory-key">{m.key}</div>
                  <div className="memory-value">{m.value}</div>
                  <div className="memory-source">
                    {m.source === 'ai_detected' ? 'Auto-detectado' : 'Manual'} · {new Date(m.updated_at).toLocaleDateString('es')}
                  </div>
                </div>
                <button className="delete-btn" onClick={() => deleteMemory(m.id)}>✕</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="add-form">
        <div className="add-form-title">Agregar memoria</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <select className="select-field" value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ flexShrink: 0 }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input-field" placeholder="Clave" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
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
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}
