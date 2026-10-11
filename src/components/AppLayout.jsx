import { Activity, ArrowUpRight, Dumbbell, LayoutDashboard, LogOut, Menu, Sparkles } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import '../styles/app.css'

const currentYear = new Date().getFullYear()
const navigation = [
  { to: '/', label: 'Обзор', icon: Activity, end: true },
  { to: '/workouts', label: 'Тренировки', icon: Dumbbell },
  { to: '/explore', label: 'Исследовать', icon: Sparkles },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Форма, главная"><span className="brand-mark"><Activity size={19} /></span><span>форма<span className="brand-period">.</span></span></Link>
        <nav className="main-nav" aria-label="Основная навигация">
          {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}><Icon size={16} />{label}</NavLink>)}
        </nav>
        <div className="topbar-actions">
          {user ? <><Link className="dashboard-link" to="/dashboard"><LayoutDashboard size={16} /><span>Мой прогресс</span></Link><button className="icon-button logout-button" type="button" onClick={logout} title="Выйти" aria-label="Выйти"><LogOut size={17} /></button><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span></> : <><Link className="login-link" to="/login">Войти</Link><Link className="button button-dark button-small" to="/register">Создать аккаунт<ArrowUpRight size={15} /></Link></>}
          <button className="icon-button mobile-menu" type="button" aria-label="Открыть навигацию" onClick={() => document.querySelector('.main-nav')?.classList.toggle('nav-open')}><Menu size={20} /></button>
        </div>
      </header>
      <main className="page-content"><Outlet /></main>
      <footer className="site-footer"><Link className="brand brand-footer" to="/"><span className="brand-mark"><Activity size={17} /></span><span>форма<span className="brand-period">.</span></span></Link><p>Двигайся в своём ритме.</p><span>© {currentYear} форма</span></footer>
    </div>
  )
}