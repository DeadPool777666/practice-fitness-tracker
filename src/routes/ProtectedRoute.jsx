import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { Skeleton } from '../components/Skeleton.jsx'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="inner-page"><Skeleton lines={5} height={28} /></div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}
