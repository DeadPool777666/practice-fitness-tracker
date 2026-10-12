import { useMemo, useState } from 'react'
import { Heart, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { exercisesApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useAuth } from '../context/useAuth.js'
import { useToast } from '../context/useToast.js'
import { difficulties, equipments, muscles } from '../services/labels.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { EmptyState, ErrorState } from '../components/StatePanels.jsx'


export default function ExercisesPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const list = useLoad(() => exercisesApi.list())
  const favorites = useLoad(() => (user ? exercisesApi.favorites() : Promise.resolve([])), user?.id)
  const [filters, setFilters] = useState({ query: '', muscle: '', equipment: '', difficulty: '', sort: 'name', onlyFavorites: false })
  const set = (field, value) => setFilters((current) => ({ ...current, [field]: value }))

  const visible = useMemo(() => {
    const favs = new Set(favorites.data ?? [])
    const rank = (level) => difficulties.indexOf(level)
    return (list.data ?? [])
      .filter((item) => item.name.toLowerCase().includes(filters.query.trim().toLowerCase()))
      .filter((item) => (!filters.muscle || item.muscle === filters.muscle) && (!filters.equipment || item.equipment === filters.equipment) && (!filters.difficulty || item.difficulty === filters.difficulty))
      .filter((item) => !filters.onlyFavorites || favs.has(item.id))
      .sort((a, b) => filters.sort === 'difficulty' ? rank(a.difficulty) - rank(b.difficulty) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name))
  }, [list.data, favorites.data, filters])

  async function toggleFavorite(exercise) {
    const isFavorite = favorites.data.includes(exercise.id)
    try {
      if (isFavorite) await exercisesApi.removeFavorite(exercise.id); else await exercisesApi.addFavorite(exercise.id)
      favorites.setData((ids) => isFavorite ? ids.filter((id) => id !== exercise.id) : [...ids, exercise.id])
    } catch { notify('Не удалось изменить избранное', 'error') }
  }

  const select = (field, options, label) => <label className="form-field">{label}<select value={filters[field]} onChange={(event) => set(field, event.target.value)}><option value="">Все</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>

  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">БИБЛИОТЕКА УПРАЖНЕНИЙ</span><h1>Техника<br /><em>решает.</em></h1></div></div>
    <div className="filter-bar">
      <label className="search-field"><Search size={17} /><span className="sr-only">Поиск упражнений</span><input value={filters.query} onChange={(event) => set('query', event.target.value)} placeholder="Найти упражнение…" /></label>
      {select('muscle', muscles, 'Мышцы')}{select('equipment', equipments, 'Оборудование')}{select('difficulty', difficulties, 'Сложность')}
      <label className="form-field">Сортировка<select value={filters.sort} onChange={(event) => set('sort', event.target.value)}><option value="name">По названию</option><option value="difficulty">По сложности</option></select></label>
      {user && <label className="checkbox-field"><input type="checkbox" checked={filters.onlyFavorites} onChange={(event) => set('onlyFavorites', event.target.checked)} /><span className="custom-checkbox" /><span>Только избранное</span></label>}
    </div>
    {list.loading ? <Skeleton lines={6} height={46} /> : list.error ? <ErrorState message={list.error} onRetry={list.retry} /> : visible.length === 0
      ? <EmptyState title="Ничего не найдено" text="Измени поиск или фильтры." />
      : <div className="exercise-grid">{visible.map((exercise) => <article className="exercise-card" key={exercise.id}>
        <div className="exercise-card-top"><span className="tag">{exercise.muscle}</span>{user && favorites.data && <button className={`heart-button${favorites.data.includes(exercise.id) ? ' is-on' : ''}`} type="button" onClick={() => toggleFavorite(exercise)} aria-pressed={favorites.data.includes(exercise.id)} aria-label={`Избранное: ${exercise.name}`}><Heart size={17} fill={favorites.data.includes(exercise.id) ? 'currentColor' : 'none'} /></button>}</div>
        <Link to={`/exercises/${exercise.id}`}><h2>{exercise.name}</h2></Link><p>{exercise.description}</p><small>{exercise.equipment} · {exercise.difficulty}</small></article>)}</div>}
  </div>
}
