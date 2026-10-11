export const workoutTemplates = [
  { id: 'tempo-strength', title: 'Сила в темпе', category: 'Силовая', duration: 45, intensity: 'Средняя', description: 'Три базовых движения и ровный темп для уверенной силовой сессии.', accent: 'lime', exercises: [{ name: 'Приседания', sets: 3, reps: 10, weight: null }, { name: 'Отжимания', sets: 3, reps: 12, weight: null }, { name: 'Тяга гантели', sets: 3, reps: 10, weight: 8 }] },
  { id: 'pulse-run', title: 'Пульс города', category: 'Кардио', duration: 30, intensity: 'Средняя', description: 'Интервальная пробежка с короткими ускорениями и активным восстановлением.', accent: 'orange', exercises: [{ name: 'Лёгкий бег', sets: 1, reps: 20, weight: null }, { name: 'Ускорения', sets: 6, reps: 1, weight: null }] },
  { id: 'mobility-reset', title: 'Перезагрузка тела', category: 'Мобильность', duration: 20, intensity: 'Низкая', description: 'Мягкая подвижность позвоночника, плеч и тазобедренных суставов.', accent: 'blue', exercises: [{ name: 'Кошка-корова', sets: 2, reps: 10, weight: null }, { name: 'Выпад с растяжкой', sets: 2, reps: 8, weight: null }] },
  { id: 'leg-drive', title: 'Опора и импульс', category: 'Силовая', duration: 50, intensity: 'Высокая', description: 'Тренировка ног с постепенным наращиванием нагрузки и контролем техники.', accent: 'orange', exercises: [{ name: 'Гоблет-присед', sets: 4, reps: 8, weight: 12 }, { name: 'Румынская тяга', sets: 4, reps: 10, weight: 16 }, { name: 'Ягодичный мост', sets: 3, reps: 12, weight: null }] },
  { id: 'core-control', title: 'Центр контроля', category: 'Кор', duration: 25, intensity: 'Средняя', description: 'Стабильность корпуса без спешки: короткие подходы, чистое движение.', accent: 'blue', exercises: [{ name: 'Планка', sets: 3, reps: 30, weight: null }, { name: 'Dead bug', sets: 3, reps: 10, weight: null }] },
  { id: 'endurance-ride', title: 'Длинная дистанция', category: 'Кардио', duration: 40, intensity: 'Высокая', description: 'Ритмичная велосессия для выносливости с контрольным финишем.', accent: 'lime', exercises: [{ name: 'Велотренажёр', sets: 1, reps: 40, weight: null }] },
]

export function dateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function getAgeCategory(age) {
  if (age < 20) return '16–20'
  if (age < 40) return '20–40'
  if (age < 60) return '40–60'
  return '60–99'
}

export function getRecommendedWorkoutIds(age) {
  if (age < 20) return ['mobility-reset', 'tempo-strength', 'core-control']
  if (age < 40) return ['leg-drive', 'pulse-run', 'tempo-strength', 'core-control']
  if (age < 60) return ['mobility-reset', 'tempo-strength', 'core-control', 'endurance-ride']
  return ['mobility-reset', 'core-control', 'endurance-ride']
}

export function getWorkoutGuidance(age, intensity) {
  const isHighIntensity = ['Высокая', 'Экстремальная'].includes(intensity)
  if (age >= 60) return 'Держи нагрузку контролируемой, начинай с разминки и оставляй время на восстановление.'
  if (age >= 40 && isHighIntensity) return 'Перед высокой нагрузкой удели больше времени разминке; после занятия запланируй восстановление до 48 часов.'
  if (age >= 40) return 'Сохраняй комфортный темп, разминай суставы и увеличивай объём постепенно.'
  if (age < 20) return 'Сосредоточься на технике и постепенном прогрессе; не гонись за максимальными весами.'
  return 'Следи за техникой, чередуй силовую и аэробную нагрузку и повышай объём постепенно.'
}

export function getRecommendation(user, workouts = []) {
  const bmi = user.weight / ((user.height / 100) ** 2)
  const today = dateKey()
  const didTrainToday = workouts.some((workout) => workout.date === today && workout.completed)
  const highLoad = workouts.some((workout) => workout.date === today && ['Высокая', 'Экстремальная'].includes(workout.intensity))
  let advice = bmi < 18.5
    ? 'Добавляйте нагрузку постепенно и уделяйте внимание восстановлению и полноценному питанию.'
    : bmi >= 25
      ? 'Сочетайте умеренное кардио с силовой работой; ориентируйтесь на самочувствие, а не только на цифры.'
      : 'Поддерживайте баланс силовой и аэробной нагрузки, повышая объём постепенно.'
  if (user.age >= 40 && highLoad) advice = 'После высокой нагрузки сегодня запланируйте не менее 48 часов восстановления и мягкую разминку суставов.'
  else if (user.age >= 60) advice = 'Выбирайте контролируемую интенсивность, качественную разминку и восстановительные дни между тяжёлыми сессиями.'
  else if (user.age < 20) advice = 'Сосредоточьтесь на технике и постепенном прогрессе; максимальные веса не должны быть целью.'
  return { bmi: bmi.toFixed(1), didTrainToday, ageCategory: getAgeCategory(user.age), advice }
}

export function russianCount(count, forms) {
  const lastTwo = count % 100
  const last = count % 10
  const formIndex = lastTwo >= 11 && lastTwo <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2
  return `${count} ${forms[formIndex]}`
}