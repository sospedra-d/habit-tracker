import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Todos() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const
  [description, setDescription] = useState('')

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

  // Automatic Classification Logic
  const classifiedTodos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr + "T00:00:00")
    
    // Urgent margin: 3 days from today
    const urgentDate = new Date(today)
    urgentDate.setDate(today.getDate() + 3)

    const hacerAhora = []
    const agendado = []
    const bandeja = []

    // Sort todos chronologically by due_date if they have one
    const sortedTodos = [...todos].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })

    sortedTodos.forEach((todo) => {
      if (!todo.due_date) {
        bandeja.push(todo)
      } else {
        const due = new Date(todo.due_date + "T00:00:00")
        if (due <= urgentDate) {
          hacerAhora.push(todo)
        } else {
          agendado.push(todo)
        }
      }
    })

    return { hacerAhora, agendado, bandeja }
  }, [todos])

  // Mock global stats increment
  const mockIncrementGlobalStats = () => {
    // In a real Redux/Context setup this would trigger a global "tasks completed" counter.
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
      if (isNowCompleted) {
        mockIncrementGlobalStats()
      }
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
        description: description.trim() || null,
        due_date: dueDate || null,
        user_id: user.id
      }

      const { data, error } = await supabase.from('todos').insert([payload]).select()
      if (error) throw error

      if (data) {
        setTodos(prev => [data[0], ...prev])
      }
      
      setTitle('')
      setDescription('')
      setDueDate('')
    } catch (err) {
      console.error('Error adding todo:', err)
    }
  }

  // Calculate days left for formatting
  const getDaysLeftText = (dateStr) => {
    const today = new Date()
    today.setHours(0,0,0,0)
    const due = new Date(dateStr + "T00:00:00")
    
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `Atrasado por ${Math.abs(diffDays)}d`
    if (diffDays === 0) return '¡Hoy!'
    if (diffDays === 1) return 'Mañana'
    return `En ${diffDays} días`
  }

  const renderTodoCard = (todo, type) => {
    const isUrgent = type === 'urgent'
    const isPlanned = type === 'planned'

    return (
      <div 
        key={todo.id} 
        className={`group flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 ${todo.is_completed ? 'opacity-60 grayscale' : 'hover:-translate-y-1 hover:shadow-lg'}`}
        style={{
          background: 'var(--bg-card)',
          borderColor: isUrgent && !todo.is_completed ? 'rgba(244, 63, 94, 0.4)' : isPlanned && !todo.is_completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)',
        }}
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => toggleComplete(todo)}
            className="mt-1 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-200"
            style={{
              borderColor: todo.is_completed ? (isUrgent ? 'var(--accent-primary)' : '#10b981') : 'var(--border-subtle)',
              background: todo.is_completed ? (isUrgent ? 'var(--accent-gradient)' : '#10b981') : 'transparent'
            }}
          >
            {todo.is_completed && (
               <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
               </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h4 className={`font-bold text-sm truncate ${todo.is_completed ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
              {todo.title}
            </h4>
            {todo.description && (
              <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                {todo.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-3">
              {todo.due_date && (
                <span 
                  className="px-2 py-1 rounded-md text-[10px] font-bold"
                  style={{ 
                    background: isUrgent ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.1)', 
                    color: isUrgent ? 'var(--accent-primary)' : '#10b981'
                  }}
                >
                  {getDaysLeftText(todo.due_date)} {todo.due_date.split('-').reverse().slice(0,2).join('/')}
                </span>
             )}
              
             {/* Pomodoro Quick Link */}
             {isUrgent && !todo.is_completed && (
                <button 
                  onClick={() => navigate('/pomodoro')}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}
                  title="Empezar Pomodoro"
                >
                  <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 20.04c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                  </svg>
                  Enfocar
                </button>
             )}
            </div>
          </div>
          
          <button
            onClick={() => handleDelete(todo.id)}
            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-500/20"
            style={{ color: 'var(--accent-primary)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 pb-12 mt-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Productividad
        </h1>
        <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Matriz de Priorización Automática
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Dashboard Prioritization (Matrix) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Urgent / Hacer Ahora */}
            <div className="p-6 rounded-[2rem] border relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'rgba(244, 63, 94, 0.2)', boxShadow: '0 10px 30px -10px rgba(244, 63, 94, 0.1)' }}>
               {/* Background Glow */}
               <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[60px] pointer-events-none" style={{ background: 'var(--accent-primary)', opacity: 0.15 }} />
               
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-gradient)' }}>
                     <span className="text-xl">🔥</span>
                   </div>
                   <div>
                     <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Hacer Ahora</h2>
                     <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--accent-primary)' }}>Urgente e Importante (≤ 3 Días)</p>
                   </div>
                 </div>

                 {classifiedTodos.hacerAhora.length === 0 ? (
                    <p className="text-sm italic py-4" style={{ color: 'var(--text-secondary)' }}>No hay tareas críticas a la vista.</p>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {classifiedTodos.hacerAhora.map(t => renderTodoCard(t, 'urgent'))}
                    </div>
                 )}
               </div>
            </div>

            {/* Agendado / Planned */}
            <div className="p-6 rounded-[2rem] border relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
               {/* Background Glow */}
               <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[60px] pointer-events-none" style={{ background: '#10b981', opacity: 0.1 }} />
               
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500">
                     <span className="text-xl text-white">📅</span>
                   </div>
                   <div>
                     <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Agendado</h2>
                     <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-500">Importante (Futuro &gt; 3 Días)</p>
                   </div>
                 </div>

                 {classifiedTodos.agendado.length === 0 ? (
                    <p className="text-sm italic py-4" style={{ color: 'var(--text-secondary)' }}>Tu agenda futura está despejada.</p>
                 ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {classifiedTodos.agendado.map(t => renderTodoCard(t, 'planned'))}
                    </div>
                 )}
               </div>
            </div>

          </div>

          {/* Inbox & Create (Right Column) */}
          <div className="space-y-6">
            
            {/* Create Form */}
            <div className="p-5 rounded-[1.5rem] border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Nueva Tarea</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Terminar informe..."
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-rose-500"
                    style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Descripción (opcional)"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-rose-500 resize-none"
                    style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1.5 font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Fecha Límite (Opcional)</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border text-sm transition-colors focus:outline-none focus:border-rose-500"
                    style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                  style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 15px rgba(244, 63, 94, 0.3)' }}
                >
                  Añadir al Sistema
                </button>
              </form>
            </div>

            {/* Bandeja General */}
            <div className="p-5 rounded-[1.5rem] border flex flex-col min-h-[300px]" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📥</span>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Bandeja General</h3>
              </div>
              <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>
                Tareas sin fecha ("Algún día").
              </p>
              
              <div className="flex-1 space-y-3">
                 {classifiedTodos.bandeja.length === 0 ? (
                    <p className="text-xs italic text-center py-8" style={{ color: 'var(--text-secondary)' }}>Bandeja vacía.</p>
                 ) : (
                    classifiedTodos.bandeja.map(t => renderTodoCard(t, 'inbox'))
                 )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
