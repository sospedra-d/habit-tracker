import { useState, useEffect, useRef } from 'react'
import useScrollLock from '../hooks/useScrollLock'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const CATEGORIES = ['Salud', 'Productividad', 'Ejercicio', 'Estudios', 'Otro']
const TURNO_OPTIONS = [
  { value: 'todo', label: 'Todo el día', icon: '🔄' },
  { value: 'mañana', label: 'Mañana', icon: '☀️' },
  { value: 'noche', label: 'Noche', icon: '🌙' },
]

// M15: un color distinto por categoría (antes Salud=Ejercicio y Productividad=Estudios
// compartían color). Se evita el rojo reservado a "núcleo".
const CATEGORY_COLORS = {
  'Salud': '#22c55e',          // verde
  'Productividad': '#0d9488',  // teal
  'Ejercicio': '#f97316',      // naranja
  'Estudios': '#a855f7',       // morado
  'Otro': '#52525b',           // gris
}

// M1: plantillas de hábitos populares. Al tocar una, se pre-rellenan los campos del
// formulario (no toca la BD; el hábito se crea con el "Crear" de siempre).
// days: 0=Dom … 6=Sáb (coincide con Date.getDay()).
const HABIT_TEMPLATES = [
  { emoji: '💧', name: 'Beber agua',    category: 'Salud',         isCounter: true,  target: 8,  days: [0, 1, 2, 3, 4, 5, 6] },
  { emoji: '🧘', name: 'Meditar',       category: 'Salud',         isCounter: false, target: 1,  days: [0, 1, 2, 3, 4, 5, 6] },
  { emoji: '📖', name: 'Leer',          category: 'Estudios',      isCounter: true,  target: 10, days: [0, 1, 2, 3, 4, 5, 6] },
  { emoji: '🏃', name: 'Ejercicio',     category: 'Ejercicio',     isCounter: false, target: 1,  days: [1, 2, 3, 4, 5] },
  { emoji: '🚶', name: '10.000 pasos',  category: 'Ejercicio',     isCounter: false, target: 1,  days: [0, 1, 2, 3, 4, 5, 6] },
  { emoji: '🙏', name: 'Gratitud',      category: 'Otro',          isCounter: false, target: 1,  days: [0, 1, 2, 3, 4, 5, 6] },
]

export default function HabitFormModal({ isOpen, onClose, onSave, onDelete, editingHabit }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Salud')
  const [selectedDays, setSelectedDays] = useState([])
  const [isCounter, setIsCounter] = useState(false)
  const [isCore, setIsCore] = useState(false)
  const [targetCount, setTargetCount] = useState(1)
  const [turno, setTurno] = useState('todo')
  const [challengeActive, setChallengeActive] = useState(false)
  const [challengeDays, setChallengeDays] = useState(21)
  const [cue, setCue] = useState('') // M5: detonante / "¿cuándo lo harás?"
  const [saving, setSaving] = useState(false)
  const nameInputRef = useRef(null)

  // Lock body scroll while open so iOS can't leave the page cut off after the keyboard closes
  useScrollLock(isOpen)

  // Scroll name input into view when modal opens (fixes mobile keyboard pushing content off-screen).
  // 'nearest' only scrolls the modal's own scroll area, never the document body.
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name)
      setCategory(editingHabit.category || 'Salud')
      setSelectedDays(editingHabit.days_of_week || [])
      setIsCounter(editingHabit.is_counter || false)
      setIsCore(editingHabit.is_core ?? false)
      setTargetCount(editingHabit.target_count || 1)
      setTurno(editingHabit.turno || 'todo')
      setChallengeActive(editingHabit.challenge_active || false)
      setChallengeDays(editingHabit.challenge_days || 21)
      setCue(editingHabit.cue || '')
    } else {
      setName(''); setCategory('Salud'); setSelectedDays([0, 1, 2, 3, 4, 5, 6])
      setIsCounter(false); setIsCore(false); setTargetCount(1); setTurno('todo')
      setChallengeActive(false); setChallengeDays(21)
      setCue('')
    }
  }, [editingHabit, isOpen])

  const toggleDay = (dayIndex) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    )
  }

  // M1: vuelca una plantilla en los campos del formulario. El usuario aún revisa y pulsa "Crear".
  const applyTemplate = (t) => {
    setName(t.name)
    setCategory(t.category)
    setIsCounter(t.isCounter)
    setTargetCount(t.target || 1)
    setSelectedDays(t.days)
    nameInputRef.current?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || selectedDays.length === 0) return
    setSaving(true)
    // M14: nunca guardar un objetivo inválido (vacío, 0, negativo o NaN) → mínimo 1.
    // Un contador con target 0 rompe el cálculo de progreso (count / 0 → NaN/Infinity).
    const safeTarget = Math.max(1, Math.floor(Number(targetCount)) || 1)
    await onSave({
      name: name.trim(), category, days_of_week: selectedDays,
      is_counter: isCounter, is_core: isCore,
      target_count: isCounter ? safeTarget : 1,
      turno,
      challenge_active: challengeActive,
      challenge_days: challengeActive ? Number(challengeDays) : null,
      challenge_started_at: (challengeActive && !editingHabit?.challenge_active) ? new Date().toISOString() : (challengeActive ? editingHabit?.challenge_started_at : null),
      cue: cue.trim() || null,
      id: editingHabit?.id
    })
    setSaving(false)
    onClose()
  }

  if (!isOpen) return null

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text1)', outline: 'none'
  }

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
        <div className="modal-content animate-fade-in-up">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text1)' }}>
            {editingHabit ? 'Editar Hábito' : 'Nuevo Hábito'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* M1: plantillas — solo al crear, no al editar */}
          {!editingHabit && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>
                Empieza con una plantilla
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {HABIT_TEMPLATES.map(t => (
                  <button
                    key={t.name} type="button" onClick={() => applyTemplate(t)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s',
                      background: 'var(--surface2)', color: 'var(--text2)',
                      display: 'flex', alignItems: 'center', gap: 5
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{t.emoji}</span>{t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <input
            ref={nameInputRef}
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del hábito..." autoFocus style={inputStyle}
            onFocus={() => {
              setTimeout(() => nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
            }}
          />

          {/* Core toggle */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderRadius: 12,
            background: 'var(--surface2)', border: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text1)' }}>
                {isCore ? '⭐ Hábito Núcleo' : 'Hábito Extra'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {isCore ? 'Obligatorio. Prioridad alta.' : 'Opcional. Bueno tenerlo.'}
              </div>
            </div>
            <div
              className={`sw-track ${isCore ? 'on' : 'off'}`}
              onClick={() => setIsCore(!isCore)}
              style={isCore ? { background: 'var(--red)' } : {}}
            >
              <div className="sw-thumb" />
            </div>
          </div>

          {/* Counter toggle */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderRadius: 12,
            background: 'var(--surface2)', border: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text1)' }}>Hábito con contador</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Ej: Vasos de agua, páginas</div>
            </div>
            <div
              className={`sw-track ${isCounter ? 'on' : 'off'}`}
              onClick={() => setIsCounter(!isCounter)}
            >
              <div className="sw-thumb" />
            </div>
          </div>

          {/* Target count */}
          {isCounter && (
            <input
              type="number" min="1" value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              placeholder="Meta diaria" style={inputStyle}
            />
          )}

          {/* Consistency Challenge */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: '12px 14px', borderRadius: 12,
            background: 'var(--surface2)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text1)' }}>🏅 Reto de Consistencia</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Mantén una racha de días</div>
              </div>
              <div
                className={`sw-track ${challengeActive ? 'on' : 'off'}`}
                onClick={() => setChallengeActive(!challengeActive)}
                style={challengeActive ? { background: '#c9963a' } : {}}
              >
                <div className="sw-thumb" />
              </div>
            </div>
            {challengeActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--text1)' }}>Días seguidos:</span>
                <input
                  type="number" min="2" max="365" value={challengeDays}
                  onChange={(e) => setChallengeDays(e.target.value)}
                  style={{ ...inputStyle, padding: '8px 12px', flex: 1 }}
                />
              </div>
            )}
          </div>

          {/* Turno selector */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>
              Turno
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TURNO_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button" onClick={() => setTurno(opt.value)}
                  style={{
                    flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                    border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                    textAlign: 'center',
                    background: turno === opt.value ? 'var(--surface3)' : 'transparent',
                    color: turno === opt.value ? 'var(--text1)' : 'var(--text2)',
                    borderColor: turno === opt.value ? 'var(--border2)' : 'var(--border)'
                  }}
                >
                  <span style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* M5: detonante / intención de implementación */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>
              ¿Cuándo lo harás? <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opcional)</span>
            </div>
            <input
              type="text" value={cue} onChange={(e) => setCue(e.target.value)}
              placeholder="Ej: después de desayunar" style={inputStyle} maxLength={80}
            />
          </div>

          {/* Category */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat} type="button" onClick={() => setCategory(cat)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                  background: category === cat ? 'var(--surface3)' : 'transparent',
                  color: category === cat ? 'var(--text1)' : 'var(--text2)',
                  borderColor: category === cat ? 'var(--border2)' : 'var(--border)'
                }}
              >{cat}</button>
            ))}
          </div>

          {/* Days */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>
              Días de la semana
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {DAY_LABELS.map((label, index) => (
                <button
                  key={index} type="button" onClick={() => toggleDay(index)}
                  style={{
                    flex: 1, aspectRatio: '1', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedDays.includes(index) ? 'var(--red)' : 'var(--surface2)',
                    color: selectedDays.includes(index) ? 'white' : 'var(--text3)',
                  }}
                >{label}</button>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>Selecciona al menos un día</p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 500,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer'
              }}
            >Cancelar</button>
            <button
              type="submit" disabled={saving || !name.trim() || selectedDays.length === 0}
              style={{
                flex: 1, padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: 'var(--red)', border: 'none', color: 'white', cursor: 'pointer',
                opacity: (saving || !name.trim() || selectedDays.length === 0) ? 0.5 : 1
              }}
            >
              {saving ? 'Guardando...' : editingHabit ? 'Guardar' : 'Crear'}
            </button>
          </div>

          {/* Delete button — only when editing */}
          {editingHabit && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Seguro que quieres eliminar este hábito? Esta acción no se puede deshacer')) {
                  onDelete(editingHabit.id)
                  onClose()
                }
              }}
              style={{
                width: '100%', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: 'transparent', border: '1px solid rgba(220,32,32,0.3)',
                color: '#dc2020', cursor: 'pointer', marginTop: 4
              }}
            >
              Eliminar hábito
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export { DAY_LABELS, CATEGORIES, CATEGORY_COLORS }
