import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

// Constants for Energy levels styling
const ENERGY_STYLES = {
  low: {
    label: 'Baja',
    icon: '🔋',
    color: '#10b981', // Emerald 500
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  medium: {
    label: 'Media',
    icon: '⚡',
    color: '#fbbf24', // Amber 400
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.3)'
  },
  high: {
    label: 'Alta',
    icon: '🔥',
    color: '#e11d48', // Rose 600
    bg: 'rgba(225, 29, 72, 0.15)',
    border: 'rgba(225, 29, 72, 0.3)'
  }
}

export default function Todos() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Quick Add State
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [energy, setEnergy] = useState('medium')
  const [isFormExpanded, setIsFormExpanded] = useState(false)

  // Wizard State
  const [showWizard, setShowWizard] = useState(false)
  const [wizardEnergy, setWizardEnergy] = useState(null)

  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTodos(data || [])
    } catch (err) {
      console.error('Error fetching todos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Automatic Classification Logic ---
  const categorizedTodos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr + "T00:00:00")
    
    // Urgent margin: 3 days from today
    const urgentDate = new Date(today)
    urgentDate.setDate(today.getDate() + 3)

    const hacerAhora = []
    const agendado = []
    const bandeja = []

    // Sort chronologically by due_date
    const sortedTodos = [...todos].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })

    sortedTodos.forEach((todo) => {
      // Prioritize assigning to correct buckets
      // Energy Level defaults to medium if missing (for old data)
      const t = { ...todo, energy_level: todo.energy_level || 'medium' }
      
      if (!t.due_date) {
        bandeja.push(t)
      } else {
        const due = new Date(t.due_date + "T00:00:00")
        if (due <= urgentDate) {
          hacerAhora.push(t)
        } else {
          agendado.push(t)
        }
      }
    })

    return { hacerAhora, agendado, bandeja, allActive: sortedTodos.filter(t => !t.is_completed) }
  }, [todos])

  // --- Wizard Recommendation Logic ---
  const wizardRecommendations = useMemo(() => {
    if (!wizardEnergy) return []
    // Filter active items matching the energy
    const activeMatch = categorizedTodos.allActive
      .map(t => ({ ...t, energy_level: t.energy_level || 'medium' }))
      .filter(t => t.energy_level === wizardEnergy)

    // Sort by Urgency (Eisenhower rules)
    // 1. Due within 3 days (Hacer Ahora items first)
    // 2. Due > 3 days (Agendado items second)
    // 3. No Date (Bandeja last)
    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr + "T00:00:00")
    const urgentDate = new Date(today)
    urgentDate.setDate(today.getDate() + 3)

    return activeMatch.sort((a, b) => {
      const aScore = !a.due_date ? 3 : (new Date(a.due_date + "T00:00:00") <= urgentDate ? 1 : 2)
      const bScore = !b.due_date ? 3 : (new Date(b.due_date + "T00:00:00") <= urgentDate ? 1 : 2)
      if (aScore !== bScore) return aScore - bScore
      // If same bucket, sort chronologically
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date)
      return 0
    })
  }, [categorizedTodos.allActive, wizardEnergy])

  // --- Handlers ---
  const mockIncrementGlobalStats = () => {
    console.log("Stats incremented! +1 completada")
  }

  const toggleComplete = async (todo) => {
    const isNowCompleted = !todo.is_completed
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: isNowCompleted })
        .eq('id', todo.id)
      
      if (error) throw error

      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_completed: isNowCompleted } : t))
      if (isNowCompleted) mockIncrementGlobalStats()
    } catch (err) {
      console.error('Error updating todo:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) throw error
      setTodos(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error("Error deleting todo:", err)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        title: title.trim(),
        description: null, // Keep description hidden in fast UI to keep it clean
        due_date: dueDate || null,
        energy_level: energy,
        user_id: user.id
      }

      const { data, error } = await supabase.from('todos').insert([payload]).select()
      if (error) throw error

      if (data) {
        setTodos(prev => [data[0], ...prev])
      }
      
      setTitle('')
      setDueDate('')
      setEnergy('medium')
      setIsFormExpanded(false)
    } catch (err) {
      console.error('Error adding todo:', err)
      alert('Error al guardar la tarea en la base de datos: ' + err.message + '\n\n¿Ejecutaste el comando SQL de energy_level correctamente?')
    }
  }

  const getDaysLeftText = (dateStr) => {
    const today = new Date()
    today.setHours(0,0,0,0)
    const due = new Date(dateStr + "T00:00:00")
    
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `Vencido (${Math.abs(diffDays)}d)`
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Mañana'
    return `Faltan ${diffDays}d`
  }

  const renderTodoCard = (todo, bucketType) => {
    const isUrgent = bucketType === 'urgent'
    const style = ENERGY_STYLES[todo.energy_level] || ENERGY_STYLES['medium']

    return (
      <div 
        key={todo.id} 
        className={`group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 ${todo.is_completed ? 'opacity-50 grayscale hover:opacity-100' : 'hover:shadow-2xl hover:-translate-y-1'}`}
        style={{
          background: 'var(--glass-bg)',
          borderColor: isUrgent && !todo.is_completed ? 'rgba(225, 29, 72, 0.4)' : 'var(--border-subtle)',
          boxShadow: isUrgent && !todo.is_completed ? '0 10px 40px -10px rgba(225, 29, 72, 0.15)' : 'none'
        }}
      >
        <div className="flex gap-4">
          <button
            onClick={() => toggleComplete(todo)}
            className="mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
            style={{
              borderColor: todo.is_completed ? 'var(--text-secondary)' : style.color,
              background: todo.is_completed ? 'var(--text-secondary)' : 'transparent'
            }}
          >
            {todo.is_completed && (
               <svg className="w-3 h-3 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={4} /></svg>
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-[15px] truncate transition-all ${todo.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
              {todo.title}
            </h4>
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Energy Tag */}
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider"
                style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
              >
                <span>{style.icon}</span> {style.label}
              </span>

              {/* Due Date Tag */}
              {todo.due_date && (
                <span 
                  className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                >
                  ⏳ {getDaysLeftText(todo.due_date)}
                </span>
              )}
              
              {/* Focus Button */}
              {isUrgent && !todo.is_completed && (
                <button 
                  onClick={() => navigate('/pomodoro')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all hover:scale-105"
                  style={{ background: 'var(--accent-gradient)', color: 'white', boxShadow: '0 4px 10px rgba(244,63,94,0.3)' }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 20.04c-1.25.687-2.779-.217-2.779-1.643V5.653z" /></svg>
                  Enfocar
                </button>
              )}
            </div>
          </div>
          
          {/* Delete Button */}
          <button
            onClick={() => handleDelete(todo.id)}
            className="opacity-0 group-hover:opacity-100 absolute top-4 right-4 p-1.5 rounded-lg transition-all hover:bg-slate-700 text-slate-400 hover:text-rose-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 mt-4 relative">
      
      {/* Mega Magic Button */}
      <div className="mb-10 flex justify-center">
        <button
          onClick={() => {
            setShowWizard(true)
            setWizardEnergy(null)
          }}
          className="group relative px-6 sm:px-12 py-4 sm:py-5 rounded-3xl font-black text-lg sm:text-2xl tracking-tight overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-95"
          style={{ 
             background: 'var(--accent-gradient)', // Primary Red/Rose gradient
             color: '#fff',
             boxShadow: '0 15px 40px -10px rgba(244, 63, 94, 0.6)'
          }}
        >
          {/* Animated flare */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <span className="relative flex items-center gap-3">
            <span className="text-2xl sm:text-3xl animate-bounce">⚡</span> 
            What can I do right now?
          </span>
        </button>
      </div>

      {/* QUICK ADD INLINE BAR */}
      <div className="mb-12 relative z-10">
        <form 
          onSubmit={handleAdd} 
          className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-col sm:flex-row items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-rose-500/50"
        >
          <input
            type="text"
            required
            placeholder="I need to..."
            className="flex-1 w-full sm:w-auto bg-transparent px-4 py-2 font-medium text-slate-100 placeholder-slate-500 focus:outline-none text-[15px]"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setIsFormExpanded(true)}
          />

          <div className={`flex w-full sm:w-auto overflow-hidden transition-all duration-300 ease-in-out ${isFormExpanded ? 'max-w-[500px] opacity-100' : 'max-w-0 opacity-0 sm:max-w-max sm:opacity-100'}`}>
            <div className="flex flex-1 items-center gap-2 pr-2">
              <select
                value={energy}
                onChange={e => setEnergy(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 text-slate-300 text-[13px] font-bold py-2 px-3 rounded-xl focus:outline-none focus:border-rose-500 transition-colors"
                style={{ appearance: 'none' }}
              >
                <option value="low">🔋 Baja Energía</option>
                <option value="medium">⚡ Media Energía</option>
                <option value="high">🔥 Alta Concentración</option>
              </select>

              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 text-slate-300 text-[13px] font-bold py-2 px-3 rounded-xl focus:outline-none focus:border-rose-500 transition-colors [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 text-white p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5v15m7.5-7.5h-15" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" /></svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-10">
          
          {/* URGENT COLUMN */}
          <div className="xl:col-span-5 space-y-4">
             <div className="flex items-center gap-3 mb-6 px-2">
               <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/20">
                 <span className="text-xl">🚨</span>
               </div>
               <div>
                 <h2 className="text-lg font-black text-slate-100">Hacer Ahora</h2>
                 <p className="text-[11px] uppercase tracking-wider font-bold text-rose-500/80">Crítico (≤ 3 Días)</p>
               </div>
             </div>
             
             <div className="flex flex-col gap-3">
               {categorizedTodos.hacerAhora.length === 0 ? (
                  <div className="text-center py-10 px-6 border border-slate-700/50 border-dashed rounded-3xl bg-slate-800/20 text-slate-500">
                    Ningún incendio activo hoy. 🔥🧯
                  </div>
               ) : (
                  categorizedTodos.hacerAhora.map(t => renderTodoCard(t, 'urgent'))
               )}
             </div>
          </div>

          {/* PLANNED & INBOX COLUMN */}
          <div className="xl:col-span-4 space-y-4">
             <div className="flex items-center gap-3 mb-6 px-2">
               <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
                 <span className="text-xl">📅</span>
               </div>
               <div>
                 <h2 className="text-lg font-black text-slate-100">Agendado</h2>
                 <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-500/80">Futuras (&gt; 3 Días)</p>
               </div>
             </div>

             <div className="flex flex-col gap-3 mb-12">
               {categorizedTodos.agendado.length === 0 ? (
                  <div className="text-center py-6 px-6 border border-slate-700/50 border-dashed rounded-3xl bg-slate-800/20 text-slate-500 text-sm">
                    Agenda vacía.
                  </div>
               ) : (
                  categorizedTodos.agendado.map(t => renderTodoCard(t, 'planned'))
               )}
             </div>

             <div className="flex items-center gap-3 mb-6 px-2">
               <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-slate-800 border border-slate-700">
                 <span className="text-xl">📥</span>
               </div>
               <div>
                 <h2 className="text-lg font-black text-slate-100">Inbox</h2>
                 <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Sin Fecha</p>
               </div>
             </div>

             <div className="flex flex-col gap-3">
               {categorizedTodos.bandeja.map(t => renderTodoCard(t, 'inbox'))}
             </div>
          </div>
          
          {/* STATS PANE (RIGHT) */}
          <div className="xl:col-span-3">
            <div className="sticky top-24 p-6 rounded-[2rem] border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl">
              <h3 className="font-bold text-slate-300 mb-6 text-sm uppercase tracking-widest text-center">Resumen Eisenhower</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-rose-500 font-bold text-sm">🔥🔥 Críticas</span>
                  <span className="text-slate-300 font-black">{categorizedTodos.hacerAhora.filter(t => !t.is_completed).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-emerald-500 font-bold text-sm">📅 Agendadas</span>
                  <span className="text-slate-300 font-black">{categorizedTodos.agendado.filter(t => !t.is_completed).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-slate-400 font-bold text-sm">📥 Inbox</span>
                  <span className="text-slate-300 font-black">{categorizedTodos.bandeja.filter(t => !t.is_completed).length}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}


      {/* MODAL: WHAT CAN I DO NOW? */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowWizard(false)} />
          
          <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl animate-fade-in-up">
            
            <button onClick={() => setShowWizard(false)} className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {!wizardEnergy ? (
              // STEP 1: SELECT ENERGY
              <div className="text-center pb-6">
                <div className="w-20 h-20 mx-auto bg-slate-800 rounded-3xl flex items-center justify-center mb-6 border border-slate-700 shadow-xl">
                  <span className="text-4xl animate-pulse">⚡</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mb-2">How much energy do you have <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-500">right now?</span></h2>
                <p className="text-slate-400 font-medium mb-10">Match your next task to your current state.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(ENERGY_STYLES).map(([key, style]) => (
                    <button
                      key={key}
                      onClick={() => setWizardEnergy(key)}
                      className="flex flex-col items-center p-6 rounded-[2rem] border transition-all duration-300 hover:scale-105 group"
                      style={{ background: 'var(--glass-bg)', borderColor: style.border }}
                    >
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: style.bg, color: style.color }}>
                        <span className="text-3xl">{style.icon}</span>
                      </div>
                      <h3 className="font-bold text-slate-200 text-lg mb-1">{style.label}</h3>
                      <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Energía</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // STEP 2: RECOMMENDATIONS
              <div className="pb-4">
                <button onClick={() => setWizardEnergy(null)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-6 font-bold transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Volver
                </button>

                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-800">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: ENERGY_STYLES[wizardEnergy].bg, color: ENERGY_STYLES[wizardEnergy].color, border: `1px solid ${ENERGY_STYLES[wizardEnergy].border}` }}>
                    <span className="text-2xl">{ENERGY_STYLES[wizardEnergy].icon}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-100">Matching Tasks</h2>
                    <p className="text-slate-400 text-sm">Sorted by Eisenhower urgency.</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {wizardRecommendations.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-slate-500 text-lg mb-2">No tienes tareas pendientes para este nivel de energía.</p>
                      <span className="text-4xl">🎉</span>
                    </div>
                  ) : (
                    wizardRecommendations.map((todo, idx) => (
                      <div key={todo.id} className="relative">
                         {/* Highlight the #1 recommendation */}
                         {idx === 0 && (
                            <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.5)] hidden sm:flex">
                              <span className="text-white text-xs font-black">#1</span>
                            </div>
                         )}
                         {renderTodoCard(todo, todo.due_date ? (new Date(todo.due_date) <= new Date(new Date().setDate(new Date().getDate() + 3)) ? 'urgent' : 'planned') : 'inbox')}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
