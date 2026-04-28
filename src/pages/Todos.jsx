import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import TaskFormModal from '../components/TaskFormModal'

const ENERGY_MAP = {
  high: { label: 'Alta', color: '#f97316', dotClass: 'p-alta' },
  medium: { label: 'Media', color: 'var(--blue)', dotClass: 'p-media' },
  low: { label: 'Baja', color: 'var(--text3)', dotClass: 'p-baja' }
}

export default function Todos() {
  const [todos, setTodos] = useState([])
  const [completedTodos, setCompletedTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('auto')
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // BUG 1 FIX: Fetch ALL todos (pending and completed) in one go
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      console.log('[Todos] Fetched all todos:', data?.length, data)

      const pending = (data || []).filter(t => !t.is_completed)
      
      // BUG 2 FIX: filter completed by completed_at within last 24h
      const since24h = Date.now() - 24 * 60 * 60 * 1000
      const completed = (data || []).filter(t => {
        if (!t.is_completed) return false
        const completedAt = t.completed_at ? new Date(t.completed_at).getTime() : 0
        return completedAt > since24h
      })

      setTodos(pending)
      setCompletedTodos(completed)
    } catch (err) { console.error('Error fetching todos:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const categorizedTodos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr + "T00:00:00")
    const urgentDate = new Date(today)
    urgentDate.setDate(today.getDate() + 3)

    const hacerAhora = [], agendado = [], bandeja = []

    const sorted = [...todos].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1; if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })

    sorted.forEach(todo => {
      const t = { ...todo, energy_level: todo.energy_level || 'low' }
      if (!t.due_date) bandeja.push(t)
      else {
        const due = new Date(t.due_date + "T00:00:00")
        if (due <= urgentDate) hacerAhora.push(t)
        else agendado.push(t)
      }
    })

    return { hacerAhora, agendado, bandeja }
  }, [todos])

  const toggleComplete = async (todo) => {
    try {
      const newCompleted = !todo.is_completed
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: newCompleted, completed_at: new Date().toISOString() })
        .eq('id', todo.id)
      if (error) throw error
      await fetchData()
    } catch (err) { console.error(err) }
  }

  const uncompleteTask = async (todo) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: false })
        .eq('id', todo.id)
      if (error) throw error
      await fetchData()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) throw error
      setTodos(prev => prev.filter(t => t.id !== id))
      setCompletedTodos(prev => prev.filter(t => t.id !== id))
    } catch (err) { console.error(err) }
  }

  const getDaysLeftText = (dateStr) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const due = new Date(dateStr + "T00:00:00")
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `Vencido (${Math.abs(diff)}d)`
    if (diff === 0) return 'Hoy'; if (diff === 1) return 'Mañana'
    return `${diff}d`
  }

  const activeTabResolved = useMemo(() => {
    if (activeTab !== 'auto') return activeTab
    if (categorizedTodos.hacerAhora.length > 0) return 'criticas'
    if (categorizedTodos.agendado.length > 0) return 'agendadas'
    if (categorizedTodos.bandeja.length > 0) return 'inbox'
    return 'criticas'
  }, [activeTab, categorizedTodos])

  const activeList = useMemo(() => {
    let list = []
    switch (activeTabResolved) {
      case 'criticas': list = categorizedTodos.hacerAhora; break
      case 'agendadas': list = categorizedTodos.agendado; break
      case 'inbox': list = categorizedTodos.bandeja; break
      case 'completadas': list = completedTodos; break
      default: return []
    }

    const ENERGY_VAL = { high: 3, medium: 2, low: 1 }
    
    return [...list].sort((a, b) => {
      // 1. Sort by energy high to low
      const eA = ENERGY_VAL[a.energy_level || 'low']
      const eB = ENERGY_VAL[b.energy_level || 'low']
      if (eA !== eB) return eB - eA
      
      // 2. Sort by due_date if energy is the same
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })
  }, [activeTabResolved, categorizedTodos, completedTodos])

  // Top focus task = first pending critical task
  const focusTask = categorizedTodos.hacerAhora[0]

  const totalPending = todos.length

  const getEnergyInfo = (level) => ENERGY_MAP[level] || ENERGY_MAP.low

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="screen-header">
        <h1 className="screen-title">Tareas</h1>
        <p className="screen-sub">{totalPending} pendientes</p>
      </div>

      {/* Tabs */}
      <div className="task-tabs">
        <button
          className={`task-tab ${activeTabResolved === 'criticas' ? 'active' : ''}`}
          onClick={() => setActiveTab('criticas')}
        >
          Críticas ({categorizedTodos.hacerAhora.length})
        </button>
        <button
          className={`task-tab ${activeTabResolved === 'agendadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('agendadas')}
        >
          Agendadas ({categorizedTodos.agendado.length})
        </button>
        <button
          className={`task-tab ${activeTabResolved === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          Inbox ({categorizedTodos.bandeja.length})
        </button>
        <button
          className={`task-tab ${activeTabResolved === 'completadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('completadas')}
        >
          ✓ Hoy ({completedTodos.length})
        </button>
      </div>

      {/* Focus card — only on Críticas tab when there's a focus task */}
      {activeTabResolved === 'criticas' && focusTask && (
        <div className="task-focus">
          <div className="focus-label">🔥 Hacer ahora</div>
          <div className="focus-title">{focusTask.title}</div>
          <div className="focus-meta">
            {focusTask.due_date && getDaysLeftText(focusTask.due_date)}
          </div>
          <button className="focus-btn" onClick={() => navigate('/pomodoro')}>
            Iniciar Pomodoro
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <svg className="animate-spin" style={{ width: 24, height: 24, color: 'var(--text3)' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
          </svg>
        </div>
      ) : (
        <div key={activeTabResolved} className="anim-tab-slide" style={{ paddingBottom: 60 }}>
          {activeList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 14 }}>
              {activeTabResolved === 'completadas' ? 'No hay tareas completadas en las últimas 24h' : 'Sin tareas en esta categoría'}
            </div>
          ) : activeTabResolved === 'completadas' ? (
            /* Completed tasks tab */
            activeList.map(todo => {
              const energy = getEnergyInfo(todo.energy_level)
              return (
                <div key={todo.id} className="task-row" style={{ position: 'relative' }}>
                  {/* Undo button */}
                  <button
                    onClick={() => uncompleteTask(todo)}
                    style={{
                      width: 20, height: 20, borderRadius: 5,
                      background: 'var(--text3)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0, marginTop: 1,
                      transition: 'all 0.2s'
                    }}
                    title="Desmarcar"
                  >
                    <svg style={{ width: 12, height: 12, color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>

                  {/* Task info */}
                  <div className="task-info">
                    <div className="task-name completed">{todo.title}</div>
                    <div className="task-meta">
                      <div className={`priority-dot ${energy.dotClass}`} />
                      <span>
                        {energy.label}
                        {todo.due_date && ` · ${getDaysLeftText(todo.due_date)}`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            /* Pending tasks */
            activeList.map(todo => {
              const energy = getEnergyInfo(todo.energy_level)
              return (
                <div key={todo.id} className="task-row" style={{ position: 'relative' }}>
                  {/* Rounded checkbox */}
                  <div
                    className="task-sq"
                    onClick={() => toggleComplete(todo)}
                  >
                  </div>

                  {/* Task info */}
                  <div className="task-info">
                    <div className="task-name">{todo.title}</div>
                    <div className="task-meta">
                      <div className={`priority-dot ${energy.dotClass}`} />
                      <span>
                        {energy.label}
                        {todo.due_date && ` · ${getDaysLeftText(todo.due_date)}`}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(todo.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: 'var(--text3)', fontSize: 12, position: 'absolute', top: 10, right: 0,
                      opacity: 0, transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    title="Eliminar"
                  >✕</button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setModalOpen(true)}>+</button>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => fetchData()}
      />
    </div>
  )
}
