import { useState } from 'react'
import { ArrowRight, Clock3, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getAgeCategory, getRecommendedWorkoutIds, getRecommendation, russianCount, workoutTemplates } from '../services/workoutTemplates.js'

const intensities = ['Все уровни', 'Низкая', 'Средняя', 'Высокая', 'Экстремальная']

export default function WorkoutCatalogPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [intensity, setIntensity] = useState('Все уровни')
  const recommendedIds = user ? getRecommendedWorkoutIds(user.age) : []
  const filtered = workoutTemplates.filter((workout) => {
    const matchesText = `${workout.title} ${workout.description} ${workout.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (intensity === 'Все уровни' || workout.intensity === intensity)
  }).sort((first, second) => {
    const firstIndex = recommendedIds.indexOf(first.id)
    const secondIndex = recommendedIds.indexOf(second.id)
    return (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) - (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex)
  })
  const personalizedAdvice = user ? getRecommendation(user).advice : ''

  return <div className="inner-page catalog-page">
    <div className="page-heading"><div><span className="section-index">КАТАЛОГ / 06 ПЛАНОВ</span><h1>Выбери свой<br /><em>следующий шаг.</em></h1></div><p>Публичные планы для вдохновения. Открой тренировку, адаптируй под себя и добавь в личный журнал.</p></div>
    {user ? <section className="age-guidance"><span className="guidance-icon"><Clock3 size={21} /></span><div><span className="section-index">ПОДБОРКА ДЛЯ ВОЗРАСТА {getAgeCategory(user.age)}</span><p>{personalizedAdvice}</p></div><Link className="text-link" to="/dashboard">Мои рекомендации<ArrowRight size={15} /></Link></section> : <section className="age-guidance guest-guidance"><span className="guidance-icon"><Search size={20} /></span><div><span className="section-index">ПОДБЕРЁМ ПЛАН ПОД ТЕБЯ</span><p>Войди или создай профиль, чтобы увидеть рекомендации по возрасту, нагрузке и прогрессу.</p></div><Link className="text-link" to="/register">Создать профиль<ArrowRight size={15} /></Link></section>}
    <div className="catalog-toolbar"><label className="search-field"><Search size={17} /><span className="sr-only">Поиск тренировок</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, направление…" /></label><label className="select-field"><span>Интенсивность</span><select value={intensity} onChange={(event) => setIntensity(event.target.value)}>{intensities.map((value) => <option key={value}>{value}</option>)}</select></label><span className="result-count">{russianCount(filtered.length, ['план', 'плана', 'планов'])}</span></div>
    {filtered.length ? <div className="workout-grid">{filtered.map((workout, index) => <Link to={`/workouts/${workout.id}`} className={`workout-card card-${workout.accent}`} key={workout.id}>
      <div className="card-topline"><span className="card-index">{String(index + 1).padStart(2, '0')}</span><span className="category-pill">{workout.category}</span>{recommendedIds.includes(workout.id) && <span className="recommended-pill">Для вас</span>}<span className="card-arrow"><ArrowRight size={17} /></span></div>
      <div className="card-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><span className="art-word">{workout.category === 'Кардио' ? 'CARDIO' : workout.category === 'Кор' ? 'CORE' : workout.category === 'Силовая' ? 'STRENGTH' : 'RESET'}</span><span className="art-mark">F.</span></div>
      <div className="card-content"><div className="workout-meta"><span><Clock3 size={14} />{workout.duration} мин</span><span>{workout.intensity} нагрузка</span></div><h2>{workout.title}</h2><p>{workout.description}</p></div>
    </Link>)}</div> : <div className="empty-state"><Search size={23} /><h2>Ничего не нашлось</h2><p>Измени запрос или выбери другой уровень интенсивности.</p><button className="button button-outline" type="button" onClick={() => { setQuery(''); setIntensity('Все уровни') }}>Сбросить фильтры</button></div>}
  </div>
}