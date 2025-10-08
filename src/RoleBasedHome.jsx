import { Navigate } from 'react-router-dom'
import { useAuthSession } from './hooks/useAuthSession'

export default function RoleBasedHome() {
  const { userRole, checking } = useAuthSession()
  if (checking) return null
  if (userRole === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/app" replace />
}


