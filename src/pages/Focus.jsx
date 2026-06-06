import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { toDateStr } from '../utils/challenge'
import useToday from '../hooks/useToday'

const GOAL_OPTIONS = [1, 2, 3, 4, 5]
const AUTO_SAVE_TIMEOUT = 30 * 60 * 1000 // 30 minutes in ms

function fmtDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function Focus() {
  // Timer state
  const [elapsed, setElapsed] = useState(0) // seconds accumulated
  const [isRunning, setIsRunning] = useState(false)
  const [sessionStartedAt, setSessionStartedAt] = useState(null)
  const sessionStartedAtRef = useRef(null) // mirror of sessionStartedAt, always current
  const timerRef = useRef(null)
  const lastStopRef = useRef(null) // timestamp of last stop

  // Keep the ref in sync so saveSession never reads a stale closure value
  useEffect(() => { sessionStartedAtRef.current = sessionStartedAt }, [sessionStartedAt])

  // Goal
  const [goalHours, setGoalHours] = useState(() => {
    try {
      const stored = localStorage.getItem('focus_goal_hours')
      return stored ? parseInt(stored, 10) : 2
    } catch { return 2 }
  })
  const [showGoalPicker, setShowGoalPicker] = useState(false)

  // Confirm reset
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Stats
  const [todaySeconds, setTodaySeconds] = useState(0)
  const [weekSeconds, setWeekSeconds] = useState(0)
  const [dayStreak, setDayStreak] = useState(0)

  // BUG 3 FIX: hoy local que avanza al pasar la medianoche (antes congelado con useMemo [])
  const todayStr = useToday()

  // --- Fetch stats from Supabase ---
  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Today
      const { data: todayData } = await supabase
        .from('focus_sessions')
        .select('duration_seconds')
        .eq('date', todayStr)
      const todayTotal = (todayData || []).reduce((acc, s) => acc + s.duration_seconds, 0)
      setTodaySeconds(todayTotal)

      // This week (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      const weekAgoStr = toDateStr(weekAgo)
      const { data: weekData } = await supabase
        .from('focus_sessions')
        .select('duration_seconds')
        .gte('date', weekAgoStr)
      const weekTotal = (weekData || []).reduce((acc, s) => acc + s.duration_seconds, 0)
      setWeekSeconds(weekTotal)

      // Streak — consecutive days with at least one session
      const { data: allSessions } = await supabase
        .from('focus_sessions')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(365)

      if (!allSessions || allSessions.length === 0) {
        setDayStreak(0)
        return
      }

      const uniqueDates = [...new Set(allSessions.map(s => s.date))].sort((a, b) => b.localeCompare(a))
      let streak = 0
      const today = new Date(todayStr + 'T00:00:00')

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() - i)
        const checkStr = toDateStr(checkDate)
        if (uniqueDates.includes(checkStr)) {
          streak++
        } else {
          // BUG 5.5 — "today" is a grace day: the day isn't over, so a missing
          // session today does NOT break the streak (we keep counting from
          // yesterday). Completing a session today then adds today on top, so the
          // displayed number goes e.g. 2 → 3. Any earlier gap (i > 0) ends it.
          if (i === 0) continue
          break
        }
      }
      setDayStreak(streak)
    } catch (err) {
      console.error('Error fetching focus stats:', err)
    }
  }, [todayStr])

  useEffect(() => { fetchStats() }, [fetchStats])

  // --- Save session to Supabase ---
  const saveSession = useCallback(async (durationSec) => {
    if (durationSec < 10) return // Don't save trivial sessions (< 10s)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // BUG 5.4 FIX: read the start time from a ref (not a stale closure capture)
      // and fall back to "now" computed at invocation time
      await supabase.from('focus_sessions').insert([{
        user_id: user.id,
        started_at: sessionStartedAtRef.current || new Date().toISOString(),
        duration_seconds: durationSec,
        date: todayStr
      }])

      await fetchStats()
    } catch (err) {
      console.error('Error saving focus session:', err)
    }
  }, [todayStr, fetchStats])

  // --- Auto-save check: if stopped for 30+ min, save and reset ---
  useEffect(() => {
    if (isRunning || elapsed === 0) return

    const checkAutoSave = setInterval(() => {
      if (lastStopRef.current && Date.now() - lastStopRef.current >= AUTO_SAVE_TIMEOUT) {
        // Auto-save the session
        saveSession(elapsed)
        setElapsed(0)
        setSessionStartedAt(null)
        lastStopRef.current = null
        clearInterval(checkAutoSave)
      }
    }, 10000) // check every 10s

    return () => clearInterval(checkAutoSave)
  }, [isRunning, elapsed, saveSession])

  // --- Timer logic ---
  const startTimer = useCallback(() => {
    if (!sessionStartedAt) {
      setSessionStartedAt(new Date().toISOString())
    }
    lastStopRef.current = null
    setIsRunning(true)
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
  }, [sessionStartedAt])

  const stopTimer = useCallback(() => {
    setIsRunning(false)
    clearInterval(timerRef.current)
    lastStopRef.current = Date.now()
  }, [])

  const resetTimer = useCallback(async () => {
    clearInterval(timerRef.current)
    setIsRunning(false)

    if (elapsed > 0) {
      await saveSession(elapsed)
    }

    setElapsed(0)
    setSessionStartedAt(null)
    lastStopRef.current = null
    setShowResetConfirm(false)
  }, [elapsed, saveSession])

  // Cleanup
  useEffect(() => () => clearInterval(timerRef.current), [])

  // --- Format display ---
  const displayTime = useMemo(() => {
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    const s = elapsed % 60
    const mm = String(m).padStart(2, '0')
    const ss = String(s).padStart(2, '0')
    if (h > 0) return `${h}:${mm}:${ss}`
    return `${mm}:${ss}`
  }, [elapsed])

  // --- Progress ring ---
  const goalSeconds = goalHours * 3600
  const totalActiveToday = todaySeconds + elapsed
  const progressPct = Math.min(totalActiveToday / goalSeconds, 1)
  const isGoalReached = totalActiveToday >= goalSeconds

  const circleSize = 260
  const strokeWidth = 3
  const circleR = (circleSize / 2) - strokeWidth - 2
  const circumference = 2 * Math.PI * circleR

  // --- Goal selector ---
  const handleGoalChange = (hours) => {
    setGoalHours(hours)
    try { localStorage.setItem('focus_goal_hours', String(hours)) } catch {}
    setShowGoalPicker(false)
  }

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>

      {/* Header */}
      <div className="screen-header" style={{ width: '100%' }}>
        <h1 className="screen-title">Focus</h1>
      </div>

      {/* Goal line */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 28, position: 'relative'
      }}>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          Meta: {goalHours}h
        </span>
        <button
          onClick={() => setShowGoalPicker(!showGoalPicker)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#a1a1aa', fontSize: 13, padding: '2px 4px',
            lineHeight: 1, display: 'flex', alignItems: 'center'
          }}
          title="Cambiar meta"
        >
          ✎
        </button>

        {/* Goal picker dropdown */}
        {showGoalPicker && (
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: 6, background: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: 6, display: 'flex', gap: 4, zIndex: 10
          }}>
            {GOAL_OPTIONS.map(h => (
              <button
                key={h}
                onClick={() => handleGoalChange(h)}
                style={{
                  width: 40, height: 36, borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: h === goalHours ? '#dc2020' : 'rgba(255,255,255,0.06)',
                  color: h === goalHours ? '#fff' : '#a1a1aa',
                  transition: 'all 0.2s'
                }}
              >
                {h}h
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timer Circle with progress ring */}
      <div style={{
        position: 'relative', width: circleSize, height: circleSize,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32
      }}>
        {/* SVG Progress Ring */}
        <svg
          style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)', pointerEvents: 'none' }}
          viewBox={`0 0 ${circleSize} ${circleSize}`}
        >
          {/* Background ring */}
          <circle
            cx={circleSize / 2} cy={circleSize / 2} r={circleR}
            fill="transparent"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={circleSize / 2} cy={circleSize / 2} r={circleR}
            fill="transparent"
            stroke={isGoalReached ? '#c9963a' : '#dc2020'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progressPct)}
            style={{ transition: isGoalReached ? 'stroke 0.6s ease, stroke-dashoffset 1s linear' : 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        {/* Time display */}
        <span style={{
          fontSize: elapsed >= 3600 ? 48 : 56,
          fontWeight: 700, letterSpacing: '-0.05em',
          color: 'var(--text1)', lineHeight: 1, position: 'relative',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {displayTime}
        </span>
        <span style={{
          fontSize: 11, letterSpacing: '0.1em', color: 'var(--text2)',
          textTransform: 'uppercase', marginTop: 6, position: 'relative'
        }}>
          {isRunning ? 'En foco' : elapsed > 0 ? 'Pausado' : 'Listo'}
        </span>
      </div>

      {/* Play/Stop button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={isRunning ? stopTimer : startTimer}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: isRunning ? 'var(--surface3)' : '#dc2020',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0
          }}
        >
          {isRunning ? (
            /* Pause icon */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--text1)">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            /* Play icon */
            <div style={{
              width: 0, height: 0,
              borderStyle: 'solid', borderWidth: '11px 0 11px 18px',
              borderColor: 'transparent transparent transparent white',
              marginLeft: 3
            }} />
          )}
        </button>

        {/* Reset button — only visible when paused or stopped with time */}
        {!isRunning && elapsed > 0 && (
          <>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#52525b', padding: '4px 8px',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, transition: 'color 0.2s'
                }}
                title="Terminar sesión"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                </svg>
                Terminar
              </button>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'fadeInUp 0.2s ease'
              }}>
                <span style={{ fontSize: 12, color: '#a1a1aa' }}>¿Guardar y reiniciar?</span>
                <button
                  onClick={resetTimer}
                  style={{
                    background: '#dc2020', border: 'none', borderRadius: 8,
                    color: 'white', fontSize: 12, padding: '5px 12px',
                    cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Sí
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    background: 'var(--surface3)', border: 'none', borderRadius: 8,
                    color: 'var(--text2)', fontSize: 12, padding: '5px 12px',
                    cursor: 'pointer'
                  }}
                >
                  No
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats Grid — 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%' }}>
        <div style={{
          background: '#111113', borderRadius: 12,
          padding: '14px 10px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500, letterSpacing: '0.03em', marginBottom: 6 }}>Hoy</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8' }}>
            {fmtDuration(todaySeconds + (isRunning ? elapsed : 0))}
          </div>
        </div>
        <div style={{
          background: '#111113', borderRadius: 12,
          padding: '14px 10px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500, letterSpacing: '0.03em', marginBottom: 6 }}>Esta semana</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8' }}>
            {fmtDuration(weekSeconds + (isRunning ? elapsed : 0))}
          </div>
        </div>
        <div style={{
          background: '#111113', borderRadius: 12,
          padding: '14px 10px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500, letterSpacing: '0.03em', marginBottom: 6 }}>Racha</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: dayStreak > 0 ? '#c9963a' : '#f0ede8' }}>
            {dayStreak}<span style={{ fontSize: 12, fontWeight: 400, color: '#a1a1aa', marginLeft: 2 }}>d</span>
          </div>
        </div>
      </div>
    </div>
  )
}
