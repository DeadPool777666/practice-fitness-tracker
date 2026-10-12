import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Bell, LogOut, Menu, ShieldCheck } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { progressApi } from '../services/api.js'
import MobileNav from './MobileNav.jsx'
import '../styles/app.css'

const currentYear = new Date().getFullYear()
const publicLinks = [{ to: '/', label: 'Обзор', end: true }, { to: '/workouts', label: 'Тренировки' }, { to: '/exercises', label: 'Упражнения' }, { to: '/explore', label: 'Исследовать' }, { to: '/pricing', label: 'Тарифы' }]
const mainLinks = [{ to: '/dashboard', label: 'Дашборд' }, { to: '/workouts', label: 'Тренировки' }, { to: '/exercises', label: 'Упражнения' }, { to: '/calendar', label: 'Календарь' }, { to: '/analytics', label: 'Аналитика' }]
const moreLinks = [{ to: '/goals', label: 'Цели' }, { to: '/challenges', label: 'Челленджи' }, { to: '/achievements', label: 'Достижения' }, { to: '/planner', label: 'Планировщик' }, { to: '/friends', label: 'Друзья' }, { to: '/explore', label: 'Исследовать' }, { to: '/pricing', label: 'Тарифы' }, { to: '/settings', label: 'Настройки' }]
const linkClass = ({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    let active = true
    progressApi.notifications().then((result) => { if (active) setUnread(result.unread) }).catch(() => {})
    return () => { active = false }
  }, [user, location.pathname])

  const closeMenus = (event) => {
    event.currentTarget.closest('details')?.removeAttribute('open')
    document.querySelector('.main-nav')?.classList.remove('nav-open')
  }

  return (
    <div className={`app-shell${user ? ' has-mobile-nav' : ''}`}>
      <a className="skip-link" href="#content">К содержимому</a>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Форма, главная"><span className="brand-mark"><Activity size={19} /></span><span>форма<span className="brand-period">.</span></span></Link>
        <nav className="main-nav" aria-label="Основная навигация" onClick={closeMenus}>
          {(user ? mainLinks : publicLinks).map(({ to, label, end }) => <NavLink key={to} to={to} end={end} className={linkClass}>{label}</NavLink>)}
          {user && <details className="nav-more"><summary className="nav-link">Ещё</summary><div className="nav-more-menu" onClick={closeMenus}>{moreLinks.map(({ to, label }) => <NavLink key={to} to={to} className={linkClass}>{label}</NavLink>)}{user.role === 'admin' && <NavLink to="/admin" className={linkClass}>Админка</NavLink>}</div></details>}
        </nav>
        <div className="topbar-actions">
          {user ? <>
            {user.role === 'admin' && <Link className="icon-button" to="/admin" title="Админка" aria-label="Админка"><ShieldCheck size={17} /></Link>}
            <Link className="icon-button bell-button" to="/notifications" title="Уведомления" aria-label={`Уведомления: ${unread}`}><Bell size={17} />{unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}</Link>
            <button className="icon-button logout-button" type="button" onClick={logout} title="Выйти" aria-label="Выйти"><LogOut size={17} /></button>
            <Link className="avatar" to="/profile" aria-label="Профиль">{user.name.slice(0, 1).toUpperCase()}</Link>
          </> : <><Link className="login-link" to="/login">Войти</Link><Link className="button button-dark button-small" to="/register">Создать аккаунт<ArrowUpRight size={15} /></Link></>}
          <button className="icon-button mobile-menu" type="button" aria-label="Открыть навигацию" onClick={() => document.querySelector('.main-nav')?.classList.toggle('nav-open')}><Menu size={20} /></button>
        </div>
      </header>
      <main className="page-content" id="content"><Outlet /></main>
      <footer className="site-footer"><Link className="brand brand-footer" to="/"><span className="brand-mark"><Activity size={17} /></span><span>форма<span className="brand-period">.</span></span></Link><p>Двигайся в своём ритме.</p><span>© {currentYear} форма</span></footer>
      {user && <MobileNav />}
    </div>
  )
}
