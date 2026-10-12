import { db } from './db.js'

// ---------- даты ----------
function localKey(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
export const todayKey = () => localKey(new Date())
export function addDays(key, amount) {
  const [y, m, d] = key.split('-').map(Number)
  return localKey(new Date(y, m - 1, d + amount))
}
export function weekStart(key) {
  const [y, m, d] = key.split('-').map(Number)
  return addDays(key, -((new Date(y, m - 1, d).getDay() + 6) % 7))
}

// ---------- метрики ----------
export function bestStreak(dates) {
  const days = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const day of days) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}
export function currentStreak(dates, today = todayKey()) {
  const set = new Set(dates)
  let cursor = set.has(today) ? today : addDays(today, -1)
  let count = 0
  while (set.has(cursor)) { count += 1; cursor = addDays(cursor, -1) }
  return count
}

// kind: workouts | cardio | hours | days | streak
export function metric(kind, workouts) {
  if (kind === 'workouts') return workouts.length
  if (kind === 'cardio') return workouts.filter((w) => w.type === 'Кардио').length
  if (kind === 'hours') return Math.round(workouts.reduce((sum, w) => sum + w.duration, 0) / 6) / 10
  if (kind === 'days') return new Set(workouts.map((w) => w.date)).size
  if (kind === 'streak') return bestStreak(workouts.map((w) => w.date))
  return 0
}

function loadCompleted(userId) {
  return db.prepare('SELECT id, date, duration, intensity, type, exercises, mood FROM workouts WHERE user_id = ? AND completed = 1').all(userId)
}
// created_at хранится в UTC — отступаем на день, чтобы не потерять тренировку из-за часового пояса
const sinceKey = (timestamp) => addDays(String(timestamp).slice(0, 10), -1)
const since = (workouts, timestamp) => workouts.filter((w) => w.date >= sinceKey(timestamp))

export function goalCurrent(goal, workouts) {
  return metric(goal.type, since(workouts, goal.created_at))
}
export function challengeProgress(challenge, joinedAt, workouts) {
  return metric(challenge.kind, since(workouts, joinedAt))
}

// ---------- достижения ----------
export const ACHIEVEMENTS = [
  { code: 'first', emoji: '🏁', title: 'Первая тренировка', description: 'Выполни первую тренировку', test: (s) => s.count >= 1 },
  { code: 'streak3', emoji: '🔥', title: 'Серия 3 дня', description: 'Тренируйся 3 дня подряд', test: (s) => s.best >= 3 },
  { code: 'streak7', emoji: '🔥', title: 'Серия 7 дней', description: 'Тренируйся 7 дней подряд', test: (s) => s.best >= 7 },
  { code: 'streak30', emoji: '🔥', title: 'Серия 30 дней', description: 'Тренируйся 30 дней подряд', test: (s) => s.best >= 30 },
  { code: 'w10', emoji: '💪', title: '10 тренировок', description: 'Выполни 10 тренировок', test: (s) => s.count >= 10 },
  { code: 'w50', emoji: '💪', title: '50 тренировок', description: 'Выполни 50 тренировок', test: (s) => s.count >= 50 },
  { code: 'h5', emoji: '⏱', title: '5 часов', description: 'Набери 5 часов тренировок', test: (s) => s.minutes >= 300 },
  { code: 'h10', emoji: '⏱', title: '10 часов', description: 'Набери 10 часов тренировок', test: (s) => s.minutes >= 600 },
  { code: 'cardio10', emoji: '🏃', title: '10 кардио', description: 'Выполни 10 кардио-тренировок', test: (s) => s.cardio >= 10 },
  { code: 'strength10', emoji: '🏋️', title: '10 силовых', description: 'Выполни 10 силовых тренировок', test: (s) => s.strength >= 10 },
]

export function computeStats(workouts) {
  return {
    count: workouts.length,
    minutes: workouts.reduce((sum, w) => sum + w.duration, 0),
    best: bestStreak(workouts.map((w) => w.date)),
    cardio: workouts.filter((w) => w.type === 'Кардио').length,
    strength: workouts.filter((w) => w.type === 'Силовая').length,
  }
}

// ---------- ежедневные задания ----------
const QUEST_POOL = [
  { code: 'any', text: 'Выполни любую тренировку', test: (list) => list.length > 0 },
  { code: 'min20', text: 'Тренировка от 20 минут', test: (list) => list.some((w) => w.duration >= 20) },
  { code: 'mobility', text: 'Сделай мобильность', test: (list) => list.some((w) => w.type === 'Мобильность') },
  { code: 'cardio', text: 'Кардио-сессия', test: (list) => list.some((w) => w.type === 'Кардио') },
  { code: 'strength', text: 'Силовая тренировка', test: (list) => list.some((w) => w.type === 'Силовая') },
]
export function dailyQuests(day) {
  const [y, m, d] = day.split('-').map(Number)
  const start = Math.floor(Date.UTC(y, m - 1, d) / 86400000) % QUEST_POOL.length
  return [0, 1, 2].map((offset) => QUEST_POOL[(start + offset) % QUEST_POOL.length])
}
const QUEST_XP = 50

// ---------- синхронизация прогресса ----------
function notify(userId, kind, message) {
  db.prepare('INSERT INTO notifications (user_id, kind, message) VALUES (?, ?, ?)').run(userId, kind, message)
}

// Идемпотентно: открывает достижения, закрывает цели и челленджи, засчитывает задания дня
export function syncProgress(userId) {
  const workouts = loadCompleted(userId)
  const stats = computeStats(workouts)
  const now = new Date().toISOString()

  const have = new Set(db.prepare('SELECT code FROM user_achievements WHERE user_id = ?').all(userId).map((row) => row.code))
  for (const achievement of ACHIEVEMENTS) {
    if (have.has(achievement.code) || !achievement.test(stats)) continue
    db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, code) VALUES (?, ?)').run(userId, achievement.code)
    notify(userId, 'achievement', `Достижение: ${achievement.emoji} ${achievement.title}`)
  }

  for (const goal of db.prepare("SELECT * FROM goals WHERE user_id = ? AND status = 'active'").all(userId)) {
    if (goalCurrent(goal, workouts) < goal.target) continue
    db.prepare("UPDATE goals SET status = 'completed' WHERE id = ?").run(goal.id)
    notify(userId, 'goal', `Цель выполнена: ${goal.title}`)
  }

  const open = db.prepare(`SELECT c.*, p.joined_at FROM challenge_progress p JOIN challenges c ON c.id = p.challenge_id
    WHERE p.user_id = ? AND p.completed_at IS NULL`).all(userId)
  for (const challenge of open) {
    if (challengeProgress(challenge, challenge.joined_at, workouts) < challenge.target) continue
    db.prepare('UPDATE challenge_progress SET completed_at = ? WHERE user_id = ? AND challenge_id = ?').run(now, userId, challenge.id)
    notify(userId, 'challenge', `Челлендж завершён: ${challenge.title}`)
  }

  const today = todayKey()
  const todays = workouts.filter((w) => w.date === today)
  for (const quest of dailyQuests(today)) {
    if (quest.test(todays)) db.prepare('INSERT OR IGNORE INTO quest_claims (user_id, day, code) VALUES (?, ?, ?)').run(userId, today, quest.code)
  }
}

// Личные рекорды: вес в упражнении выше прежнего максимума по этому названию
export function detectPersonalRecords(userId, workout, workoutId) {
  if (!workout.completed) return
  const previous = db.prepare('SELECT exercises FROM workouts WHERE user_id = ? AND completed = 1 AND id != ?').all(userId, workoutId)
  const best = new Map()
  for (const row of previous) {
    for (const exercise of JSON.parse(row.exercises)) {
      const key = exercise.name.toLowerCase()
      if (exercise.weight > (best.get(key) ?? 0)) best.set(key, exercise.weight)
    }
  }
  for (const exercise of workout.exercises) {
    const before = best.get(exercise.name.toLowerCase())
    if (!exercise.weight || !before || exercise.weight <= before) continue
    const message = `Новый рекорд: ${exercise.name} — ${exercise.weight} кг × ${exercise.reps} (было ${before} кг)`
    if (!db.prepare('SELECT 1 FROM notifications WHERE user_id = ? AND message = ?').get(userId, message)) notify(userId, 'pr', message)
  }
}

export function getProgress(userId) {
  syncProgress(userId)
  const workouts = loadCompleted(userId)
  const stats = computeStats(workouts)
  const unlocked = new Map(db.prepare('SELECT code, unlocked_at FROM user_achievements WHERE user_id = ?').all(userId).map((row) => [row.code, row.unlocked_at]))
  const challengesDone = db.prepare('SELECT COUNT(*) AS n FROM challenge_progress WHERE user_id = ? AND completed_at IS NOT NULL').get(userId).n
  const today = todayKey()
  const claims = new Set(db.prepare('SELECT code FROM quest_claims WHERE user_id = ? AND day = ?').all(userId, today).map((row) => row.code))
  const totalClaims = db.prepare('SELECT COUNT(*) AS n FROM quest_claims WHERE user_id = ?').get(userId).n

  const xp = stats.count * 100 + unlocked.size * 300 + challengesDone * 200 + totalClaims * QUEST_XP
  const perLevel = 500
  return {
    xp,
    level: Math.floor(xp / perLevel) + 1,
    intoLevel: xp % perLevel,
    perLevel,
    stats: { ...stats, currentStreak: currentStreak(workouts.map((w) => w.date)), bestStreak: stats.best },
    achievements: ACHIEVEMENTS.map(({ code, emoji, title, description }) => ({ code, emoji, title, description, unlocked: unlocked.has(code), unlockedAt: unlocked.get(code) ?? null })),
    quests: dailyQuests(today).map((quest) => ({ code: quest.code, text: quest.text, done: claims.has(quest.code), xp: QUEST_XP })),
  }
}
