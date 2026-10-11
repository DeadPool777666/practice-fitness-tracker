import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Clock3, Dumbbell } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { workoutsApi } from '../services/api.js'
import { getWorkoutGuidance, workoutTemplates } from '../services/workoutTemplates.js'

export default function WorkoutDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const template = workoutTemplates.find((item) => item.id === id)
  const [personalWorkout, setPersonalWorkout] = useState(null)
  const [loading, setLoading] = useState(!template && Boolean(user))
  useEffect(() => {
    if (template || !user) return
    workoutsApi.get(id).then(setPersonalWorkout).catch(() => setPersonalWorkout(null)).finally(() => setLoading(false))
  }, [id, template, user])
  const workout = template || personalWorkout
  const guidance = user && workout ? getWorkoutGuidance(user.age, workout.intensity) : null

  if (loading) return <div className="route-loading" role="status">Загружаем тренировку…</div>
  if (!workout) return <div className="inner-page"><div className="empty-state"><h1>Тренировка не найдена</h1><Link className="button button-dark" to="/workouts">Вернуться в каталог</Link></div></div>

  return <div className="inner-page detail-page">
    <Link className="back-link" to={template ? '/workouts' : '/dashboard'}><ArrowLeft size={16} />{template ? 'Каталог' : 'Мой прогресс'}</Link>
    <div className="detail-layout"><section className={`detail-intro detail-${template?.accent || 'lime'}`}><span className="section-index">{template?.category || 'ЛИЧНАЯ ТРЕНИРОВКА'} / {workout.intensity.toUpperCase()}</span><h1>{workout.title}</h1><p>{template?.description || workout.notes || 'Запись из вашего личного журнала тренировок.'}</p><div className="detail-facts"><span><Clock3 size={16} />{workout.duration} минут</span><span><Dumbbell size={16} />{workout.exercises.length} упражнений</span></div>{guidance && <div className="training-guidance"><span className="section-index">ОРИЕНТИР ДЛЯ ВАС · {user.age} ЛЕТ</span><p>{guidance}</p></div>}{template && <Link className="button button-dark" to={user ? '/workouts/new' : '/register'} state={user ? { template } : undefined}>Добавить в журнал<ArrowUpRight size={16} /></Link>}</section>
      <section className="exercise-panel"><div className="panel-heading"><span className="section-index">ПЛАН ЗАНЯТИЯ</span><span>{workout.exercises.length} движений</span></div>{workout.exercises.map((exercise, index) => <div className="exercise-row" key={`${exercise.name}-${index}`}><span className="exercise-count">0{index + 1}</span><div className="exercise-name"><strong>{exercise.name}</strong><span>{exercise.sets} подхода · {exercise.reps} повторений{exercise.weight ? ` · ${exercise.weight} кг` : ''}</span></div><Check size={17} /></div>)}{workout.notes && <div className="detail-notes"><span className="section-index">ЗАМЕТКА</span><p>{workout.notes}</p></div>}</section>
    </div>
  </div>
}