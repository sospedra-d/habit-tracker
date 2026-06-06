/**
 * Calcula los días de gracia según la duración del reto.
 * 1-7 días → 0 gracia, 8-21 días → 1 gracia, 22+ días → 2 gracia.
 */
function getGraceDays(challengeDays) {
  if (challengeDays <= 7) return 0
  if (challengeDays <= 21) return 1
  return 2
}

/**
 * Formatea una Date a 'YYYY-MM-DD' usando componentes LOCALES (sin desfase de
 * zona horaria que sí tiene toISOString(), que devuelve la fecha en UTC).
 */
export function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calcula el estado del reto de consistencia de un hábito.
 *
 * @param {object} habit - El hábito con challenge_active, challenge_days, challenge_started_at
 * @param {Array} allLogs - Todos los habit_logs relevantes (con habit_id, completed_at, count)
 * @param {string} todayStr - Fecha de hoy en formato 'YYYY-MM-DD'
 * @returns {object} { isActive, streak, showRedX, isInFailureState, needsDeactivation, isCompleted }
 */
export function getChallengeStatus(habit, allLogs, todayStr) {
  const inactive = {
    isActive: false,
    streak: 0,
    showRedX: false,
    isInFailureState: false,
    needsDeactivation: false,
    isCompleted: false
  }

  if (!habit.challenge_active) return inactive

  if (!habit.challenge_started_at) {
    return { ...inactive, isActive: true }
  }

  // --- Fechas clave ---
  const today = new Date(todayStr + 'T00:00:00')
  const startedAt = new Date(habit.challenge_started_at)
  startedAt.setHours(0, 0, 0, 0)

  // --- Set de fechas completadas para este hábito ---
  const habitLogs = (allLogs || []).filter(l => l.habit_id === habit.id)
  const completedDates = new Set(habitLogs.map(l => l.completed_at))

  const hasLogToday = completedDates.has(todayStr)

  // --- Días de gracia ---
  const graceDaysTotal = getGraceDays(habit.challenge_days)

  // --- CÁLCULO DE RACHA ---
  // Si hay log hoy → empezar desde hoy
  // Si NO hay log hoy → empezar desde ayer
  const startFrom = new Date(today)
  if (!hasLogToday) {
    startFrom.setDate(startFrom.getDate() - 1)
  }

  let streak = 0
  let graceDaysUsed = 0
  let d = new Date(startFrom)

  while (d >= startedAt) {
    const dStr = toDateStr(d)
    if (completedDates.has(dStr)) {
      streak++
    } else {
      // Intentar usar un día de gracia
      if (graceDaysUsed < graceDaysTotal) {
        graceDaysUsed++
        // No suma a la racha pero no la interrumpe → continuar
      } else {
        // Sin gracia restante → racha rota
        break
      }
    }
    d.setDate(d.getDate() - 1)
  }

  // --- ESTADO DE FALLO ---
  // Se activa cuando: mirando desde AYER hacia atrás, la racha se rompe
  // (es decir, ayer no tiene log Y se agotaron los días de gracia mirando hacia atrás desde ayer)
  // Esto es independiente de si hay log hoy o no.
  let isInFailureState = false

  // Solo puede haber fallo si el reto empezó antes de hoy
  if (startedAt < today) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = toDateStr(yesterday)

    if (!completedDates.has(yesterdayStr)) {
      // Ayer no tiene log → verificar si los días de gracia alcanzan mirando atrás desde ayer
      let graceCheck = 0
      let checkDate = new Date(yesterday)

      // Recorrer hacia atrás desde ayer buscando si la racha ya estaba rota
      while (checkDate >= startedAt) {
        const checkStr = toDateStr(checkDate)
        if (!completedDates.has(checkStr)) {
          graceCheck++
          if (graceCheck > graceDaysTotal) {
            isInFailureState = true
            break
          }
        } else {
          // Encontramos un log → la gracia se usó correctamente, no hay fallo
          break
        }
        checkDate.setDate(checkDate.getDate() - 1)
      }

      // Si recorrimos hasta antes de startedAt sin encontrar log y gracia agotada
      if (checkDate < startedAt && graceCheck > graceDaysTotal) {
        isInFailureState = true
      }
    }
  }

  // Mostrar X roja: en estado fallo Y el usuario NO ha completado hoy
  // (al completar hoy, la X desaparece y el reto se reinicia)
  const showRedX = isInFailureState && !hasLogToday

  // --- DESACTIVACIÓN AUTOMÁTICA (48h) ---
  // Si está en estado fallo Y han pasado 2 días sin log (ayer y anteayer no tienen log)
  // → la ventana de 48h expiró, desactivar reto
  let needsDeactivation = false
  if (isInFailureState) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = toDateStr(yesterday)

    const dayBefore = new Date(today)
    dayBefore.setDate(dayBefore.getDate() - 2)
    const dayBeforeStr = toDateStr(dayBefore)

    // Si ni ayer ni anteayer tienen log, y ambos días están dentro del periodo del reto
    if (!completedDates.has(yesterdayStr) && !completedDates.has(dayBeforeStr) && dayBefore >= startedAt) {
      needsDeactivation = true
    }
  }

  // --- COMPLETADO ---
  const isCompleted = streak >= habit.challenge_days

  return {
    isActive: true,
    streak: Math.min(streak, habit.challenge_days),
    showRedX,
    isInFailureState,
    needsDeactivation,
    isCompleted
  }
}
