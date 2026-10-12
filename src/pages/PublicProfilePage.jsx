import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { socialApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorState } from '../components/StatePanels.jsx'

export default function PublicProfilePage() {
  const { id } = useParams()
  const { data, loading, error, retry } = useLoad(() => socialApi.profile(id), id)
  return <div className="inner-page">
    <Link className="back-link" to="/friends"><ArrowLeft size={16} />Друзья</Link>
    {loading ? <Skeleton lines={4} height={34} /> : error ? <ErrorState message={error} onRetry={retry} /> : <>
      <div className="profile-head"><span className="avatar avatar-large">{data.name.slice(0, 1).toUpperCase()}</span><div><span className="section-index">ПУБЛИЧНЫЙ ПРОФИЛЬ</span><h1>{data.name}</h1></div></div>
      <div className="stat-grid"><div className="stat-card"><span className="section-index">УРОВЕНЬ</span><strong>{data.level}</strong><small>{data.xp} XP</small></div><div className="stat-card"><span className="section-index">ТРЕНИРОВОК</span><strong>{data.totalWorkouts}</strong></div><div className="stat-card"><span className="section-index">ЛУЧШАЯ СЕРИЯ</span><strong>{data.bestStreak}</strong></div><div className="stat-card"><span className="section-index">ДОСТИЖЕНИЙ</span><strong>{data.achievements}</strong></div></div></>}
  </div>
}
