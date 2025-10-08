import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from './hooks/useAuthSession'

export default function GuestRoute() {
  const { session, userRole, checking } = useAuthSession()
  if (checking) return null
  if (session) {
    // If already authenticated, send to role-based home
    return <Navigate to={userRole === 'admin' ? '/admin' : '/'} replace />
  }
  return <Outlet />
}



