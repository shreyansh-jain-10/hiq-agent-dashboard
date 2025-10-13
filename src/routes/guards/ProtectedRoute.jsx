import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthSession } from '@/hooks/useAuthSession'

export default function ProtectedRoute() {
  const { session, checking } = useAuthSession()
  const location = useLocation()
  
  if (checking) return null
  
  // Allow access to reset-password when using recovery link
  if (location.pathname === '/reset-password') {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    if (type === 'recovery') return <Outlet />
  }
  
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}


