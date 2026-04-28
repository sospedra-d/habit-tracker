/**
 * Calcula el estado del reto de consistencia de un hábito.
 *
 * @param {object} habit - El hábito con challenge_active, challenge_days, challenge_started_at
 * @param {Array} allLogs - Todos los habit_logs relevantes (con habit_id, completed_at, count)
 * @param {string} todayStr - Fecha de hoy en formato 'YYYY-MM-DD'
 * @returns {object} { isActive, streak, showRedX, isInFailureState, needsDeactivation, isCompleted }
 */
export function getChallengeStatus(habit, allLogs, todayStr) {
  if (!habit.challenge_active) {
    return {
      isActive: false,
      streak: 0,
      showRedX: false,
      isInFailureState: false,
      needsDeactivation: false,
      isCompleted: false
    }
  }

  if (!habit.challenge_started_at) {
    return {
      isActive: true,
      streak: 0,
      showRedX: false,
      isInFailureState: false,
      needsDeactivation: false,
      isCompleted: false
    }
  }

  // --- Fechas clave ---
  const today = new Date(todayStr + 'T00:00:00')
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const dayBeforeYesterday = new Date(yesterday)
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1)
  const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0]

  const startedAt = new Date(habit.challenge_started_at)
  startedAt.setHours(0, 0, 0, 0)

  // --- Set de fechas completadas para este hábito ---
  const habitLogs = (allLogs || []).filter(l => l.habit_id === habit.id)
  const completedDates = new Set(habitLogs.map(l => l.completed_at))

  const hasLogToday = completedDates.has(todayStr)
  const hasLogYesterday = completedDates.has(yesterdayStr)

  // --- STREAK ---
  // Si completado hoy → contar desde hoy hacia atrás
  // Si NO completado hoy → contar desde ayer hacia atrás
  let streak = 0
  const startFrom = hasLogToday ? new Date(today) : new Date(yesterday)
  let d = new Date(startFrom)

  while (d >= startedAt) {
    const dStr = d.toISOString().split('T')[0]
    if (completedDates.has(dStr)) {
      streak++
    } else {
      break
    }
    d.setDate(d.getDate() - 1)
  }

  // --- ESTADO FALLO ---
  // Ayer no tiene log Y el reto empezó en ayer o antes
  const startedBeforeOrOnYesterday = startedAt <= yesterday
  const isInFailureState = startedBeforeOrOnYesterday && !hasLogYesterday

  // Mostrar X roja: en estado fallo Y el usuario NO ha completado hoy
  const showRedX = isInFailureState && !hasLogToday

  // --- DESACTIVACIÓN AUTOMÁTICA ---
  // Si falta log de ayer Y de anteayer → la ventana de 24h expiró
  let needsDeactivation = false
  if (startedBeforeOrOnYesterday && !hasLogYesterday) {
    const startedBeforeOrOnDBY = startedAt <= dayBeforeYesterday
    if (startedBeforeOrOnDBY && !completedDates.has(dayBeforeYesterdayStr)) {
      needsDeactivation = true
    }
  }

  // --- COMPLETADO ---
  const isCompleted = streak >= habit.challenge_days

  return {
    isActive: true,
    streak,
    showRedX,
    isInFailureState,
    needsDeactivation,
    isCompleted
  }
}
