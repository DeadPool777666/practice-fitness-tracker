import { Link } from 'react-router-dom'
import { goalsApi, progressApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useAuth } from '../context/useAuth.js'
import { formatMinutes } from '../services/stats.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorState } from '../components/StatePanels.jsx'
import { goalTypeLabels } from '../services/labels.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const progress = useLoad(() => progressApi.get())
  const goals = useLoad(() => goalsApi.list())
  const failed = progress.error || goals.error
  return <div className="inner-page">
    <div className="profile-head"><span className="avatar avatar-large">{user.name.slice(0, 1).toUpperCase()}</span><div><span className="section-index">ПРОФИЛЬ{user.isPro ? ' · PRO' : ''}{user.role === 'admin' ? ' · ADMIN' : ''}</span><h1>{user.name}</h1><span className="muted-line">{user.email}</span></div><Link className="button button-quiet" to="/settings">Настройки</Link></div>
    {progress.loading || goals.loading ? <Skeleton lines={5} height={34} /> : failed ? <ErrorState message={failed} onRetry={() => { progress.retry(); goals.retry() }} /> : <>
      <div className="level-panel"><div><span className="section-index">УРОВЕНЬ</span><strong className="big-number">{progress.data.level}</strong></div><div className="level-bar"><ProgressBar value={progress.data.intoLevel} max={progress.data.perLevel} label="Опыт" /><span>{progress.data.intoLevel} / {progress.data.perLevel} XP · всего {progress.data.xp}</span></div></div>
      <div className="stat-grid">
        <div className="stat-card"><span className="section-index">СЕРИЯ</span><strong>{progress.data.stats.currentStreak}</strong><small>лучшая: {progress.data.stats.bestStreak}</small></div>
        <div className="stat-card"><span className="section-index">ТРЕНИРОВОК</span><strong>{progress.data.stats.count}</strong><small>выполнено</small></div>
        <div className="stat-card"><span className="section-index">ВРЕМЯ</span><strong>{formatMinutes(progress.data.stats.minutes)}</strong><small>суммарно</small></div>
      </div>
      <section className="chart-section"><h2>Достижения</h2><div className="badge-row">{progress.data.achievements.filter((a) => a.unlocked).map((a) => <span className="badge" key={a.code}>{a.emoji} {a.title}</span>)}{progress.data.achievements.every((a) => !a.unlocked) && <span className="muted-line">Пока нет — первая тренировка откроет достижение.</span>}</div><Link className="panel-action" to="/achievements">Все достижения</Link></section>
      <section className="chart-section"><h2>Цели</h2>{goals.data.length === 0 ? <span className="muted-line">Целей пока нет.</span> : goals.data.slice(0, 4).map((goal) => <div className="mini-goal" key={goal.id}><span>{goal.title} · {Math.min(goal.current, goal.target)}/{goal.target} {goalTypeLabels[goal.type]}</span><ProgressBar value={goal.current} max={goal.target} label={goal.title} /></div>)}<Link className="panel-action" to="/goals">Все цели</Link></section>
    </>}
  </div>
}
