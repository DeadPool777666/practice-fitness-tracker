import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { rejectIfLimited } from '../billing.js'
import { getProgress, goalCurrent, syncProgress } from '../progress.js'
import { validDate, validNumber } from '../validate.js'

export const progressRouter = Router()
progressRouter.use(['/progress', '/goals', '/notifications'], requireAuth)

const goalTypes = ['workouts', 'hours', 'streak', 'cardio']

progressRouter.get('/progress', (request, response) => response.json(getProgress(request.userId)))

function mapGoals(userId) {
  const workouts = db.prepare('SELECT date, duration, type FROM workouts WHERE user_id = ? AND completed = 1').all(userId)
  return db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY id DESC').all(userId).map((goal) => ({
    id: goal.id, title: goal.title, type: goal.type, target: goal.target, deadline: goal.deadline, status: goal.status, current: goalCurrent(goal, workouts),
  }))
}

function readGoal(body) {
  const { title, type, target, deadline = null } = body ?? {}
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) return 'Название цели: от 2 до 100 символов'
  if (!goalTypes.includes(type)) return 'Неизвестный тип цели'
  if (!Number.isInteger(Number(target)) || !validNumber(target, 1, 1000)) return 'Цель должна быть целым числом от 1 до 1000'
  if (deadline !== null && deadline !== '' && !validDate(deadline)) return 'Укажите корректный срок'
  return { title: title.trim(), type, target: Number(target), deadline: deadline || null }
}

progressRouter.get('/goals', (request, response) => { syncProgress(request.userId); response.json(mapGoals(request.userId)) })
progressRouter.post('/goals', (request, response) => {
  const goal = readGoal(request.body)
  if (typeof goal === 'string') return response.status(400).json({ error: goal })
  const count = db.prepare('SELECT COUNT(*) AS n FROM goals WHERE user_id = ?').get(request.userId).n
  if (rejectIfLimited(response, request.userId, 'goals', count)) return
  db.prepare('INSERT INTO goals (user_id, title, type, target, deadline) VALUES (?, ?, ?, ?, ?)').run(request.userId, goal.title, goal.type, goal.target, goal.deadline)
  syncProgress(request.userId)
  response.status(201).json(mapGoals(request.userId)[0])
})
progressRouter.put('/goals/:id', (request, response) => {
  const goal = readGoal(request.body)
  if (typeof goal === 'string') return response.status(400).json({ error: goal })
  const result = db.prepare("UPDATE goals SET title = ?, type = ?, target = ?, deadline = ?, status = 'active' WHERE id = ? AND user_id = ?")
    .run(goal.title, goal.type, goal.target, goal.deadline, Number(request.params.id), request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Цель не найдена' })
  syncProgress(request.userId)
  response.json(mapGoals(request.userId).find((item) => item.id === Number(request.params.id)))
})
progressRouter.delete('/goals/:id', (request, response) => {
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(Number(request.params.id), request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Цель не найдена' })
  response.status(204).end()
})

progressRouter.get('/notifications', (request, response) => {
  const items = db.prepare('SELECT id, kind, message, is_read AS isRead, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(request.userId)
  const unread = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0').get(request.userId).n
  response.json({ items: items.map((item) => ({ ...item, isRead: Boolean(item.isRead) })), unread })
})
progressRouter.post('/notifications/read', (request, response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(request.userId)
  response.status(204).end()
})

