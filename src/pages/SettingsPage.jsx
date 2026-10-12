import { useState } from 'react'
import { Link } from 'react-router-dom'
import { accountApi } from '../services/api.js'
import { useAuth } from '../context/useAuth.js'
import { useTheme } from '../context/useTheme.js'
import { useToast } from '../context/useToast.js'
import { ErrorBanner } from '../components/StatePanels.jsx'

export default function SettingsPage() {
  const { user, refresh } = useAuth()
  const { theme, setTheme } = useTheme()
  const { notify } = useToast()
  const [account, setAccount] = useState({ name: user.name, email: user.email, isPublic: user.isPublic })
  const [passwords, setPasswords] = useState({ current: '', next: '' })
  const [accountError, setAccountError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  async function saveAccount(event) {
    event.preventDefault(); setAccountError(null)
    try { await accountApi.update(account); await refresh(); notify('Настройки сохранены') } catch (error) { setAccountError(error) }
  }
  async function savePassword(event) {
    event.preventDefault(); setPasswordError(null)
    try { await accountApi.changePassword(passwords); setPasswords({ current: '', next: '' }); notify('Пароль изменён') } catch (error) { setPasswordError(error) }
  }

  return <div className="inner-page settings-page">
    <div className="page-heading"><div><span className="section-index">НАСТРОЙКИ</span><h1>Всё под<br /><em>тебя.</em></h1></div></div>
    <form className="panel-form" onSubmit={saveAccount}><h2>Аккаунт и приватность</h2>
      <div className="form-grid"><label className="form-field">Имя<input required minLength={2} value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} /></label><label className="form-field">Email<input type="email" required value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} /></label></div>
      <label className="checkbox-field"><input type="checkbox" checked={account.isPublic} onChange={(event) => setAccount({ ...account, isPublic: event.target.checked })} /><span className="custom-checkbox" /><span>Публичный профиль (меня можно найти и добавить в друзья)</span></label>
      <ErrorBanner error={accountError} /><div className="form-actions"><button className="button button-dark" type="submit">Сохранить</button></div></form>
    <form className="panel-form" onSubmit={savePassword}><h2>Пароль</h2>
      <div className="form-grid"><label className="form-field">Текущий пароль<input type="password" autoComplete="current-password" required value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} /></label><label className="form-field">Новый пароль (от 8 символов)<input type="password" autoComplete="new-password" minLength={8} required value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} /></label></div>
      <ErrorBanner error={passwordError} /><div className="form-actions"><button className="button button-dark" type="submit">Изменить пароль</button></div></form>
    <section className="panel-form"><h2>Тема оформления</h2><div className="theme-options" role="radiogroup" aria-label="Тема">{[['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']].map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={theme === value} className={`theme-option${theme === value ? ' is-on' : ''}`} onClick={() => setTheme(value)}>{label}</button>)}</div></section>
    <section className="panel-form"><h2>Подписка</h2><p className="muted-line">Тариф: {user.isPro ? 'Pro' : 'Free'}.</p><Link className="button button-quiet" to="/pricing">Тарифы и оплата (демо)</Link></section>
  </div>
}
