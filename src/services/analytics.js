import { addDays, weekStart } from './stats.js'
import { dateKey } from './workoutTemplates.js'

const count = (items, pick) => items.reduce((map, item) => { const key = pick(item); map[key] = (map[key] || 0) + 1; return map }, {})
const mostFrequent = (entries) => Object.entries(entries).sort((a, b) => b[1] - a[1])[0] ?? null

export function buildAnalytics(workouts, today = dateKey()) {
  const done = workouts.filter((w) => w.completed)
  const minutes = done.reduce((sum, w) => sum + w.duration, 0)
  const thisWeek = weekStart(today)
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = addDays(thisWeek, -(7 - index) * 7)
    const items = done.filter((w) => w.date >= start && w.date < addDays(start, 7))
    return { label: start.slice(8) + '.' + start.slice(5, 7), workouts: items.length, minutes: items.reduce((sum, w) => sum + w.duration, 0) }
  })
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - (5 - index), 1)
    const key = dateKey(date).slice(0, 7)
    return { label: key.slice(5) + '.' + key.slice(2, 4), workouts: done.filter((w) => w.date.startsWith(key)).length }
  })
  const exerciseCounts = {}
  done.forEach((w) => w.exercises.forEach((e) => { exerciseCounts[e.name] = (exerciseCounts[e.name] || 0) + 1 }))
  const moods = done.filter((w) => w.mood)
  const longest = done.reduce((best, w) => (!best || w.duration > best.duration ? w : best), null)
  return {
    total: done.length,
    minutes,
    average: done.length ? Math.round(minutes / done.length) : 0,
    weeks,
    months,
    intensity: Object.entries(count(done, (w) => w.intensity)).map(([label, value]) => ({ label, value })),
    types: Object.entries(count(done, (w) => w.type || 'Другое')).map(([label, value]) => ({ label, value })),
    topExercise: mostFrequent(exerciseCounts),
    longest,
    averageMood: moods.length ? Math.round(moods.reduce((sum, w) => sum + w.mood, 0) / moods.length * 10) / 10 : null,
  }
}

// История упражнения: максимум веса по дням (совпадение по названию без учёта регистра)
export function exerciseHistory(workouts, name) {
  const key = name.trim().toLowerCase()
  const byDate = new Map()
  workouts.filter((w) => w.completed).forEach((w) => w.exercises.forEach((e) => {
    const other = e.name.trim().toLowerCase()
    if (other !== key && !other.includes(key) && !key.includes(other)) return
    const weight = e.weight || 0
    const current = byDate.get(w.date)
    if (!current || weight > current.weight) byDate.set(w.date, { date: w.date, weight, reps: e.reps, sets: e.sets })
  }))
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  let record = null
  points.forEach((p) => { if (p.weight > 0 && (!record || p.weight > record.weight)) record = p })
  return { points, record }
}
