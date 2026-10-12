import { useState } from 'react'
import { Search, UserMinus, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { socialApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useToast } from '../context/useToast.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { ErrorBanner, ErrorState } from '../components/StatePanels.jsx'

const medals = ['🥇', '🥈', '🥉']

export default function FriendsPage() {
  const [reload, setReload] = useState(0)
  const { data: friends, loading, error, retry } = useLoad(() => socialApi.friends(), reload)
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [actionError, setActionError] = useState(null)

  async function search(event) {
    event.preventDefault(); setActionError(null)
    try { setResults(await socialApi.searchUsers(query)) } catch (requestError) { setActionError(requestError) }
  }
  async function add(user) {
    try { await socialApi.addFriend(user.id); notify(`${user.name} добавлен в друзья`); setReload((value) => value + 1); setResults(null) } catch (requestError) { setActionError(requestError) }
  }
  async function remove(user) {
    try { await socialApi.removeFriend(user.id); notify('Друг удалён'); setReload((value) => value + 1) } catch (requestError) { setActionError(requestError) }
  }

  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">ДРУЗЬЯ</span><h1>Вместе<br /><em>веселее.</em></h1></div><p>Рейтинг только среди друзей — без глобальных таблиц.</p></div>
    <ErrorBanner error={actionError} />
    <form className="filter-bar" onSubmit={search}><label className="search-field"><Search size={17} /><span className="sr-only">Поиск пользователей</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти по имени…" /></label><button className="button button-dark" type="submit">Искать</button></form>
    {results && <div className="card-list">{results.length === 0 ? <span className="muted-line">Никого не нашли.</span> : results.map((user) => <div className="notice" key={user.id}><span>{user.name}</span><button className="button button-quiet button-small" type="button" onClick={() => add(user)}><UserPlus size={14} />Добавить</button></div>)}</div>}
    {loading ? <Skeleton lines={4} height={34} /> : error ? <ErrorState message={error} onRetry={retry} /> : <>
      <section className="chart-section"><h2>Эта неделя</h2>{friends.leaderboard.map((person, index) => <div className={`board-row${person.isMe ? ' is-me' : ''}`} key={person.id}><span>{medals[index] || index + 1}</span><strong>{person.isMe ? 'Вы' : person.name}</strong><span>{person.weekWorkouts} трен.</span></div>)}</section>
      <section className="chart-section"><h2>Мои друзья</h2>{friends.friends.length === 0 ? <span className="muted-line">Друзей пока нет — найди кого-нибудь через поиск.</span> : friends.friends.map((friend) => <div className="notice" key={friend.id}><Link to={`/users/${friend.id}`}>{friend.name}</Link><button className="icon-button" type="button" onClick={() => remove(friend)} aria-label={`Удалить ${friend.name}`}><UserMinus size={15} /></button></div>)}</section></>}
  </div>
}
