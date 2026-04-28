import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [mode, setMode] = useState('focus') // 'focus' | 'break'

  const [focusDuration, setFocusDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)

  const [todayCompletedMinutes, setTodayCompletedMinutes] = useState(0)
  const [todaySessions, setTodaySessions] = useState(0)

  const timerRef = useRef(null)

  const fetchTodayLogs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayStr = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('pomodoro_logs')
        .select('duration_minutes')
        .gte('completed_at', `${todayStr}T00:00:00Z`)
        .lte('completed_at', `${todayStr}T23:59:59Z`)

      if (error) throw error

      if (data && data.length > 0) {
        setTodaySessions(data.length)
        const totalMins = data.reduce((acc, curr) => acc + curr.duration_minutes, 0)
        setTodayCompletedMinutes(totalMins)
      } else {
        setTodaySessions(0)
        setTodayCompletedMinutes(0)
      }
    } catch (err) {
      console.error("Error fetching pomodoro logs", err)
    }
  }, [])

  useEffect(() => { fetchTodayLogs() }, [fetchTodayLogs])

  const switchMode = (newMode) => {
    setMode(newMode)
    setIsActive(false)
    setIsPaused(false)
    clearInterval(timerRef.current)
    setTimeLeft((newMode === 'focus' ? focusDuration : breakDuration) * 60)
  }

  useEffect(() => {
    if (!isActive && !isPaused) {
      setTimeLeft((mode === 'focus' ? focusDuration : breakDuration) * 60)
    }
  }, [focusDuration, breakDuration, mode, isActive, isPaused])

  const finishTimer = async () => {
    setIsActive(false)
    setIsPaused(false)
    clearInterval(timerRef.current)

    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.play().catch(() => {})
    } catch (e) { /* ignore */ }

    if (mode === 'focus') {
      try {
        const { error } = await supabase.from('pomodoro_logs').insert([{ duration_minutes: focusDuration }])
        if (!error) await fetchTodayLogs()
      } catch (err) { console.error('Error:', err) }
      switchMode('break')
    } else {
      switchMode('focus')
    }
  }

  const toggleTimer = () => {
    if (isActive) {
      clearInterval(timerRef.current)
      setIsPaused(true)
      setIsActive(false)
    } else {
      setIsActive(true)
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); finishTimer(); return 0 }
          return prev - 1
        })
      }, 1000)
    }
  }

  const resetTimer = () => {
    setIsActive(false)
    setIsPaused(false)
    clearInterval(timerRef.current)
    setTimeLeft((mode === 'focus' ? focusDuration : breakDuration) * 60)
  }

  useEffect(() => { return () => clearInterval(timerRef.current) }, [])

  const fmtDisplay = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progressTotal = (mode === 'focus' ? focusDuration : breakDuration) * 60
  const progressPercent = ((progressTotal - timeLeft) / progressTotal) * 100
  const activeColor = mode === 'focus' ? 'var(--red)' : 'var(--blue)'

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>

      {/* Mode tabs */}
      <div style={{
        display: 'flex', background: 'var(--surface2)', borderRadius: 12,
        padding: 3, gap: 3, marginBottom: 32
      }}>
        <button
          onClick={() => switchMode('focus')}
          style={{
            padding: '7px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: mode === 'focus' ? 'var(--surface3)' : 'transparent',
            color: mode === 'focus' ? 'var(--text1)' : 'var(--text2)'
          }}
        >Concentración</button>
        <button
          onClick={() => switchMode('break')}
          style={{
            padding: '7px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: mode === 'break' ? 'var(--surface3)' : 'transparent',
            color: mode === 'break' ? 'var(--text1)' : 'var(--text2)'
          }}
        >Descanso</button>
      </div>

      {/* Timer Circle */}
      <div style={{
        position: 'relative', width: 220, height: 220, borderRadius: '50%',
        border: '2px solid var(--surface3)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32
      }}>
        {/* SVG Progress Ring */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
          <circle cx="110" cy="110" r="106" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
          <circle
            cx="110" cy="110" r="106" fill="transparent"
            stroke={activeColor}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 106}
            strokeDashoffset={2 * Math.PI * 106 * (1 - progressPercent / 100)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.05em', color: 'var(--text1)', lineHeight: 1, position: 'relative' }}>
          {fmtDisplay(timeLeft)}
        </span>
        <span style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--text2)', textTransform: 'uppercase', marginTop: 4, position: 'relative' }}>
          {mode === 'focus' ? 'Tiempo de trabajo' : 'Tiempo de descanso'}
        </span>
      </div>

      {/* Play / Reset Buttons */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, alignItems: 'center' }}>
        <button
          onClick={toggleTimer}
          className="pomo-play"
          style={isActive ? {
            background: 'var(--surface3)', width: 58, height: 58
          } : {}}
        >
          {isActive ? (
            <svg style={{ width: 20, height: 20, color: 'var(--text1)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <div style={{
              width: 0, height: 0,
              borderStyle: 'solid', borderWidth: '11px 0 11px 18px',
              borderColor: 'transparent transparent transparent white',
              marginLeft: 3
            }} />
          )}
        </button>

        <button
          onClick={resetTimer}
          disabled={!isActive && !isPaused && timeLeft === progressTotal}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (!isActive && !isPaused && timeLeft === progressTotal) ? 0.3 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Stats Grid — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
        <div className="pomo-stat">
          <div className="pomo-stat-label">Sesiones hoy</div>
          <div className="pomo-stat-val">{todaySessions}</div>
        </div>
        <div className="pomo-stat">
          <div className="pomo-stat-label">Minutos enfocado</div>
          <div className="pomo-stat-val">{todayCompletedMinutes}</div>
        </div>
      </div>
    </div>
  )
}
