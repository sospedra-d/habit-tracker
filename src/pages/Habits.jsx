import { useState, useEffect, useCallback, useMemo } from 'react'
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

  // Group displayed habits by category
  const groupedHabits = useMemo(() => {
    const groups = {}
    displayedHabits.forEach(h => {
      const cat = h.category || 'Otro'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(h)
    })
    return groups
  }, [displayedHabits])

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

  // Global Stats
  const getHabitProgress = (h) => {
    const log = logsMap.get(h.id)
    const currentCount = log ? log.count : 0
    const target = h.is_counter ? h.target_count || 1 : 1
    return Math.min(currentCount / target, 1)
  }
  
  const completedCount = todaysHabits.reduce((sum, h) => sum + getHabitProgress(h), 0)
  const totalToday = todaysHabits.length
  const globalProgress = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0
  
  const displayCompleted = Number.isInteger(completedCount) ? completedCount : completedCount.toFixed(1)

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Mis Hábitos
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Hoy es <span style={{ color: 'var(--accent-primary)' }}>{todayLabel}</span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer shrink-0"
          style={{
            background: 'var(--accent-gradient)',
            boxShadow: '0 8px 25px rgba(244, 63, 94, 0.3)', // Red shadow
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Hábito
        </button>
      </div>

      {/* Global Progress Hero Board */}
      <div className="mb-10 p-6 sm:p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500" 
           style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)' }}>
        
        {/* Glow effect inside card */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none" 
             style={{ background: 'var(--accent-primary)', opacity: 0.1 }} />

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex-1">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>
              Progreso Global
            </h2>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <span className="text-5xl sm:text-6xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>
                {globalProgress}%
              </span>
              <span className="text-sm sm:text-base font-semibold mb-1 min-w-max" style={{ color: 'var(--text-secondary)' }}>
                {displayCompleted} de {totalToday} completados
              </span>
            </div>
            
            {/* Thick Red Progress Bar */}
            <div className="h-4 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${globalProgress}%`,
                  background: 'var(--accent-gradient)',
                  boxShadow: '0 0 20px var(--accent-primary)',
                }}
              />
            </div>
          </div>

          {/* Icon/Motivation */}
          <div className="hidden md:flex w-24 h-24 rounded-3xl items-center justify-center shrink-0 border"
               style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-subtle)' }}>
            {globalProgress === 100 ? (
              <svg className="w-12 h-12" style={{ color: 'var(--accent-primary)' }} fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2 mb-8 bg-black/20 p-1.5 rounded-2xl w-fit border" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => setShowAllHabits(false)}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer"
          style={{
            background: !showAllHabits ? 'var(--bg-card)' : 'transparent',
            color: !showAllHabits ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: !showAllHabits ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          Hoy ({todaysHabits.length})
        </button>
        <button
          onClick={() => setShowAllHabits(true)}
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer"
          style={{
            background: showAllHabits ? 'var(--bg-card)' : 'transparent',
            color: showAllHabits ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: showAllHabits ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          Todos ({habits.length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin w-10 h-10" style={{ color: 'var(--accent-primary)' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedHabits.length === 0 && (
        <div
          className="rounded-[2rem] border p-12 text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 border"
               style={{ background: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.1)' }}>
            <svg className="w-10 h-10" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {showAllHabits ? 'Aún no tienes hábitos' : `No hay hábitos para ${todayLabel}`}
          </h3>
          <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {showAllHabits
              ? 'Empieza creando tu primer hábito para construir una mejor rutina.'
              : 'Disfruta tu día libre o cambia al filtro "Todos" para editar tu semana.'}
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer"
            style={{ background: 'var(--accent-gradient)', boxShadow: '0 8px 25px rgba(244, 63, 94, 0.3)' }}
          >
            Crear tu primer hábito
          </button>
        </div>
      )}

      {/* Categorized Habit Lists */}
      {!loading && displayedHabits.length > 0 && (
        <div className="space-y-10">
          {Object.entries(groupedHabits).map(([categoryName, catHabits]) => {
            
            // Category Stats
            const catCompleted = catHabits.reduce((sum, h) => sum + getHabitProgress(h), 0)
            const catTotal = catHabits.length
            const catProgress = catTotal > 0 ? (catCompleted / catTotal) * 100 : 0
            const catColor = CATEGORY_COLORS[categoryName] || '#94a3b8'
            const displayCatCompleted = Number.isInteger(catCompleted) ? catCompleted : catCompleted.toFixed(1)

            return (
              <div key={categoryName} className="animate-fade-in-up">
                {/* Category Header with Mini Progress */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {categoryName}
                    </h3>
                    <span 
                      className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ background: catColor + '20', color: catColor }}
                    >
                      {displayCatCompleted}/{catTotal}
                    </span>
                  </div>
                  {/* Category Mini Progress Bar */}
                  <div className="hidden sm:block w-32 h-2 rounded-full overflow-hidden bg-black/20">
                    <div 
                      className="h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${catProgress}%`, background: catColor }} 
                    />
                  </div>
                </div>

                {/* Cards Grid for this category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catHabits.map((habit) => {
                    const log = logsMap.get(habit.id)
                    const currentCount = log ? log.count : 0
                    const target = habit.is_counter ? habit.target_count || 1 : 1
                    const isCompleted = currentCount >= target
                    
                    const isToggling = togglingId === habit.id
                    const isDeleting = deletingId === habit.id
                    const isForToday = habit.days_of_week?.includes(todayDayIndex)

                    return (
                      <div
                        key={habit.id}
                        className="group flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        style={{
                          background: isCompleted ? 'rgba(244, 63, 94, 0.03)' : 'var(--bg-card)',
                          borderColor: isCompleted ? 'rgba(244, 63, 94, 0.2)' : 'var(--border-subtle)',
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                      >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            {/* Checkbox / Counter Action */}
                            {isForToday && (
                              <div className="shrink-0 flex items-center">
                                {habit.is_counter ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2 bg-black/20 rounded-xl p-1 border" style={{ borderColor: 'var(--border-subtle)' }}>
                                      <button
                                        onClick={() => updateLog(habit, currentCount - 1)}
                                        disabled={isToggling || currentCount <= 0}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer font-bold"
                                      >
                                        -
                                      </button>
                                      <div className="min-w-[2.5rem] text-center">
                                        <span className="font-bold text-sm" style={{ color: isCompleted ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                          {currentCount}
                                        </span>
                                        <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-secondary)' }}>/{target}</span>
                                      </div>
                                      <button
                                        onClick={() => updateLog(habit, currentCount + 1)}
                                        disabled={isToggling}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-80 transition-colors disabled:opacity-30 cursor-pointer text-white font-black"
                                        style={{ background: isCompleted ? 'var(--accent-primary)' : 'rgba(244, 63, 94, 0.5)' }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => updateLog(habit, isCompleted ? 0 : 1)}
                                    disabled={isToggling}
                                    className="w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 disabled:opacity-50 shadow-inner"
                                    style={{
                                      borderColor: isCompleted ? 'var(--accent-primary)' : 'var(--border-subtle)',
                                      background: isCompleted ? 'var(--accent-gradient)' : 'rgba(0,0,0,0.2)',
                                    }}
                                  >
                                    {isToggling ? (
                                      <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                                      </svg>
                                    ) : isCompleted ? (
                                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : null}
                                  </button>
                                )}
                              </div>
                            )}

                            <div>
                              <span
                                className="font-bold text-base block transition-colors leading-tight"
                                style={{
                                  color: isCompleted ? 'var(--accent-primary)' : 'var(--text-primary)',
                                  textDecoration: isCompleted && !habit.is_counter ? 'line-through' : 'none',
                                  opacity: isCompleted && !habit.is_counter ? 0.7 : 1,
                                }}
                              >
                                {habit.name}
                              </span>
                            </div>
                          </div>

                          {/* Actions (Edit / Delete) */}
                          <div className="flex items-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => openEdit(habit)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10 cursor-pointer"
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
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 cursor-pointer"
                              style={{ color: 'var(--accent-primary)' }}
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Day Pills Footer */}
                        <div className="flex gap-1.5 mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                          {DAY_LABELS.map((label, idx) => {
                            const isActive = habit.days_of_week?.includes(idx)
                            const isTodayDay = idx === todayDayIndex
                            return (
                              <span
                                key={idx}
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black"
                                style={{
                                  background: isActive
                                    ? isTodayDay
                                      ? 'var(--accent-primary)'
                                      : 'rgba(255, 255, 255, 0.1)'
                                    : 'transparent',
                                  color: isActive
                                    ? isTodayDay
                                      ? '#ffffff'
                                      : 'var(--text-primary)'
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
                    )
                  })}
                </div>
              </div>
            )
          })}
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

