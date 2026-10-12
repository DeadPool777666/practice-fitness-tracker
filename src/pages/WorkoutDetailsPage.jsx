import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Clock3, Dumbbell } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../context/useToast.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { useAuth } from '../context/useAuth.js'
import { workoutsApi } from '../services/api.js'
import { dateKey, getWorkoutGuidance, workoutTemplates } from '../services/workoutTemplates.js'

export default function WorkoutDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const template = workoutTemplates.find((item) => item.id === id)
  const [personalWorkout, setPersonalWorkout] = useState(null)
  const [loading, setLoading] = useState(!template && Boolean(user))
  useEffect(() => {
    if (template || !user) return
    workoutsApi.get(id).then(setPersonalWorkout).catch(() => setPersonalWorkout(null)).finally(() => setLoading(false))
  }, [id, template, user])
  const workout = template || personalWorkout

  async function startTemplate() {
    try {
      const created = await workoutsApi.create({ title: template.title, date: dateKey(), duration: template.duration, intensity: template.intensity, type: template.category, exercises: template.exercises, notes: '', completed: false })
      navigate(`/workouts/${created.id}/start`)
    } catch (requestError) { notify(requestError.message, 'error') }
  }
  async function toggleShare() {
    try {
      const updated = await workoutsApi.share(personalWorkout.id, !personalWorkout.shared)
      setPersonalWorkout(updated)
      if (updated.shared) { await navigator.clipboard?.writeText(`${window.location.origin}/share/workout/${updated.id}`).catch(() => {}); notify('Публичная ссылка скопирована') } else notify('Публичный доступ закрыт')
    } catch (requestError) { notify(requestError.message, 'error') }
  }
  const guidance = user && workout ? getWorkoutGuidance(user.age, workout.intensity) : null

  if (loading) return <div className="inner-page"><Skeleton lines={5} height={30} /></div>
  if (!workout) return <div className="inner-page"><div className="empty-state"><h1>Тренировка не найдена</h1><Link className="button button-dark" to="/workouts">Вернуться в каталог</Link></div></div>

  return <div className="inner-page detail-page">
    <Link className="back-link" to={template ? '/workouts' : '/dashboard'}><ArrowLeft size={16} />{template ? 'Каталог' : 'Мой прогресс'}</Link>
    <div className="detail-layout"><section className={`detail-intro detail-${template?.accent || 'lime'}`}><span className="section-index">{template?.category || 'ЛИЧНАЯ ТРЕНИРОВКА'} / {workout.intensity.toUpperCase()}</span><h1>{workout.title}</h1><p>{template?.description || workout.notes || 'Запись из вашего личного журнала тренировок.'}</p><div className="detail-facts"><span><Clock3 size={16} />{workout.duration} минут</span><span><Dumbbell size={16} />{workout.exercises.length} упражнений</span></div>{guidance && <div className="training-guidance"><span className="section-index">ОРИЕНТИР ДЛЯ ВАС · {user.age} ЛЕТ</span><p>{guidance}</p></div>}{template && user && <button className="button button-dark" type="button" onClick={startTemplate}>Начать сейчас<ArrowUpRight size={16} /></button>}{personalWorkout && !personalWorkout.completed && <Link className="button button-dark" to={`/workouts/${personalWorkout.id}/start`}>Начать тренировку<ArrowUpRight size={16} /></Link>}{personalWorkout?.completed && <button className="button button-quiet" type="button" onClick={toggleShare}>{personalWorkout.shared ? 'Закрыть публичную ссылку' : 'Поделиться'}</button>}{personalWorkout?.mood && <span className="mood-view">Настроение: {['', '😫', '😐', '🙂', '😄', '🔥'][personalWorkout.mood]}</span>}{template && <Link className="button button-dark" to={user ? '/workouts/new' : '/register'} state={user ? { template } : undefined}>Добавить в журнал<ArrowUpRight size={16} /></Link>}</section>
      <section className="exercise-panel"><div className="panel-heading"><span className="section-index">ПЛАН ЗАНЯТИЯ</span><span>{workout.exercises.length} движений</span></div>{workout.exercises.map((exercise, index) => <div className="exercise-row" key={`${exercise.name}-${index}`}><span className="exercise-count">0{index + 1}</span><div className="exercise-name"><strong>{exercise.name}</strong><span>{exercise.sets} подхода · {exercise.reps} повторений{exercise.weight ? ` · ${exercise.weight} кг` : ''}</span></div><Check size={17} /></div>)}{workout.notes && <div className="detail-notes"><span className="section-index">ЗАМЕТКА</span><p>{workout.notes}</p></div>}</section>
    </div>
  </div>
}