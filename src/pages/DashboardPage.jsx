import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowRight, CalendarDays, Check, Dumbbell, Flame, Plus, Repeat, Sparkles, Trash2, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { goalsApi, planningApi, progressApi, workoutsApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { getCoachTips, getRecoveryScore } from '../services/coach.js'
import { fetchQuote } from '../services/quote.js'
import { goalTypeLabels } from '../services/labels.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { dateKey, getRecommendation, russianCount } from '../services/workoutTemplates.js'
import { buildHeatmap, computeStreaks, formatMinutes, nextPlanned, todayWeekday, weeklySummary } from '../services/stats.js'
import { useToast } from '../context/useToast.js'
import Heatmap from '../components/Heatmap.jsx'
import QuickWorkoutModal from '../components/QuickWorkoutModal.jsx'
import { DashboardSkeleton, Skeleton } from '../components/Skeleton.jsx'

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
  const [quickOpen, setQuickOpen] = useState(false)
  const { notify } = useToast()
  const navigate = useNavigate()
  const levelRef = useRef(null)
  const [greeting] = useState(() => { const hour = new Date().getHours(); return hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер' })
  const [levelUp, setLevelUp] = useState(false)

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
  const streaks = useMemo(() => computeStreaks(workouts), [workouts])
  const week = useMemo(() => weeklySummary(workouts), [workouts])
  const heatmap = useMemo(() => buildHeatmap(workouts), [workouts])
  const next = useMemo(() => nextPlanned(workouts), [workouts])

  const doneKey = String(completed.length)
  const progress = useLoad(() => progressApi.get(), doneKey)
  const goals = useLoad(() => goalsApi.list(), doneKey)
  const planner = useLoad(() => planningApi.planner())
  const quote = useLoad(() => fetchQuote())
  const coachTips = useMemo(() => getCoachTips(workouts), [workouts])
  const recovery = useMemo(() => getRecoveryScore(workouts), [workouts])
  const planToday = planner.data?.find((row) => row.weekday === todayWeekday())
  const activeGoal = goals.data?.find((goal) => goal.status === 'active')

  useEffect(() => {
    const level = progress.data?.level
    if (!level) return
    if (levelRef.current && level > levelRef.current) { setLevelUp(true); setTimeout(() => setLevelUp(false), 3500) }
    levelRef.current = level
  }, [progress.data?.level])

  async function startPlanned() {
    try {
      const created = await workoutsApi.create({ title: planToday.title, date: dateKey(), duration: planToday.duration, intensity: planToday.intensity, type: planToday.type, exercises: [], notes: '', completed: false })
      navigate(`/workouts/${created.id}/start`)
    } catch (requestError) { notify(requestError.message, 'error') }
  }

  async function toggleCompleted(workout) {
    setBusyId(workout.id)
    try { const updated = await workoutsApi.update(workout.id, { ...workout, completed: !workout.completed }); setWorkouts((current) => current.map((item) => item.id === updated.id ? updated : item)); notify(updated.completed ? 'Тренировка выполнена' : 'Отметка снята') }
    catch (requestError) { setError(requestError.message); notify('Не удалось сохранить тренировку', 'error') } finally { setBusyId(null) }
  }
  async function removeWorkout(workout) {
    if (!window.confirm(`Удалить «${workout.title}»?`)) return
    setBusyId(workout.id)
    try { await workoutsApi.remove(workout.id); setWorkouts((current) => current.filter((item) => item.id !== workout.id)); notify('Тренировка удалена') }
    catch (requestError) { setError(requestError.message); notify('Не удалось удалить тренировку', 'error') } finally { setBusyId(null) }
  }
  async function repeatWorkout(workout) {
    setBusyId(workout.id)
    try {
      const created = await workoutsApi.create({ title: workout.title, date: dateKey(), duration: workout.duration, intensity: workout.intensity, type: workout.type, exercises: workout.exercises, notes: '', completed: false })
      setWorkouts((current) => [created, ...current])
      notify('Тренировка повторена на сегодня')
    } catch { notify('Не удалось повторить тренировку', 'error') } finally { setBusyId(null) }
  }

  return <div className="inner-page dashboard-page">
    <div className="dashboard-heading"><div><span className="section-index">ЛИЧНЫЙ КАБИНЕТ / {currentMonthLabel}</span><h1>{greeting}, {user.name.split(' ')[0]} 👋<span className="heading-period">.</span></h1><p>Твой прогресс складывается из регулярных шагов.</p></div><div className="heading-actions"><button className="button button-outline" type="button" onClick={() => setQuickOpen(true)}><Zap size={16} />Быстрая</button><Link className="button button-dark" to="/workouts/new"><Plus size={17} />Новая тренировка</Link></div></div>
    {error && <div className="inline-error" role="alert">{error}<button type="button" onClick={retryLoad}>Повторить</button></div>}
    <section className="dashboard-top-grid">
      <div className={`activity-panel${todayCount ? ' activity-done' : ''}`}><div className="panel-heading"><span className="section-index">СЕГОДНЯ · {currentDateLabel}</span><CalendarDays size={18} /></div><div className="activity-content"><div className="activity-check">{todayCount ? <Check size={27} /> : <Activity size={27} />}</div><div><h2>{todayCount ? 'Ты уже двигался сегодня' : 'День ещё открыт'}</h2><p>{todayCount ? `${todayCount} выполненная тренировка. Отличный ритм.` : 'Запиши тренировку, когда будешь готов.'}</p></div></div>{next && <div className="next-workout"><span className="section-index">{next.date === dateKey() ? 'В ПЛАНЕ НА СЕГОДНЯ' : `БЛИЖАЙШАЯ · ${formatDate(next.date).toUpperCase()}`}</span><strong>{next.title}</strong><small>{next.duration} мин · {next.intensity}</small></div>}{next ? <span className="today-actions"><Link className="panel-action" to={`/workouts/${next.id}/start`}>Начать тренировку<ArrowRight size={16} /></Link><Link className="panel-action" to={`/workouts/${next.id}`}>Подробнее</Link></span>
          : planToday && planToday.type !== 'Отдых' ? <><div className="next-workout"><span className="section-index">ПО ПЛАНУ НА СЕГОДНЯ</span><strong>{planToday.title}</strong><small>{planToday.duration} мин · {planToday.intensity}</small></div><button className="panel-action action-button" type="button" onClick={startPlanned}>Начать тренировку<ArrowRight size={16} /></button></>
          : planToday ? <div className="next-workout"><span className="section-index">ПО ПЛАНУ</span><strong>День отдыха</strong><small>Восстановление — тоже часть прогресса</small></div>
          : <Link className="panel-action" to="/workouts">Выбрать тренировку<ArrowRight size={16} /></Link>}</div>
      <div className="stats-panel"><span className="section-index">ВСЁ В ДВИЖЕНИИ</span><div className="stats-row"><div className="stat-item"><strong>{loading ? '—' : completed.length}</strong><span>выполнено</span></div><div className="stat-divider" /><div className="stat-item"><strong>{loading ? '—' : <>{Math.floor(totalMinutes / 60)}<small>ч</small> {totalMinutes % 60}<small>м</small></>}</strong><span>в движении</span></div></div><div className="intensity-chart" aria-label="Распределение тренировок по интенсивности">{intensityCount.map((item) => <div className="intensity-line" key={item.intensity}><span>{item.intensity}</span><div className="intensity-track"><i style={{ width: `${Math.max(item.count ? 8 : 0, item.count / maxIntensityCount * 100)}%` }} /></div><strong>{item.count}</strong></div>)}</div></div>
    </section>
    {loading ? <DashboardSkeleton /> : <section className="pulse-grid">
      <div className="pulse-card streak-card"><span className="section-index">СЕРИЯ</span><div className="pulse-value"><Flame size={28} /><strong>{streaks.current}</strong><span>{streaks.current === 1 ? 'день' : 'дн. подряд'}</span></div><small>Лучшая серия: {streaks.best}</small></div>
      <div className="pulse-card"><span className="section-index">ЭТА НЕДЕЛЯ</span><div className="pulse-value"><strong>{week.count}</strong><span>{russianCount(week.count, ['тренировка', 'тренировки', 'тренировок']).split(' ').slice(1).join(' ')}</span></div><small>{formatMinutes(week.minutes)} · в среднем {week.average} мин · {week.diff > 0 ? `+${week.diff}` : week.diff} к прошлой неделе</small></div>
      <div className="pulse-card"><span className="section-index">ИНТЕНСИВНОСТЬ НЕДЕЛИ</span><div className="pulse-value"><strong className="pulse-text">{week.topIntensity}</strong></div><small>Чаще всего на этой неделе</small></div>
    </section>}
    {!loading && <section className="extras-grid">
      <div className={`pulse-card level-card${levelUp ? ' is-levelup' : ''}`}><span className="section-index">УРОВЕНЬ{levelUp ? ' · НОВЫЙ!' : ''}</span>{progress.data ? <><div className="pulse-value"><strong>{progress.data.level}</strong><span>{progress.data.intoLevel} / {progress.data.perLevel} XP</span></div><ProgressBar value={progress.data.intoLevel} max={progress.data.perLevel} label="Опыт до следующего уровня" /></> : <Skeleton lines={2} height={20} />}</div>
      <div className="pulse-card"><span className="section-index">ТЕКУЩАЯ ЦЕЛЬ</span>{goals.loading ? <Skeleton lines={2} height={20} /> : activeGoal ? <><strong className="goal-title">{activeGoal.title}</strong><ProgressBar value={activeGoal.current} max={activeGoal.target} label={activeGoal.title} /><small>{Math.min(activeGoal.current, activeGoal.target)} / {activeGoal.target} {goalTypeLabels[activeGoal.type]} · осталось {Math.max(0, activeGoal.target - activeGoal.current)}</small></> : <><small>Активных целей нет</small><Link className="panel-action" to="/goals">Поставить цель</Link></>}</div>
      <div className="pulse-card"><span className="section-index">ВОССТАНОВЛЕНИЕ</span><div className="pulse-value"><strong>{recovery.score}</strong><span>/ 100</span></div><ProgressBar value={recovery.score} max={100} label="Восстановление" /><small>{recovery.label}</small></div>
    </section>}
    {!loading && <section className="coach-grid">
      <div className="coach-card"><span className="section-index">ТРЕНЕР СОВЕТУЕТ</span>{coachTips.map((tip) => <p key={tip}>{tip}</p>)}<small className="quote-line">{quote.data ? `«${quote.data.quote}» — ${quote.data.author}` : quote.loading ? '' : 'Двигайся в своём ритме.'}</small></div>
      <div className="coach-card"><span className="section-index">ЗАДАНИЯ ДНЯ</span>{progress.data ? progress.data.quests.map((quest) => <p className={`quest${quest.done ? ' is-done' : ''}`} key={quest.code}>{quest.done ? '☑' : '☐'} {quest.text}<small> +{quest.xp} XP</small></p>) : <Skeleton lines={3} height={16} />}
        {progress.data && <><span className="section-index badges-title">ДОСТИЖЕНИЯ</span><p className="badge-row">{progress.data.achievements.filter((a) => a.unlocked).slice(-3).map((a) => <span className="badge" key={a.code}>{a.emoji} {a.title}</span>)}{progress.data.achievements.every((a) => !a.unlocked) && <small>Пока нет</small>}</p></>}</div>
    </section>}
    <section className="insight-strip"><div className="insight-icon"><Sparkles size={19} /></div><div className="insight-copy"><span className="section-index">ПЕРСОНАЛЬНЫЙ ОРИЕНТИР · {recommendation.ageCategory} ЛЕТ · ИМТ {recommendation.bmi}</span><p>{recommendation.advice}</p><small>ИМТ — справочный показатель, не медицинский диагноз.</small></div><span className="insight-badge">{user.skillLevel}</span></section>
    <section className="heatmap-section"><div className="section-heading"><div><span className="section-index">АКТИВНОСТЬ / 16 НЕДЕЛЬ</span><h2>Твой ритм</h2></div></div>{loading ? <Skeleton lines={3} height={18} /> : <Heatmap cells={heatmap} />}</section>
    <section className="journal-section"><div className="section-heading"><div><span className="section-index">ТВОИ ЗАПИСИ</span><h2>Журнал тренировок</h2></div><span className="journal-count">{russianCount(workouts.length, ['запись', 'записи', 'записей'])}</span></div>
      {loading ? <Skeleton lines={4} height={44} /> : workouts.length ? <div className="journal-list">{workouts.map((workout) => <article className="journal-row" key={workout.id}><button className={`complete-toggle${workout.completed ? ' is-complete' : ''}`} type="button" onClick={() => toggleCompleted(workout)} disabled={busyId === workout.id} aria-label={workout.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}>{workout.completed && <Check size={15} />}</button><div className="journal-main"><Link to={`/workouts/${workout.id}`} className="journal-title">{workout.title}</Link><span>{formatDate(workout.date)} · {workout.intensity} · {workout.duration} мин</span></div><span className={`completion-tag${workout.completed ? ' tag-done' : ''}`}>{workout.completed ? 'Выполнена' : 'Запланирована'}</span><div className="journal-actions">{workout.completed && <button className="icon-button" title="Повторить на сегодня" aria-label={`Повторить ${workout.title}`} disabled={busyId === workout.id} onClick={() => repeatWorkout(workout)}><Repeat size={16} /></button>}<Link className="icon-button" title="Редактировать" aria-label={`Редактировать ${workout.title}`} to={`/workouts/${workout.id}/edit`}><Dumbbell size={16} /></Link><button className="icon-button danger-icon" title="Удалить" aria-label={`Удалить ${workout.title}`} disabled={busyId === workout.id} onClick={() => removeWorkout(workout)}><Trash2 size={16} /></button></div></article>)}</div> : <div className="empty-state journal-empty"><Dumbbell size={23} /><h2>Журнал пока пуст</h2><p>Добавь первую тренировку, чтобы увидеть свой ритм и статистику.</p><Link className="button button-dark" to="/workouts/new"><Plus size={16} />Создать тренировку</Link></div>}
    </section>
    {quickOpen && <QuickWorkoutModal onClose={() => setQuickOpen(false)} onError={(message) => notify(message, 'error')} onCreated={(created) => { setWorkouts((current) => [created, ...current]); setQuickOpen(false); notify('Тренировка добавлена') }} />}
  </div>
}