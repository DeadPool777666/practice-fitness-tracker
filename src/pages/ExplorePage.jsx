import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, CheckCircle2, Circle, RefreshCw, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { workoutsApi } from '../services/api.js'
import { dateKey } from '../services/workoutTemplates.js'

export default function ExplorePage() {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedWorkout, setSavedWorkout] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('https://dummyjson.com/todos?limit=100', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Сервис задач временно недоступен.'); return response.json() })
      .then((data) => { if (!Array.isArray(data.todos)) throw new Error('Сервис вернул неожиданный ответ.'); setTodos(data.todos) })
      .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError.message || 'Не удалось загрузить задания.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  const filtered = useMemo(() => todos.filter((todo) => todo.todo.toLowerCase().includes(query.toLowerCase()) && (showCompleted || !todo.completed)), [todos, query, showCompleted])
  const selectedTodo = todos.find((todo) => todo.id === selectedId)
  function retry() { setLoading(true); setError(''); setAttempt((value) => value + 1) }

  async function addToPlan() {
    if (!selectedTodo || !user) return
    setSaving(true)
    setSaveError('')
    try {
      const workout = await workoutsApi.create({
        title: `Челлендж: ${selectedTodo.todo}`.slice(0, 100),
        date: dateKey(),
        duration: 20,
        intensity: 'Низкая',
        exercises: [],
        notes: `Ежедневная идея из DummyJSON (задача #${selectedTodo.id}). Адаптируйте длительность и нагрузку под самочувствие.`,
        completed: false,
      })
      setSavedWorkout(workout)
    } catch (requestError) {
      setSaveError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return <div className="inner-page explore-page"><div className="page-heading"><div><span className="section-index">EXPLORE / ВНЕШНИЙ ИСТОЧНИК</span><h1>Маленький вызов.<br /><em>Большая привычка.</em></h1></div><p>Идеи для активности из ежедневных задач. Выбери одну и впиши движение в свой день.</p></div>
    <section className="explore-source"><div className="explore-icon"><Sparkles size={22} /></div><div><strong>Ежедневные идеи</strong><span>Источник: DummyJSON · обновляется при загрузке</span></div><a href="https://dummyjson.com/todos" target="_blank" rel="noreferrer" aria-label="Открыть API DummyJSON"><ArrowUpRight size={17} /></a></section>
    <div className="catalog-toolbar explore-toolbar"><label className="search-field"><Search size={17} /><span className="sr-only">Поиск заданий</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти задание…" /></label><label className="toggle-field"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} /><span className="custom-checkbox" />Показать выполненные</label><span className="result-count">{loading ? '…' : `${filtered.length} заданий`}</span></div>
    {selectedTodo && <section className="challenge-detail" aria-live="polite"><div className="challenge-detail-icon"><Sparkles size={22} /></div><div className="challenge-detail-copy"><span className="section-index">ВЫБРАННАЯ ИДЕЯ · #{selectedTodo.id}</span><h2>{selectedTodo.todo}</h2><p>{selectedTodo.completed ? 'В исходном списке задача отмечена выполненной.' : 'Добавь эту идею в свой журнал и отметь выполнение после занятия.'} Ориентир: 20 минут, низкая интенсивность.</p>{saveError && <span className="form-error" role="alert">{saveError}</span>}</div><div className="challenge-detail-action">{savedWorkout ? <><span className="saved-message"><CheckCircle2 size={17} />Добавлено в план</span><Link className="button button-dark" to={`/workouts/${savedWorkout.id}`}>Открыть запись<ArrowRight size={16} /></Link></> : user ? <button className="button button-dark" type="button" onClick={addToPlan} disabled={saving}>{saving ? 'Сохраняем…' : 'Добавить в мой план'}<ArrowRight size={16} /></button> : <Link className="button button-dark" to="/login" state={{ from: { pathname: '/explore' } }}>Войти и сохранить<ArrowRight size={16} /></Link>}</div></section>}
    {loading ? <div className="explore-state" role="status"><span className="loading-spinner" /><p>Ищем идеи для движения…</p></div> : error ? <div className="explore-state explore-error" role="alert"><span className="error-mark">!</span><h2>Не получилось загрузить задания</h2><p>{error}</p><button className="button button-dark" type="button" onClick={retry}><RefreshCw size={16} />Повторить</button></div> : filtered.length ? <div className="challenge-list">{filtered.map((todo, index) => <button className={`challenge-row challenge-select${selectedId === todo.id ? ' selected-challenge' : ''}`} key={todo.id} type="button" onClick={() => { setSelectedId(todo.id); setSavedWorkout(null); setSaveError('') }} aria-pressed={selectedId === todo.id}><span className="challenge-index">{String(index + 1).padStart(2, '0')}</span><span className="challenge-mark">{todo.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}</span><span className="challenge-copy"><strong>{todo.todo}</strong><span>{todo.completed ? 'Завершено в исходном списке' : 'Нажми, чтобы посмотреть и добавить в план'}</span></span><span className="challenge-owner">ЗАДАНИЕ {todo.id}<ArrowRight size={16} /></span></button>)}</div> : <div className="empty-state"><Search size={23} /><h2>Заданий не найдено</h2><p>Попробуй изменить поисковый запрос или включить выполненные задания.</p></div>}
  </div>
}