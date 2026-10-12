import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'
import { rejectIfLimited } from '../billing.js'
import { allowedIntensities, allowedTypes, normalizeExercises, validNumber } from '../validate.js'

export const planningRouter = Router()
planningRouter.use(['/templates', '/planner'], requireAuth)

const mapTemplate = (row) => ({ id: row.id, title: row.title, type: row.type, duration: row.duration, intensity: row.intensity, exercises: JSON.parse(row.exercises) })

function readTemplate(body) {
  const { title, type = 'Другое', duration, intensity, exercises = [] } = body ?? {}
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) return 'Название шаблона: от 2 до 100 символов'
  if (!allowedTypes.includes(type)) return 'Недопустимый тип'
  if (!Number.isInteger(Number(duration)) || !validNumber(duration, 1, 600)) return 'Длительность: от 1 до 600 минут'
  if (!allowedIntensities.includes(intensity)) return 'Недопустимая интенсивность'
  const parsed = normalizeExercises(exercises)
  if (typeof parsed === 'string') return parsed
  return { title: title.trim(), type, duration: Number(duration), intensity, exercises: parsed.exercises }
}

planningRouter.get('/templates', (request, response) => {
  response.json(db.prepare('SELECT * FROM workout_templates WHERE user_id = ? ORDER BY id DESC').all(request.userId).map(mapTemplate))
})
planningRouter.post('/templates', (request, response) => {
  const template = readTemplate(request.body)
  if (typeof template === 'string') return response.status(400).json({ error: template })
  const count = db.prepare('SELECT COUNT(*) AS n FROM workout_templates WHERE user_id = ?').get(request.userId).n
  if (rejectIfLimited(response, request.userId, 'templates', count)) return
  const result = db.prepare('INSERT INTO workout_templates (user_id, title, type, duration, intensity, exercises) VALUES (?, ?, ?, ?, ?, ?)')
    .run(request.userId, template.title, template.type, template.duration, template.intensity, JSON.stringify(template.exercises))
  response.status(201).json(mapTemplate(db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(result.lastInsertRowid)))
})
planningRouter.put('/templates/:id', (request, response) => {
  const template = readTemplate(request.body)
  if (typeof template === 'string') return response.status(400).json({ error: template })
  const result = db.prepare('UPDATE workout_templates SET title = ?, type = ?, duration = ?, intensity = ?, exercises = ? WHERE id = ? AND user_id = ?')
    .run(template.title, template.type, template.duration, template.intensity, JSON.stringify(template.exercises), Number(request.params.id), request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Шаблон не найден' })
  response.json(mapTemplate(db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(Number(request.params.id))))
})
planningRouter.delete('/templates/:id', (request, response) => {
  const result = db.prepare('DELETE FROM workout_templates WHERE id = ? AND user_id = ?').run(Number(request.params.id), request.userId)
  if (!result.changes) return response.status(404).json({ error: 'Шаблон не найден' })
  response.status(204).end()
})

// Планировщик: weekday 0 = понедельник … 6 = воскресенье
const plannerTypes = [...allowedTypes, 'Отдых']
planningRouter.get('/planner', (request, response) => {
  response.json(db.prepare('SELECT weekday, title, type, duration, intensity FROM planner WHERE user_id = ? ORDER BY weekday').all(request.userId))
})
planningRouter.put('/planner/:weekday', (request, response) => {
  const weekday = Number(request.params.weekday)
  const { title, type, duration = 30, intensity = 'Средняя' } = request.body ?? {}
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return response.status(400).json({ error: 'День недели: 0–6' })
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) return response.status(400).json({ error: 'Название: от 2 до 100 символов' })
  if (!plannerTypes.includes(type) || !allowedIntensities.includes(intensity) || !Number.isInteger(Number(duration)) || !validNumber(duration, 1, 600)) return response.status(400).json({ error: 'Проверьте тип, длительность и интенсивность' })
  db.prepare(`INSERT INTO planner (user_id, weekday, title, type, duration, intensity) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, weekday) DO UPDATE SET title = excluded.title, type = excluded.type, duration = excluded.duration, intensity = excluded.intensity`)
    .run(request.userId, weekday, title.trim(), type, Number(duration), intensity)
  response.json({ weekday, title: title.trim(), type, duration: Number(duration), intensity })
})
planningRouter.delete('/planner/:weekday', (request, response) => {
  db.prepare('DELETE FROM planner WHERE user_id = ? AND weekday = ?').run(request.userId, Number(request.params.weekday))
  response.status(204).end()
})
