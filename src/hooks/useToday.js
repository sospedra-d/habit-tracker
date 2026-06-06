import { useState, useEffect } from 'react'
import { toDateStr } from '../utils/challenge'

/**
 * Devuelve la fecha de HOY en formato 'YYYY-MM-DD' usando la zona horaria LOCAL.
 *
 * Se recalcula solo: cada minuto y cada vez que la pestaña recupera el foco, así
 * que si la app se deja abierta y pasa la medianoche, "hoy" avanza al día nuevo
 * (arregla el Bug 3) y nunca usa la fecha UTC (arregla el Bug 4).
 */
export default function useToday() {
  const [todayStr, setTodayStr] = useState(() => toDateStr(new Date()))

  useEffect(() => {
    const sync = () => setTodayStr(prev => {
      const next = toDateStr(new Date())
      return next !== prev ? next : prev
    })
    const id = setInterval(sync, 60 * 1000) // comprobar cada minuto
    const onVisibility = () => { if (!document.hidden) sync() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return todayStr
}
