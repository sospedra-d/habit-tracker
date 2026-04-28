import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { getChallengeStatus } from '../utils/challenge'

// Frases motivacionales
const phrases = {
  "0-2": ["Vamos, empieza el día", "Un pequeño paso es un gran comienzo", "Cada acción cuenta"],
  "3-5": ["Buen comienzo, sigue así", "Ya vamos sumando", "Tus hábitos van tomando fuerza"],
  "6-8": ["¡Día productivo!", "Estás en la zona", "Cada acción cuenta"],
  "9-11": ["¡Estás en racha!", "Imparable hoy", "¡Sigue así, casi en la cima!"],
  "12-14": ["¡Día Épico!", "Nivel de productividad alto", "Hoy estás on fire"],
  "15+": ["¡Día Legendario! 🏆", "Has dominado el día"]
}

function getDailyMessage(total) {
  if (total <= 2) return phrases["0-2"][Math.floor(Math.random() * phrases["0-2"].length)]
  if (total <= 5) return phrases["3-5"][Math.floor(Math.random() * phrases["3-5"].length)]
  if (total <= 8) return phrases["6-8"][Math.floor(Math.random() * phrases["6-8"].length)]
  if (total <= 11) return phrases["9-11"][Math.floor(Math.random() * phrases["9-11"].length)]
  if (total <= 14) return phrases["12-14"][Math.floor(Math.random() * phrases["12-14"].length)]
  return phrases["15+"][Math.floor(Math.random() * phrases["15+"].length)]
}

export default function Today() {
  const [loading, setLoading] = useState(true)
  const [todos, setTodos] = useState([])
  const [completedTodosCount, setCompletedTodosCount] = useState(0)
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [challengeLogs, setChallengeLogs] = useState([])
  const [fadingHabits, setFadingHabits] = useState(new Set())
  const [hiddenHabits, setHiddenHabits] = useState(new Set())
  const [celebratingIds, setCelebratingIds] = useState(new Set())
  const [completingChallengeIds, setCompletingChallengeIds] = useState(new Set())
  const [allCoreCelebration, setAllCoreCelebration] = useState(false)
  const [legendaryCelebration, setLegendaryCelebration] = useState(false)
  const [energySelector, setEnergySelector] = useState(null)
  const [focusIndex, setFocusIndex] = useState(0)
  const [poppingCheckId, setPoppingCheckId] = useState(null)
  const prevCoreCompleteRef = useRef(false)
  const prevLegendaryRef = useRef(false)
  const prevProdRef = useRef(null)
  const [prodFlip, setProdFlip] = useState(false)

  const navigate = useNavigate()

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const dayOfWeekIndex = new Date(todayStr + "T00:00:00").getDay()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // BUG 1 FIX: fetch ALL non-completed todos without extra filters
      const { data: tData, error: tErr } = await supabase
        .from('todos')
        .select('*')
        .eq('is_completed', false)
      if (tErr) console.error('Todos fetch error:', tErr)
      console.log('[Today] Fetched pending todos:', tData?.length, tData)
      setTodos(tData || [])

      const todayStart = `${todayStr}T00:00:00Z`
      const { count } = await supabase
        .from('todos')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', true)
        .gte('completed_at', todayStart)
      setCompletedTodosCount(count || 0)

      const { data: hData } = await supabase.from('habits').select('*')
      setHabits(hData || [])

      const { data: hlData } = await supabase.from('habit_logs').select('*').eq('completed_at', todayStr)
      setHabitLogs(hlData || [])

      const activeChallengeHabits = (hData || []).filter(h => h.challenge_active)
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
      }
      setChallengeLogs(allChallengeLogs)

      // Auto-deactivation (24h expired) and auto-completion
      const deactivateIds = []
      const completedChallenges = []

      activeChallengeHabits.forEach(h => {
        const status = getChallengeStatus(h, allChallengeLogs, todayStr)
        if (status.needsDeactivation) {
          deactivateIds.push(h.id)
        } else if (status.isCompleted) {
          completedChallenges.push(h)
        }
      })

      if (deactivateIds.length > 0) {
        await supabase.from('habits').update({ challenge_active: false, challenge_started_at: null }).in('id', deactivateIds)
        setHabits(prev => prev.map(h => deactivateIds.includes(h.id) ? { ...h, challenge_active: false, challenge_started_at: null } : h))
      }

      if (completedChallenges.length > 0 && user) {
        for (const h of completedChallenges) {
          await supabase.from('habits').update({ challenge_active: false, challenge_started_at: null }).eq('id', h.id)
          await supabase.from('achievements').insert([{
            user_id: user.id,
            type: 'habit_challenge',
            name: h.name,
            achieved_at: new Date().toISOString()
          }])
        }
        setHabits(prev => prev.map(h => completedChallenges.some(c => c.id === h.id) ? { ...h, challenge_active: false, challenge_started_at: null } : h))
      }

      // BUG 2 FIX: Only auto-delete completed tasks older than 24h, NOT by due_date
      // (the old logic deleted by due_date which was too aggressive)
    } catch (err) {
      console.error('Error fetching today data:', err)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => { fetchData() }, [fetchData])

  // --- TODOS: Urgent tasks (≤3 days or overdue) ---
  const hacerAhora = useMemo(() => {
    const today = new Date(todayStr + "T00:00:00")
    const urgentDate = new Date(today)
    urgentDate.setDate(today.getDate() + 3)
    return [...todos]
      .filter(t => t.due_date && new Date(t.due_date + "T00:00:00") <= urgentDate)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  }, [todos, todayStr])

  // --- BUG 3 FIX: energy → energy_level mapping ---
  const focusPool = useMemo(() => {
    // Priority 1: critical tasks (≤3d/overdue)
    const criticalPending = hacerAhora.filter(t => !t.is_completed)
    if (criticalPending.length > 0) return { tasks: criticalPending, type: 'critica' }

    // Priority 2: filter by selected energy — maps to energy_level field
    if (energySelector) {
      const energyTasks = todos.filter(t => {
        if (t.is_completed) return false
        const level = t.energy_level || 'low'
        if (energySelector === 'high') return level === 'high'
        if (energySelector === 'medium') return level === 'medium'
        // low = low priority + inbox (no date)
        return level === 'low'
      })
      if (energyTasks.length > 0) return { tasks: energyTasks, type: 'energia' }
    }

    // Priority 3: any pending task
    const allPending = todos.filter(t => !t.is_completed)
    if (allPending.length > 0) return { tasks: allPending, type: 'pendiente' }

    return { tasks: [], type: 'none' }
  }, [hacerAhora, todos, energySelector])

  const currentFocusTask = focusPool.tasks.length > 0
    ? focusPool.tasks[focusIndex % focusPool.tasks.length]
    : null

  const cycleFocus = () => {
    if (focusPool.tasks.length > 1) {
      setFocusIndex(prev => (prev + 1) % focusPool.tasks.length)
    }
  }

  // Reset focusIndex when energy changes
  useEffect(() => { setFocusIndex(0) }, [energySelector])

  const completeTodo = async (id) => {
    try {
      // BUG 2 FIX: set completed_at so ✓ Hoy tab can track 24h window
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) { alert("Error: " + error.message); return }
      setCelebratingIds(prev => new Set([...prev, `todo-${id}`]))
      setTimeout(() => {
        setCelebratingIds(prev => { const n = new Set(prev); n.delete(`todo-${id}`); return n })
        setTodos(prev => prev.filter(t => t.id !== id))
        setCompletedTodosCount(prev => prev + 1)
        setFocusIndex(0)
      }, 500)
    } catch (err) { console.error(err) }
  }

  // --- HABITS logic ---
  const handleChallengeCompletion = async (habit) => {
    try {
      setCompletingChallengeIds(prev => new Set([...prev, habit.id]))
      const { error } = await supabase.from('habits').update({ challenge_active: false, challenge_started_at: null }).eq('id', habit.id)
      if (error) console.error(error)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('achievements').insert([{
          user_id: user.id,
          type: 'habit_challenge',
          name: habit.name,
          achieved_at: new Date().toISOString()
        }])
      }
    } catch(err) { console.error(err) }
  }

  const todaysHabits = useMemo(() => {
    return habits.filter(h => {
      if (!h.days_of_week) return true
      if (Array.isArray(h.days_of_week) && h.days_of_week.length === 0) return true
      return h.days_of_week.includes(dayOfWeekIndex)
    })
  }, [habits, dayOfWeekIndex])

  const getHabitProgress = (h) => {
    const log = habitLogs.find(l => l.habit_id === h.id)
    const currentCount = log ? log.count : 0
    const target = h.is_counter ? h.target_count || 1 : 1
    return { current: currentCount, target, progress: Math.min(currentCount / target, 1) }
  }

  const toggleHabit = async (habit) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert("Necesitas iniciar sesión"); return }

      const { current, target, progress } = getHabitProgress(habit)
      const isCompleted = progress >= 1
      const willComplete = !isCompleted

      // Check pop animation
      if (willComplete) {
        setPoppingCheckId(habit.id)
        setTimeout(() => setPoppingCheckId(null), 200)
      }

      // --- DESHACER ---
      if (isCompleted && !habit.is_counter) {
        await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('completed_at', todayStr)
        // Refetch completo para recalcular racha desde BD
        await fetchData()
        return
      }

      if (habit.is_counter && isCompleted) {
        // Undo counter habit
        await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('completed_at', todayStr)
        setHabitLogs(prev => prev.filter(l => l.habit_id !== habit.id))
        setChallengeLogs(prev => prev.filter(l => l.habit_id !== habit.id || l.completed_at !== todayStr))
        return
      }

      // --- COMPLETAR ---
      // Detectar estado fallo para reiniciar reto
      let didRestartChallenge = false
      if (habit.challenge_active) {
        const status = getChallengeStatus(habit, challengeLogs, todayStr)
        if (status.isInFailureState) {
          // Reiniciar reto: challenge_started_at = now()
          await supabase.from('habits').update({ challenge_started_at: new Date().toISOString() }).eq('id', habit.id)
          didRestartChallenge = true
        }
      }

      const checkChallenge = () => {
        if (habit.challenge_active && !didRestartChallenge) {
          const status = getChallengeStatus(habit, challengeLogs, todayStr)
          const newStreak = status.streak + 1
          if (newStreak >= habit.challenge_days) {
            handleChallengeCompletion(habit)
            return true
          }
        }
        return false
      }

      if (!habit.is_counter) {
        const { data } = await supabase.from('habit_logs')
          .upsert([{ habit_id: habit.id, count: 1, completed_at: todayStr }], { onConflict: 'habit_id, completed_at' }).select()
        if (data) {
          setHabitLogs(prev => [...prev.filter(l => l.habit_id !== habit.id), data[0]])
          setChallengeLogs(prev => [...prev.filter(l => l.habit_id !== habit.id || l.completed_at !== todayStr), data[0]])
        }
      } else {
        const nextCount = current + 1
        const willCompleteCounter = nextCount >= target
        const { data } = await supabase.from('habit_logs')
          .upsert([{ habit_id: habit.id, count: nextCount, completed_at: todayStr }], { onConflict: 'habit_id, completed_at' }).select()
        if (data) {
          setHabitLogs(prev => [...prev.filter(l => l.habit_id !== habit.id), data[0]])
          setChallengeLogs(prev => [...prev.filter(l => l.habit_id !== habit.id || l.completed_at !== todayStr), data[0]])
        }
        if (willCompleteCounter) {
          const completedChallenge = checkChallenge()
          setCelebratingIds(prev => new Set([...prev, habit.id]))
          setTimeout(() => setCelebratingIds(prev => { const n = new Set(prev); n.delete(habit.id); return n }), 700)
          setFadingHabits(prev => new Set([...prev, habit.id]))
          setTimeout(() => {
            setFadingHabits(prev => { const n = new Set(prev); n.delete(habit.id); return n })
            setHiddenHabits(prev => new Set([...prev, habit.id]))
          }, completedChallenge ? 1200 : 250)
          return
        }
      }

      if (willComplete) {
        const completedChallenge = checkChallenge()
        setCelebratingIds(prev => new Set([...prev, habit.id]))
        setTimeout(() => setCelebratingIds(prev => { const n = new Set(prev); n.delete(habit.id); return n }), 700)
        setFadingHabits(prev => new Set([...prev, habit.id]))
        setTimeout(() => {
          setFadingHabits(prev => { const n = new Set(prev); n.delete(habit.id); return n })
          setHiddenHabits(prev => new Set([...prev, habit.id]))
        }, completedChallenge ? 1200 : 250)
      }
    } catch (err) { console.error('Error toggling habit:', err) }
  }

  // --- GAMIFIED METRICS ---
  const { coreTotal, coreCompleted, corePctReal, extrasTotal, extrasCompleted, extrasPctReal } = useMemo(() => {
    let ct = 0, cc = 0, ccPartial = 0, et = 0, ec = 0, ecPartial = 0
    todaysHabits.forEach(h => {
      const { progress } = getHabitProgress(h)
      const isCompleted = progress >= 1
      if (h.is_core) {
        ct++; ccPartial += progress; if (isCompleted) cc++
      } else {
        et++; ecPartial += progress; if (isCompleted) ec++
      }
    })
    return {
      coreTotal: ct, coreCompleted: cc, corePctReal: ct === 0 ? 0 : Math.round((ccPartial / ct) * 100),
      extrasTotal: et, extrasCompleted: ec, extrasPctReal: et === 0 ? 0 : Math.round((ecPartial / et) * 100),
    }
  }, [todaysHabits, habitLogs])

  const coreComplete = corePctReal >= 100 && coreTotal > 0
  const barCorePct = Math.min(corePctReal, 100)
  const barExtrasPct = (coreComplete && extrasCompleted > 0) ? Math.min(extrasPctReal, 100) : 0
  const displayPct = coreComplete ? 100 + barExtrasPct : barCorePct
  const isLegendary = displayPct >= 200

  const totalProductivity = coreCompleted + extrasCompleted + completedTodosCount

  // Celebrations
  useEffect(() => {
    if (coreComplete && !prevCoreCompleteRef.current && coreTotal > 0) {
      setAllCoreCelebration(true)
      setTimeout(() => setAllCoreCelebration(false), 1500)
    }
    prevCoreCompleteRef.current = coreComplete
  }, [coreComplete, coreTotal])

  useEffect(() => {
    if (isLegendary && !prevLegendaryRef.current) {
      setLegendaryCelebration(true)
      setTimeout(() => setLegendaryCelebration(false), 2000)
    }
    prevLegendaryRef.current = isLegendary
  }, [isLegendary])

  // Habits grouped for display — MEJORA 2: filter out completed habits permanently unless undone
  const habitsByType = useMemo(() => {
    const visible = todaysHabits.filter(h => {
      // If locally hidden (fade finished), don't show
      if (hiddenHabits.has(h.id)) return false
      // Let it remain visible if fading/celebrating (so animation finishes before disappearing)
      if (fadingHabits.has(h.id) || celebratingIds.has(h.id)) return true
      
      // Permanently hide if it is already logged as completed today
      const log = habitLogs.find(l => l.habit_id === h.id)
      const isCompleted = log && (!h.is_counter || log.count >= (h.target_count || 1))
      if (isCompleted) return false

      return true
    })
    const core = visible.filter(h => h.is_core)
    const extra = visible.filter(h => !h.is_core)
    return { core, extra }
  }, [todaysHabits, habitLogs, hiddenHabits, fadingHabits, celebratingIds])

  // Helper for focus card date text
  const getDaysLeftText = (dateStr) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const due = new Date(dateStr + "T00:00:00")
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `Venció hace ${Math.abs(diff)} días`
    if (diff === 0) return 'Vence hoy'
    return `Vence en ${diff} días`
  }

  const focusTypeLabel = {
    critica: '🔥 Crítica',
    energia: energySelector === 'high' ? '🔥 Alta energía' : energySelector === 'medium' ? '⚡ Media energía' : '🌿 Baja energía',
    pendiente: '📋 Siguiente tarea',
    none: ''
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="screen-header">
        <h1 className="screen-title">Mi Día</h1>
        <p className="screen-sub">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <svg className="animate-spin" style={{ width: 24, height: 24, color: 'var(--text3)' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
          </svg>
        </div>
      ) : (
        <>
          {/* Energy Selector */}
          <div className="energy-row">
            {[
              { key: 'low', icon: '🌿', label: 'Baja' },
              { key: 'medium', icon: '⚡', label: 'Media' },
              { key: 'high', icon: '🔥', label: 'Alta' }
            ].map(e => (
              <div
                key={e.key}
                className={`energy-btn ${energySelector === e.key ? 'active' : ''}`}
                onClick={() => setEnergySelector(energySelector === e.key ? null : e.key)}
              >
                <span className="energy-icon">{e.icon}</span>
                <span className="energy-txt">{e.label}</span>
              </div>
            ))}
          </div>

          {/* Overdrive + Productivity — 2 col grid */}
          <div className="two-col">
            {/* Overdrive Card */}
            <div
              className={`card ${legendaryCelebration ? 'animate-legendary-complete' : allCoreCelebration ? 'animate-all-core-complete' : ''}`}
              style={isLegendary ? { borderColor: 'rgba(59,126,248,0.2)' } : {}}
            >
              <div className="od-pct" style={isLegendary ? {
                background: 'linear-gradient(135deg, var(--red), #8b5cf6, var(--blue))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              } : {}}>
                {displayPct}%
              </div>
              <div className="od-sub">{coreCompleted}/{coreTotal} Núcleo · {extrasCompleted}/{extrasTotal} Extra</div>
              <div className="od-bar-track">
                <div className="od-bar-fill" style={{ width: `${barCorePct}%`, background: 'var(--red)' }} />
                {coreComplete && barExtrasPct > 0 && (
                  <div className="od-bar-fill" style={{
                    width: `${barExtrasPct}%`,
                    background: 'linear-gradient(90deg, transparent 0%, var(--blue) 100%)',
                    borderRadius: '0 3px 3px 0'
                  }} />
                )}
              </div>
              <div className="od-tags">
                <span className="habit-badge badge-nucleo">Núcleo</span>
                <span className="habit-badge badge-extra">Extra</span>
                {isLegendary && <span className="habit-badge" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>⭐</span>}
              </div>
            </div>

            {/* Productivity Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div key={totalProductivity} className={`prod-num anim-flip-in`} style={{ overflow:'hidden' }}>{totalProductivity}</div>
              <div className="prod-phrase">"{getDailyMessage(totalProductivity)}"</div>
            </div>
          </div>

          {/* Focus Card — ALWAYS VISIBLE */}
          <div style={{ marginBottom: 24 }}>
            <div className="section-label">Tu foco ahora</div>
            {currentFocusTask ? (
              <div className="task-focus" style={{ position: 'relative' }}>
                <div className="focus-label">{focusTypeLabel[focusPool.type]}</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Checkbox to complete */}
                  <div
                    className="task-sq"
                    onClick={() => completeTodo(currentFocusTask.id)}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  >
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="focus-title">{currentFocusTask.title}</div>
                    {/* BUG 3 FIX: removed priority label, only show date info */}
                    <div className="focus-meta">
                      {currentFocusTask.due_date && getDaysLeftText(currentFocusTask.due_date)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <button className="focus-btn" onClick={() => navigate('/pomodoro')}>
                    Enfocar con Pomodoro
                  </button>
                  {/* Cycle button */}
                  {focusPool.tasks.length > 1 && (
                    <button
                      onClick={cycleFocus}
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        color: 'var(--text2)', cursor: 'pointer', fontSize: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', flexShrink: 0
                      }}
                      title="Siguiente tarea"
                    >⟳</button>
                  )}
                </div>
                {/* Pool indicator */}
                {focusPool.tasks.length > 1 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                    {(focusIndex % focusPool.tasks.length) + 1} de {focusPool.tasks.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="task-focus" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ fontSize: 14, color: 'var(--text3)' }}>🎯 Sin tareas pendientes</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>¡Buen trabajo!</div>
              </div>
            )}
          </div>

          {/* Habits of the day — MEJORA 2: completed habits hidden with fade-out */}
          <div className="habit-list">
            <div className="section-label">Hábitos de hoy</div>

            {todaysHabits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 14 }}>
                No hay hábitos programados para hoy.
              </div>
            ) : (
              <>
                {/* Core habits */}
                {habitsByType.core.length > 0 && (
                  <>
                    <div className="habit-group-label">
                      <div className="habit-group-dot" style={{ background: 'var(--red)' }} />
                      Núcleo
                    </div>
                    {habitsByType.core.map(h => {
                      const { current, target, progress } = getHabitProgress(h)
                      const isCompleted = progress >= 1
                      const isFading = fadingHabits.has(h.id)
                      const isCelebrating = celebratingIds.has(h.id)
                      const isChallengeDone = completingChallengeIds.has(h.id)
                      const status = getChallengeStatus(h, challengeLogs, todayStr)
                      const streak = status.streak
                      
                      return (
                        <div
                          key={h.id}
                          className={`habit-row ${isFading ? 'animate-habit-hide' : ''} ${isCelebrating ? 'animate-habit-complete' : ''}`}
                        >
                          <div
                            className={`habit-check ${isCompleted ? (isChallengeDone ? 'done-gold' : 'done') : ''} ${poppingCheckId === h.id ? 'anim-habit-check-pop' : ''}`}
                            onClick={() => toggleHabit(h)}
                            style={isChallengeDone ? { backgroundColor: '#c9963a', borderColor: '#c9963a' } : {}}
                          >
                            {isCompleted && <span style={{ fontSize: 10, color: 'white' }}>✓</span>}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
                            <span className={`habit-name ${isCompleted ? 'completed' : ''}`} style={{ flex: 'none' }}>
                              {h.name}
                              {status.showRedX && (
                                <span style={{ color: '#dc2020', marginLeft: 6, fontWeight: 'bold', fontSize: 15 }} title="Racha rota — completa hoy para reiniciar">✕</span>
                              )}
                              {h.is_counter && (
                                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>
                                  {current}/{target}
                                </span>
                              )}
                            </span>
                            
                            {/* Barra dorada + medalla: solo ESTADO NORMAL (sin X, sin completado) */}
                            {(h.challenge_active && status.isActive && !status.showRedX && !isChallengeDone) && (
                              <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 12 }}>🏅</span>
                                  <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2 }}>
                                    <div style={{ width: `${Math.min((streak / h.challenge_days) * 100, 100)}%`, height: '100%', background: '#c9963a', borderRadius: 2, transition: 'width 0.3s' }} />
                                  </div>
                                </div>
                                <div style={{ fontSize: 11, color: '#a1a1aa' }}>Racha: {Math.min(streak, h.challenge_days)} / {h.challenge_days} días</div>
                              </div>
                            )}
                            {isChallengeDone && (
                              <div style={{ marginTop: 2, fontSize: 11, color: '#c9963a', fontWeight: 'bold' }}>
                                ✨ ¡Reto completado! 
                              </div>
                            )}
                          </div>
                          
                          <span className="habit-badge badge-nucleo">Núcleo</span>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Extra habits */}
                {habitsByType.extra.length > 0 && (
                  <>
                    <div className="habit-group-label" style={{ marginTop: 14 }}>
                      <div className="habit-group-dot" style={{ background: 'var(--blue)' }} />
                      Extra
                    </div>
                    {habitsByType.extra.map(h => {
                      const { current, target, progress } = getHabitProgress(h)
                      const isCompleted = progress >= 1
                      const isFading = fadingHabits.has(h.id)
                      const isCelebrating = celebratingIds.has(h.id)
                      const isChallengeDone = completingChallengeIds.has(h.id)
                      const status = getChallengeStatus(h, challengeLogs, todayStr)
                      const streak = status.streak
                      
                      return (
                        <div
                          key={h.id}
                          className={`habit-row ${isFading ? 'animate-habit-hide' : ''} ${isCelebrating ? 'animate-habit-complete' : ''}`}
                        >
                          <div
                            className={`habit-check ${isCompleted ? (isChallengeDone ? 'done-gold' : 'done-blue') : ''} ${poppingCheckId === h.id ? 'anim-habit-check-pop' : ''}`}
                            onClick={() => toggleHabit(h)}
                            style={isChallengeDone ? { backgroundColor: '#c9963a', borderColor: '#c9963a' } : {}}
                          >
                            {isCompleted && <span style={{ fontSize: 10, color: 'white' }}>✓</span>}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
                            <span className={`habit-name ${isCompleted ? 'completed' : ''}`} style={{ flex: 'none' }}>
                              {h.name}
                              {status.showRedX && (
                                <span style={{ color: '#dc2020', marginLeft: 6, fontWeight: 'bold', fontSize: 15 }} title="Racha rota — completa hoy para reiniciar">✕</span>
                              )}
                              {h.is_counter && (
                                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>
                                  {current}/{target}
                                </span>
                              )}
                            </span>
                            
                            {/* Barra dorada + medalla: solo ESTADO NORMAL (sin X, sin completado) */}
                            {(h.challenge_active && status.isActive && !status.showRedX && !isChallengeDone) && (
                              <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 12 }}>🏅</span>
                                  <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2 }}>
                                    <div style={{ width: `${Math.min((streak / h.challenge_days) * 100, 100)}%`, height: '100%', background: '#c9963a', borderRadius: 2, transition: 'width 0.3s' }} />
                                  </div>
                                </div>
                                <div style={{ fontSize: 11, color: '#a1a1aa' }}>Racha: {Math.min(streak, h.challenge_days)} / {h.challenge_days} días</div>
                              </div>
                            )}
                            {isChallengeDone && (
                              <div style={{ marginTop: 2, fontSize: 11, color: '#c9963a', fontWeight: 'bold' }}>
                                ✨ ¡Reto completado! 
                              </div>
                            )}
                          </div>
                          
                          <span className="habit-badge badge-extra">Extra</span>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Show count of hidden completed habits */}
                {hiddenHabits.size > 0 && (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text3)', fontSize: 12, opacity: 0.7 }}>
                    ✓ {hiddenHabits.size} hábito{hiddenHabits.size > 1 ? 's' : ''} completado{hiddenHabits.size > 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
