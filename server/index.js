import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { resolve } from 'node:path'
import { db } from './db.js'
import { issueToken, jwtSecret, requireAuth } from './auth.js'
import { isPro } from './billing.js'
import { detectPersonalRecords, syncProgress } from './progress.js'
import { normalizeWorkout, validNumber } from './validate.js'
import { progressRouter } from './routes/progress.js'
import { libraryRouter } from './routes/library.js'
import { planningRouter } from './routes/planning.js'
import { socialRouter } from './routes/social.js'
import { accountRouter } from './routes/account.js'
import { adminRouter } from './routes/admin.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production')
}
void jwtSecret

// Первый администратор назначается через ADMIN_EMAIL (роль хранится в БД и проверяется на сервере)
if (adminEmail) db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(adminEmail)

app.disable('x-powered-by')
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      connectSrc: ["'self'", 'https://dummyjson.com'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https:'],
    },
  },
}))
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '32kb' }))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false })
const authRouter = express.Router()
authRouter.use(authLimiter)

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
    role: user.role,
    isPublic: Boolean(user.is_public),
    isPro: isPro(user.id),
  }
}

function mapWorkout(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.date,
    duration: row.duration,
    intensity: row.intensity,
    type: row.type,
    exercises: JSON.parse(row.exercises),
    notes: row.notes,
    completed: Boolean(row.completed),
    mood: row.mood,
    shared: Boolean(row.shared),
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
    const role = adminEmail && normalizedEmail === adminEmail ? 'admin' : 'user'
    const result = db.prepare(`INSERT INTO users (name, email, password_hash, age, height_cm, weight_kg, gender, skill_level, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name.trim(), normalizedEmail, passwordHash, Number(age), Number(height), Number(weight), gender, skillLevel, role)
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
    if (user.blocked) return response.status(403).json({ error: 'Аккаунт заблокирован администратором' })
    response.json({ user: toPublicUser(user), token: issueToken(user) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.get('/api/auth/me', requireAuth, (request, response) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(request.userId)
  response.json({ user: toPublicUser(user) })
})

const workouts = express.Router()
workouts.use(requireAuth)
const findWorkout = (id, userId) => db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?').get(id, userId)

// После любого изменения тренировок пересчитываем достижения, цели, челленджи и задания дня
function afterChange(userId, workout, workoutId) {
  if (workout) detectPersonalRecords(userId, workout, workoutId)
  syncProgress(userId)
}

workouts.get('/', (request, response) => {
  const rows = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, id DESC').all(request.userId)
  response.json(rows.map(mapWorkout))
})
workouts.post('/', (request, response) => {
  const workout = normalizeWorkout(request.body)
  if (typeof workout === 'string') return response.status(400).json({ error: workout })
  const result = db.prepare(`INSERT INTO workouts (user_id, title, date, duration, intensity, type, exercises, notes, completed, mood)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(request.userId, workout.title, workout.date, workout.duration, workout.intensity, workout.type, JSON.stringify(workout.exercises), workout.notes, Number(workout.completed), workout.mood)
  afterChange(request.userId, workout, result.lastInsertRowid)
  response.status(201).json(mapWorkout(findWorkout(result.lastInsertRowid, request.userId)))
})
workouts.get('/:id', (request, response) => {
  const row = findWorkout(Number(request.params.id), request.userId)
  if (!row) return response.status(404).json({ error: 'Тренировка не найдена' })
  response.json(mapWorkout(row))
})
workouts.put('/:id', (request, response) => {
  const workout = normalizeWorkout(request.body)
  if (typeof workout === 'string') return response.status(400).json({ error: workout })
  const id = Number(request.params.id)
  const result = db.prepare(`UPDATE workouts SET title = ?, date = ?, duration = ?, intensity = ?, type = ?, exercises = ?, notes = ?, completed = ?, mood = ?
    WHERE id = ? AND user_id = ?`).run(workout.title, workout.date, workout.duration, workout.intensity, workout.type, JSON.stringify(workout.exercises), workout.notes, Number(workout.completed), workout.mood, id, request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Тренировка не найдена' })
  if (!workout.completed) db.prepare('UPDATE workouts SET shared = 0 WHERE id = ?').run(id)
  afterChange(request.userId, workout, id)
  response.json(mapWorkout(findWorkout(id, request.userId)))
})
workouts.put('/:id/share', (request, response) => {
  const id = Number(request.params.id)
  const row = findWorkout(id, request.userId)
  if (!row) return response.status(404).json({ error: 'Тренировка не найдена' })
  if (typeof request.body?.shared !== 'boolean') return response.status(400).json({ error: 'Укажите shared: true или false' })
  if (request.body.shared && !row.completed) return response.status(400).json({ error: 'Поделиться можно только выполненной тренировкой' })
  db.prepare('UPDATE workouts SET shared = ? WHERE id = ?').run(Number(request.body.shared), id)
  response.json(mapWorkout(findWorkout(id, request.userId)))
})
workouts.delete('/:id', (request, response) => {
  const result = db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(Number(request.params.id), request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Тренировка не найдена' })
  response.status(204).end()
})
app.use('/api/workouts', workouts)

app.use('/api', libraryRouter, progressRouter, planningRouter, socialRouter, accountRouter, adminRouter)

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
