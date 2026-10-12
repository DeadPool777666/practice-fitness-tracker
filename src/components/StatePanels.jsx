import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ErrorState({ message, onRetry }) {
  return <div className="empty-state error-state" role="alert">
    <AlertTriangle size={24} />
    <h2>Что-то пошло не так</h2>
    <p>{message}</p>
    {onRetry && <button className="button button-dark" type="button" onClick={onRetry}>Повторить</button>}
  </div>
}

export function EmptyState({ title, text, to, action }) {
  return <div className="empty-state">
    <h2>{title}</h2>
    {text && <p>{text}</p>}
    {to && <Link className="button button-dark" to={to}>{action}</Link>}
  </div>
}

// Ошибка действия; для лимита бесплатного тарифа добавляет ссылку на тарифы
export function ErrorBanner({ error }) {
  if (!error) return null
  return <div className="inline-error" role="alert">{error.message}{error.code === 'PRO_REQUIRED' && <Link to="/pricing">Тарифы</Link>}</div>
}
