import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

let server
let baseUrl
let temporaryDirectory
let database

before(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'fittrack-features-'))
  process.env.DB_PATH = join(temporaryDirectory, 'test.sqlite')
  process.env.JWT_SECRET = 'integration-test-secret-with-enough-randomness'
  process.env.NODE_ENV = 'test'
  process.env.ADMIN_EMAIL = 'boss@example.test'
  const { app } = await import('../server/index.js')
  ;({ db: database } = await import('../server/db.js'))
  server = await new Promise((resolve) => { const listener = app.listen(0, () => resolve(listener)) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  database?.close()
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
})

async function api(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return { status: response.status, body: response.status === 204 ? null : await response.json() }
}
const register = (email, name = 'Тест Юзер') => api('/api/auth/register', { body: { name, email, password: 'secure-password-123', age: 30, height: 175, weight: 70 } })
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
const workout = (extra = {}) => ({ title: 'Тренировка', date: today(), duration: 40, intensity: 'Средняя', type: 'Силовая', exercises: [], completed: true, ...extra })

test('admin role: server-side checks, not just hidden buttons', async () => {
  const admin = await register('boss@example.test', 'Босс')
  const user = await register('user@example.test', 'Обычный')
  assert.equal(admin.body.user.role, 'admin')
  assert.equal(user.body.user.role, 'user')

  assert.equal((await api('/api/admin/stats')).status, 401)
  assert.equal((await api('/api/admin/stats', { token: user.body.token })).status, 403)
  assert.equal((await api('/api/admin/users', { token: user.body.token })).status, 403)
  assert.equal((await api('/api/admin/exercises', { token: user.body.token, body: { name: 'Хак' } })).status, 403)
  // обычный пользователь не может сделать себя админом
  assert.equal((await api(`/api/admin/users/${user.body.user.id}`, { method: 'PATCH', token: user.body.token, body: { role: 'admin' } })).status, 403)

  const stats = await api('/api/admin/stats', { token: admin.body.token })
  assert.equal(stats.status, 200)
  assert.ok(stats.body.users >= 2 && stats.body.exercises >= 30)

  const ex = await api('/api/admin/exercises', { token: admin.body.token, body: { name: 'Тестовое упражнение', muscle: 'Кор', equipment: 'Свой вес', difficulty: 'Новичок' } })
  assert.equal(ex.status, 201)
  assert.equal((await api('/api/admin/exercises', { token: admin.body.token, body: { name: 'Тестовое упражнение', muscle: 'Кор', equipment: 'Свой вес', difficulty: 'Новичок' } })).status, 409)
  assert.equal((await api(`/api/admin/exercises/${ex.body.id}`, { method: 'PUT', token: admin.body.token, body: { name: 'Переименовано', muscle: 'Кор', equipment: 'Свой вес', difficulty: 'Средний' } })).status, 200)
  assert.equal((await api(`/api/admin/exercises/${ex.body.id}`, { method: 'DELETE', token: admin.body.token })).status, 204)
  assert.equal((await api('/api/admin/challenges', { token: admin.body.token, body: { title: 'Мой челлендж', kind: 'workouts', target: 3 } })).status, 201)
  assert.equal((await api('/api/admin/challenges', { token: admin.body.token, body: { title: 'Плохой', kind: 'nope', target: 3 } })).status, 400)

  // блокировка действует сразу, даже со старым токеном
  assert.equal((await api(`/api/admin/users/${user.body.user.id}`, { method: 'PATCH', token: admin.body.token, body: { blocked: true } })).status, 200)
  assert.equal((await api('/api/workouts', { token: user.body.token })).status, 403)
  assert.equal((await api('/api/auth/login', { body: { email: 'user@example.test', password: 'secure-password-123' } })).status, 403)
  assert.equal((await api(`/api/admin/users/${admin.body.user.id}`, { method: 'PATCH', token: admin.body.token, body: { blocked: true } })).status, 400)
})

test('content security policy allows required external app resources', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  const policy = response.headers.get('content-security-policy')
  assert.ok(policy)
  assert.match(policy, /connect-src[^;]*https:\/\/dummyjson\.com/)
  assert.match(policy, /img-src[^;]*https:\/\/images\.unsplash\.com/)
})

test('progress: achievements, XP, goals, challenges, quests and notifications', async () => {
  const { body: { token } } = await register('progress@example.test')
  assert.equal((await api('/api/progress')).status, 401)
  const before = await api('/api/progress', { token })
  assert.equal(before.body.xp, 0)
  assert.equal(before.body.level, 1)

  const goal = await api('/api/goals', { token, body: { title: '2 тренировки', type: 'workouts', target: 2 } })
  assert.equal(goal.status, 201)
  const join = await api('/api/challenges/3/join', { token, method: 'POST' })
  assert.equal(join.status, 201)
  assert.equal((await api('/api/challenges/3/join', { token, method: 'POST' })).status, 409)

  await api('/api/workouts', { token, body: workout({ type: 'Кардио' }) })
  await api('/api/workouts', { token, body: workout({ type: 'Кардио', date: today() }) })
  const progress = await api('/api/progress', { token })
  assert.ok(progress.body.achievements.find((a) => a.code === 'first').unlocked)
  assert.ok(progress.body.xp >= 2 * 100 + 300)
  assert.equal(progress.body.stats.count, 2)

  const goals = await api('/api/goals', { token })
  assert.equal(goals.body[0].status, 'completed')
  assert.equal(goals.body[0].current, 2)
  const notes = await api('/api/notifications', { token })
  assert.ok(notes.body.unread >= 2)
  assert.ok(notes.body.items.some((n) => n.kind === 'goal'))
  assert.equal((await api('/api/notifications/read', { token, method: 'POST' })).status, 204)
  assert.equal((await api('/api/notifications', { token })).body.unread, 0)
  assert.equal(progress.body.quests.length, 3)

  // чужая цель недоступна
  const other = await register('progress2@example.test')
  assert.equal((await api(`/api/goals/${goals.body[0].id}`, { token: other.body.token, method: 'DELETE' })).status, 404)
  assert.equal((await api(`/api/goals/${goals.body[0].id}`, { token, method: 'DELETE' })).status, 204)
})

test('personal records create a notification only when the weight beats the previous best', async () => {
  const { body: { token } } = await register('pr@example.test')
  const ex = (weight) => [{ name: 'Жим лёжа', sets: 3, reps: 5, weight }]
  await api('/api/workouts', { token, body: workout({ exercises: ex(70), date: '2026-01-01' }) })
  await api('/api/workouts', { token, body: workout({ exercises: ex(60), date: '2026-01-02' }) })
  assert.equal((await api('/api/notifications', { token })).body.items.filter((n) => n.kind === 'pr').length, 0)
  await api('/api/workouts', { token, body: workout({ exercises: ex(80), date: '2026-01-03' }) })
  const pr = (await api('/api/notifications', { token })).body.items.filter((n) => n.kind === 'pr')
  assert.equal(pr.length, 1)
  assert.match(pr[0].message, /80 кг/)
})

test('free plan limits are enforced on the server and Pro lifts them', async () => {
  const { body: { token } } = await register('limits@example.test')
  for (let i = 1; i <= 3; i += 1) assert.equal((await api('/api/goals', { token, body: { title: `Цель ${i}`, type: 'workouts', target: 50 } })).status, 201)
  const blocked = await api('/api/goals', { token, body: { title: 'Цель 4', type: 'workouts', target: 50 } })
  assert.equal(blocked.status, 402)
  assert.equal(blocked.body.code, 'PRO_REQUIRED')

  const sub = await api('/api/billing/subscribe', { token, body: { plan: 'month' } })
  assert.equal(sub.status, 201)
  assert.equal(sub.body.isPro, true)
  assert.equal((await api('/api/billing/subscribe', { token, body: { plan: 'weekly' } })).status, 400)
  assert.equal((await api('/api/goals', { token, body: { title: 'Цель 4', type: 'workouts', target: 50 } })).status, 201)

  const cancelled = await api('/api/billing/cancel', { token, method: 'POST' })
  assert.equal(cancelled.body.isPro, false)
})

test('templates, planner, favorites and exercise library', async () => {
  const { body: { token } } = await register('plan@example.test')
  assert.equal((await api('/api/exercises')).body.length >= 30, true)
  assert.equal((await api('/api/favorites')).status, 401)
  const first = (await api('/api/exercises')).body[0]
  assert.equal((await api('/api/favorites', { token, body: { exerciseId: first.id } })).status, 201)
  assert.deepEqual((await api('/api/favorites', { token })).body, [first.id])
  assert.equal((await api(`/api/favorites/${first.id}`, { token, method: 'DELETE' })).status, 204)
  assert.equal((await api('/api/favorites', { token, body: { exerciseId: 99999 } })).status, 404)

  const tpl = await api('/api/templates', { token, body: { title: 'Верх тела', type: 'Силовая', duration: 45, intensity: 'Средняя', exercises: [{ name: 'Жим', sets: 3, reps: 10, weight: 60 }] } })
  assert.equal(tpl.status, 201)
  assert.equal((await api(`/api/templates/${tpl.body.id}`, { method: 'PUT', token, body: { ...tpl.body, title: 'Верх тела 2' } })).body.title, 'Верх тела 2')
  assert.equal((await api('/api/templates', { token, body: { title: 'Ноги', type: 'Силовая', duration: 50, intensity: 'Высокая' } })).status, 201)
  assert.equal((await api('/api/templates', { token, body: { title: 'Третий', type: 'Силовая', duration: 50, intensity: 'Высокая' } })).status, 402)
  assert.equal((await api('/api/templates', { token, body: { title: 'x' } })).status, 400)

  assert.equal((await api('/api/planner/0', { token, method: 'PUT', body: { title: 'Сила', type: 'Силовая', duration: 45, intensity: 'Средняя' } })).status, 200)
  assert.equal((await api('/api/planner/0', { token, method: 'PUT', body: { title: 'Сила 2', type: 'Силовая', duration: 45, intensity: 'Средняя' } })).status, 200)
  assert.equal((await api('/api/planner', { token })).body.length, 1)
  assert.equal((await api('/api/planner/9', { token, method: 'PUT', body: { title: 'Сила', type: 'Силовая' } })).status, 400)
})

test('friends, public profiles and workout sharing respect privacy', async () => {
  const a = await register('fa@example.test', 'Алиса')
  const b = await register('fb@example.test', 'Борис')
  const hidden = await register('fh@example.test', 'Скрытый')
  await api('/api/me', { token: hidden.body.token, method: 'PUT', body: { name: 'Скрытый', email: 'fh@example.test', isPublic: false } })

  assert.equal((await api('/api/users?q=Бор', { token: a.body.token })).body.length, 1)
  assert.equal((await api('/api/users?q=Скрыт', { token: a.body.token })).body.length, 0)
  assert.equal((await api('/api/friends', { token: a.body.token, body: { userId: hidden.body.user.id } })).status, 404)
  assert.equal((await api('/api/friends', { token: a.body.token, body: { userId: a.body.user.id } })).status, 400)
  assert.equal((await api(`/api/users/${hidden.body.user.id}`, { token: a.body.token })).status, 404)
  assert.equal((await api('/api/friends', { token: a.body.token, body: { userId: b.body.user.id } })).status, 201)

  await api('/api/workouts', { token: b.body.token, body: workout() })
  const board = (await api('/api/friends', { token: a.body.token })).body.leaderboard
  assert.equal(board[0].name, 'Борис')
  assert.equal(board.length, 2)
  assert.equal((await api(`/api/friends/${b.body.user.id}`, { token: a.body.token, method: 'DELETE' })).status, 204)

  const done = await api('/api/workouts', { token: a.body.token, body: workout({ title: 'Для шеринга' }) })
  const planned = await api('/api/workouts', { token: a.body.token, body: workout({ completed: false }) })
  assert.equal((await api(`/api/public/workouts/${done.body.id}`)).status, 404)
  assert.equal((await api(`/api/workouts/${planned.body.id}/share`, { token: a.body.token, method: 'PUT', body: { shared: true } })).status, 400)
  assert.equal((await api(`/api/workouts/${done.body.id}/share`, { token: b.body.token, method: 'PUT', body: { shared: true } })).status, 404)
  assert.equal((await api(`/api/workouts/${done.body.id}/share`, { token: a.body.token, method: 'PUT', body: { shared: true } })).status, 200)
  const pub = await api(`/api/public/workouts/${done.body.id}`)
  assert.equal(pub.status, 200)
  assert.equal(pub.body.title, 'Для шеринга')
  assert.equal(pub.body.userId, undefined)
})

test('account: password change and mood validation', async () => {
  const { body: { token } } = await register('acc@example.test')
  assert.equal((await api('/api/me/password', { token, body: { current: 'wrong-password', next: 'another-password-1' } })).status, 400)
  assert.equal((await api('/api/me/password', { token, body: { current: 'secure-password-123', next: 'another-password-1' } })).status, 204)
  assert.equal((await api('/api/auth/login', { body: { email: 'acc@example.test', password: 'another-password-1' } })).status, 200)
  assert.equal((await api('/api/workouts', { token, body: workout({ mood: 9 }) })).status, 400)
  assert.equal((await api('/api/workouts', { token, body: workout({ mood: 4 }) })).body.mood, 4)
})
