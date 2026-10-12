import { db } from './db.js'

export const PLANS = {
  month: { label: 'Pro · месяц', priceCents: 499, days: 30 },
  year: { label: 'Pro · год', priceCents: 3999, days: 365 },
}
export const FREE_LIMITS = { goals: 3, templates: 2, challenges: 1 }
const LIMIT_LABELS = { goals: 'целей', templates: 'шаблонов', challenges: 'активных челленджей' }

export function getSubscription(userId) {
  return db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) ?? null
}

export function isPro(userId) {
  const subscription = getSubscription(userId)
  return Boolean(subscription && subscription.status === 'active' && subscription.expires_at > new Date().toISOString())
}

// true — лимит бесплатного тарифа исчерпан, ответ 402 уже отправлен
export function rejectIfLimited(response, userId, key, currentCount) {
  if (isPro(userId) || currentCount < FREE_LIMITS[key]) return false
  response.status(402).json({ error: `Бесплатный тариф: не более ${FREE_LIMITS[key]} ${LIMIT_LABELS[key]}. Оформите Pro, чтобы снять лимит.`, code: 'PRO_REQUIRED' })
  return true
}
