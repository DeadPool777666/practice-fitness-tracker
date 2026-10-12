import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { workoutsApi } from '../services/api.js'
import { dateKey } from '../services/workoutTemplates.js'
import { addDays } from '../services/stats.js'
import { Skeleton } from '../components/Skeleton.jsx'

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function CalendarPage() {
  const today = dateKey()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    workoutsApi.list().then((items) => { if (active) setWorkouts(items) }).catch((e) => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])

  const byDate = useMemo(() => {
    const map = {}
    workouts.forEach((w) => { (map[w.date] ||= []).push(w) })
    return map
  }, [workouts])

  const days = useMemo(() => {
    const first = dateKey(month)
    const offset = (month.getDay() + 6) % 7
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array.from({ length: offset }, () => null), ...Array.from({ length: count }, (_, i) => addDays(first, i))]
  }, [month])

  const shiftMonth = (delta) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  const dayItems = byDate[selected] || []
  const label = month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  return <div className="inner-page calendar-page">
    <div className="page-heading"><div><span className="section-index">КАЛЕНДАРЬ</span><h1>Твои дни<br /><em>в движении.</em></h1></div><Link className="button button-dark" to="/workouts/new"><Plus size={16} />Новая тренировка</Link></div>
    {error && <div className="inline-error" role="alert">{error}<button type="button" onClick={() => { setError(''); setLoading(true); setAttempt((n) => n + 1) }}>Повторить</button></div>}
    <div className="calendar-head"><button className="icon-button" type="button" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц"><ChevronLeft size={18} /></button><h2>{label}</h2><button className="icon-button" type="button" onClick={() => shiftMonth(1)} aria-label="Следующий месяц"><ChevronRight size={18} /></button></div>
    {loading ? <Skeleton lines={6} height={34} /> : <div className="calendar-grid">
      {weekdays.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
      {days.map((day, index) => day ? <button key={day} type="button" className={`calendar-day${day === today ? ' is-today' : ''}${day === selected ? ' is-selected' : ''}`} onClick={() => setSelected(day)} aria-label={`${day}, тренировок: ${(byDate[day] || []).length}`}>
        <span>{Number(day.slice(8))}</span>
        <span className="day-dots">{(byDate[day] || []).slice(0, 3).map((w) => <i key={w.id} className={w.completed ? 'dot-done' : 'dot-planned'} />)}</span>
      </button> : <span key={`blank-${index}`} />)}
    </div>}
    <section className="calendar-list">
      <span className="section-index">{new Date(`${selected}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</span>
      {dayItems.length ? dayItems.map((w) => <Link key={w.id} to={`/workouts/${w.id}`} className="calendar-item"><strong>{w.title}</strong><span>{w.duration} мин · {w.intensity}</span><span className={`completion-tag${w.completed ? ' tag-done' : ''}`}>{w.completed ? 'Выполнена' : 'Запланирована'}</span></Link>)
        : <div className="empty-state"><h2>В этот день тренировок нет</h2><p>Добавь запись, чтобы она появилась в календаре.</p></div>}
    </section>
  </div>
}
