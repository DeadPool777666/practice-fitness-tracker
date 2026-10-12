import { useState } from 'react'
import { challengesApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useToast } from '../context/useToast.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorBanner, ErrorState } from '../components/StatePanels.jsx'

const units = { workouts: 'тренировок', cardio: 'кардио', hours: 'ч', days: 'дней', streak: 'дней подряд' }

export default function ChallengesPage() {
  const { data, loading, error, retry, setData } = useLoad(() => challengesApi.list())
  const { notify } = useToast()
  const [actionError, setActionError] = useState(null)

  async function join(challenge) {
    setActionError(null)
    try { const updated = await challengesApi.join(challenge.id); setData((items) => items.map((item) => item.id === updated.id ? updated : item)); notify('Вы вступили в челлендж') }
    catch (requestError) { setActionError(requestError) }
  }
  async function leave(challenge) {
    try { await challengesApi.leave(challenge.id); setData((items) => items.map((item) => item.id === challenge.id ? { ...item, joined: false, progress: 0 } : item)); notify('Вы вышли из челленджа') }
    catch (requestError) { setActionError(requestError) }
  }

  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">ЧЕЛЛЕНДЖИ</span><h1>Вызов<br /><em>принят.</em></h1></div><p>Прогресс считается по тренировкам после вступления.</p></div>
    <ErrorBanner error={actionError} />
    {loading ? <Skeleton lines={5} height={46} /> : error ? <ErrorState message={error} onRetry={retry} /> : <div className="card-list">{data.map((challenge) => <article className={`goal-card${challenge.completed ? ' is-done' : ''}`} key={challenge.id}>
      <div className="goal-head"><div><strong>{challenge.title}</strong><span>{challenge.description}</span></div>
        <span className={`completion-tag${challenge.completed ? ' tag-done' : ''}`}>{challenge.completed ? 'Завершён +200 XP' : challenge.joined ? 'Участвую' : `${challenge.target} ${units[challenge.kind]}`}</span></div>
      {challenge.kind === 'days' && challenge.target <= 14 && <div className="day-chips">{Array.from({ length: challenge.target }, (_, index) => <span key={index} className={index < challenge.progress ? 'is-done' : ''}>{index < challenge.progress ? '✓' : '○'} День {index + 1}</span>)}</div>}
      {challenge.joined && <><ProgressBar value={challenge.progress} max={challenge.target} label={challenge.title} /><span className="muted-line">{challenge.progress} / {challenge.target} {units[challenge.kind]}</span></>}
      <div className="form-actions">{challenge.joined && !challenge.completed ? <button className="button button-quiet" type="button" onClick={() => leave(challenge)}>Выйти</button> : !challenge.joined && <button className="button button-dark" type="button" onClick={() => join(challenge)}>Присоединиться</button>}</div>
    </article>)}</div>}
  </div>
}
