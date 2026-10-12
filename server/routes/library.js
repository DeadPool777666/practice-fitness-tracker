import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { rejectIfLimited } from '../billing.js'
import { challengeProgress, syncProgress } from '../progress.js'

export const libraryRouter = Router()

const mapExercise = (row) => ({ id: row.id, name: row.name, description: row.description, muscle: row.muscle, equipment: row.equipment, difficulty: row.difficulty, instructions: row.instructions, imageUrl: row.image_url })

// Библиотека упражнений открыта всем (чтение)
libraryRouter.get('/exercises', (_request, response) => {
  response.json(db.prepare('SELECT * FROM exercises ORDER BY name').all().map(mapExercise))
})
libraryRouter.get('/exercises/:id', (request, response) => {
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(Number(request.params.id))
  if (!row) return response.status(404).json({ error: 'Упражнение не найдено' })
  response.json(mapExercise(row))
})

libraryRouter.get('/favorites', requireAuth, (request, response) => {
  response.json(db.prepare('SELECT exercise_id FROM favorites WHERE user_id = ?').all(request.userId).map((row) => row.exercise_id))
})
libraryRouter.post('/favorites', requireAuth, (request, response) => {
  const exerciseId = Number(request.body?.exerciseId)
  if (!db.prepare('SELECT 1 FROM exercises WHERE id = ?').get(exerciseId)) return response.status(404).json({ error: 'Упражнение не найдено' })
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, exercise_id) VALUES (?, ?)').run(request.userId, exerciseId)
  response.status(201).json({ exerciseId })
})
libraryRouter.delete('/favorites/:exerciseId', requireAuth, (request, response) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND exercise_id = ?').run(request.userId, Number(request.params.exerciseId))
  response.status(204).end()
})

function mapChallenges(userId) {
  const workouts = db.prepare('SELECT date, duration, type FROM workouts WHERE user_id = ? AND completed = 1').all(userId)
  const joined = new Map(db.prepare('SELECT * FROM challenge_progress WHERE user_id = ?').all(userId).map((row) => [row.challenge_id, row]))
  return db.prepare('SELECT * FROM challenges ORDER BY id').all().map((challenge) => {
    const entry = joined.get(challenge.id)
    return {
      id: challenge.id, title: challenge.title, description: challenge.description, kind: challenge.kind, target: challenge.target,
      joined: Boolean(entry), completed: Boolean(entry?.completed_at),
      progress: entry ? Math.min(challenge.target, challengeProgress(challenge, entry.joined_at, workouts)) : 0,
    }
  })
}

libraryRouter.get('/challenges', requireAuth, (request, response) => { syncProgress(request.userId); response.json(mapChallenges(request.userId)) })
libraryRouter.post('/challenges/:id/join', requireAuth, (request, response) => {
  const id = Number(request.params.id)
  if (!db.prepare('SELECT 1 FROM challenges WHERE id = ?').get(id)) return response.status(404).json({ error: 'Челлендж не найден' })
  if (db.prepare('SELECT 1 FROM challenge_progress WHERE user_id = ? AND challenge_id = ?').get(request.userId, id)) return response.status(409).json({ error: 'Вы уже участвуете' })
  const active = db.prepare('SELECT COUNT(*) AS n FROM challenge_progress WHERE user_id = ? AND completed_at IS NULL').get(request.userId).n
  if (rejectIfLimited(response, request.userId, 'challenges', active)) return
  db.prepare('INSERT INTO challenge_progress (user_id, challenge_id) VALUES (?, ?)').run(request.userId, id)
  syncProgress(request.userId)
  response.status(201).json(mapChallenges(request.userId).find((item) => item.id === id))
})
libraryRouter.delete('/challenges/:id/join', requireAuth, (request, response) => {
  const result = db.prepare('DELETE FROM challenge_progress WHERE user_id = ? AND challenge_id = ? AND completed_at IS NULL').run(request.userId, Number(request.params.id))
  if (!result.changes) return response.status(404).json({ error: 'Активного участия не найдено' })
  response.status(204).end()
})
