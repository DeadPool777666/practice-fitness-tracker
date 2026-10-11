import { ArrowLeft, ArrowUpRight, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
  return <div className="error-page"><ShieldAlert size={32} /><span className="section-index">403 / ДОСТУП ЗАКРЫТ</span><h1>Сюда нельзя.</h1><p>У этой страницы ограниченный доступ. Войди в аккаунт, чтобы продолжить.</p><Link className="button button-dark" to="/login">Перейти ко входу<ArrowUpRight size={16} /></Link></div>
}

export function NotFoundPage() {
  return <div className="error-page"><span className="not-found-code">404</span><span className="section-index">МАРШРУТ НЕ НАЙДЕН</span><h1>Кажется, ты<br />свернул не туда.</h1><p>Такой страницы нет, но путь к прогрессу открыт.</p><Link className="button button-dark" to="/"><ArrowLeft size={16} />На главную</Link></div>
}