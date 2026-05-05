import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import Dashboard from './Dashboard'

const COLORS = ['#3b7ef8','#0d9488','#c9963a','#22c55e','#a855f7','#f97316']

function calcProgress(milestones) {
  if (!milestones || milestones.length === 0) return 0
  let sum = 0
  milestones.forEach(m => {
    if (m.type === 'checkbox') {
      sum += m.is_completed ? 1 : 0
    } else {
      const t = m.target_count || 1
      sum += Math.min((m.current_count || 0) / t, 1)
    }
  })
  return Math.round((sum / milestones.length) * 100)
}

// ─── Goal Create Modal ───
function GoalModal({ open, onClose, onSave }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), color })
    setSaving(false)
    setName(''); setColor(COLORS[0])
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content animate-fade-in-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:600, color:'var(--text1)' }}>Nueva Meta</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <input
          value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la meta..."
          autoFocus style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text1)', outline:'none', marginBottom:14, boxSizing:'border-box' }}
        />
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8, fontWeight:500 }}>Color</div>
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width:32, height:32, borderRadius:10, background:c, cursor:'pointer',
              border: color === c ? '2px solid var(--text1)' : '2px solid transparent',
              transition:'border 0.2s'
            }} />
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:12, fontSize:14, fontWeight:500, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ flex:1, padding:12, borderRadius:12, fontSize:14, fontWeight:600, background:'#dc2020', border:'none', color:'white', cursor:'pointer', opacity:(saving||!name.trim())?0.5:1 }}>
            {saving ? 'Guardando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Milestone Create Modal ───
function MilestoneModal({ open, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('checkbox')
  const [target, setTarget] = useState(1)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), type, target_count: type === 'counter' ? Number(target) : 1 })
    setSaving(false)
    setTitle(''); setType('checkbox'); setTarget(1)
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content animate-fade-in-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:600, color:'var(--text1)' }}>Nuevo Hito</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del hito..." autoFocus
          style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text1)', outline:'none', marginBottom:14, boxSizing:'border-box' }}
        />
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8, fontWeight:500 }}>Tipo</div>
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[{v:'checkbox',l:'Checkbox ☑'},{v:'counter',l:'Contador 🔢'}].map(o => (
            <button key={o.v} type="button" onClick={() => setType(o.v)} style={{
              flex:1, padding:'10px 8px', borderRadius:10, fontSize:13, fontWeight:500, border:'1px solid', cursor:'pointer', transition:'all 0.2s', textAlign:'center',
              background: type===o.v ? 'var(--surface3)' : 'transparent', color: type===o.v ? 'var(--text1)' : 'var(--text2)', borderColor: type===o.v ? 'var(--border2)' : 'var(--border)'
            }}>{o.l}</button>
          ))}
        </div>
        {type === 'counter' && (
          <input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="Objetivo" style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:14, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text1)', outline:'none', marginBottom:14, boxSizing:'border-box' }} />
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:12, fontSize:14, fontWeight:500, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)', cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving||!title.trim()} style={{ flex:1, padding:12, borderRadius:12, fontSize:14, fontWeight:600, background:'#dc2020', border:'none', color:'white', cursor:'pointer', opacity:(saving||!title.trim())?0.5:1 }}>
            {saving ? 'Guardando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Goal Detail View ───
function GoalDetail({ goal, milestones, onBack, onRefresh, onComplete }) {
  const [msModal, setMsModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [poppingId, setPoppingId] = useState(null)
  const [bouncingId, setBouncingId] = useState(null)
  const [btnVisible, setBtnVisible] = useState(false)
  const progress = calcProgress(milestones)
  const completedCount = milestones.filter(m => m.is_completed).length
  const allDone = milestones.length > 0 && progress === 100

  // Animate button appearance/disappearance
  useEffect(() => {
    if (allDone) {
      // Small delay so it feels reactive, not instant
      const t = setTimeout(() => setBtnVisible(true), 50)
      return () => clearTimeout(t)
    } else {
      setBtnVisible(false)
    }
  }, [allDone])

  const addMilestone = async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('milestones').insert([{ goal_id: goal.id, user_id: user.id, ...data }])
    onRefresh()
  }

  const toggleCheckbox = async (m) => {
    setPoppingId(m.id)
    setTimeout(() => setPoppingId(null), 250)
    const done = !m.is_completed
    await supabase.from('milestones').update({ is_completed: done, completed_at: done ? new Date().toISOString() : null }).eq('id', m.id)
    onRefresh()
  }

  const updateCounter = async (m, delta) => {
    setBouncingId(m.id)
    setTimeout(() => setBouncingId(null), 200)
    const next = Math.max(0, (m.current_count || 0) + delta)
    const done = next >= (m.target_count || 1)
    await supabase.from('milestones').update({ current_count: next, is_completed: done, completed_at: done ? new Date().toISOString() : (next < (m.target_count||1) ? null : m.completed_at) }).eq('id', m.id)
    onRefresh()
  }

  const deleteGoal = async () => {
    if (!confirm('¿Eliminar esta meta y todos sus hitos?')) return
    setDeleting(true)
    await supabase.from('goals').delete().eq('id', goal.id)
    onBack()
  }

  return (
    <div className="anim-goal-detail">
      <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, marginBottom:16, padding:0, display:'flex', alignItems:'center', gap:4 }}>
        ← Volver a metas
      </button>

      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text1)', marginBottom:8 }}>{goal.name}</h2>
        <div style={{ width:'100%', height:6, background:'var(--border)', borderRadius:3, marginBottom:6 }}>
          <div style={{ width:`${progress}%`, height:'100%', background:goal.color, borderRadius:3, transition:'width 0.4s ease-out' }} />
        </div>
        <div style={{ fontSize:12, color:'var(--text3)' }}>{completedCount} / {milestones.length} hitos completados · {progress}%</div>

        {/* Complete button — only when all milestones done */}
        <div style={{
          overflow:'hidden', maxHeight: btnVisible ? 80 : 0,
          opacity: btnVisible ? 1 : 0,
          transform: btnVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease',
          marginTop: btnVisible ? 12 : 0
        }}>
          <button onClick={() => onComplete(goal)} style={{
            width:'100%', padding:14, borderRadius:14, fontSize:15, fontWeight:600,
            background:'rgba(201,150,58,0.12)', border:'1px solid #c9963a', color:'#c9963a',
            cursor:'pointer', transition:'all 0.2s'
          }}>
            ✓ Completar Meta
          </button>
        </div>
      </div>

      {milestones.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)', fontSize:14 }}>
          Añade hitos para definir el camino hacia tu meta
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {milestones.map(m => (
          <div key={m.id} style={{
            display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14,
            background:'#111113', border:'1px solid rgba(255,255,255,0.07)'
          }}>
            {m.type === 'checkbox' ? (
              <div onClick={() => toggleCheckbox(m)} className={poppingId === m.id ? 'anim-check-pop' : ''} style={{
                width:22, height:22, borderRadius:11, border:`2px solid ${m.is_completed ? goal.color : 'var(--border)'}`,
                background: m.is_completed ? goal.color : 'transparent', cursor:'pointer', transition:'all 0.2s',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
              }}>
                {m.is_completed && <span style={{ fontSize:10, color:'white' }}>✓</span>}
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                <button onClick={() => updateCounter(m, -1)} style={{ width:26, height:26, borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span className={bouncingId === m.id ? 'anim-counter-bounce' : ''} style={{ fontSize:13, fontWeight:600, color: m.is_completed ? goal.color : 'var(--text1)', minWidth:40, textAlign:'center', display:'inline-block' }}>
                  {m.current_count || 0}/{m.target_count}
                </span>
                <button onClick={() => updateCounter(m, 1)} style={{ width:26, height:26, borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text2)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              </div>
            )}
            <span style={{ fontSize:14, color: m.is_completed ? 'var(--text3)' : 'var(--text1)', textDecoration: m.is_completed ? 'line-through' : 'none', flex:1 }}>
              {m.title}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, marginTop:20 }}>
        <button onClick={() => setMsModal(true)} style={{
          flex:1, padding:12, borderRadius:12, fontSize:14, fontWeight:500,
          background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text1)', cursor:'pointer'
        }}>+ Añadir hito</button>
        <button onClick={deleteGoal} disabled={deleting} style={{
          padding:'12px 16px', borderRadius:12, fontSize:14, fontWeight:500,
          background:'transparent', border:'1px solid rgba(220,32,32,0.3)', color:'#dc2020', cursor:'pointer', opacity: deleting ? 0.5 : 1
        }}>Eliminar</button>
      </div>

      <MilestoneModal open={msModal} onClose={() => setMsModal(false)} onSave={addMilestone} />
    </div>
  )
}

// ─── Legacy Section (collapsible goals + habit challenges) ───
function LegacySection() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [expandedMilestones, setExpandedMilestones] = useState([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('achievements').select('*').eq('user_id', user.id).order('achieved_at', { ascending: false })
      setAchievements(data || [])
      setLoading(false)
    })()
  }, [])

  const toggleExpand = async (a) => {
    if (a.type !== 'goal') return
    if (expandedId === a.id) {
      setExpandedId(null)
      setExpandedMilestones([])
      return
    }
    // Find the goal by name to get its id, then fetch milestones
    const { data: goals } = await supabase.from('goals').select('id').eq('name', a.name).eq('is_completed', true).limit(1)
    if (goals && goals.length > 0) {
      const { data: ms } = await supabase.from('milestones').select('*').eq('goal_id', goals[0].id).eq('is_completed', true).order('created_at', { ascending: true })
      setExpandedMilestones(ms || [])
    } else {
      setExpandedMilestones([])
    }
    setExpandedId(a.id)
  }

  // Separate goal achievements from habit challenges
  const goalAchievements = achievements.filter(a => a.type === 'goal')
  const habitChallenges = achievements.filter(a => a.type === 'habit_challenge')

  // De-duplicate habit challenges: keep only highest challenge_days per habit name
  const uniqueChallenges = useMemo(() => {
    const byName = {}
    habitChallenges.forEach(c => {
      const name = c.name
      if (!byName[name] || (c.challenge_days || 0) > (byName[name].challenge_days || 0)) {
        byName[name] = c
      }
    })
    // Sort by most recent first
    return Object.values(byName).sort((a, b) => new Date(b.achieved_at) - new Date(a.achieved_at))
  }, [habitChallenges])

  if (loading) return null

  const hasGoals = goalAchievements.length > 0
  const hasChallenges = uniqueChallenges.length > 0

  return (
    <div style={{ marginTop: 24 }}>
      <div className="section-label">Legado</div>
      {!hasGoals && !hasChallenges ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:'#a1a1aa', fontSize:14 }}>
          Aquí aparecerán tus logros
        </div>
      ) : (
        <>
          {/* Completed goals */}
          {hasGoals && (
            <div style={{ display:'flex', flexDirection:'column' }}>
              {goalAchievements.map((a, i) => {
                const isExpanded = expandedId === a.id

                return (
                  <div key={a.id}>
                    <div onClick={() => toggleExpand(a)} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'14px 0',
                      borderBottom: (i < goalAchievements.length - 1 && !isExpanded) ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      cursor: 'pointer'
                    }}>
                      <span style={{ fontSize:18 }}>🚩</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, color:'var(--text1)', fontWeight:500 }}>{a.name}</div>
                        <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                          {new Date(a.achieved_at).toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}
                        </div>
                      </div>
                      <span style={{
                        fontSize:12, color:'var(--text3)', transition:'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display:'inline-block'
                      }}>›</span>
                    </div>

                    {/* Expanded milestones */}
                    <div style={{
                      overflow:'hidden', maxHeight: isExpanded ? 500 : 0, opacity: isExpanded ? 1 : 0,
                      transition:'max-height 0.2s ease, opacity 0.2s ease',
                      borderBottom: isExpanded && i < goalAchievements.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                    }}>
                      {expandedMilestones.map(m => (
                        <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0 8px 30px' }}>
                          <span style={{ fontSize:12, color:'var(--gold)' }}>✓</span>
                          <span style={{ fontSize:13, color:'var(--text2)' }}>{m.title}</span>
                        </div>
                      ))}
                      {expandedMilestones.length === 0 && isExpanded && (
                        <div style={{ padding:'8px 0 8px 30px', fontSize:12, color:'var(--text3)' }}>Sin hitos registrados</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Retos superados — habit challenges */}
          {hasChallenges && (
            <div style={{ marginTop: hasGoals ? 20 : 0 }}>
              <div className="section-label">Retos superados</div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {uniqueChallenges.map((c, i) => (
                  <div key={c.id} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'14px 0',
                    borderBottom: i < uniqueChallenges.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                  }}>
                    <span style={{ fontSize:18 }}>🏅</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, color:'var(--text1)', fontWeight:500 }}>
                        {c.name}
                        <span style={{ color:'var(--gold)', marginLeft:6, fontSize:12, fontWeight:400 }}>
                          {c.challenge_days ? `${c.challenge_days} días consecutivos` : ''}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                        {new Date(c.achieved_at).toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Goals Page ───
export default function Goals() {
  const [view, setView] = useState('active')
  const [goals, setGoals] = useState([])
  const [milestonesMap, setMilestonesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [goalModal, setGoalModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [celebratingId, setCelebratingId] = useState(null)
  const [completionPhase, setCompletionPhase] = useState(null) // 'bar' | 'text' | 'glow'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: gData } = await supabase.from('goals').select('*').eq('is_completed', false).order('created_at', { ascending: true })
      setGoals(gData || [])

      if (gData && gData.length > 0) {
        const gids = gData.map(g => g.id)
        const { data: mData } = await supabase.from('milestones').select('*').in('goal_id', gids).order('created_at', { ascending: true })
        const map = {}
        gids.forEach(id => { map[id] = [] })
        ;(mData || []).forEach(m => {
          if (!map[m.goal_id]) map[m.goal_id] = []
          map[m.goal_id].push(m)
        })
        setMilestonesMap(map)
      } else {
        setMilestonesMap({})
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Goal completion sequence: bar → pause → text pop → glow
  const runCompletionSequence = useCallback(async (goalId, goalName) => {
    setCelebratingId(goalId)
    setCompletionPhase('bar')

    // Phase 1: bar fills (400ms)
    await new Promise(r => setTimeout(r, 400))
    // Phase 2: pause (200ms)
    await new Promise(r => setTimeout(r, 200))
    // Phase 3: text pop (300ms)
    setCompletionPhase('text')
    await new Promise(r => setTimeout(r, 300))
    // Phase 4: glow (1500ms)
    setCompletionPhase('glow')

    // Persist to DB
    await supabase.from('goals').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', goalId)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('achievements').insert([{ user_id: user.id, type: 'goal', name: goalName, achieved_at: new Date().toISOString() }])
    }

    await new Promise(r => setTimeout(r, 1000))
    setCelebratingId(null)
    setCompletionPhase(null)
    setSelectedGoal(null)
    await fetchData()
  }, [fetchData])

  const refreshDetail = useCallback(async () => {
    if (!selectedGoal) return
    const { data: ms } = await supabase.from('milestones').select('*').eq('goal_id', selectedGoal.id).order('created_at', { ascending: true })
    setMilestonesMap(prev => ({ ...prev, [selectedGoal.id]: ms || [] }))
  }, [selectedGoal])

  const handleManualComplete = useCallback(async (goal) => {
    runCompletionSequence(goal.id, goal.name)
  }, [runCompletionSequence])

  const createGoal = async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('goals').insert([{ user_id: user.id, ...data }])
    await fetchData()
  }

  // Detail view
  if (selectedGoal) {
    const gMs = milestonesMap[selectedGoal.id] || []
    return (
      <div>
        <GoalDetail goal={selectedGoal} milestones={gMs} onBack={() => { setSelectedGoal(null); fetchData() }} onRefresh={refreshDetail} onComplete={handleManualComplete} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="screen-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="screen-title">{view === 'active' ? 'Metas' : 'Estadísticas'}</h1>
          <p className="screen-sub">{view === 'active' ? `${goals.length} meta${goals.length !== 1 ? 's' : ''} activa${goals.length !== 1 ? 's' : ''}` : 'Tu progreso y legado'}</p>
        </div>
        <button onClick={() => setView(view === 'active' ? 'stats' : 'active')} style={{
          background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 12px',
          color:'var(--text2)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:4, transition:'all 0.2s', marginTop:4
        }}>
          {view === 'active' ? '📊' : '🚩'}
        </button>
      </div>

      {view === 'active' ? (
        <>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
              <svg className="animate-spin" style={{ width:24, height:24, color:'var(--text3)' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity:0.25 }} />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity:0.75 }} />
              </svg>
            </div>
          ) : goals.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)', fontSize:14 }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:0.3 }}>🚩</div>
              Crea tu primera meta para empezar
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {goals.map(g => {
                const ms = milestonesMap[g.id] || []
                const progress = calcProgress(ms)
                const completed = ms.filter(m => m.is_completed).length
                const isCelebrating = celebratingId === g.id

                return (
                  <div key={g.id} onClick={() => !isCelebrating && setSelectedGoal(g)} style={{
                    background:'#111113', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:16, cursor: isCelebrating ? 'default' : 'pointer',
                    transition:'all 0.3s', position:'relative', overflow:'hidden',
                    boxShadow: (isCelebrating && completionPhase === 'glow') ? `0 0 30px ${g.color}40` : 'none'
                  }}>
                    {isCelebrating && completionPhase === 'glow' && (
                      <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, ${g.color}20, transparent)`, animation:'pulse 0.5s ease-in-out infinite alternate', borderRadius:20 }} />
                    )}
                    <div style={{ fontSize:16, fontWeight:600, color:'var(--text1)', marginBottom:10, position:'relative' }}>{g.name}</div>
                    <div style={{ width:'100%', height:5, background:'var(--border)', borderRadius:3, marginBottom:8, position:'relative' }}>
                      <div style={{
                        width: (isCelebrating && completionPhase === 'bar') ? '100%' : `${progress}%`,
                        height:'100%', background:g.color, borderRadius:3,
                        transition: (isCelebrating && completionPhase === 'bar') ? 'width 0.4s ease-out' : 'width 0.4s'
                      }} />
                    </div>
                    <div style={{
                      fontSize:12, color: (isCelebrating && completionPhase === 'text') ? '#c9963a' : 'var(--text3)',
                      position:'relative',
                      animation: (isCelebrating && completionPhase === 'text') ? 'goalTextPop 300ms ease-out' : 'none',
                      fontWeight: (isCelebrating && completionPhase === 'text') ? 600 : 400
                    }}>
                      {completed} / {ms.length} hitos completados
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button className="fab" onClick={() => setGoalModal(true)}>+</button>
          <GoalModal open={goalModal} onClose={() => setGoalModal(false)} onSave={createGoal} />
        </>
      ) : (
        <>
          <Dashboard embedded />
          <LegacySection />
        </>
      )}
    </div>
  )
}
