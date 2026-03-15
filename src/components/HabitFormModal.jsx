import { useState, useEffect } from 'react'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const CATEGORIES = ['Salud', 'Productividad', 'Ejercicio', 'Estudios', 'Otro']

const CATEGORY_COLORS = {
  'Salud': '#10b981',
  'Productividad': '#3b82f6',
  'Ejercicio': '#f59e0b',
  'Estudios': '#8b5cf6',
  'Otro': '#64748b',
}

export default function HabitFormModal({ isOpen, onClose, onSave, editingHabit }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Salud')
  const [selectedDays, setSelectedDays] = useState([])
  const [isCounter, setIsCounter] = useState(false)
  const [targetCount, setTargetCount] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name)
      setCategory(editingHabit.category || 'Salud')
      setSelectedDays(editingHabit.days_of_week || [])
      setIsCounter(editingHabit.is_counter || false)
      setTargetCount(editingHabit.target_count || 1)
    } else {
      setName('')
      setCategory('Salud')
      setSelectedDays([])
      setIsCounter(false)
      setTargetCount(1)
    }
  }, [editingHabit, isOpen])

  const toggleDay = (dayIndex) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || selectedDays.length === 0) return
    setSaving(true)
    await onSave({ 
      name: name.trim(), 
      category, 
      days_of_week: selectedDays, 
      is_counter: isCounter,
      target_count: isCounter ? Number(targetCount) : 1,
      id: editingHabit?.id 
    })
    setSaving(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 animate-fade-in-up"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--glass-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {editingHabit ? 'Editar Hábito' : 'Nuevo Hábito'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Nombre del hábito
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Hacer ejercicio 30 min"
              className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 focus:outline-none focus:ring-2"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--accent-primary)',
              }}
              autoFocus
            />
          </div>

          {/* Type of Habit (Normal vs Counter) */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Hábito con contador</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Ej: Vasos de agua, páginas leídas</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCounter(!isCounter)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isCounter ? 'bg-[#6c63ff]' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCounter ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Target Count Input (only if isCounter) */}
          {isCounter && (
            <div className="animate-fade-in-up">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Meta diaria
              </label>
              <input
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-300 focus:outline-none focus:ring-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent-primary)',
                }}
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Categoría
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer hover:scale-105"
                  style={{
                    background: category === cat ? CATEGORY_COLORS[cat] + '30' : 'rgba(255, 255, 255, 0.05)',
                    color: category === cat ? CATEGORY_COLORS[cat] : 'var(--text-secondary)',
                    border: `1px solid ${category === cat ? CATEGORY_COLORS[cat] + '60' : 'var(--border-subtle)'}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Días de la semana
            </label>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className="w-10 h-10 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-110"
                  style={{
                    background: selectedDays.includes(index)
                      ? 'var(--accent-gradient)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: selectedDays.includes(index) ? '#ffffff' : 'var(--text-secondary)',
                    border: selectedDays.includes(index)
                      ? 'none'
                      : '1px solid var(--border-subtle)',
                    boxShadow: selectedDays.includes(index)
                      ? '0 4px 12px rgba(108, 99, 255, 0.3)'
                      : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--accent-secondary)', opacity: 0.8 }}>
                Selecciona al menos un día
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-white/10 cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || selectedDays.length === 0}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
              style={{
                background: 'var(--accent-gradient)',
                boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
              }}
            >
              {saving ? 'Guardando...' : editingHabit ? 'Guardar Cambios' : 'Crear Hábito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { DAY_LABELS, CATEGORIES, CATEGORY_COLORS }
