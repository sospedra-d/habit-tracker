import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

const generateDays = (count) => {
  const days = []
  const today = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

const STATIC_LAST_7_DAYS = generateDays(7)
const STATIC_LAST_90_DAYS = generateDays(90)

// ─── Focused Time Tracker (localStorage-based, local only) ───
const APP_TIME_KEY = 'habit_tracker_app_time'

function getAppTimeData() {
  try {
    const raw = localStorage.getItem(APP_TIME_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch { return {} }
}

function addAppTime(seconds) {
  const todayStr = new Date().toISOString().split('T')[0]
  const data = getAppTimeData()
  data[todayStr] = (data[todayStr] || 0) + seconds
  const keys = Object.keys(data).sort().slice(-7)
  const cleaned = {}
  keys.forEach(k => { cleaned[k] = data[k] })
  localStorage.setItem(APP_TIME_KEY, JSON.stringify(cleaned))
}

function getTodayAppTime() {
  const todayStr = new Date().toISOString().split('T')[0]
  return getAppTimeData()[todayStr] || 0
}

export default function Dashboard({ embedded = false }) {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [habits, setHabits] = useState([])
  const [completedTodos, setCompletedTodos] = useState([])
  const [todayHabitCount, setTodayHabitCount] = useState(0)
  const [todayTodoCount, setTodayTodoCount] = useState(0)
  const [appTimeSeconds, setAppTimeSeconds] = useState(getTodayAppTime())

  const last7Days = STATIC_LAST_7_DAYS
  const last90Days = STATIC_LAST_90_DAYS

  // ─── App Time Tracking ───
  const sessionStartRef = useRef(Date.now())

  useEffect(() => {
    const flushTime = () => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000)
      if (elapsed > 0) {
        addAppTime(elapsed)
        sessionStartRef.current = Date.now()
        setAppTimeSeconds(getTodayAppTime())
      }
    }

    const handleVisibility = () => {
      if (document.hidden) flushTime()
      else sessionStartRef.current = Date.now()
    }

    const handleBeforeUnload = () => flushTime()
    const interval = setInterval(() => { if (!document.hidden) flushTime() }, 30000)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      flushTime()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const oldestDateStr = last90Days[0]
      const todayStr = new Date().toISOString().split('T')[0]

      const { data: hLogs, error: hErr } = await supabase
        .from('habit_logs')
        .select('habit_id, completed_at, count')
        .gte('completed_at', oldestDateStr)
      if (hErr) throw hErr

      const { data: habitsData, error: habErr } = await supabase
        .from('habits')
        .select('id, is_core, days_of_week')
      if (habErr) throw habErr

      const { data: cTodos, error: tErr } = await supabase
        .from('todos')
        .select('id, created_at, completed_at, is_completed')
        .eq('is_completed', true)
        .gte('created_at', `${oldestDateStr}T00:00:00Z`)
      if (tErr) throw tErr

      setLogs(hLogs || [])
      setHabits(habitsData || [])
      setCompletedTodos(cTodos || [])

      // MEJORA 3: Count today's completed habits and todos
      const todayHabits = (hLogs || []).filter(l => l.completed_at === todayStr)
      setTodayHabitCount(todayHabits.length)

      const todayStart = `${todayStr}T00:00:00Z`
      const todayTodos = (cTodos || []).filter(t => {
        const ua = t.completed_at || t.created_at
        return ua >= todayStart
      })
      setTodayTodoCount(todayTodos.length)
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [last90Days])

  useEffect(() => { fetchData() }, [fetchData])

  // MEJORA 3: Enhanced weekly data with core/extra/legendary info for colored bars
  const weeklyData = useMemo(() => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const coreHabitIds = new Set(habits.filter(h => h.is_core).map(h => h.id))

    return last7Days.map((dateStr) => {
      const d = new Date(dateStr + "T00:00:00")
      const dayLabel = dayNames[d.getDay()]
      const dayLogs = logs.filter(l => l.completed_at === dateStr)
      const completados = dayLogs.length

      const coreCount = dayLogs.filter(l => coreHabitIds.has(l.habit_id)).length
      const extraCount = dayLogs.filter(l => !coreHabitIds.has(l.habit_id)).length

      const dayOfWeek = d.getDay()
      const scheduledCoreCount = habits.filter(h => h.is_core && (h.days_of_week?.includes(dayOfWeek) ?? true)).length
      const scheduledExtraCount = habits.filter(h => !h.is_core && (h.days_of_week?.includes(dayOfWeek) ?? true)).length
      const allCoreComplete = scheduledCoreCount > 0 && coreCount >= scheduledCoreCount
      const halfExtrasComplete = scheduledExtraCount > 0 && extraCount >= Math.ceil(scheduledExtraCount * 0.5)
      const isLegendary = allCoreComplete && halfExtrasComplete
      const hasExtras = extraCount > 0

      // Determine bar color
      let barColor = '#262626' // no completions
      if (completados > 0) {
        if (isLegendary) barColor = '#c9963a' // gold for 200%
        else if (hasExtras) barColor = '#3b7ef8' // blue for extras
        else barColor = '#dc2020' // red for core only
      }

      return { name: dayLabel, completados, dateStr, barColor }
    })
  }, [last7Days, logs, habits])

  // ─── Streak ───
  const currentStreak = useMemo(() => {
    let streak = 0
    for (let i = 0; i < 90; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayHabitCount = logs.filter(l => l.completed_at === dateStr).length
      const dayTodoCount = completedTodos.filter(t => t.created_at?.split('T')[0] === dateStr).length
      if (dayHabitCount + dayTodoCount >= 5) streak++
      else { if (i === 0) continue; break }
    }
    return streak
  }, [logs, completedTodos])

  // ─── Heatmap ───
  const heatmapData = useMemo(() => {
    const coreHabitIds = new Set(habits.filter(h => h.is_core).map(h => h.id))

    return last90Days.map(dateStr => {
      const dayLogs = logs.filter(l => l.completed_at === dateStr)
      const count = dayLogs.length
      const coreCompletedOnDay = dayLogs.filter(l => coreHabitIds.has(l.habit_id)).length
      const extraCompletedOnDay = dayLogs.filter(l => !coreHabitIds.has(l.habit_id)).length
      const dayOfWeek = new Date(dateStr + "T00:00:00").getDay()
      const scheduledCoreCount = habits.filter(h => h.is_core && (h.days_of_week?.includes(dayOfWeek) ?? true)).length
      const scheduledExtraCount = habits.filter(h => !h.is_core && (h.days_of_week?.includes(dayOfWeek) ?? true)).length
      const allCoreComplete = scheduledCoreCount > 0 && coreCompletedOnDay >= scheduledCoreCount
      const halfExtrasComplete = scheduledExtraCount > 0 && extraCompletedOnDay >= Math.ceil(scheduledExtraCount * 0.5)
      const hasExtras = allCoreComplete && extraCompletedOnDay > 0
      const isLegendary = allCoreComplete && halfExtrasComplete

      return { date: dateStr, count, hasExtras, isLegendary }
    })
  }, [last90Days, logs, habits])

  const getHeatColor = (day) => {
    if (day.count === 0) return { bg: 'rgba(40,40,42,0.5)', border: '1px solid rgba(60,60,64,0.5)' }
    if (day.isLegendary) return { bg: 'rgba(23,23,23,0.85)', border: '1px solid rgba(180,140,60,0.4)', legendary: true }
    if (day.hasExtras) {
      const a = Math.min(day.count * 0.2, 1)
      return { bg: `rgba(59,126,248,${a})`, border: `1px solid rgba(59,126,248,${a * 0.5})` }
    }
    const a = Math.min(day.count * 0.2, 1)
    return { bg: `rgba(220,32,32,${a})`, border: `1px solid rgba(220,32,32,${a * 0.5})` }
  }

  const totalCompletedThisWeek = weeklyData.reduce((acc, curr) => acc + curr.completados, 0)

  const appTimeHours = Math.floor(appTimeSeconds / 3600)
  const appTimeMins = Math.floor((appTimeSeconds % 3600) / 60)

  return (
    <div className={embedded ? '' : 'animate-fade-in-up'}>
      {/* Header */}
      {!embedded && (
        <div className="screen-header">
          <h1 className="screen-title">Estadísticas</h1>
          <p className="screen-sub">Tu progreso y patrones de productividad</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <svg className="animate-spin" style={{ width: 24, height: 24, color: 'var(--text3)' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
          </svg>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 3 Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div className="card">
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text1)', lineHeight: 1 }}>
                {totalCompletedThisWeek}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, letterSpacing: '0.03em' }}>
                Hábitos (7 días)
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text1)', lineHeight: 1 }}>
                {currentStreak}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, letterSpacing: '0.03em' }}>
                🔥 Racha actual{currentStreak !== 1 && ' (días)'}
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text1)', lineHeight: 1 }}>
                {appTimeHours > 0 ? `${appTimeHours}h` : ''}{appTimeMins}m
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, letterSpacing: '0.03em' }}>
                Tiempo en app
              </div>
            </div>
          </div>

          {/* MEJORA 3a: Removed pomodoro stats cards */}

          {/* Productivity Chart — full width, colored bars */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 16 }}>
              Productividad Diaria
            </div>
            <div style={{ width: '100%', minHeight: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#52525b', fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#52525b', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 12
                    }}
                    itemStyle={{ color: 'var(--text1)', fontWeight: 500 }}
                  />
                  {/* MEJORA 3b: Colored bars — red=core, blue=extras, gold=200% */}
                  <Bar dataKey="completados" name="Completados" radius={[4, 4, 4, 4]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.barColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MEJORA 3c: Today's metrics — 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="card">
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text1)', lineHeight: 1 }}>
                {todayHabitCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                ✅ Hábitos completados hoy
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text1)', lineHeight: 1 }}>
                {todayTodoCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                📋 Tareas completadas hoy
              </div>
            </div>
          </div>

          {/* Heatmap — full width */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 16 }}>
              Mapa de Calor (90 días)
            </div>

            <div style={{ overflowX: 'auto', paddingBottom: 8 }} className="custom-scrollbar">
              <div style={{
                display: 'grid',
                gridTemplateRows: 'repeat(7, 1fr)',
                gridAutoFlow: 'column',
                gap: 3,
                width: 'max-content'
              }}>
                {heatmapData.map((day) => {
                  const style = getHeatColor(day)
                  return (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count} hábitos${day.isLegendary ? ' ⭐ Legendario' : day.hasExtras ? ' (+extras)' : ''}`}
                      style={{
                        width: 16, height: 16, borderRadius: 3,
                        background: style.bg, border: style.border,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'opacity 0.2s', cursor: 'default'
                      }}
                    >
                      {style.legendary && (
                        <span style={{ fontSize: 7, lineHeight: 1, color: 'rgba(200,160,70,0.6)' }}>★</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend — centered */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginTop: 14, fontSize: 10, color: 'var(--text3)'
            }}>
              <span>Menos</span>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(40,40,42,0.5)', border: '1px solid rgba(60,60,64,0.5)' }} />
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(220,32,32,0.4)', border: '1px solid rgba(220,32,32,0.2)' }} />
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(59,126,248,0.6)', border: '1px solid rgba(59,126,248,0.3)' }} />
              <div style={{
                width: 10, height: 10, borderRadius: 2,
                background: 'rgba(23,23,23,0.85)', border: '1px solid rgba(180,140,60,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 5, color: 'rgba(200,160,70,0.6)' }}>★</span>
              </div>
              <span>Más</span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
