import { useState } from 'react'
import { ArrowRight, Activity } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

export default function LoginPage() {
  const { login, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (user) return <div className="route-loading">Вы уже вошли в аккаунт.</div>
  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setSubmitting(true)
    const data = new FormData(event.currentTarget)
    try {
      await login({ email: data.get('email'), password: data.get('password') })
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  return <div className="auth-page"><div className="auth-aside"><span className="auth-stamp"><Activity size={22} /></span><span className="section-index">ВОЗВРАЩАЙСЯ В СВОЙ РИТМ</span><h1>Каждый шаг<br /><em>имеет значение.</em></h1><p>Твой прогресс никуда не делся. Продолжим?</p></div><form className="auth-form" onSubmit={handleSubmit}><span className="section-index">ЛИЧНЫЙ КАБИНЕТ</span><h2>С возвращением</h2><p className="form-intro">Войди, чтобы открыть журнал и персональные ориентиры.</p>
    <label className="form-field">Email<input type="email" name="email" autoComplete="email" required maxLength="254" /></label>
    <label className="form-field">Пароль<input type="password" name="password" autoComplete="current-password" required minLength="8" /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-dark form-submit" type="submit" disabled={submitting}>{submitting ? 'Входим…' : 'Войти в аккаунт'}<ArrowRight size={17} /></button>
    <p className="form-switch">Впервые здесь? <Link to="/register">Создать аккаунт</Link></p>
  </form></div>
}