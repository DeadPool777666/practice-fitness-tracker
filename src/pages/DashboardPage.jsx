import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, CalendarDays, Check, Dumbbell, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { workoutsApi } from '../services/api.js'
import { dateKey, getRecommendation, russianCount } from '../services/workoutTemplates.js'

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`))
}

const currentDate = new Date()
const currentDateLabel = currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
const currentMonthLabel = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase()

export default function DashboardPage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let active = true
    workoutsApi.list().then((items) => { if (active) setWorkouts(items) }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadAttempt])

  function retryLoad() {
    setError('')
    setLoading(true)
    setLoadAttempt((attempt) => attempt + 1)
  }

  const completed = workouts.filter((workout) => workout.completed)
  const todayCount = completed.filter((workout) => workout.date === dateKey()).length
  const totalMinutes = completed.reduce((sum, workout) => sum + workout.duration, 0)
  const intensityCount = useMemo(() => ['Низкая', 'Средняя', 'Высокая', 'Экстремальная'].map((intensity) => ({ intensity, count: workouts.filter((workout) => workout.intensity === intensity).length })), [workouts])
  const maxIntensityCount = Math.max(1, ...intensityCount.map((item) => item.count))
  const recommendation = getRecommendation(user, workouts)

  async function toggleCompleted(workout) {
    setBusyId(workout.id)
    try { const updated = await workoutsApi.update(workout.id, { ...workout, completed: !workout.completed }); setWorkouts((current) => current.map((item) => item.id === updated.id ? updated : item)) }
    catch (requestError) { setError(requestError.message) } finally { setBusyId(null) }
  }
  async function removeWorkout(workout) {
    if (!window.confirm(`Удалить «${workout.title}»?`)) return
    setBusyId(workout.id)
    try { await workoutsApi.remove(workout.id); setWorkouts((current) => current.filter((item) => item.id !== workout.id)) }
    catch (requestError) { setError(requestError.message) } finally { setBusyId(null) }
  }

  return <div className="inner-page dashboard-page">
    <div className="dashboard-heading"><div><span className="section-index">ЛИЧНЫЙ КАБИНЕТ / {currentMonthLabel}</span><h1>Привет, {user.name.split(' ')[0]}<span className="heading-period">.</span></h1><p>Твой прогресс складывается из регулярных шагов.</p></div><Link className="button button-dark" to="/workouts/new"><Plus size={17} />Новая тренировка</Link></div>
    {error && <div className="inline-error" role="alert">{error}<button type="button" onClick={retryLoad}>Повторить</button></div>}
    <section className="dashboard-top-grid">
      <div className={`activity-panel${todayCount ? ' activity-done' : ''}`}><div className="panel-heading"><span className="section-index">СЕГОДНЯ · {currentDateLabel}</span><CalendarDays size={18} /></div><div className="activity-content"><div className="activity-check">{todayCount ? <Check size={27} /> : <Activity size={27} />}</div><div><h2>{todayCount ? 'Ты уже двигался сегодня' : 'День ещё открыт'}</h2><p>{todayCount ? `${todayCount} выполненная тренировка. Отличный ритм.` : 'Запиши тренировку, когда будешь готов.'}</p></div></div><Link className="panel-action" to="/workouts/new">{todayCount ? 'Добавить ещё' : 'Записать занятие'}<ArrowRight size={16} /></Link></div>
      <div className="stats-panel"><span className="section-index">ВСЁ В ДВИЖЕНИИ</span><div className="stats-row"><div className="stat-item"><strong>{loading ? '—' : completed.length}</strong><span>выполнено</span></div><div className="stat-divider" /><div className="stat-item"><strong>{loading ? '—' : <>{Math.floor(totalMinutes / 60)}<small>ч</small> {totalMinutes % 60}<small>м</small></>}</strong><span>в движении</span></div></div><div className="intensity-chart" aria-label="Распределение тренировок по интенсивности">{intensityCount.map((item) => <div className="intensity-line" key={item.intensity}><span>{item.intensity}</span><div className="intensity-track"><i style={{ width: `${Math.max(item.count ? 8 : 0, item.count / maxIntensityCount * 100)}%` }} /></div><strong>{item.count}</strong></div>)}</div></div>
    </section>
    <section className="insight-strip"><div className="insight-icon"><Sparkles size={19} /></div><div className="insight-copy"><span className="section-index">ПЕРСОНАЛЬНЫЙ ОРИЕНТИР · {recommendation.ageCategory} ЛЕТ · ИМТ {recommendation.bmi}</span><p>{recommendation.advice}</p><small>ИМТ — справочный показатель, не медицинский диагноз.</small></div><span className="insight-badge">{user.skillLevel}</span></section>
    <section className="journal-section"><div className="section-heading"><div><span className="section-index">ТВОИ ЗАПИСИ</span><h2>Журнал тренировок</h2></div><span className="journal-count">{russianCount(workouts.length, ['запись', 'записи', 'записей'])}</span></div>
      {loading ? <div className="journal-placeholder" role="status">Загружаем журнал…</div> : workouts.length ? <div className="journal-list">{workouts.map((workout) => <article className="journal-row" key={workout.id}><button className={`complete-toggle${workout.completed ? ' is-complete' : ''}`} type="button" onClick={() => toggleCompleted(workout)} disabled={busyId === workout.id} aria-label={workout.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}>{workout.completed && <Check size={15} />}</button><div className="journal-main"><Link to={`/workouts/${workout.id}`} className="journal-title">{workout.title}</Link><span>{formatDate(workout.date)} · {workout.intensity} · {workout.duration} мин</span></div><span className={`completion-tag${workout.completed ? ' tag-done' : ''}`}>{workout.completed ? 'Выполнена' : 'Запланирована'}</span><div className="journal-actions"><Link className="icon-button" title="Редактировать" aria-label={`Редактировать ${workout.title}`} to={`/workouts/${workout.id}/edit`}><Dumbbell size={16} /></Link><button className="icon-button danger-icon" title="Удалить" aria-label={`Удалить ${workout.title}`} disabled={busyId === workout.id} onClick={() => removeWorkout(workout)}><Trash2 size={16} /></button></div></article>)}</div> : <div className="empty-state journal-empty"><Dumbbell size={23} /><h2>Журнал пока пуст</h2><p>Добавь первую тренировку, чтобы увидеть свой ритм и статистику.</p><Link className="button button-dark" to="/workouts/new"><Plus size={16} />Создать тренировку</Link></div>}
    </section>
  </div>
}