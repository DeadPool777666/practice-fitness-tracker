import { Router } from 'express'
import { db } from '../db.js'
import { requireAdmin, requireAuth } from '../auth.js'
import { PLANS } from '../billing.js'

export const adminRouter = Router()
// Все маршруты админки: сначала проверка токена и актуальной роли в БД, затем роль admin
adminRouter.use('/admin', requireAuth, requireAdmin)

adminRouter.get('/admin/stats', (_request, response) => {
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n
  const nowIso = new Date().toISOString()
  const active = db.prepare("SELECT plan FROM subscriptions WHERE status = 'active' AND expires_at > ?").all(nowIso)
  const users = count('users')
  const mrrCents = Math.round(active.reduce((sum, row) => sum + (row.plan === 'year' ? PLANS.year.priceCents / 12 : PLANS.month.priceCents), 0))
  const revenueCents = db.prepare('SELECT COALESCE(SUM(amount_cents), 0) AS total FROM payments').get().total
  response.json({
    users, workouts: count('workouts'), exercises: count('exercises'), challenges: count('challenges'),
    revenue: { proUsers: active.length, mrrCents, revenueCents, conversion: users ? active.length / users : 0, arpuCents: users ? Math.round(mrrCents / users) : 0 },
  })
})

adminRouter.get('/admin/users', (_request, response) => {
  const rows = db.prepare(`SELECT u.id, u.name, u.email, u.role, u.blocked, u.created_at,
    (SELECT COUNT(*) FROM workouts w WHERE w.user_id = u.id) AS workouts FROM users u ORDER BY u.id DESC LIMIT 200`).all()
  response.json(rows.map((row) => ({ ...row, blocked: Boolean(row.blocked) })))
})
adminRouter.patch('/admin/users/:id', (request, response) => {
  const id = Number(request.params.id)
  const { blocked, role } = request.body ?? {}
  if (id === request.userId) return response.status(400).json({ error: 'Нельзя менять собственную роль или блокировку' })
  if (blocked !== undefined && typeof blocked !== 'boolean') return response.status(400).json({ error: 'Некорректное значение blocked' })
  if (role !== undefined && !['user', 'admin'].includes(role)) return response.status(400).json({ error: 'Некорректная роль' })
  const user = db.prepare('SELECT id, blocked, role FROM users WHERE id = ?').get(id)
  if (!user) return response.status(404).json({ error: 'Пользователь не найден' })
  db.prepare('UPDATE users SET blocked = ?, role = ? WHERE id = ?').run(blocked === undefined ? user.blocked : Number(blocked), role ?? user.role, id)
  response.json({ id, blocked: blocked ?? Boolean(user.blocked), role: role ?? user.role })
})

adminRouter.get('/admin/workouts', (_request, response) => {
  const rows = db.prepare(`SELECT w.id, w.title, w.date, w.duration, w.intensity, w.type, w.completed, u.name AS author FROM workouts w JOIN users u ON u.id = w.user_id ORDER BY w.id DESC LIMIT 100`).all()
  response.json(rows.map((row) => ({ ...row, completed: Boolean(row.completed) })))
})

// ---- упражнения ----
const muscles = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Кор']
const equipments = ['Штанга', 'Гантели', 'Тренажёр', 'Свой вес']
const difficulties = ['Новичок', 'Средний', 'Продвинутый']

function readExercise(body) {
  const { name, description = '', muscle, equipment, difficulty, instructions = '', imageUrl = '' } = body ?? {}
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return 'Название: от 2 до 100 символов'
  if (!muscles.includes(muscle) || !equipments.includes(equipment) || !difficulties.includes(difficulty)) return 'Проверьте группу мышц, оборудование и сложность'
  if ([description, instructions].some((text) => typeof text !== 'string' || text.length > 2000)) return 'Описание и техника: до 2000 символов'
  if (typeof imageUrl !== 'string' || (imageUrl && !/^https?:\/\//.test(imageUrl)) || imageUrl.length > 500) return 'Ссылка на изображение должна начинаться с http(s)://'
  return { name: name.trim(), description, muscle, equipment, difficulty, instructions, imageUrl }
}
const exerciseRow = (row) => ({ id: row.id, name: row.name, description: row.description, muscle: row.muscle, equipment: row.equipment, difficulty: row.difficulty, instructions: row.instructions, imageUrl: row.image_url })

adminRouter.post('/admin/exercises', (request, response) => {
  const exercise = readExercise(request.body)
  if (typeof exercise === 'string') return response.status(400).json({ error: exercise })
  try {
    const result = db.prepare('INSERT INTO exercises (name, description, muscle, equipment, difficulty, instructions, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(exercise.name, exercise.description, exercise.muscle, exercise.equipment, exercise.difficulty, exercise.instructions, exercise.imageUrl)
    response.status(201).json(exerciseRow(db.prepare('SELECT * FROM exercises WHERE id = ?').get(result.lastInsertRowid)))
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'Упражнение с таким названием уже есть' })
    throw error
  }
})
adminRouter.put('/admin/exercises/:id', (request, response) => {
  const exercise = readExercise(request.body)
  if (typeof exercise === 'string') return response.status(400).json({ error: exercise })
  try {
    const result = db.prepare('UPDATE exercises SET name = ?, description = ?, muscle = ?, equipment = ?, difficulty = ?, instructions = ?, image_url = ? WHERE id = ?')
      .run(exercise.name, exercise.description, exercise.muscle, exercise.equipment, exercise.difficulty, exercise.instructions, exercise.imageUrl, Number(request.params.id))
    if (!result.changes) return response.status(404).json({ error: 'Упражнение не найдено' })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'Упражнение с таким названием уже есть' })
    throw error
  }
  response.json(exerciseRow(db.prepare('SELECT * FROM exercises WHERE id = ?').get(Number(request.params.id))))
})
adminRouter.delete('/admin/exercises/:id', (request, response) => {
  const result = db.prepare('DELETE FROM exercises WHERE id = ?').run(Number(request.params.id))
  if (!result.changes) return response.status(404).json({ error: 'Упражнение не найдено' })
  response.status(204).end()
})

// ---- челленджи ----
const kinds = ['workouts', 'cardio', 'hours', 'days', 'streak']
function readChallenge(body) {
  const { title, description = '', kind, target } = body ?? {}
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) return 'Название: от 2 до 100 символов'
  if (typeof description !== 'string' || description.length > 500) return 'Описание: до 500 символов'
  if (!kinds.includes(kind)) return 'Неизвестный тип челленджа'
  if (!Number.isInteger(Number(target)) || Number(target) < 1 || Number(target) > 1000) return 'Цель: целое число от 1 до 1000'
  return { title: title.trim(), description, kind, target: Number(target) }
}
adminRouter.post('/admin/challenges', (request, response) => {
  const challenge = readChallenge(request.body)
  if (typeof challenge === 'string') return response.status(400).json({ error: challenge })
  const result = db.prepare('INSERT INTO challenges (title, description, kind, target) VALUES (?, ?, ?, ?)').run(challenge.title, challenge.description, challenge.kind, challenge.target)
  response.status(201).json({ id: Number(result.lastInsertRowid), ...challenge })
})
adminRouter.put('/admin/challenges/:id', (request, response) => {
  const challenge = readChallenge(request.body)
  if (typeof challenge === 'string') return response.status(400).json({ error: challenge })
  const result = db.prepare('UPDATE challenges SET title = ?, description = ?, kind = ?, target = ? WHERE id = ?').run(challenge.title, challenge.description, challenge.kind, challenge.target, Number(request.params.id))
  if (!result.changes) return response.status(404).json({ error: 'Челлендж не найден' })
  response.json({ id: Number(request.params.id), ...challenge })
})
adminRouter.delete('/admin/challenges/:id', (request, response) => {
  const result = db.prepare('DELETE FROM challenges WHERE id = ?').run(Number(request.params.id))
  if (!result.changes) return response.status(404).json({ error: 'Челлендж не найден' })
  response.status(204).end()
})
