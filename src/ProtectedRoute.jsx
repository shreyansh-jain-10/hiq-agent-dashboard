import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthSession } from './hooks/useAuthSession'

export default function ProtectedRoute() {
  const { session, checking } = useAuthSession()
  const location = useLocation()
  if (checking) return null
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}


