import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { getAgeCategory, getRecommendedWorkoutIds, getWorkoutGuidance, russianCount } from '../src/services/workoutTemplates.js'

let server
let baseUrl
let temporaryDirectory
let database
let app

before(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'fittrack-test-'))
  process.env.DB_PATH = join(temporaryDirectory, 'test.sqlite')
  process.env.JWT_SECRET = 'integration-test-secret-with-enough-randomness'
  process.env.NODE_ENV = 'test'
  ;({ app } = await import('../server/index.js'))
  ;({ db: database } = await import('../server/db.js'))
  server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener))
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  database?.close()
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
})

async function api(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
  return { status: response.status, body: response.status === 204 ? null : await response.json() }
}

test('auth, CRUD validation and cross-user workout isolation', async () => {
  const profile = (email) => ({ name: 'Алекс Тест', email, password: 'secure-password-123', age: 42, height: 178, weight: 76, gender: 'Не указано', skillLevel: 'Средний' })
  const accountA = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(profile('a@example.test')) })
  const accountB = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(profile('b@example.test')) })
  assert.equal(accountA.status, 201)
  assert.equal(accountB.status, 201)
  assert.equal(typeof accountA.body.user.id, 'number')

  const duplicate = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(profile('A@example.test')) })
  assert.equal(duplicate.status, 409)
  const login = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'a@example.test', password: 'secure-password-123' }) })
  assert.equal(login.status, 200)
  const invalid = await api('/api/workouts', { method: 'POST', token: accountA.body.token, body: JSON.stringify({ title: 'x' }) })
  assert.equal(invalid.status, 400)
  const impossibleDate = await api('/api/workouts', { method: 'POST', token: accountA.body.token, body: JSON.stringify({ title: 'Проверка даты', date: '2026-02-30', duration: 30, intensity: 'Низкая', exercises: [] }) })
  assert.equal(impossibleDate.status, 400)

  const workout = await api('/api/workouts', { method: 'POST', token: accountA.body.token, body: JSON.stringify({ title: 'Силовая тренировка', date: '2026-10-01', duration: 45, intensity: 'Высокая', exercises: [{ name: 'Присед', sets: 3, reps: 8, weight: 40 }], notes: 'Самочувствие хорошее', completed: true }) })
  assert.equal(workout.status, 201)
  assert.equal(workout.body.exercises[0].weight, 40)

  const ownList = await api('/api/workouts', { token: accountA.body.token })
  const otherList = await api('/api/workouts', { token: accountB.body.token })
  assert.equal(ownList.body.length, 1)
  assert.equal(otherList.body.length, 0)
  for (const result of [
    await api(`/api/workouts/${workout.body.id}`, { token: accountB.body.token }),
    await api(`/api/workouts/${workout.body.id}`, { method: 'PUT', token: accountB.body.token, body: JSON.stringify(workout.body) }),
    await api(`/api/workouts/${workout.body.id}`, { method: 'DELETE', token: accountB.body.token }),
  ]) assert.equal(result.status, 404)

  const stillOwned = await api(`/api/workouts/${workout.body.id}`, { token: accountA.body.token })
  assert.equal(stillOwned.status, 200)
  const deleted = await api(`/api/workouts/${workout.body.id}`, { method: 'DELETE', token: accountA.body.token })
  assert.equal(deleted.status, 204)
})

test('age-specific workout groups and guidance', () => {
  assert.equal(getAgeCategory(18), '16–20')
  assert.equal(getAgeCategory(28), '20–40')
  assert.equal(getAgeCategory(48), '40–60')
  assert.equal(getAgeCategory(68), '60–99')
  assert.deepEqual(getRecommendedWorkoutIds(68), ['mobility-reset', 'core-control', 'endurance-ride'])
  assert.match(getWorkoutGuidance(48, 'Высокая'), /48 часов/)
  assert.match(getWorkoutGuidance(18, 'Экстремальная'), /технике/)
  assert.equal(russianCount(1, ['план', 'плана', 'планов']), '1 план')
  assert.equal(russianCount(3, ['запись', 'записи', 'записей']), '3 записи')
  assert.equal(russianCount(12, ['план', 'плана', 'планов']), '12 планов')
})