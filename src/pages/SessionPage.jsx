import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { progressApi, workoutsApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useToast } from '../context/useToast.js'
import { dateKey } from '../services/workoutTemplates.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorState } from '../components/StatePanels.jsx'

const REST_SECONDS = 90
const moods = [[1, '😫'], [2, '😐'], [3, '🙂'], [4, '😄'], [5, '🔥']]
const clock = (total) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

export default function SessionPage() {
  const { id } = useParams()
  const { notify } = useToast()
  const { data: workout, loading, error, retry } = useLoad(() => workoutsApi.get(id), id)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(true)
  const [rest, setRest] = useState(null)       // оставшиеся секунды отдыха или null
  const [restDone, setRestDone] = useState(false)
  const [sets, setSets] = useState({})         // "индекс-подход" -> true
  const [stage, setStage] = useState('active') // active | finish | done
  const [mood, setMood] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [rewards, setRewards] = useState([])

  useEffect(() => {
    if (!running || stage !== 'active') return
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [running, stage])

  useEffect(() => {
    if (rest === null) return
    const timer = setTimeout(() => {
      if (rest <= 1) { setRestDone(true); setRest(null) } else setRest(rest - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [rest])

  if (loading) return <div className="inner-page"><Skeleton lines={5} height={34} /></div>
  if (error) return <div className="inner-page"><ErrorState message={error} onRetry={retry} /></div>
  if (workout.completed && stage !== 'done') return <Navigate to={`/workouts/${id}`} replace />

  const toggleSet = (key) => {
    const next = !sets[key]
    setSets((current) => ({ ...current, [key]: next }))
    if (next) { setRestDone(false); setRest(REST_SECONDS) }
  }

  async function save() {
    setSaving(true)
    try {
      await workoutsApi.update(id, { ...workout, completed: true, date: dateKey(), duration: Math.min(600, Math.max(1, Math.round(seconds / 60))), mood, notes: notes.trim() ? [workout.notes, notes.trim()].filter(Boolean).join('\n') : workout.notes })
      const { items } = await progressApi.notifications()
      setRewards(items.filter((item) => !item.isRead).slice(0, 3))
      setStage('done'); notify('Тренировка выполнена')
    } catch (requestError) { notify(requestError.message, 'error') } finally { setSaving(false) }
  }

  if (stage === 'done') return <div className="inner-page session-page"><section className="session-done"><span className="section-index">ТРЕНИРОВКА ЗАВЕРШЕНА 🔥</span><h1>{workout.title}</h1><p className="big-time">{Math.max(1, Math.round(seconds / 60))} мин</p><p>+100 XP за тренировку</p>
    {rewards.map((item) => <div className="reward-line" key={item.id}>{item.message}</div>)}
    <div className="form-actions"><Link className="button button-quiet" to="/dashboard">На дашборд</Link><Link className="button button-dark" to={`/workouts/${id}`}>Открыть тренировку</Link></div></section></div>

  if (stage === 'finish') return <div className="inner-page session-page"><section className="session-done"><span className="section-index">ЗАВЕРШЕНИЕ</span><h1>Тренировка выполнена!</h1><p className="big-time">{clock(seconds)}</p>
    <h2>Как прошла тренировка?</h2><div className="mood-row">{moods.map(([value, emoji]) => <button key={value} type="button" className={`mood-button${mood === value ? ' is-on' : ''}`} aria-pressed={mood === value} aria-label={`Настроение ${value} из 5`} onClick={() => setMood(value)}>{emoji}</button>)}</div>
    <label className="form-field">Заметка<textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Как себя чувствовал?" /></label>
    <div className="form-actions"><button className="button button-quiet" type="button" onClick={() => setStage('active')}>Назад</button><button className="button button-dark" type="button" disabled={saving} onClick={save}>{saving ? 'Сохраняем…' : 'Сохранить тренировку'}</button></div></section></div>

  return <div className="inner-page session-page">
    <span className="section-index">ТРЕНИРОВКА / {workout.type.toUpperCase()}</span><h1>{workout.title}</h1>
    <div className="timer-face" role="timer" aria-live="off">{clock(seconds)}</div>
    <div className="form-actions timer-actions"><button className="button button-quiet" type="button" onClick={() => setRunning((value) => !value)}>{running ? <><Pause size={16} />Пауза</> : <><Play size={16} />Продолжить</>}</button><button className="button button-dark" type="button" onClick={() => { setRunning(false); setStage('finish') }}>Завершить</button></div>
    {(rest !== null || restDone) && <div className={`rest-box${restDone ? ' is-done' : ''}`} role="status">{restDone ? '🔔 СЛЕДУЮЩИЙ ПОДХОД' : <>ОТДЫХ <strong>{clock(rest)}</strong></>}<button className="icon-button" type="button" onClick={() => { setRest(null); setRestDone(false) }} aria-label="Скрыть отдых">✕</button></div>}
    <section className="exercise-panel">{workout.exercises.length === 0 ? <p className="muted-line">В этой тренировке нет упражнений — просто следи за временем.</p> : workout.exercises.map((exercise, index) => <div className="exercise-row session-row" key={`${exercise.name}-${index}`}>
      <div className="exercise-name"><strong>{exercise.name}</strong><span>{exercise.sets} × {exercise.reps}{exercise.weight ? ` · ${exercise.weight} кг` : ''}</span></div>
      <div className="set-chips">{Array.from({ length: exercise.sets }, (_, setIndex) => { const key = `${index}-${setIndex}`; return <button key={key} type="button" className={`set-chip${sets[key] ? ' is-done' : ''}`} aria-pressed={Boolean(sets[key])} aria-label={`${exercise.name}, подход ${setIndex + 1}`} onClick={() => toggleSet(key)}>{setIndex + 1}</button> })}</div>
    </div>)}</section>
  </div>
}
