import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { resolve } from 'node:path'
import { db } from './db.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const jwtSecret = process.env.JWT_SECRET || 'local-development-secret-change-me'
const allowedIntensities = ['Низкая', 'Средняя', 'Высокая', 'Экстремальная']

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production')
}

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '32kb' }))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false })
const authRouter = express.Router()
authRouter.use(authLimiter)

function validNumber(value, min, max) {
  return Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    age: user.age,
    height: user.height_cm,
    weight: user.weight_kg,
    gender: user.gender,
    skillLevel: user.skill_level,
  }
}

function issueToken(user) {
  return jwt.sign({ sub: String(user.id) }, jwtSecret, { expiresIn: '7d' })
}

function requireAuth(request, response, next) {
  const token = request.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return response.status(401).json({ error: 'Требуется авторизация' })

  try {
    const payload = jwt.verify(token, jwtSecret)
    request.userId = Number(payload.sub)
    next()
  } catch {
    response.status(401).json({ error: 'Сессия истекла. Войдите снова.' })
  }
}

function normalizeWorkout(body) {
  const { title, date, duration, intensity, exercises = [], notes = '', completed = false } = body ?? {}
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) return 'Название должно содержать от 2 до 100 символов'
  const parsedDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return 'Укажите корректную дату'
  if (!Number.isInteger(Number(duration)) || !validNumber(duration, 1, 600)) return 'Длительность должна быть от 1 до 600 минут'
  if (!allowedIntensities.includes(intensity)) return 'Укажите допустимую интенсивность'
  if (!Array.isArray(exercises) || exercises.length > 50) return 'Список упражнений некорректен'
  const cleanExercises = []
  for (const exercise of exercises) {
    if (typeof exercise?.name !== 'string' || !exercise.name.trim() || exercise.name.length > 100) return 'Проверьте названия упражнений'
    if (!Number.isInteger(Number(exercise.sets)) || !Number.isInteger(Number(exercise.reps)) || !validNumber(exercise.sets, 1, 100) || !validNumber(exercise.reps, 1, 1000)) return 'Подходы и повторения должны быть целыми положительными числами'
    const weight = exercise.weight === '' || exercise.weight == null ? null : Number(exercise.weight)
    if (weight !== null && !validNumber(weight, 0, 1000)) return 'Вес должен быть от 0 до 1000 кг'
    cleanExercises.push({ name: exercise.name.trim(), sets: Number(exercise.sets), reps: Number(exercise.reps), weight })
  }
  if (typeof notes !== 'string' || notes.length > 2000) return 'Заметка не должна превышать 2000 символов'
  if (typeof completed !== 'boolean') return 'Статус выполнения некорректен'
  return { title: title.trim(), date, duration: Number(duration), intensity, exercises: cleanExercises, notes: notes.trim(), completed }
}

function mapWorkout(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.date,
    duration: row.duration,
    intensity: row.intensity,
    exercises: JSON.parse(row.exercises),
    notes: row.notes,
    completed: Boolean(row.completed),
  }
}

authRouter.post('/register', async (request, response, next) => {
  try {
    const { name, email, password, age, height, weight, gender = 'Не указано', skillLevel = 'Новичок' } = request.body ?? {}
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return response.status(400).json({ error: 'Имя должно содержать от 2 до 80 символов' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) return response.status(400).json({ error: 'Укажите корректный email' })
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) return response.status(400).json({ error: 'Пароль должен содержать от 8 до 72 символов' })
    if (!Number.isInteger(Number(age)) || !validNumber(age, 16, 99) || !validNumber(height, 100, 250) || !validNumber(weight, 30, 350)) return response.status(400).json({ error: 'Проверьте возраст, рост и вес' })
    if (!['Мужской', 'Женский', 'Не указано'].includes(gender) || !['Новичок', 'Средний', 'Продвинутый'].includes(skillLevel)) return response.status(400).json({ error: 'Проверьте параметры профиля' })

    const passwordHash = await bcrypt.hash(password, 12)
    const result = db.prepare(`INSERT INTO users (name, email, password_hash, age, height_cm, weight_kg, gender, skill_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(name.trim(), normalizedEmail, passwordHash, Number(age), Number(height), Number(weight), gender, skillLevel)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    response.status(201).json({ user: toPublicUser(user), token: issueToken(user) })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'Аккаунт с таким email уже существует' })
    next(error)
  }
})

authRouter.post('/login', async (request, response, next) => {
  try {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body?.password === 'string' ? request.body.password : ''
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return response.status(401).json({ error: 'Неверный email или пароль' })
    response.json({ user: toPublicUser(user), token: issueToken(user) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.get('/api/auth/me', requireAuth, (request, response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(request.userId)
  if (!user) return response.status(401).json({ error: 'Пользователь не найден' })
  response.json({ user: toPublicUser(user) })
})

const workouts = express.Router()
workouts.use(requireAuth)
workouts.get('/', (request, response) => {
  const rows = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, id DESC').all(request.userId)
  response.json(rows.map(mapWorkout))
})
workouts.post('/', (request, response) => {
  const workout = normalizeWorkout(request.body)
  if (typeof workout === 'string') return response.status(400).json({ error: workout })
  const result = db.prepare(`INSERT INTO workouts (user_id, title, date, duration, intensity, exercises, notes, completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(request.userId, workout.title, workout.date, workout.duration, workout.intensity, JSON.stringify(workout.exercises), workout.notes, Number(workout.completed))
  const row = db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(result.lastInsertRowid, request.userId)
  response.status(201).json(mapWorkout(row))
})
workouts.get('/:id', (request, response) => {
  const row = db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(Number(request.params.id), request.userId)
  if (!row) return response.status(404).json({ error: 'Тренировка не найдена' })
  response.json(mapWorkout(row))
})
workouts.put('/:id', (request, response) => {
  const workout = normalizeWorkout(request.body)
  if (typeof workout === 'string') return response.status(400).json({ error: workout })
  const result = db.prepare(`UPDATE workouts SET title = ?, date = ?, duration = ?, intensity = ?, exercises = ?, notes = ?, completed = ?
    WHERE id = ? AND user_id = ?`).run(workout.title, workout.date, workout.duration, workout.intensity, JSON.stringify(workout.exercises), workout.notes, Number(workout.completed), Number(request.params.id), request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Тренировка не найдена' })
  response.json(mapWorkout(db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(Number(request.params.id), request.userId)))
})
workouts.delete('/:id', (request, response) => {
  const result = db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(Number(request.params.id), request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Тренировка не найдена' })
  response.status(204).end()
})
app.use('/api/workouts', workouts)

app.use('/api', (_request, response) => response.status(404).json({ error: 'Маршрут API не найден' }))
if (process.env.NODE_ENV === 'production') {
  const distPath = resolve('dist')
  app.use(express.static(distPath))
  app.get('/{*path}', (_request, response) => response.sendFile(resolve(distPath, 'index.html')))
}

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Fitness API listening on http://localhost:${port}`))
}

export { app }