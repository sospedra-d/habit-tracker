import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function TaskFormModal({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [energy, setEnergy] = useState('low')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('todos').insert([{
        title: title.trim(),
        due_date: date || null,
        energy_level: energy,
        user_id: user.id
      }])
      setTitle('')
      setDate('')
      setEnergy('low')
      if (onSave) onSave()
      onClose()
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content animate-fade-in-up">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text1)' }}>Nueva Tarea</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="text"
            required
            placeholder="¿Qué hay que hacer?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              padding: '12px 14px', borderRadius: 12, color: 'var(--text1)', fontSize: 14,
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={energy}
              onChange={e => setEnergy(e.target.value)}
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                padding: '10px 12px', borderRadius: 12, color: 'var(--text2)', fontSize: 13,
                outline: 'none'
              }}
            >
              <option value="low">🔋 Baja</option>
              <option value="medium">⚡ Media</option>
              <option value="high">🔥 Alta</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                padding: '10px 12px', borderRadius: 12, color: 'var(--text2)', fontSize: 13,
                outline: 'none'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            style={{
              width: '100%', background: 'var(--red)', color: 'white', border: 'none',
              padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {saving ? 'Guardando...' : 'Capturar'}
          </button>
        </form>
      </div>
    </div>
  )
}
