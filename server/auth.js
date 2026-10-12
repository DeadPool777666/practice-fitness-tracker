import jwt from 'jsonwebtoken'
import { db } from './db.js'

export const jwtSecret = process.env.JWT_SECRET || 'local-development-secret-change-me'

export function issueToken(user) {
  return jwt.sign({ sub: String(user.id) }, jwtSecret, { expiresIn: '7d' })
}

// Проверка токена + актуальное состояние пользователя из БД (роль и блокировка берутся с сервера, а не из токена)
export function requireAuth(request, response, next) {
  const token = request.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return response.status(401).json({ error: 'Требуется авторизация' })
  let payload
  try { payload = jwt.verify(token, jwtSecret) } catch { return response.status(401).json({ error: 'Сессия истекла. Войдите снова.' }) }
  const user = db.prepare('SELECT id, role, blocked FROM users WHERE id = ?').get(Number(payload.sub))
  if (!user) return response.status(401).json({ error: 'Пользователь не найден' })
  if (user.blocked) return response.status(403).json({ error: 'Аккаунт заблокирован администратором' })
  request.userId = user.id
  request.role = user.role
  next()
}

export function requireAdmin(request, response, next) {
  if (request.role !== 'admin') return response.status(403).json({ error: 'Недостаточно прав' })
  next()
}
