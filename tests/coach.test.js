import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCoachTips, getRecoveryScore } from '../src/services/coach.js'
import { buildAnalytics, exerciseHistory } from '../src/services/analytics.js'

const today = '2026-10-01'
const w = (date, extra = {}) => ({ id: Math.random(), date, duration: 30, intensity: 'Средняя', type: 'Силовая', exercises: [], completed: true, mood: null, ...extra })

test('coach: rule-based tips from recent history', () => {
  assert.match(getCoachTips([], today)[0], /короткой тренировки/)
  assert.ok(getCoachTips([w('2026-09-01')], today).some((tip) => /7 дней/.test(tip)))
  const busy = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'].map((d) => w(d))
  assert.ok(getCoachTips(busy, today).some((tip) => /восстановления/.test(tip)))
  assert.ok(getCoachTips(busy, today).some((tip) => /кардио/.test(tip)))
  const hard = [w('2026-09-30', { intensity: 'Высокая', type: 'Кардио' }), w('2026-09-29', { intensity: 'Экстремальная', type: 'Кардио' })]
  assert.ok(getCoachTips(hard, today).some((tip) => /высокой интенсивности/.test(tip)))
})

test('recovery score drops with load and stays within 10..100', () => {
  assert.equal(getRecoveryScore([], today).score, 100)
  const loaded = Array.from({ length: 7 }, (_, i) => w(`2026-09-${String(25 + i).padStart(2, '0')}`, { intensity: 'Высокая' })).concat(w(today, { intensity: 'Высокая' }))
  const { score, label } = getRecoveryScore(loaded, today)
  assert.ok(score >= 10 && score < 50)
  assert.match(label, /отдых/)
})

test('analytics totals and exercise history with personal record', () => {
  const list = [
    w('2026-09-30', { duration: 60, mood: 4, exercises: [{ name: 'Жим лёжа', sets: 3, reps: 5, weight: 60 }] }),
    w('2026-09-28', { type: 'Кардио', mood: 2, exercises: [{ name: 'Жим лёжа', sets: 3, reps: 5, weight: 70 }] }),
    w('2026-09-20', { completed: false }),
  ]
  const stats = buildAnalytics(list, today)
  assert.equal(stats.total, 2)
  assert.equal(stats.minutes, 90)
  assert.equal(stats.longest.duration, 60)
  assert.equal(stats.averageMood, 3)
  assert.deepEqual(stats.topExercise, ['Жим лёжа', 2])
  assert.equal(stats.weeks.length, 8)
  const history = exerciseHistory(list, 'жим лёжа')
  assert.deepEqual(history.points.map((p) => p.weight), [70, 60])
  assert.equal(history.record.weight, 70)
})
