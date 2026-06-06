import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { toDateStr } from '../utils/challenge'

export default function NightReflectionModal() {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  // Once shown / skipped / saved this session, stop re-checking so we don't nag.
  const handledRef = useRef(false)

  const checkIfNeeded = useCallback(async () => {
    if (handledRef.current) return
    try {
      const hour = new Date().getHours()
      if (hour < 21) return // Only show after 21:00

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // BUG 4 FIX: fecha LOCAL, coherente con el disparador por hora local (>= 21h)
      const todayStr = toDateStr(new Date())

      const { data, error } = await supabase
        .from('daily_reflections')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .limit(1)

      if (error) return // table may not exist yet

      // Reflection already exists, or we're about to show it → stop checking either way
      handledRef.current = true
      if (!data || data.length === 0) {
        setVisible(true)
      }
    } catch (err) {
      console.error('[Reflection] Error checking:', err)
    }
  }, [])

  // BUG 5.3 FIX: the component never unmounts, so a one-shot check at mount means
  // opening the app before 21:00 hides the modal forever. Re-check on an interval
  // and whenever the tab regains focus.
  useEffect(() => {
    checkIfNeeded()
    const interval = setInterval(checkIfNeeded, 5 * 60 * 1000) // every 5 min
    const onVisibility = () => { if (!document.hidden) checkIfNeeded() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [checkIfNeeded])

  const saveMood = async (mood) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }

      const todayStr = toDateStr(new Date())

      const { error } = await supabase.from('daily_reflections').insert([{
        user_id: user.id,
        date: todayStr,
        mood
      }])

      // BUG 6 FIX: si falla, no cerrar el modal como si se hubiera guardado
      if (error) {
        console.error('[Reflection] Error saving:', error)
        alert('No se pudo guardar tu reflexión, inténtalo de nuevo')
        setSaving(false)
        return
      }
      setSaving(false)
      setVisible(false)
    } catch (err) {
      console.error('[Reflection] Error:', err)
      setSaving(false)
    }
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      animation: 'fadeIn 200ms ease-out'
    }}>
      <div style={{
        background: '#111113',
        borderRadius: 20,
        padding: '32px 24px',
        width: '90%',
        maxWidth: 340,
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Skip button */}
        <button
          onClick={() => setVisible(false)}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none',
            color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
            opacity: 0.6
          }}
        >
          Saltar
        </button>

        {/* Title */}
        <h2 style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text1)',
          textAlign: 'center', marginBottom: 28, marginTop: 4
        }}>
          ¿Cómo ha ido hoy?
        </h2>

        {/* Mood buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { mood: 'bien', emoji: '💪', label: 'Bien' },
            { mood: 'regular', emoji: '😐', label: 'Regular' },
            { mood: 'dificil', emoji: '😓', label: 'Difícil' }
          ].map(opt => (
            <button
              key={opt.mood}
              onClick={() => saveMood(opt.mood)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px 20px', borderRadius: 14,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 16, fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
                transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: 22 }}>{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
