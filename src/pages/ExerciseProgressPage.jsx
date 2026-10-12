import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { exercisesApi, workoutsApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { exerciseHistory } from '../services/analytics.js'
import { LineChart } from '../components/Chart.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { EmptyState, ErrorState } from '../components/StatePanels.jsx'

export default function ExerciseProgressPage() {
  const { id } = useParams()
  const exercise = useLoad(() => exercisesApi.get(id), id)
  const workouts = useLoad(() => workoutsApi.list())
  const history = useMemo(() => (exercise.data && workouts.data ? exerciseHistory(workouts.data, exercise.data.name) : null), [exercise.data, workouts.data])
  const failed = exercise.error || workouts.error
  return <div className="inner-page">
    <Link className="back-link" to={`/exercises/${id}`}><ArrowLeft size={16} />К упражнению</Link>
    {exercise.loading || workouts.loading ? <Skeleton lines={5} height={34} /> : failed ? <ErrorState message={failed} onRetry={() => { exercise.retry(); workouts.retry() }} /> : <>
      <div className="page-heading"><div><span className="section-index">ПРОГРЕСС УПРАЖНЕНИЯ</span><h1>{exercise.data.name}</h1></div></div>
      {history.points.length === 0 ? <EmptyState title="Истории пока нет" text="Добавь это упражнение в выполненную тренировку, чтобы увидеть график." to="/workouts/new" action="Создать тренировку" /> : <>
        {history.record && <div className="pr-card"><span className="section-index">🏆 ЛИЧНЫЙ РЕКОРД</span><strong>{history.record.weight} кг × {history.record.reps}</strong><small>{history.record.date}</small></div>}
        <section className="chart-section"><h2>Вес по датам</h2><LineChart unit=" кг" points={history.points.map((p) => ({ label: p.date.slice(5), value: p.weight }))} /></section></>}
    </>}
  </div>
}
