import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="route-loading" role="status">Загружаем профиль…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}