import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthSession } from '@/hooks/useAuthSession'

export default function GuestRoute() {
  const { session, userRole, checking } = useAuthSession()
  const location = useLocation()
  
  if (checking) return null
  
  // Allow reset-password page even when authenticated if it's a recovery flow
  if (location.pathname === '/reset-password') {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    if (type === 'recovery') return <Outlet />
  }
  
  if (session) return <Navigate to={userRole === 'admin' ? '/admin' : '/'} replace />
  return <Outlet />
}


