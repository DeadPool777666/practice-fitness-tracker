import { Link, useParams } from 'react-router-dom'
import { socialApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorState } from '../components/StatePanels.jsx'

export default function SharePage() {
  const { id } = useParams()
  const { data, loading, error, retry } = useLoad(() => socialApi.sharedWorkout(id), id)
  return <div className="inner-page share-page">
    {loading ? <Skeleton lines={4} height={34} /> : error ? <ErrorState message={error} onRetry={retry} /> : <section className="session-done"><span className="section-index">ТРЕНИРОВКА ЗАВЕРШЕНА 🔥</span><h1>{data.title}</h1>
      <p className="big-time">{data.duration} мин</p><p>{data.intensity} · {data.type} · {data.exerciseCount} упражнений</p><p className="muted-line">{data.author} · {data.date}</p>
      <Link className="button button-dark" to="/register">Начать свой путь в «форма.»</Link></section>}
  </div>
}
