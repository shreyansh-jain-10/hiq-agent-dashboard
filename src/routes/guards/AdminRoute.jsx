import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthSession } from '@/hooks/useAuthSession'

export default function AdminRoute() {
  const { session, userRole, checking } = useAuthSession()
  const location = useLocation()
  if (checking) return null
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  if (userRole !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}


