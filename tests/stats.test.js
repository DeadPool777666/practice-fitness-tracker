import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildHeatmap, computeStreaks, nextPlanned, weeklySummary } from '../src/services/stats.js'

const w = (id, date, extra = {}) => ({ id, date, duration: 30, intensity: 'Средняя', completed: true, ...extra })
const today = '2026-10-01' // четверг

test('streak: current counts back from today or yesterday, best finds the longest run', () => {
  const list = [w(1, '2026-10-01'), w(2, '2026-09-30'), w(3, '2026-09-29'), w(4, '2026-09-20'), w(5, '2026-09-19'), w(6, '2026-09-18'), w(7, '2026-09-17')]
  assert.deepEqual(computeStreaks(list, today), { current: 3, best: 4 })
  assert.equal(computeStreaks([w(1, '2026-09-30')], today).current, 1)
  assert.equal(computeStreaks([w(1, '2026-09-28')], today).current, 0)
  assert.equal(computeStreaks([w(1, '2026-10-01', { completed: false })], today).current, 0)
})

test('weekly summary compares with the previous week (Monday start)', () => {
  const list = [w(1, '2026-09-28'), w(2, '2026-10-01', { duration: 60, intensity: 'Высокая' }), w(3, '2026-09-22'), w(4, '2026-10-02', { completed: false })]
  const week = weeklySummary(list, today)
  assert.equal(week.count, 2)
  assert.equal(week.minutes, 90)
  assert.equal(week.average, 45)
  assert.equal(week.diff, 1)
})

test('heatmap has 16 full weeks, levels follow minutes and future days are hidden', () => {
  const cells = buildHeatmap([w(1, today, { duration: 75 })], 16, today)
  assert.equal(cells.length, 112)
  assert.equal(cells.find((c) => c.date === today).level, 3)
  assert.equal(cells.find((c) => c.date === '2026-10-02').level, -1)
})

test('next planned workout is the earliest unfinished one from today', () => {
  const list = [w(1, '2026-10-05', { completed: false }), w(2, '2026-10-02', { completed: false }), w(3, '2026-09-01', { completed: false })]
  assert.equal(nextPlanned(list, today).id, 2)
})
