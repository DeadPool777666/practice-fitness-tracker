export const allowedIntensities = ['Низкая', 'Средняя', 'Высокая', 'Экстремальная']
export const allowedTypes = ['Силовая', 'Кардио', 'Мобильность', 'Кор', 'Другое']

export function validNumber(value, min, max) {
  return Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max
}

export function validDate(date) {
  const parsed = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null
  return Boolean(parsed && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date)
}

// Возвращает строку-ошибку или { exercises }
export function normalizeExercises(exercises) {
  if (!Array.isArray(exercises) || exercises.length > 50) return 'Список упражнений некорректен'
  const clean = []
  for (const exercise of exercises) {
    if (typeof exercise?.name !== 'string' || !exercise.name.trim() || exercise.name.length > 100) return 'Проверьте названия упражнений'
    if (!Number.isInteger(Number(exercise.sets)) || !Number.isInteger(Number(exercise.reps)) || !validNumber(exercise.sets, 1, 100) || !validNumber(exercise.reps, 1, 1000)) return 'Подходы и повторения должны быть целыми положительными числами'
    const weight = exercise.weight === '' || exercise.weight == null ? null : Number(exercise.weight)
    if (weight !== null && !validNumber(weight, 0, 1000)) return 'Вес должен быть от 0 до 1000 кг'
    clean.push({ name: exercise.name.trim(), sets: Number(exercise.sets), reps: Number(exercise.reps), weight })
  }
  return { exercises: clean }
}

export function normalizeWorkout(body) {
  const { title, date, duration, intensity, type = 'Другое', exercises = [], notes = '', completed = false, mood = null } = body ?? {}
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) return 'Название должно содержать от 2 до 100 символов'
  if (!validDate(date)) return 'Укажите корректную дату'
  if (!Number.isInteger(Number(duration)) || !validNumber(duration, 1, 600)) return 'Длительность должна быть от 1 до 600 минут'
  if (!allowedIntensities.includes(intensity)) return 'Укажите допустимую интенсивность'
  if (!allowedTypes.includes(type)) return 'Укажите допустимый тип тренировки'
  const parsed = normalizeExercises(exercises)
  if (typeof parsed === 'string') return parsed
  if (typeof notes !== 'string' || notes.length > 2000) return 'Заметка не должна превышать 2000 символов'
  if (typeof completed !== 'boolean') return 'Статус выполнения некорректен'
  if (mood !== null && !(Number.isInteger(mood) && mood >= 1 && mood <= 5)) return 'Настроение должно быть от 1 до 5'
  return { title: title.trim(), date, duration: Number(duration), intensity, type, exercises: parsed.exercises, notes: notes.trim(), completed, mood }
}
