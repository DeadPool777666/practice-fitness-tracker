import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { PLANS, FREE_LIMITS, getSubscription, isPro } from '../billing.js'

export const accountRouter = Router()
accountRouter.use(['/me', '/billing'], requireAuth)

accountRouter.put('/me', (request, response) => {
  const { name, email, isPublic } = request.body ?? {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return response.status(400).json({ error: 'Имя должно содержать от 2 до 80 символов' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) return response.status(400).json({ error: 'Укажите корректный email' })
  if (typeof isPublic !== 'boolean') return response.status(400).json({ error: 'Укажите видимость профиля' })
  try {
    db.prepare('UPDATE users SET name = ?, email = ?, is_public = ? WHERE id = ?').run(name.trim(), normalizedEmail, Number(isPublic), request.userId)
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'Этот email уже занят' })
    throw error
  }
  response.json({ ok: true })
})

accountRouter.post('/me/password', async (request, response, next) => {
  try {
    const { current, next: nextPassword } = request.body ?? {}
    if (typeof nextPassword !== 'string' || nextPassword.length < 8 || nextPassword.length > 72) return response.status(400).json({ error: 'Новый пароль: от 8 до 72 символов' })
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(request.userId)
    if (typeof current !== 'string' || !(await bcrypt.compare(current, user.password_hash))) return response.status(400).json({ error: 'Текущий пароль указан неверно' })
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(nextPassword, 12), request.userId)
    response.status(204).end()
  } catch (error) { next(error) }
})

// ---------- демо-монетизация (платежи имитируются, реальные деньги не списываются) ----------
function billingState(userId) {
  const subscription = getSubscription(userId)
  const usage = {
    goals: db.prepare('SELECT COUNT(*) AS n FROM goals WHERE user_id = ?').get(userId).n,
    templates: db.prepare('SELECT COUNT(*) AS n FROM workout_templates WHERE user_id = ?').get(userId).n,
    challenges: db.prepare('SELECT COUNT(*) AS n FROM challenge_progress WHERE user_id = ? AND completed_at IS NULL').get(userId).n,
  }
  return { isPro: isPro(userId), plan: subscription?.plan ?? 'free', expiresAt: subscription?.expires_at ?? null, limits: FREE_LIMITS, usage, plans: PLANS }
}
accountRouter.get('/billing', (request, response) => response.json(billingState(request.userId)))
accountRouter.post('/billing/subscribe', (request, response) => {
  const plan = PLANS[request.body?.plan]
  if (!plan) return response.status(400).json({ error: 'Неизвестный тариф' })
  const now = new Date()
  const expires = new Date(now.getTime() + plan.days * 86400000)
  db.prepare(`INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at) VALUES (?, ?, 'active', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, status = 'active', started_at = excluded.started_at, expires_at = excluded.expires_at`)
    .run(request.userId, request.body.plan, now.toISOString(), expires.toISOString())
  db.prepare('INSERT INTO payments (user_id, plan, amount_cents) VALUES (?, ?, ?)').run(request.userId, request.body.plan, plan.priceCents)
  response.status(201).json(billingState(request.userId))
})
accountRouter.post('/billing/cancel', (request, response) => {
  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ?").run(request.userId)
  response.json(billingState(request.userId))
})
