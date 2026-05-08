import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function NightReflectionModal() {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkIfNeeded()
  }, [])

  const checkIfNeeded = async () => {
    try {
      const hour = new Date().getHours()
      if (hour < 21) return // Only show after 21:00

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayStr = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('daily_reflections')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .limit(1)

      if (error) {
        console.log('[Reflection] Table may not exist yet:', error.message)
        return
      }

      // If no reflection today, show modal
      if (!data || data.length === 0) {
        setVisible(true)
      }
    } catch (err) {
      console.error('[Reflection] Error checking:', err)
    }
  }

  const saveMood = async (mood) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayStr = new Date().toISOString().split('T')[0]

      const { error } = await supabase.from('daily_reflections').insert([{
        user_id: user.id,
        date: todayStr,
        mood
      }])

      if (error) console.error('[Reflection] Error saving:', error)
    } catch (err) {
      console.error('[Reflection] Error:', err)
    } finally {
      setSaving(false)
      setVisible(false)
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
