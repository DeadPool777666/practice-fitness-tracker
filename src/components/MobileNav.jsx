import { CalendarDays, Dumbbell, LayoutDashboard, LineChart, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { to: '/workouts', label: 'Тренировки', icon: Dumbbell },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays },
  { to: '/analytics', label: 'Аналитика', icon: LineChart },
  { to: '/profile', label: 'Профиль', icon: User },
]

export default function MobileNav() {
  return <nav className="mobile-nav" aria-label="Нижняя навигация">
    {items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>)}
  </nav>
}
