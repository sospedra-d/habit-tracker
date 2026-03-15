import { useState, useEffect, useCallback, useMemo } from 'react'
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

// Generate dates once outside the component to prevent infinite dependency loops
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [pomodoroLogs, setPomodoroLogs] = useState([])

  const last7Days = STATIC_LAST_7_DAYS
  const last90Days = STATIC_LAST_90_DAYS

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const oldestDateStr = last90Days[0]

      // Fetch Habit Logs
      const { data: hLogs, error: hErr } = await supabase
        .from('habit_logs')
        .select('habit_id, completed_at, count')
        .gte('completed_at', oldestDateStr)
      if (hErr) throw hErr

      // Fetch Pomodoro Logs
      const { data: pLogs, error: pErr } = await supabase
        .from('pomodoro_logs')
        .select('duration_minutes, completed_at')
        .gte('completed_at', `${oldestDateStr}T00:00:00Z`)
      if (pErr) throw pErr

      setLogs(hLogs || [])
      setPomodoroLogs(pLogs || [])
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [last90Days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Data processing for Bar Chart (last 7 days)
  const weeklyData = useMemo(() => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return last7Days.map((dateStr) => {
      const d = new Date(dateStr + "T00:00:00") // Fix timezone shift
      const dayLabel = dayNames[d.getDay()]
      
      const dayLogs = logs.filter(l => l.completed_at === dateStr)
      // For counters, we could count sum of 'count' or just 1 per log. We'll count 1 per log entry to represent "interactions/goals met"
      const completados = dayLogs.length

      return {
        name: dayLabel,
        completados,
        dateStr
      }
    })
  }, [last7Days, logs])

  // Data processing for Heatmap (last 90 days mapped to counts)
  const heatmapData = useMemo(() => {
    const counts = {}
    last90Days.forEach(d => counts[d] = 0)
    
    logs.forEach(log => {
      if (counts[log.completed_at] !== undefined) {
        counts[log.completed_at] += 1
      }
    })
    
    // Group into weeks for the grid wrapper (7 rows, N cols)
    // Actually, simpler approach: just render as continuous flexwrap or grid
    // For a true Github look: CSS grid with columns flowing top-to-bottom, left-to-right.
    return Object.entries(counts).map(([date, count]) => ({ date, count }))
  }, [last90Days, logs])

  // Get intensity color class for Heatmap cells
  const getIntensityColor = (count) => {
    if (count === 0) return 'bg-white/5 border border-white/5'
    if (count === 1) return 'bg-[#f43f5e]/30 border border-[#f43f5e]/20'
    if (count === 2) return 'bg-[#f43f5e]/60 border border-[#f43f5e]/40'
    if (count === 3) return 'bg-[#f43f5e]/80 border border-[#f43f5e]/60'
    return 'bg-[#f43f5e] border border-[#f43f5e]' // 4+
  }

  // Quick Stats computation
  const totalCompletedThisWeek = weeklyData.reduce((acc, curr) => acc + curr.completados, 0)
  
  const totalFocusMinutesThisWeek = useMemo(() => {
    const weekStart = last7Days[0]
    return pomodoroLogs
      .filter(p => p.completed_at >= weekStart)
      .reduce((acc, curr) => acc + curr.duration_minutes, 0)
  }, [pomodoroLogs, last7Days])

  const totalFocusHours = Math.floor(totalFocusMinutesThisWeek / 60)
  const totalFocusMins = totalFocusMinutesThisWeek % 60

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Panel de Estadísticas
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Visualiza tu progreso y descubre tus patrones de productividad.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg className="animate-spin w-8 h-8" style={{ color: 'var(--accent-primary)' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-primary)' }}>
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                 </div>
                 <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Hábitos Completados (Últimos 7 días)</h3>
               </div>
               <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{totalCompletedThisWeek}</p>
            </div>

            <div className="p-6 rounded-2xl border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                 </div>
                 <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tiempo Enfocado (Últimos 7 días)</h3>
               </div>
               <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                 {totalFocusHours > 0 && `${totalFocusHours}h `}
                 {totalFocusMins}m
               </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Weekly Bar Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-sm font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Productividad Diaria</h3>
              <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                      contentStyle={{ background: '#1e1e2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="completados" name="Completados" radius={[6, 6, 6, 6]}>
                      {weeklyData.map((entry, index) => {
                        const isToday = entry.dateStr === last7Days[last7Days.length - 1]
                        return <Cell key={`cell-${index}`} fill={isToday ? '#f43f5e' : '#334155'} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap (Activity Calendar) */}
            <div className="p-6 rounded-2xl border flex flex-col" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-sm font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Mapa de Calor (90 días)</h3>
              
              <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
                <div className="min-w-max flex items-center justify-center sm:justify-start">
                  <div 
                    className="grid gap-[3px] auto-rows-[12px] grid-flow-col mx-auto sm:mx-0 pr-4" // Force columns instead of rows
                    style={{ 
                      gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
                      height: 'max-content'
                    }}
                  >
                    {heatmapData.map((day, i) => (
                      <div
                        key={day.date}
                        title={`${day.date}: ${day.count} hábitos`}
                        className={`w-3 h-3 rounded-[2px] ${getIntensityColor(day.count)} transition-all duration-300 hover:scale-125 hover:z-10`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <span>Menos Productivo</span>
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-white/5 border border-white/5" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-[#f43f5e]/30" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-[#f43f5e]/60" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-[#f43f5e]" />
                </div>
                <span>Más Productivo</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
