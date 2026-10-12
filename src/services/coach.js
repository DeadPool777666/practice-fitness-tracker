import { addDays } from './stats.js'
import { dateKey } from './workoutTemplates.js'

const HARD = ['Высокая', 'Экстремальная']
const done = (workouts) => workouts.filter((w) => w.completed)
const lastDays = (workouts, days, today) => done(workouts).filter((w) => w.date > addDays(today, -days) && w.date <= today)

// Простые правила, не ИИ и не медицинские рекомендации
export function getCoachTips(workouts, today = dateKey()) {
  const week = lastDays(workouts, 7, today)
  const tips = []
  if (done(workouts).length === 0) return ['Начни с короткой тренировки на 15–20 минут — главное, начать.']
  if (week.length === 0) tips.push('За последние 7 дней тренировок нет. Давай начнём с короткой.')
  if (week.length >= 5) tips.push('Ты много тренировался на этой неделе. Подумай о дне восстановления.')
  if (week.length > 0 && !week.some((w) => w.type === 'Кардио')) tips.push('На этой неделе не было кардио. Добавь лёгкую пробежку или велосипед.')
  if (week.length > 0 && !week.some((w) => w.type === 'Мобильность')) tips.push('Мобильность на этой неделе не встречалась. 15 минут растяжки помогут восстановлению.')
  const lastTwo = done(workouts).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2)
  if (lastTwo.length === 2 && lastTwo.every((w) => HARD.includes(w.intensity))) tips.push('Последние две тренировки были высокой интенсивности. Сегодня попробуй лёгкую мобильность.')
  if (!tips.length) tips.push('Отличный ритм. Держи баланс силовых, кардио и восстановления.')
  return tips.slice(0, 3)
}

// Игровой показатель 10–100, не медицинская оценка
export function getRecoveryScore(workouts, today = dateKey()) {
  const week = lastDays(workouts, 7, today)
  const hardRecent = lastDays(workouts, 3, today).filter((w) => HARD.includes(w.intensity)).length
  const trainedToday = week.some((w) => w.date === today)
  const trainedYesterday = week.some((w) => w.date === addDays(today, -1))
  const score = Math.max(10, Math.min(100, 100 - week.length * 6 - hardRecent * 12 - (trainedToday ? 10 : 0) - (trainedYesterday ? 8 : 0)))
  const label = score >= 75 ? 'Хороший день для тренировки' : score >= 50 ? 'Умеренная нагрузка — прислушайся к телу' : 'Лучше выбрать лёгкое движение или отдых'
  return { score, label }
}
