import { progressApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorState } from '../components/StatePanels.jsx'
import ProgressBar from '../components/ProgressBar.jsx'

export default function AchievementsPage() {
  const { data, loading, error, retry } = useLoad(() => progressApi.get())
  const unlocked = data?.achievements.filter((item) => item.unlocked).length ?? 0
  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">ДОСТИЖЕНИЯ</span><h1>Каждый шаг<br /><em>считается.</em></h1></div></div>
    {loading ? <Skeleton lines={5} height={46} /> : error ? <ErrorState message={error} onRetry={retry} /> : <>
      <div className="level-panel"><div><span className="section-index">УРОВЕНЬ</span><strong className="big-number">{data.level}</strong></div><div className="level-bar"><ProgressBar value={data.intoLevel} max={data.perLevel} label="Опыт до следующего уровня" /><span>{data.intoLevel} / {data.perLevel} XP · всего {data.xp} XP</span></div></div>
      <p className="muted-line">Открыто {unlocked} из {data.achievements.length}. XP: тренировка +100, достижение +300, челлендж +200, задание дня +50.</p>
      <div className="achievement-grid">{data.achievements.map((item) => <article className={`achievement-card${item.unlocked ? ' is-unlocked' : ''}`} key={item.code}>
        <span className="achievement-emoji" aria-hidden="true">{item.unlocked ? item.emoji : '🔒'}</span><strong>{item.title}</strong><span>{item.description}</span>
        {item.unlocked && <small>Открыто {item.unlockedAt.slice(0, 10)}</small>}</article>)}</div></>}
  </div>
}
