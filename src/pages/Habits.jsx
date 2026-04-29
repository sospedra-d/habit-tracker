import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import HabitFormModal, { DAY_LABELS, CATEGORY_COLORS } from '../components/HabitFormModal'
import { getChallengeStatus } from '../utils/challenge'

const COLLAPSE_KEY = 'habit_category_collapse'

function getCollapseState() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveCollapseState(state) {
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state))
}

export default function Habits() {
  const [habits, setHabits] = useState([])
  const [logsMap, setLogsMap] = useState(new Map())
  const [challengeLogs, setChallengeLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showAllHabits, setShowAllHabits] = useState(false)
  const [shiftFilter, setShiftFilter] = useState(false)
  // MEJORA 1: collapsible categories
  const [collapsed, setCollapsed] = useState(getCollapseState)

  const today = new Date()
  const todayDayIndex = today.getDay()
  const todayStr = today.toISOString().split('T')[0]
  const currentHour = today.getHours()
  const currentShift = currentHour < 12 ? 'mañana' : 'noche'

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const todayLabel = dayNames[todayDayIndex]

  const toggleCollapse = (cat) => {
    setCollapsed(prev => {
      const next = { ...prev, [cat]: !prev[cat] }
      saveCollapseState(next)
      return next
    })
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: allHabits, error: hErr } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true })
      if (hErr) throw hErr

      const { data: logs, error: lErr } = await supabase
        .from('habit_logs')
        .select('habit_id, count')
        .eq('completed_at', todayStr)
      if (lErr) throw lErr

      const activeChallengeHabits = (allHabits || []).filter(h => h.challenge_active)
      let allChallengeLogs = []
      if (activeChallengeHabits.length > 0) {
        const hids = activeChallengeHabits.map(h => h.id)
        const oldestTs = Math.min(...activeChallengeHabits.map(h => {
          return h.challenge_started_at ? new Date(h.challenge_started_at).getTime() : Date.now()
        }))
        const safeTs = isNaN(oldestTs) ? Date.now() : oldestTs
        const oldestDateStr = new Date(safeTs).toISOString().split('T')[0]
        
        const { data: clData, error: clErr } = await supabase
          .from('habit_logs')
          .select('habit_id, completed_at, count')
          .in('habit_id', hids)
          .gte('completed_at', oldestDateStr)
        if (!clErr) allChallengeLogs = clData || []
        
        // Auto-deactivation (24h window expired) and auto-completion
        const deactivateIds = []
        const completedIds = []
        const { data: { user } } = await supabase.auth.getUser()

        for (const h of activeChallengeHabits) {
          const status = getChallengeStatus(h, allChallengeLogs, todayStr)
          if (status.needsDeactivation) {
            deactivateIds.push(h.id)
          } else if (status.isCompleted) {
            completedIds.push(h)
          }
        }

        if (deactivateIds.length > 0) {
          await supabase.from('habits').update({ challenge_active: false, challenge_started_at: null }).in('id', deactivateIds)
          allHabits.forEach(h => {
            if (deactivateIds.includes(h.id)) {
              h.challenge_active = false
              h.challenge_started_at = null
            }
          })
        }

        if (completedIds.length > 0 && user) {
          for (const h of completedIds) {
            await supabase.from('habits').update({ challenge_active: false, challenge_started_at: null }).eq('id', h.id)
            await supabase.from('achievements').insert([{
              user_id: user.id,
              type: 'habit_challenge',
              name: h.name,
              achieved_at: new Date().toISOString()
            }])
            h.challenge_active = false
            h.challenge_started_at = null
          }
        }
      }

      setHabits(allHabits || [])
      setLogsMap(new Map((logs || []).map((l) => [l.habit_id, l])))
      setChallengeLogs(allChallengeLogs)
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => { fetchData() }, [fetchData])

  const todaysHabits = habits.filter((h) => h.days_of_week?.includes(todayDayIndex))
  
  // Apply shift filter
  const filteredHabits = useMemo(() => {
    const base = showAllHabits ? habits : todaysHabits
    if (!shiftFilter) return base
    return base.filter(h => {
      const turno = h.turno || 'todo'
      return turno === 'todo' || turno === currentShift
    })
  }, [habits, todaysHabits, showAllHabits, shiftFilter, currentShift])

  const displayedHabits = filteredHabits

  // Group by category, sort: categories with Núcleo first, within each category Núcleo before Extra
  const sortedGroups = useMemo(() => {
    const groups = {}
    displayedHabits.forEach(h => {
      const cat = h.category || 'Otro'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(h)
    })

    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        if (a.is_core && !b.is_core) return -1
        if (!a.is_core && b.is_core) return 1
        return 0
      })
    })

    const entries = Object.entries(groups)
    entries.sort((a, b) => {
      const aHasCore = a[1].some(h => h.is_core)
      const bHasCore = b[1].some(h => h.is_core)
      if (aHasCore && !bHasCore) return -1
      if (!aHasCore && bHasCore) return 1
      return 0
    })

    return entries
  }, [displayedHabits])

  const handleSave = async (habitData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay usuario autenticado")

      const payload = { ...habitData, user_id: user.id }

      if (payload.id) {
        const { error } = await supabase
          .from('habits')
          .update({
            name: payload.name,
            category: payload.category,
            days_of_week: payload.days_of_week,
            is_counter: payload.is_counter,
            is_core: payload.is_core,
            target_count: payload.target_count,
            turno: payload.turno,
            challenge_active: payload.challenge_active,
            challenge_days: payload.challenge_days,
            challenge_started_at: payload.challenge_started_at
          })
          .eq('id', payload.id)
        if (error) throw error
      } else {
        delete payload.id
        const { error } = await supabase.from('habits').insert([payload])
        if (error) throw error
      }
      await fetchData()
    } catch (err) {
      console.error('Error saving habit:', err)
      alert(`Error al guardar: ${err.message || 'Intenta refrescar la página'}`)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (err) {
      console.error('Error deleting habit:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const updateLog = async (habit, newCount) => {
    setTogglingId(habit.id)
    try {
      if (newCount <= 0) {
        // Deshacer: eliminar log de hoy
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habit.id)
          .eq('completed_at', todayStr)
        if (error) throw error
        // Refetch completo para recalcular racha desde BD
        await fetchData()
      } else {
        // Completar: verificar si estamos en estado fallo para reiniciar reto
        if (habit.challenge_active) {
          const status = getChallengeStatus(habit, challengeLogs, todayStr)
          if (status.isInFailureState) {
            // Reiniciar reto: challenge_started_at = now()
            await supabase.from('habits').update({ challenge_started_at: new Date().toISOString() }).eq('id', habit.id)
          }
        }

        const { data, error } = await supabase
          .from('habit_logs')
          .upsert([{ habit_id: habit.id, completed_at: todayStr, count: newCount }], { onConflict: 'habit_id, completed_at' })
          .select()
        if (error) throw error

        // Refetch completo para recalcular racha y detectar completado
        await fetchData()
      }
    } catch (err) {
      console.error('Error updating log:', err)
    } finally {
      setTogglingId(null)
    }
  }


  const openEdit = (habit) => {
    setEditingHabit(habit)
    setModalOpen(true)
  }

  const getHabitProgress = (h) => {
    const log = logsMap.get(h.id)
    const currentCount = log ? log.count : 0
    const target = h.is_counter ? h.target_count || 1 : 1
    return { currentCount, target, progress: Math.min(currentCount / target, 1) }
  }

  const turnoLabel = { 'mañana': '☀️', 'noche': '🌙', 'todo': '' }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="screen-header">
        <h1 className="screen-title">Mis Hábitos</h1>
        <p className="screen-sub">{displayedHabits.length} hábitos · {todayLabel}</p>
      </div>

      {/* Shift Toggle */}
      <div style={{ marginBottom: 16 }}>
        <div className="sw-row">
          <span className="sw-label">
            Filtro automático {currentShift === 'mañana' ? '☀️ mañana' : '🌙 noche'}
          </span>
          <div
            className={`sw-track ${shiftFilter ? 'on' : 'off'}`}
            onClick={() => setShiftFilter(!shiftFilter)}
          >
            <div className="sw-thumb" />
          </div>
        </div>
      </div>

      {/* Today / All toggle */}
      <div className="task-tabs" style={{ marginBottom: 20 }}>
        <button
          className={`task-tab ${!showAllHabits ? 'active' : ''}`}
          onClick={() => setShowAllHabits(false)}
        >
          Hoy ({todaysHabits.length})
        </button>
        <button
          className={`task-tab ${showAllHabits ? 'active' : ''}`}
          onClick={() => setShowAllHabits(true)}
        >
          Todos ({habits.length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <svg className="animate-spin" style={{ width: 24, height: 24, color: 'var(--text3)' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
          </svg>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedHabits.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 14 }}>
          {showAllHabits ? 'Aún no tienes hábitos' : `No hay hábitos para ${todayLabel}`}
        </div>
      )}

      {/* Grouped Habit List — sorted by category, collapsible */}
      {!loading && displayedHabits.length > 0 && (
        <div className="habit-list">
          {sortedGroups.map(([categoryName, catHabits]) => {
            const hasCoreHabits = catHabits.some(h => h.is_core)
            const dotColor = hasCoreHabits ? 'var(--red)' : 'var(--blue)'
            const isCollapsed = collapsed[categoryName] || false

            return (
              <div key={categoryName}>
                {/* Category label — MEJORA 1: clickable with chevron */}
                <div
                  className="habit-group-label"
                  onClick={() => toggleCollapse(categoryName)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div className="habit-group-dot" style={{ background: dotColor }} />
                  <span style={{ flex: 1 }}>{categoryName.toUpperCase()}</span>
                  <span style={{
                    fontSize: 12, color: 'var(--text3)', transition: 'transform 0.2s',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    display: 'inline-block'
                  }}>
                    ▾
                  </span>
                </div>

                {/* Habit rows — collapsible with transition */}
                <div style={{
                  overflow: 'hidden',
                  maxHeight: isCollapsed ? 0 : 2000,
                  opacity: isCollapsed ? 0 : 1,
                  transition: 'max-height 0.2s ease, opacity 0.2s ease'
                }}>
                  {catHabits.map(habit => {
                    const { currentCount, target, progress } = getHabitProgress(habit)
                    const isCompleted = progress >= 1
                    const isForToday = habit.days_of_week?.includes(todayDayIndex)
                    const isToggling = togglingId === habit.id

                    const checkClass = isCompleted
                      ? habit.is_core ? 'habit-check done' : 'habit-check done-blue'
                      : 'habit-check'

                    // MEJORA 2: completed habits show differently
                    const completedStyle = isCompleted ? { opacity: 0.5 } : {}
                    const status = getChallengeStatus(habit, challengeLogs, todayStr)

                    return (
                      <div
                        key={habit.id}
                        className="habit-row"
                        style={{ opacity: deletingId === habit.id ? 0.4 : 1, ...completedStyle }}
                      >
                        {/* Circular checkbox */}
                        {isForToday ? (
                          habit.is_counter ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                className={checkClass}
                                onClick={() => {
                                  if (!isToggling) updateLog(habit, isCompleted ? 0 : currentCount + 1)
                                }}
                              >
                                {isCompleted && <span style={{ fontSize: 10, color: 'white' }}>✓</span>}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                                {currentCount}/{target}
                              </span>
                            </div>
                          ) : (
                            <div
                              className={checkClass}
                              onClick={() => {
                                if (!isToggling) updateLog(habit, isCompleted ? 0 : 1)
                              }}
                            >
                              {isCompleted && <span style={{ fontSize: 10, color: 'white' }}>✓</span>}
                            </div>
                          )
                        ) : (
                          <div className="habit-check" style={{ opacity: 0.3, cursor: 'default' }} />
                        )}

                        {/* Name + challenge UI */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
                          <span className={`habit-name ${isCompleted ? 'completed' : ''}`}
                            style={isCompleted ? { color: '#71717a', textDecoration: 'line-through', flex: 'none' } : { flex: 'none' }}
                          >
                            {habit.name}
                            {status.showRedX && (
                              <span style={{ color: '#dc2020', marginLeft: 6, fontWeight: 'bold', fontSize: 15 }} title="Racha rota — completa hoy para reiniciar">✕</span>
                            )}
                            {(habit.challenge_active && status.isActive && !status.showRedX) && (
                              <span style={{ marginLeft: 6, fontSize: 13 }} title="Reto activo">🏅</span>
                            )}
                            {habit.turno && habit.turno !== 'todo' && (
                              <span style={{ marginLeft: 6, fontSize: 12 }}>{turnoLabel[habit.turno]}</span>
                            )}
                          </span>

                          {/* Barra de progreso dorada — solo en ESTADO NORMAL (sin X) */}
                          {(habit.challenge_active && status.isActive && !status.showRedX) && (
                            <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ width: '100%', height: 3, background: 'var(--border)', borderRadius: 2 }}>
                                <div style={{ width: `${Math.min((status.streak / habit.challenge_days) * 100, 100)}%`, height: '100%', background: '#c9963a', borderRadius: 2, transition: 'width 0.3s' }} />
                              </div>
                              <div style={{ fontSize: 11, color: '#a1a1aa' }}>Racha: {Math.min(status.streak, habit.challenge_days)} / {habit.challenge_days} días</div>
                            </div>
                          )}
                        </div>

                        {/* Edit button */}
                        <button
                          onClick={() => openEdit(habit)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                            color: 'var(--text3)', fontSize: 14, lineHeight: 1, flexShrink: 0,
                            opacity: 0.5, transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                          title="Editar"
                        >
                          ✎
                        </button>

                        {/* Badge */}
                        <span className={`habit-badge ${habit.is_core ? 'badge-nucleo' : 'badge-extra'}`}>
                          {habit.is_core ? 'Núcleo' : 'Extra'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FAB for new habit */}
      <button className="fab" onClick={() => { setEditingHabit(null); setModalOpen(true) }}>+</button>

      {/* Modal */}
      <HabitFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingHabit(null) }}
        onSave={handleSave}
        editingHabit={editingHabit}
      />
    </div>
  )
}
