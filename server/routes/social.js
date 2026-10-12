import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { addDays, getProgress, todayKey, weekStart } from '../progress.js'

export const socialRouter = Router()

function weekCount(userId) {
  const start = weekStart(todayKey())
  return db.prepare('SELECT COUNT(*) AS n FROM workouts WHERE user_id = ? AND completed = 1 AND date >= ? AND date < ?').get(userId, start, addDays(start, 7)).n
}

// Поиск только среди публичных профилей
socialRouter.get('/users', requireAuth, (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim().slice(0, 50) : ''
  const rows = db.prepare("SELECT id, name FROM users WHERE is_public = 1 AND blocked = 0 AND id != ? AND name LIKE ? ORDER BY name LIMIT 20").all(request.userId, `%${query.replace(/[%_]/g, '')}%`)
  response.json(rows)
})
socialRouter.get('/users/:id', requireAuth, (request, response) => {
  const id = Number(request.params.id)
  const user = db.prepare('SELECT id, name, is_public FROM users WHERE id = ? AND blocked = 0').get(id)
  if (!user || (!user.is_public && id !== request.userId)) return response.status(404).json({ error: 'Профиль не найден или закрыт' })
  const progress = getProgress(id)
  response.json({ id: user.id, name: user.name, level: progress.level, xp: progress.xp, totalWorkouts: progress.stats.count, bestStreak: progress.stats.bestStreak, achievements: progress.achievements.filter((a) => a.unlocked).length })
})

socialRouter.get('/friends', requireAuth, (request, response) => {
  const friends = db.prepare('SELECT u.id, u.name FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND u.blocked = 0 ORDER BY u.name').all(request.userId)
  const me = db.prepare('SELECT id, name FROM users WHERE id = ?').get(request.userId)
  const leaderboard = [...friends, me].map((person) => ({ id: person.id, name: person.name, isMe: person.id === request.userId, weekWorkouts: weekCount(person.id) })).sort((a, b) => b.weekWorkouts - a.weekWorkouts || a.name.localeCompare(b.name))
  response.json({ friends, leaderboard })
})
socialRouter.post('/friends', requireAuth, (request, response) => {
  const friendId = Number(request.body?.userId)
  if (!Number.isInteger(friendId) || friendId === request.userId) return response.status(400).json({ error: 'Нельзя добавить этого пользователя' })
  const target = db.prepare('SELECT id, is_public FROM users WHERE id = ? AND blocked = 0').get(friendId)
  if (!target || !target.is_public) return response.status(404).json({ error: 'Пользователь не найден или профиль закрыт' })
  db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').run(request.userId, friendId)
  response.status(201).json({ userId: friendId })
})
socialRouter.delete('/friends/:id', requireAuth, (request, response) => {
  db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(request.userId, Number(request.params.id))
  response.status(204).end()
})

// Публичная страница тренировки: только если владелец включил «поделиться» и тренировка выполнена
socialRouter.get('/public/workouts/:id', (request, response) => {
  const row = db.prepare(`SELECT w.title, w.type, w.date, w.duration, w.intensity, w.exercises, u.name FROM workouts w JOIN users u ON u.id = w.user_id
    WHERE w.id = ? AND w.shared = 1 AND w.completed = 1 AND u.blocked = 0`).get(Number(request.params.id))
  if (!row) return response.status(404).json({ error: 'Тренировка недоступна' })
  response.json({ title: row.title, type: row.type, date: row.date, duration: row.duration, intensity: row.intensity, exerciseCount: JSON.parse(row.exercises).length, author: row.name })
})
