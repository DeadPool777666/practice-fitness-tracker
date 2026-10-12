import { Link } from 'react-router-dom'

// Отправка писем в проекте не настроена, поэтому страница объясняет безопасные варианты
export default function ForgotPasswordPage() {
  return <div className="error-page"><span className="section-index">ВОССТАНОВЛЕНИЕ ДОСТУПА</span><h1>Забыл пароль?</h1>
    <p>В учебной версии нет отправки писем. Если ты уже вошёл, пароль меняется в настройках. Если нет — обратись к администратору сервиса, он поможет восстановить доступ.</p>
    <Link className="button button-dark" to="/login">Ко входу</Link></div>
}
