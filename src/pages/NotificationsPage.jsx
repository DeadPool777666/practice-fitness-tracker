import { progressApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useToast } from '../context/useToast.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { EmptyState, ErrorState } from '../components/StatePanels.jsx'

const icons = { achievement: '🏆', goal: '🎯', pr: '💥', challenge: '🏁' }

export default function NotificationsPage() {
  const { data, loading, error, retry, setData } = useLoad(() => progressApi.notifications())
  const { notify } = useToast()
  async function readAll() {
    try { await progressApi.readNotifications(); setData((current) => ({ unread: 0, items: current.items.map((item) => ({ ...item, isRead: true })) })) } catch { notify('Не удалось отметить прочитанными', 'error') }
  }
  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">УВЕДОМЛЕНИЯ</span><h1>Что<br /><em>нового.</em></h1></div>{data?.unread > 0 && <button className="button button-quiet" type="button" onClick={readAll}>Прочитать все ({data.unread})</button>}</div>
    {loading ? <Skeleton lines={5} height={34} /> : error ? <ErrorState message={error} onRetry={retry} /> : data.items.length === 0
      ? <EmptyState title="Пока тихо" text="Здесь появятся достижения, рекорды и завершённые цели." />
      : <div className="card-list">{data.items.map((item) => <div className={`notice${item.isRead ? '' : ' is-new'}`} key={item.id}><span aria-hidden="true">{icons[item.kind] || '🔔'}</span><span>{item.message}</span><small>{item.createdAt.slice(0, 10)}</small></div>)}</div>}
  </div>
}
