import { NavLink, Outlet } from 'react-router-dom'
import { adminApi } from '../../services/api.js'
import { useLoad } from '../../services/useLoad.js'
import { useToast } from '../../context/useToast.js'
import { Skeleton } from '../../components/Skeleton.jsx'
import { ErrorState } from '../../components/StatePanels.jsx'

const usd = (cents) => `$${(cents / 100).toFixed(2)}`
const adminLinks = [['/admin', 'Обзор', true], ['/admin/users', 'Пользователи'], ['/admin/exercises', 'Упражнения'], ['/admin/challenges', 'Челленджи'], ['/admin/workouts', 'Тренировки']]

export function AdminLayout() {
  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">АДМИНИСТРИРОВАНИЕ</span><h1>Панель<br /><em>управления.</em></h1></div></div>
    <nav className="admin-tabs" aria-label="Разделы админки">{adminLinks.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-tab${isActive ? ' is-active' : ''}`}>{label}</NavLink>)}</nav>
    <Outlet />
  </div>
}

export function AdminDashboard() {
  const { data, loading, error, retry } = useLoad(() => adminApi.stats())
  if (loading) return <Skeleton lines={5} height={34} />
  if (error) return <ErrorState message={error} onRetry={retry} />
  const r = data.revenue
  return <>
    <div className="stat-grid">{[['ПОЛЬЗОВАТЕЛИ', data.users], ['ТРЕНИРОВКИ', data.workouts], ['УПРАЖНЕНИЯ', data.exercises], ['ЧЕЛЛЕНДЖИ', data.challenges]].map(([label, value]) => <div className="stat-card" key={label}><span className="section-index">{label}</span><strong>{value.toLocaleString('ru-RU')}</strong></div>)}</div>
    <section className="chart-section"><h2>Выручка (демо)</h2><p className="muted-line">Считается по реальным подпискам и платежам в БД. Оплата в проекте имитируется.</p>
      <div className="stat-grid">
        <div className="stat-card"><span className="section-index">PRO-ПОЛЬЗОВАТЕЛИ</span><strong>{r.proUsers}</strong></div>
        <div className="stat-card"><span className="section-index">MRR</span><strong>{usd(r.mrrCents)}</strong><small>месячная выручка</small></div>
        <div className="stat-card"><span className="section-index">КОНВЕРСИЯ</span><strong>{(r.conversion * 100).toFixed(1)}%</strong><small>Free → Pro</small></div>
        <div className="stat-card"><span className="section-index">ARPU</span><strong>{usd(r.arpuCents)}</strong><small>на пользователя</small></div>
        <div className="stat-card"><span className="section-index">ВСЕГО ОПЛАТ</span><strong>{usd(r.revenueCents)}</strong></div>
      </div></section>
  </>
}

export function AdminUsers() {
  const { data, loading, error, retry, setData } = useLoad(() => adminApi.users())
  const { notify } = useToast()
  async function update(user, patch) {
    try { const result = await adminApi.updateUser(user.id, patch); setData((items) => items.map((item) => item.id === user.id ? { ...item, ...result } : item)); notify('Пользователь обновлён') } catch (requestError) { notify(requestError.message, 'error') }
  }
  if (loading) return <Skeleton lines={6} height={34} />
  if (error) return <ErrorState message={error} onRetry={retry} />
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Роль</th><th>Трен.</th><th>Статус</th><th /></tr></thead><tbody>{data.map((user) => <tr key={user.id}>
    <td>{user.id}</td><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.workouts}</td><td>{user.blocked ? 'Заблокирован' : 'Активен'}</td>
    <td className="row-actions"><button className="button button-quiet button-small" type="button" onClick={() => update(user, { blocked: !user.blocked })}>{user.blocked ? 'Разблокировать' : 'Заблокировать'}</button><button className="button button-quiet button-small" type="button" onClick={() => update(user, { role: user.role === 'admin' ? 'user' : 'admin' })}>{user.role === 'admin' ? 'Сделать user' : 'Сделать admin'}</button></td></tr>)}</tbody></table></div>
}

export function AdminWorkouts() {
  const { data, loading, error, retry } = useLoad(() => adminApi.workouts())
  if (loading) return <Skeleton lines={6} height={34} />
  if (error) return <ErrorState message={error} onRetry={retry} />
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Название</th><th>Автор</th><th>Дата</th><th>Мин</th><th>Тип</th><th>Статус</th></tr></thead><tbody>{data.map((w) => <tr key={w.id}><td>{w.id}</td><td>{w.title}</td><td>{w.author}</td><td>{w.date}</td><td>{w.duration}</td><td>{w.type}</td><td>{w.completed ? 'Выполнена' : 'План'}</td></tr>)}</tbody></table></div>
}
