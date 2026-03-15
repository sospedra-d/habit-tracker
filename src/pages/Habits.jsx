import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import HabitFormModal, { DAY_LABELS, CATEGORY_COLORS } from '../components/HabitFormModal'

export default function Habits() {
  const [habits, setHabits] = useState([])
  const [logsMap, setLogsMap] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showAllHabits, setShowAllHabits] = useState(false)

  const today = new Date()
  const todayDayIndex = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const todayStr = today.toISOString().split('T')[0]

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const todayLabel = dayNames[todayDayIndex]

  // Fetch habits + today's logs
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

      setHabits(allHabits || [])
      setLogsMap(new Map((logs || []).map((l) => [l.habit_id, l])))
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter habits for today
  const todaysHabits = habits.filter((h) => h.days_of_week?.includes(todayDayIndex))
  const displayedHabits = showAllHabits ? habits : todaysHabits

  // Create or Update habit
  const handleSave = async (habitData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay usuario autenticado")

      const payload = { 
        ...habitData, 
        user_id: user.id 
      }

      if (payload.id) {
        const { error } = await supabase
          .from('habits')
          .update({
            name: payload.name,
            category: payload.category,
            days_of_week: payload.days_of_week,
            is_counter: payload.is_counter,
            target_count: payload.target_count
          })
          .eq('id', payload.id)
        if (error) throw error
      } else {
        delete payload.id;
        const { error } = await supabase
          .from('habits')
          .insert([payload])
        if (error) throw error
      }
      await fetchData()
    } catch (err) {
      console.error('Error saving habit:', err)
      alert(`Error al guardar: ${err.message || 'Intenta refrescar la página'}`)
    }
  }

  // Delete habit
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

  // Update Log (Toggle or Counter increment/decrement)
  const updateLog = async (habit, newCount) => {
    setTogglingId(habit.id)
    try {
      if (newCount <= 0) {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habit.id)
          .eq('completed_at', todayStr)
        if (error) throw error
        
        setLogsMap((prev) => {
          const next = new Map(prev)
          next.delete(habit.id)
          return next
        })
      } else {
        const { error } = await supabase
          .from('habit_logs')
          .upsert([
            { habit_id: habit.id, completed_at: todayStr, count: newCount }
          ], { onConflict: 'habit_id, completed_at' })
        if (error) throw error

        setLogsMap((prev) => {
          const next = new Map(prev)
          next.set(habit.id, { habit_id: habit.id, count: newCount })
          return next
        })
      }
    } catch (err) {
      console.error('Error updating log:', err)
    } finally {
      setTogglingId(null)
    }
  }

  // Edit
  const openEdit = (habit) => {
    setEditingHabit(habit)
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditingHabit(null)
    setModalOpen(true)
  }

  // Stats
  const completedCount = todaysHabits.filter((h) => {
    const log = logsMap.get(h.id)
    const currentCount = log ? log.count : 0
    const target = h.is_counter ? h.target_count || 1 : 1
    return currentCount >= target
  }).length
  
  const totalToday = todaysHabits.length

  return (
    <div className="animate-fade-in-up max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Mis Hábitos
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Hoy es <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{todayLabel}</span>
            {' · '}{completedCount}/{totalToday} completados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer shrink-0"
          style={{
            background: 'var(--accent-gradient)',
            boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Crear Hábito
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Hábitos Totales', value: habits.length, color: '#6c63ff' },
          { label: 'Hábitos de Hoy', value: totalToday, color: '#e94560' },
          { label: 'Completados Hoy', value: `${completedCount}/${totalToday}`, color: '#00d2ff' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowAllHabits(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background: !showAllHabits ? 'var(--accent-primary)' + '30' : 'transparent',
            color: !showAllHabits ? 'var(--accent-primary)' : 'var(--text-secondary)',
            border: `1px solid ${!showAllHabits ? 'var(--accent-primary)' + '60' : 'var(--border-subtle)'}`,
          }}
        >
          Hoy ({todaysHabits.length})
        </button>
        <button
          onClick={() => setShowAllHabits(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background: showAllHabits ? 'var(--accent-primary)' + '30' : 'transparent',
            color: showAllHabits ? 'var(--accent-primary)' : 'var(--text-secondary)',
            border: `1px solid ${showAllHabits ? 'var(--accent-primary)' + '60' : 'var(--border-subtle)'}`,
          }}
        >
          Todos ({habits.length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin w-8 h-8" style={{ color: 'var(--accent-primary)' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedHabits.length === 0 && (
        <div
          className="rounded-2xl border p-12 text-center backdrop-blur-sm"
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: 'rgba(108, 99, 255, 0.1)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {showAllHabits ? 'No tienes hábitos aún' : `No hay hábitos para ${todayLabel}`}
          </h3>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {showAllHabits
              ? 'Crea tu primer hábito para empezar a rastrear tu progreso.'
              : 'Crea un hábito que incluya este día o revisa todos tus hábitos.'}
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer"
            style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Crear Hábito
          </button>
        </div>
      )}

      {/* Habit Cards */}
      {!loading && displayedHabits.length > 0 && (
        <div className="space-y-3">
          {displayedHabits.map((habit) => {
            const log = logsMap.get(habit.id)
            const currentCount = log ? log.count : 0
            const target = habit.is_counter ? habit.target_count || 1 : 1
            const isCompleted = currentCount >= target
            
            const isToggling = togglingId === habit.id
            const isDeleting = deletingId === habit.id
            const catColor = CATEGORY_COLORS[habit.category] || '#64748b'
            const isForToday = habit.days_of_week?.includes(todayDayIndex)

            return (
              <div
                key={habit.id}
                className="group rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01]"
                style={{
                  background: isCompleted ? 'rgba(108, 99, 255, 0.08)' : 'var(--glass-bg)',
                  borderColor: isCompleted ? 'rgba(108, 99, 255, 0.3)' : 'var(--border-subtle)',
                  opacity: isDeleting ? 0.5 : 1,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Controls (Checkbox or Counter) */}
                  {isForToday && (
                    <div className="shrink-0 flex items-center justify-between sm:justify-start gap-4">
                      {habit.is_counter ? (
                        <div className="flex items-center gap-3 bg-white/5 rounded-lg p-1.5 border" style={{ borderColor: 'var(--border-subtle)' }}>
                          <button
                            onClick={() => updateLog(habit, currentCount - 1)}
                            disabled={isToggling || currentCount <= 0}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30 cursor-pointer font-bold"
                          >
                            -
                          </button>
                          <div className="flex items-baseline gap-1 min-w-[3rem] justify-center">
                            <span className="font-bold text-lg leading-none" style={{ color: isCompleted ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                              {currentCount}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>/ {target}</span>
                          </div>
                          <button
                            onClick={() => updateLog(habit, currentCount + 1)}
                            disabled={isToggling}
                            className="w-6 h-6 flex items-center justify-center rounded hover:opacity-80 transition-colors disabled:opacity-30 cursor-pointer text-white font-bold"
                            style={{ background: isCompleted ? 'var(--accent-primary)' : 'rgba(108, 99, 255, 0.5)' }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateLog(habit, isCompleted ? 0 : 1)}
                          disabled={isToggling}
                          className="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 disabled:opacity-50"
                          style={{
                            borderColor: isCompleted ? 'var(--accent-primary)' : 'var(--border-subtle)',
                            background: isCompleted ? 'var(--accent-gradient)' : 'transparent',
                          }}
                        >
                          {isToggling ? (
                            <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                            </svg>
                          ) : isCompleted ? (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-semibold text-sm truncate transition-colors"
                        style={{
                          color: isCompleted ? 'var(--accent-primary)' : 'var(--text-primary)',
                          textDecoration: isCompleted && !habit.is_counter ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.8 : 1,
                        }}
                      >
                        {habit.name}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0"
                        style={{ background: catColor + '20', color: catColor }}
                      >
                        {habit.category}
                      </span>
                    </div>

                    {/* Day pills */}
                    <div className="flex gap-1">
                      {DAY_LABELS.map((label, idx) => {
                        const isActive = habit.days_of_week?.includes(idx)
                        const isTodayDay = idx === todayDayIndex
                        return (
                          <span
                            key={idx}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                            style={{
                              background: isActive
                                ? isTodayDay
                                  ? 'var(--accent-primary)'
                                  : 'rgba(108, 99, 255, 0.2)'
                                : 'rgba(255, 255, 255, 0.03)',
                              color: isActive
                                ? isTodayDay
                                  ? '#ffffff'
                                  : 'var(--accent-primary)'
                                : 'var(--text-secondary)',
                              opacity: isActive ? 1 : 0.3,
                            }}
                          >
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 justify-end">
                    <button
                      onClick={() => openEdit(habit)}
                      className="p-2 rounded-lg transition-colors hover:bg-white/10 cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      disabled={isDeleting}
                      className="p-2 rounded-lg transition-colors hover:bg-red-500/20 cursor-pointer"
                      style={{ color: '#e94560' }}
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress Bar (bottom) */}
      {!loading && totalToday > 0 && (
        <div className="mt-6 rounded-xl border p-4" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Progreso de hoy</span>
            <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
              {totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${totalToday > 0 ? (completedCount / totalToday) * 100 : 0}%`,
                background: 'var(--accent-gradient)',
                boxShadow: '0 0 10px rgba(108, 99, 255, 0.4)',
              }}
            />
          </div>
        </div>
      )}

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

