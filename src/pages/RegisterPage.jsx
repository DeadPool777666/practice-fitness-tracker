import { useState } from 'react'
import { ArrowRight, Activity } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

export default function RegisterPage() {
  const { register, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (user) return <div className="route-loading">Вы уже вошли в аккаунт.</div>
  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setSubmitting(true)
    const data = new FormData(event.currentTarget)
    const profile = Object.fromEntries(data.entries())
    profile.age = Number(profile.age); profile.height = Number(profile.height); profile.weight = Number(profile.weight)
    try {
      await register(profile)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  return <div className="auth-page register-page"><div className="auth-aside"><span className="auth-stamp"><Activity size={22} /></span><span className="section-index">ТВОЯ ТОЧКА ОТСЧЁТА</span><h1>Начни с себя.<br /><em>Дальше — больше.</em></h1><p>Профиль нужен, чтобы давать бережные рекомендации и держать прогресс в одном месте.</p></div><form className="auth-form" onSubmit={handleSubmit}><span className="section-index">НОВЫЙ ПРОФИЛЬ</span><h2>Создать аккаунт</h2><p className="form-intro">Пара данных для персональных рекомендаций.</p>
    <div className="form-grid"><label className="form-field">Имя<input name="name" autoComplete="name" required minLength="2" maxLength="80" /></label><label className="form-field">Email<input type="email" name="email" autoComplete="email" required maxLength="254" /></label><label className="form-field">Пароль<input type="password" name="password" autoComplete="new-password" required minLength="8" maxLength="72" /><small>Не менее 8 символов</small></label><label className="form-field">Возраст<input type="number" name="age" min="16" max="99" defaultValue="28" required /></label><label className="form-field">Рост, см<input type="number" name="height" min="100" max="250" defaultValue="170" required /></label><label className="form-field">Вес, кг<input type="number" name="weight" min="30" max="350" step="0.1" defaultValue="68" required /></label><label className="form-field">Пол<select name="gender" defaultValue="Не указано"><option>Не указано</option><option>Женский</option><option>Мужской</option></select></label><label className="form-field">Уровень подготовки<select name="skillLevel" defaultValue="Новичок"><option>Новичок</option><option>Средний</option><option>Продвинутый</option></select></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-dark form-submit" type="submit" disabled={submitting}>{submitting ? 'Создаём профиль…' : 'Создать профиль'}<ArrowRight size={17} /></button>
    <p className="form-switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
  </form></div>
}