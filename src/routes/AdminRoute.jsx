import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

// Только удобство интерфейса: настоящая проверка роли выполняется на сервере (requireAdmin)
export default function AdminRoute() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/403" replace />
}
