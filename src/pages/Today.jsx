import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function Today() {
  const [loading, setLoading] = useState(true)
  const [todos, setTodos] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [pomodoros, setPomodoros] = useState([])

  const navigate = useNavigate()

  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }, [])
  
  const dayOfWeekIndex = new Date(todayStr + "T00:00:00").getDay()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch Todos
      const { data: tData } = await supabase.from('todos').select('*').eq('is_completed', false)
      setTodos(tData || [])

      // Fetch Habits
      const { data: hData } = await supabase.from('habits').select('*')
      setHabits(hData || [])

      // Fetch Habit Logs for Today
      const { data: hlData } = await supabase.from('habit_logs').select('*').eq('completed_at', todayStr)
      setHabitLogs(hlData || [])

      // Fetch Pomodoros for Today
      const { data: pData } = await supabase.from('pomodoro_logs').select('*').gte('completed_at', `${todayStr}T00:00:00Z`)
      setPomodoros(pData || [])

    } catch (err) {
      console.error('Error fetching today data:', err)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- TODOS LOGIC ---
  const { hacerAhora, recomendado } = useMemo(() => {
    const today = new Date(todayStr + "T00:00:00")
    const urgentDate = new Date(today)
    urgentDate.setDate(today.getDate() + 3)

    const urgent = []
    const rec = []

    // Sort chronologically
    const sorted = [...todos].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })

    sorted.forEach(t => {
      if (!t.due_date) {
        rec.push(t)
      } else {
        const due = new Date(t.due_date + "T00:00:00")
        if (due <= urgentDate) urgent.push(t)
        else rec.push(t)
      }
    })
    return { hacerAhora: urgent, recomendado: rec }
  }, [todos, todayStr])

  const completeTodo = async (id) => {
    try {
      const { error } = await supabase.from('todos').update({ is_completed: true }).eq('id', id)
      if (!error) setTodos(prev => prev.filter(t => t.id !== id))
    } catch (err) { console.error(err) }
  }

  // --- HABITS LOGIC ---
  const todaysHabits = useMemo(() => {
    return habits.filter(h => {
      if (!h.frequency || h.frequency.length === 0) return true
      const jsDayToChar = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
      return h.frequency.includes(jsDayToChar[dayOfWeekIndex])
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
      const { current, target, progress } = getHabitProgress(habit)
      const isCompleted = progress >= 1

      if (!habit.is_counter) {
        // Toggle Checkbox
        if (isCompleted) {
          await supabase.from('habit_logs').delete().match({ habit_id: habit.id, completed_at: todayStr })
          setHabitLogs(prev => prev.filter(l => l.habit_id !== habit.id))
        } else {
          const { data } = await supabase.from('habit_logs').insert([{ habit_id: habit.id, user_id: user.id, count: 1, completed_at: todayStr }]).select()
          if (data) setHabitLogs(prev => [...prev, data[0]])
        }
      } else {
        // Increment Counter
        const newCount = current + 1
        if (current === 0) {
          const { data } = await supabase.from('habit_logs').insert([{ habit_id: habit.id, user_id: user.id, count: 1, completed_at: todayStr }]).select()
          if (data) setHabitLogs(prev => [...prev, data[0]])
        } else {
          const { data } = await supabase.from('habit_logs').update({ count: newCount }).match({ habit_id: habit.id, completed_at: todayStr }).select()
          if (data) setHabitLogs(prev => prev.map(l => l.habit_id === habit.id ? data[0] : l))
        }
      }
    } catch (err) { console.error(err) }
  }

  // --- POMODORO LOGIC ---
  const pomodoroTotalMins = pomodoros.reduce((acc, p) => acc + p.duration_minutes, 0)
  const pomodoroHours = Math.floor(pomodoroTotalMins / 60)
  const pomodoroMins = pomodoroTotalMins % 60

  return (
    <div className="animate-fade-in-up pb-12">
      {/* SaaS Typography: Page Title (32px), padding 24px */}
      <div className="mb-8">
        <h1 className="text-[32px] font-black tracking-tight text-slate-100">
          Mi Día
        </h1>
        <p className="text-[14px] text-slate-400 font-medium tracking-wide">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" /></svg>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* SEC 1: URGENT TASKS */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[20px]">🔥</span>
              <h2 className="text-[20px] font-bold text-slate-100">Hacer Ahora</h2>
              <span className="ml-2 bg-rose-500/20 text-rose-500 py-0.5 px-2 rounded-full text-[12px] font-bold">{hacerAhora.length}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hacerAhora.length === 0 ? (
                <div className="min-h-[120px] rounded-[16px] bg-slate-800/30 border border-slate-700/50 border-dashed flex items-center justify-center text-[14px] text-slate-500">
                  Nada urgente. ¡Buen trabajo!
                </div>
              ) : (
                hacerAhora.map(todo => (
                  <div key={todo.id} className="group relative min-h-[120px] p-[20px] rounded-[16px] bg-slate-800/50 border border-rose-500/30 transition-all hover:bg-slate-700/50 hover:shadow-lg hover:shadow-rose-500/10 flex flex-col justify-between">
                    <div>
                       <h3 className="text-[15px] font-semibold text-slate-100 break-words line-clamp-2">{todo.title}</h3>
                       {todo.due_date && <p className="text-[12px] text-rose-400 mt-1 font-bold">⚠️ Vence: {todo.due_date.split('-').reverse().slice(0,2).join('/')}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button onClick={() => completeTodo(todo.id)} className="w-6 h-6 rounded-full border-2 border-slate-500 hover:border-emerald-500 hover:bg-emerald-500/20 transition-colors flex items-center justify-center group/btn shadow-inner">
                        <svg className="w-3 h-3 text-emerald-500 opacity-0 group-hover/btn:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button onClick={() => navigate('/pomodoro')} className="text-[11px] font-bold text-white bg-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors shadow-[0_4px_10px_rgba(244,63,94,0.3)]">
                        Enfocar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SEC 2: RECOMMENDED TASKS */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[20px]">💡</span>
              <h2 className="text-[20px] font-bold text-slate-100">Recomendado</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recomendado.length === 0 ? (
                 <div className="min-h-[120px] rounded-[16px] bg-slate-800/30 border border-slate-700/50 border-dashed flex items-center justify-center text-[14px] text-slate-500">
                  Sin recomendaciones activas.
                 </div>
              ) : (
                recomendado.slice(0,3).map(todo => (
                  <div key={todo.id} className="group min-h-[120px] p-[20px] rounded-[16px] bg-slate-800/40 border border-slate-700 transition-all hover:bg-slate-700/60 hover:shadow-lg flex flex-col justify-between">
                    <div>
                       <h3 className="text-[14px] font-semibold text-slate-200 break-words line-clamp-2">{todo.title}</h3>
                       {todo.energy_level && (
                         <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-700">{todo.energy_level}</span>
                       )}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button onClick={() => completeTodo(todo.id)} className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/20 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
            {recomendado.length > 3 && (
               <div className="mt-3 text-right">
                 <Link to="/tareas" className="text-[13px] text-rose-500 font-bold hover:underline">Ver {recomendado.length - 3} más &rarr;</Link>
               </div>
            )}
          </section>

          {/* SEC 3: TODAY'S HABITS */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[20px]">🎯</span>
              <h2 className="text-[20px] font-bold text-slate-100">Hábitos de Hoy</h2>
              <span className="ml-2 bg-emerald-500/20 text-emerald-500 py-0.5 px-2 rounded-full text-[12px] font-bold">{todaysHabits.length}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todaysHabits.length === 0 ? (
                 <div className="min-h-[120px] rounded-[16px] bg-slate-800/30 border border-slate-700/50 border-dashed flex items-center justify-center text-[14px] text-slate-500">
                    No hay hábitos programados para hoy.
                 </div>
              ) : (
                todaysHabits.map((h, i) => {
                  const { current, target, progress } = getHabitProgress(h)
                  const isCompleted = progress >= 1
                  return (
                    <div key={h.id} className="min-h-[120px] p-[20px] rounded-[16px] bg-slate-800/40 border border-slate-700 flex flex-col justify-between transition-all hover:bg-slate-700/50">
                      <div className="flex items-start justify-between">
                         <div className="flex items-center gap-3">
                            <span className="text-2xl">{h.icon || '✨'}</span>
                            <span className={`text-[15px] font-bold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{h.name}</span>
                         </div>
                         {h.is_counter && (
                           <span className="text-[12px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                             {current} / {target}
                           </span>
                         )}
                      </div>
                      
                      <div className="mt-4">
                        {!h.is_counter ? (
                          <button
                            onClick={() => toggleHabit(h)}
                            className="flex items-center gap-2 group cursor-pointer"
                          >
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-emerald-500'}`}>
                               {isCompleted && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-[13px] font-semibold text-slate-400 group-hover:text-slate-300">{isCompleted ? 'Completado' : 'Marcar complete'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleHabit(h)}
                            disabled={isCompleted}
                            className={`w-full py-2 rounded-xl text-[13px] font-bold transition-colors ${isCompleted ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_15px_-3px_rgba(244,63,94,0.4)]'}`}
                          >
                            {isCompleted ? '¡Meta alcanzada!' : '+1 Añadir Métrica'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* SEC 4: POMODORO STATS */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[20px]">⏱️</span>
              <h2 className="text-[20px] font-bold text-slate-100">Sesiones Enfocadas</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="min-h-[120px] p-[20px] rounded-[16px] bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-center items-center text-center transition-all hover:bg-indigo-500/20">
                 <span className="text-3xl font-black text-indigo-400 mb-2">{pomodoros.length}</span>
                 <span className="text-[13px] font-bold text-indigo-300/80 uppercase tracking-widest">Tomates Hoy</span>
               </div>
               
               <div className="min-h-[120px] p-[20px] rounded-[16px] bg-amber-500/10 border border-amber-500/20 flex flex-col justify-center items-center text-center transition-all hover:bg-amber-500/20">
                 <span className="text-3xl font-black text-amber-400 mb-2">{pomodoroHours}h {pomodoroMins}m</span>
                 <span className="text-[13px] font-bold text-amber-300/80 uppercase tracking-widest">Tiempo Total</span>
               </div>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
