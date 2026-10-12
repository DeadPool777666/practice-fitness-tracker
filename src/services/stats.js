import { dateKey } from './workoutTemplates.js'

export const workoutTypes = ['Силовая', 'Кардио', 'Мобильность', 'Кор', 'Другое']

export function addDays(key, amount) {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + amount))
}

// Понедельник недели, в которую попадает дата
export function weekStart(key) {
  const [y, m, d] = key.split('-').map(Number)
  return addDays(key, -((new Date(y, m - 1, d).getDay() + 6) % 7))
}

const doneUntil = (workouts, today) => workouts.filter((w) => w.completed && w.date <= today)

export function computeStreaks(workouts, today = dateKey()) {
  const days = [...new Set(doneUntil(workouts, today).map((w) => w.date))].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const day of days) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  const set = new Set(days)
  let cursor = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(cursor)) { current += 1; cursor = addDays(cursor, -1) }
  return { current, best }
}

export function weeklySummary(workouts, today = dateKey()) {
  const start = weekStart(today)
  const prevStart = addDays(start, -7)
  const inWeek = (w, from) => w.completed && w.date >= from && w.date < addDays(from, 7)
  const current = workouts.filter((w) => inWeek(w, start))
  const previous = workouts.filter((w) => inWeek(w, prevStart))
  const minutes = current.reduce((sum, w) => sum + w.duration, 0)
  const byIntensity = {}
  current.forEach((w) => { byIntensity[w.intensity] = (byIntensity[w.intensity] || 0) + 1 })
  const topIntensity = Object.entries(byIntensity).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  return { count: current.length, minutes, average: current.length ? Math.round(minutes / current.length) : 0, diff: current.length - previous.length, topIntensity }
}

export function buildHeatmap(workouts, weeks = 16, today = dateKey()) {
  const totals = {}
  doneUntil(workouts, today).forEach((w) => { totals[w.date] = (totals[w.date] || 0) + w.duration })
  const first = addDays(weekStart(today), -(weeks - 1) * 7)
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = addDays(first, index)
    const minutes = totals[date] || 0
    const level = date > today ? -1 : minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 90 ? 3 : 4
    return { date, minutes, level }
  })
}

export function formatMinutes(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return hours ? `${hours} ч ${minutes} м` : `${minutes} м`
}

// Ближайшая незавершённая тренировка: сегодня или в будущем
export function nextPlanned(workouts, today = dateKey()) {
  return workouts.filter((w) => !w.completed && w.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)[0] ?? null
}

export const weekdayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
export const weekdayShort = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
export const todayWeekday = (key = dateKey()) => { const [y, m, d] = key.split('-').map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7 }

// «Название; подходы; повторы; вес» построчно <-> массив упражнений
export function parseExerciseLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, sets, reps, weight] = line.split(';').map((part) => part.trim())
    return { name, sets: Number(sets) || 3, reps: Number(reps) || 10, weight: weight ? Number(weight) : null }
  })
}
export const formatExerciseLines = (exercises) => exercises.map((e) => `${e.name}; ${e.sets}; ${e.reps}${e.weight ? `; ${e.weight}` : ''}`).join('\n')
