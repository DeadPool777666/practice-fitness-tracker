// Демо-данные для защиты проекта: администратор, ~40 пользователей, тренировки, подписки и платежи.
// Запуск: npm run seed:demo   (повторный запуск ничего не дублирует)
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from './db.js'
import { PLANS } from './billing.js'
import { addDays, syncProgress, todayKey } from './progress.js'

const names = ['Алексей', 'Мария', 'Дмитрий', 'Анна', 'Иван', 'Екатерина', 'Сергей', 'Ольга', 'Артём', 'Наталья', 'Максим', 'Юлия', 'Никита', 'Дарья', 'Павел', 'Елена']
const types = ['Силовая', 'Кардио', 'Мобильность', 'Кор']
const intensities = ['Низкая', 'Средняя', 'Высокая']
const exerciseNames = ['Жим штанги лёжа', 'Приседания со штангой', 'Подтягивания', 'Планка']

let seed = 42
const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const pick = (list) => list[Math.floor(random() * list.length)]

if (db.prepare("SELECT 1 FROM users WHERE email = 'demo-seed-marker@fittrack.demo'").get()) {
  console.log('Демо-данные уже добавлены.')
  process.exit(0)
}

const hash = bcrypt.hashSync('demo-pass-123', 10)
const addUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, age, height_cm, weight_kg, role) VALUES (?, ?, ?, ?, ?, ?, ?)')
const addWorkout = db.prepare('INSERT INTO workouts (user_id, title, date, duration, intensity, type, exercises, completed, mood) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)')

addUser.run('Администратор', 'admin@fittrack.demo', bcrypt.hashSync('demo-admin-123', 10), 30, 175, 70, 'admin')
addUser.run('Demo Seed', 'demo-seed-marker@fittrack.demo', hash, 30, 175, 70, 'user')

const today = todayKey()
const ids = []
for (let i = 0; i < 40; i += 1) {
  const name = `${pick(names)} ${String.fromCharCode(1040 + (i % 26))}.`
  const email = `demo${i}@fittrack.demo`
  addUser.run(name, email, hash, 18 + Math.floor(random() * 40), 160 + Math.floor(random() * 30), 55 + Math.floor(random() * 40), 'user')
  const id = db.prepare('SELECT id FROM users WHERE email = ?').get(email).id
  ids.push(id)
  const activity = random() // «вовлечённость» пользователя
  for (let day = 0; day < 90; day += 1) {
    if (random() > 0.15 + activity * 0.5) continue
    const type = pick(types)
    const exercises = type === 'Силовая' ? [{ name: pick(exerciseNames), sets: 3, reps: 8, weight: 40 + Math.floor(random() * 50) }] : []
    addWorkout.run(id, `${type}: демо`, addDays(today, -day), 20 + Math.floor(random() * 60), pick(intensities), type, JSON.stringify(exercises), 1 + Math.floor(random() * 5))
  }
}

// ~12% пользователей на Pro (смесь месячных и годовых подписок)
const addSub = db.prepare('INSERT OR REPLACE INTO subscriptions (user_id, plan, status, started_at, expires_at) VALUES (?, ?, ?, ?, ?)')
const addPayment = db.prepare('INSERT INTO payments (user_id, plan, amount_cents, created_at) VALUES (?, ?, ?, ?)')
ids.filter(() => random() < 0.12).forEach((id) => {
  const plan = random() < 0.65 ? 'month' : 'year'
  const start = new Date(Date.now() - Math.floor(random() * 20) * 86400000)
  addSub.run(id, plan, 'active', start.toISOString(), new Date(start.getTime() + PLANS[plan].days * 86400000).toISOString())
  addPayment.run(id, plan, PLANS[plan].priceCents, start.toISOString())
})

ids.forEach((id) => syncProgress(id))
console.log('Готово: admin@fittrack.demo / demo-admin-123, демо-пользователи demo0..demo39@fittrack.demo / demo-pass-123')
