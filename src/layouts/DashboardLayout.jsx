import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const navItems = [
  {
    to: '/hoy',
    label: 'Hoy',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: '/tareas',
    label: 'Tareas',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    to: '/habits',
    label: 'Hábitos',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/pomodoro',
    label: 'Pomodoro',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/estadisticas',
    label: 'Estadísticas',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  const isHabitsView = path.includes('/habits')
  const isTareasView = path.includes('/tareas')
  const isPomodoroView = path.includes('/pomodoro')
  const isStatsView = path.includes('/estadisticas')
  const isHoyView = path === '/' || path.includes('/hoy')

  const isHiddenView = isPomodoroView || isStatsView

  // -- Quick Add TASK State
  const [qsTitle, setQsTitle] = useState('')
  const [qsEnergy, setQsEnergy] = useState('medium')
  const [qsDate, setQsDate] = useState('')

  // -- Quick Add HABIT State
  const [qhName, setQhName] = useState('')
  const [qhCategory, setQhCategory] = useState('Salud')
  const [qhIsCounter, setQhIsCounter] = useState(false)
  const [qhTarget, setQhTarget] = useState(1)

  // -- Energy Widget State (Hoy)
  const [energySelector, setEnergySelector] = useState(null)
  const [widgetTodos, setWidgetTodos] = useState([])

  useEffect(() => {
    if (isHoyView) {
      supabase.from('todos').select('*').eq('is_completed', false).then(({ data }) => setWidgetTodos(data || []))
    }
  }, [isHoyView])

  const handleTaskSubmit = async (e) => {
    e.preventDefault()
    if (!qsTitle.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        title: qsTitle.trim(),
        description: null,
        due_date: qsDate || null,
        energy_level: qsEnergy,
        user_id: user.id
      }
      const { error } = await supabase.from('todos').insert([payload])
      if (error) throw error

      setQsTitle('')
      setQsDate('')
      setQsEnergy('medium')
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert("Error SQL: " + err.message)
    }
  }

  const handleHabitSubmit = async (e) => {
    e.preventDefault()
    if (!qhName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        name: qhName.trim(),
        category: qhCategory,
        days_of_week: [0, 1, 2, 3, 4, 5, 6], // default all week for quick add
        is_counter: qhIsCounter,
        target_count: qhIsCounter ? Number(qhTarget) : null,
        user_id: user.id
      }
      const { error } = await supabase.from('habits').insert([payload])
      if (error) throw error

      setQhName('')
      setQhCategory('Salud')
      setQhIsCounter(false)
      setQhTarget(1)
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert("Error SQL: " + err.message)
    }
  }

  const completeWidgetTodo = async (id) => {
     try {
       await supabase.from('todos').update({is_completed:true}).eq('id', id)
       setWidgetTodos(prev => prev.filter(x => x.id !== id))
     } catch(err) { console.error(err) }
  }

  const energyFilteredTodos = widgetTodos
    .filter(t => t.energy_level === energySelector)
    .sort((a,b) => {
       if(!a.due_date) return 1; if(!b.due_date) return -1;
       return new Date(a.due_date) - new Date(b.due_date);
    })

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* 1. LEFT SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[240px] flex flex-col shrink-0 border-r border-slate-700/50 transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} style={{ background: 'var(--glass-bg)' }}>
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-gradient)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[14px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Habit Tracker</h2>
            <p className="text-[10px] uppercase font-bold text-rose-500 tracking-widest">Workspace</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          <p className="px-2 mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Navegación</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[14px] font-semibold transition-all duration-200 group ${isActive ? 'shadow-lg' : 'hover:bg-slate-800/40'}`}
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent-gradient)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 15px rgba(244, 63, 94, 0.3)' : 'none',
              })}
            >
              <span className="opacity-80 group-hover:opacity-100">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-6">
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login') }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-[14px] font-semibold transition-all hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 cursor-pointer">
            <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            Salir
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          </button>
          <h2 className="text-[14px] font-bold text-slate-100">Habit Tracker</h2>
          <div className="w-10" />
        </header>

        {/* Dynamic Outlet */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* 3. DYNAMIC RIGHT PANEL (Hidden on Pomodoro & Stats to clean UI) */}
      {!isHiddenView && (
        <aside className="hidden xl:flex flex-col shrink-0 w-[380px] h-screen sticky top-0 border-l border-slate-700/50 bg-slate-900/40 overflow-y-auto p-8 custom-scrollbar relative">
          
          {/* Subtle Glow Background based on view */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-10" 
               style={{ background: isHabitsView ? '#10b981' : isHoyView ? '#f59e0b' : '#f43f5e' }} />

          <div className="relative z-10 w-full flex flex-col h-full">

            {/* --- HOY: ENERGY BATTERY WIDGET --- */}
            {isHoyView && (
              <div className="animate-fade-in-up flex flex-col h-full">
                <div className="mb-8">
                  <h3 className="text-[22px] font-black text-slate-100 flex items-center gap-2 tracking-tight">
                    <span className="text-amber-500">🔋</span> Nivel de Batería
                  </h3>
                  <p className="text-[13px] font-medium text-slate-400 mt-2 leading-relaxed">
                    ¿Cuánta energía tienes ahora mismo? Haz clic para ver qué deberías atacar a continuación.
                  </p>
                </div>

                <div className="flex gap-2 mb-8">
                  <button onClick={() => setEnergySelector('low')} className={`flex-1 py-3.5 rounded-[16px] text-[13px] font-black border-2 transition-all cursor-pointer ${energySelector === 'low' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50 scale-[1.03] shadow-lg shadow-emerald-500/10' : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:border-emerald-500/30'}`}>🔋 Baja</button>
                  <button onClick={() => setEnergySelector('medium')} className={`flex-1 py-3.5 rounded-[16px] text-[13px] font-black border-2 transition-all cursor-pointer ${energySelector === 'medium' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 scale-[1.03] shadow-lg shadow-amber-500/10' : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:border-amber-500/30'}`}>⚡ Media</button>
                  <button onClick={() => setEnergySelector('high')} className={`flex-1 py-3.5 rounded-[16px] text-[13px] font-black border-2 transition-all cursor-pointer ${energySelector === 'high' ? 'bg-rose-500/20 text-rose-500 border-rose-500/50 scale-[1.03] shadow-lg shadow-rose-500/10' : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:border-rose-500/30'}`}>🔥 Alta</button>
                </div>

                {energySelector && (
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-fade-in-up space-y-4">
                     <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">
                       Matches de Energía ({energyFilteredTodos.length})
                     </h4>
                     
                     {energyFilteredTodos.length === 0 ? (
                       <div className="min-h-[100px] rounded-[16px] bg-slate-800/30 border border-slate-700/50 border-dashed flex items-center justify-center p-4 text-center">
                         <p className="text-[13px] font-medium text-slate-500 leading-relaxed">No hay tareas sueltas con este nivel de energía. ¡Tómate un descanso brutal! ☕</p>
                       </div>
                     ) : (
                       energyFilteredTodos.map(t => (
                         <div key={t.id} className="p-4 bg-slate-800/60 border border-slate-700 rounded-[16px] transition-all hover:bg-slate-700/60 group cursor-default shadow-sm hover:shadow-md">
                           <div className="flex items-start justify-between gap-3">
                             <p className="text-[14px] font-semibold text-slate-200 leading-snug">{t.title}</p>
                             <button onClick={() => completeWidgetTodo(t.id)} className="w-6 h-6 shrink-0 rounded-full border-2 border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/20 transition-colors flex items-center justify-center cursor-pointer">
                               <svg className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>
                             </button>
                           </div>
                           {t.due_date && <p className="text-[11px] text-rose-400 font-bold mt-2">⚠️ Vence: {t.due_date.split('-').reverse().slice(0,2).join('/')}</p>}
                         </div>
                       ))
                     )}
                  </div>
                )}
              </div>
            )}


            {/* --- HABITS: QUICK ADD HABIT --- */}
            {isHabitsView && (
              <div className="animate-fade-in-up">
                <div className="mb-8">
                  <h3 className="text-[22px] font-black text-slate-100 flex items-center gap-2 tracking-tight">
                    <span className="text-emerald-500">✨</span> Quick Add Hábito
                  </h3>
                  <p className="text-[13px] font-medium text-slate-400 mt-1">Forja un hábito al instante.</p>
                </div>
                <form onSubmit={handleHabitSubmit} className="flex flex-col gap-4">
                  <div>
                    <input type="text" required placeholder="Ej: Beber 2L de Agua..." autoFocus className="w-full bg-slate-800/80 border border-slate-700 px-4 py-3.5 rounded-[16px] text-[14px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner" value={qhName} onChange={e => setQhName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Categoría</label>
                    <select value={qhCategory} onChange={e => setQhCategory(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[13px] font-bold py-3 px-4 rounded-[16px] focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer" style={{ appearance: 'none' }}>
                      <option value="Salud">🍎 Salud</option>
                      <option value="Trabajo">💼 Trabajo</option>
                      <option value="Estudio">📚 Estudio</option>
                      <option value="Deporte">🏅 Deporte</option>
                      <option value="Otro">🎯 Otro</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-[16px] border border-slate-700 bg-slate-800/40">
                    <label className="text-[13px] font-bold text-slate-300 cursor-pointer flex gap-3 items-center w-full">
                      <input type="checkbox" checked={qhIsCounter} onChange={e => setQhIsCounter(e.target.checked)} className="w-5 h-5 rounded-md accent-emerald-500 cursor-pointer bg-slate-900 border-slate-700" />
                      Hábito de Conteo
                    </label>
                  </div>
                  {qhIsCounter && (
                     <div className="flex flex-col gap-2 animate-fade-in-up">
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Meta Diaria</label>
                       <input type="number" min="1" required={qhIsCounter} value={qhTarget} onChange={e => setQhTarget(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 px-4 py-3.5 rounded-[16px] text-[14px] text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner" />
                     </div>
                  )}
                  <button type="submit" disabled={!qhName.trim()} className="mt-2 w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-[16px] transition-all duration-300 active:scale-95 shadow-[0_4px_15px_-3px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 text-[14px] cursor-pointer">
                    Añadir Hábito (Toda la semana)
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </button>
                </form>
              </div>
            )}

            {/* --- TAREAS: QUICK ADD TAREA --- */}
            {isTareasView && (
              <div className="animate-fade-in-up">
                <div className="mb-8">
                  <h3 className="text-[22px] font-black text-slate-100 flex items-center gap-2 tracking-tight">
                    <span className="text-rose-500">⚡</span> Quick Add Tarea
                  </h3>
                  <p className="text-[13px] font-medium text-slate-400 mt-1">Captura rápido, ordena luego.</p>
                </div>
                <form onSubmit={handleTaskSubmit} className="flex flex-col gap-4">
                  <div>
                    <input type="text" required autoFocus placeholder="I need to do..." className="w-full bg-slate-800/80 border border-slate-700 px-4 py-3.5 rounded-[16px] text-[14px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors shadow-inner" value={qsTitle} onChange={e => setQsTitle(e.target.value)} />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Energía</label>
                      <select value={qsEnergy} onChange={e => setQsEnergy(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[13px] font-bold py-3 px-4 rounded-[16px] focus:outline-none focus:border-rose-500 transition-colors cursor-pointer" style={{ appearance: 'none' }}>
                        <option value="low">🔋 Baja</option>
                        <option value="medium">⚡ Media</option>
                        <option value="high">🔥 Alta</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Fecha (Opc.)</label>
                      <input type="date" value={qsDate} onChange={e => setQsDate(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[13px] font-bold py-3 px-3 rounded-[16px] focus:outline-none focus:border-rose-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert-[0.6] cursor-pointer" />
                    </div>
                  </div>
                  <button type="submit" disabled={!qsTitle.trim()} className="mt-2 w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-[16px] transition-all duration-300 active:scale-95 shadow-[0_4px_15px_-3px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 text-[14px] cursor-pointer">
                    Añadir a Bandeja
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </button>
                </form>
              </div>
            )}

          </div>
        </aside>
      )}
    </div>
  )
}
