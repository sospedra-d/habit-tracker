import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [mode, setMode] = useState('focus') // 'focus' | 'break'
  
  // Custom durations (in minutes)
  const [focusDuration, setFocusDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)

  // Tracking history locally for today
  const [todayCompletedMinutes, setTodayCompletedMinutes] = useState(0)
  const [todaySessions, setTodaySessions] = useState(0)

  const timerRef = useRef(null)

  // Fetch today's pomodoro logs
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

  useEffect(() => {
    fetchTodayLogs()
  }, [fetchTodayLogs])

  const switchMode = (newMode) => {
    setMode(newMode)
    setIsActive(false)
    setIsPaused(false)
    clearInterval(timerRef.current)
    setTimeLeft((newMode === 'focus' ? focusDuration : breakDuration) * 60)
  }

  // Update time left instantly if inputs change and timer isn't active
  useEffect(() => {
    if (!isActive && !isPaused) {
      setTimeLeft((mode === 'focus' ? focusDuration : breakDuration) * 60)
    }
  }, [focusDuration, breakDuration, mode, isActive, isPaused])

  const finishTimer = async () => {
    setIsActive(false)
    setIsPaused(false)
    clearInterval(timerRef.current)

    // Play sound
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.play().catch(e => console.log('Audio autoplay blocked by browser', e))
    } catch (e) {
      // ignore
    }

    if (mode === 'focus') {
      // Save log to Supabase
      try {
        const { error } = await supabase
          .from('pomodoro_logs')
          .insert([{ duration_minutes: focusDuration }])
        
        if (error) {
           console.error('Error saving pomodoro log:', error)
        } else {
           // Refresh stats
           await fetchTodayLogs()
        }
      } catch (err) {
        console.error('Error:', err)
      }
      switchMode('break')
    } else {
      switchMode('focus')
    }
  }

  const toggleTimer = () => {
    if (isActive) {
      // Pause
      clearInterval(timerRef.current)
      setIsPaused(true)
      setIsActive(false)
    } else {
      // Resume or Start
      setIsActive(true)
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            finishTimer()
            return 0
          }
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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  const fmtDisplay = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progressTotal = (mode === 'focus' ? focusDuration : breakDuration) * 60
  const progressPercent = ((progressTotal - timeLeft) / progressTotal) * 100

  return (
    <div className="animate-fade-in-up max-w-2xl mx-auto flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          Pomodoro
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Mantén tu enfoque y registra tu tiempo de trabajo.
        </p>
      </div>

      {/* Mode Switches */}
      <div className="flex gap-2 p-1.5 rounded-2xl mb-8" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => switchMode('focus')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
          style={{
            background: mode === 'focus' ? 'var(--accent-gradient)' : 'transparent',
            color: mode === 'focus' ? '#fff' : 'var(--text-secondary)',
            boxShadow: mode === 'focus' ? '0 4px 15px rgba(108, 99, 255, 0.3)' : 'none',
          }}
        >
          Concentración
        </button>
        <button
          onClick={() => switchMode('break')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
          style={{
            background: mode === 'break' ? '#10b981' : 'transparent', // Custom green for break
            color: mode === 'break' ? '#fff' : 'var(--text-secondary)',
            boxShadow: mode === 'break' ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none',
          }}
        >
          Descanso
        </button>
      </div>

      {/* Timer Circle */}
      <div className="relative w-72 h-72 rounded-full flex items-center justify-center mb-10 transition-all duration-500"
           style={{
             background: 'var(--glass-bg)',
             border: '1px solid var(--border-subtle)',
             boxShadow: isActive ? (mode === 'focus' ? '0 0 50px rgba(108, 99, 255, 0.15)' : '0 0 50px rgba(16, 185, 129, 0.15)') : 'none'
           }}>
        
        {/* SVG Progress Ring */}
        <svg className="absolute w-full h-full -rotate-90 pointer-events-none">
          <circle 
            cx="144" cy="144" r="140" 
            fill="transparent" 
            stroke="var(--border-subtle)" 
            strokeWidth="4" 
          />
          <circle 
            cx="144" cy="144" r="140" 
            fill="transparent" 
            stroke={mode === 'focus' ? 'var(--accent-primary)' : '#10b981'} 
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 140}
            strokeDashoffset={2 * Math.PI * 140 * (1 - progressPercent / 100)}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        <div className="relative text-center">
          <span className="text-6xl font-black font-mono tracking-tighter" style={{ color: 'var(--text-primary)' }}>
            {fmtDisplay(timeLeft)}
          </span>
          <p className="mt-2 text-sm font-medium uppercase tracking-widest" style={{ color: mode === 'focus' ? 'var(--accent-primary)' : '#10b981' }}>
            {mode === 'focus' ? 'Tiempo de Trabajo' : 'Tiempo de Descanso'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-12">
        <button
          onClick={toggleTimer}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: isActive ? 'rgba(255, 255, 255, 0.1)' : (mode === 'focus' ? 'var(--accent-gradient)' : '#10b981'),
            color: isActive ? 'var(--text-primary)' : '#fff',
            border: isActive ? '1px solid var(--border-subtle)' : 'none',
            boxShadow: isActive ? 'none' : (mode === 'focus' ? '0 8px 25px rgba(108, 99, 255, 0.4)' : '0 8px 25px rgba(16, 185, 129, 0.4)'),
          }}
        >
          {isActive ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 20.04c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <button
          onClick={resetTimer}
          disabled={!isActive && !isPaused && timeLeft === progressTotal}
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Settings & Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        {/* Settings */}
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Personalizar
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Concentración (min)</label>
              <input 
                type="number" 
                min="1" max="120"
                value={focusDuration}
                onChange={(e) => setFocusDuration(Number(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-right rounded-lg bg-black/20 border text-sm"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                disabled={isActive || isPaused}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Descanso (min)</label>
              <input 
                type="number" 
                min="1" max="60"
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-right rounded-lg bg-black/20 border text-sm"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                disabled={isActive || isPaused}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Hoy
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Sesiones Completadas</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{todaySessions}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Minutos Enfocado</p>
              <p className="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>{todayCompletedMinutes} <span className="text-xs font-normal opacity-70">min</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
