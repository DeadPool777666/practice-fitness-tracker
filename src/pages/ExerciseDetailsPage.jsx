import { ArrowLeft, LineChart } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { exercisesApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useAuth } from '../context/useAuth.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorState } from '../components/StatePanels.jsx'

export default function ExerciseDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data, loading, error, retry } = useLoad(() => exercisesApi.get(id), id)
  return <div className="inner-page detail-page">
    <Link className="back-link" to="/exercises"><ArrowLeft size={16} />Библиотека</Link>
    {loading ? <Skeleton lines={5} height={30} /> : error ? <ErrorState message={error} onRetry={retry} /> : <section className="detail-intro detail-lime">
      <span className="section-index">{data.muscle.toUpperCase()} / {data.equipment.toUpperCase()} / {data.difficulty.toUpperCase()}</span>
      <h1>{data.name}</h1>{data.imageUrl && <img className="exercise-image" src={data.imageUrl} alt={data.name} />}
      <p>{data.description}</p><div className="training-guidance"><span className="section-index">ТЕХНИКА</span><p>{data.instructions || 'Описание техники пока не добавлено.'}</p></div>
      {user ? <Link className="button button-dark" to={`/exercises/${data.id}/progress`}><LineChart size={16} />Мой прогресс</Link> : <Link className="button button-dark" to="/login">Войдите, чтобы видеть прогресс</Link>}
    </section>}
  </div>
}
