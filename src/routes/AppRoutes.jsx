import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Lazy pages/components
const UserDashboard = lazy(() => import('@/pages/UserDashboard.jsx'))
const Login = lazy(() => import('@/pages/Login.jsx'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword.jsx'))
const ProtectedRoute = lazy(() => import('@/routes/guards/ProtectedRoute.jsx'))
const AdminRoute = lazy(() => import('@/routes/guards/AdminRoute.jsx'))
const RoleBasedHome = lazy(() => import('@/pages/RoleBasedHome.jsx'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard.jsx'))
const GuestRoute = lazy(() => import('@/routes/guards/GuestRoute.jsx'))

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* PUBLIC ROUTES - Outside all guards */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* GUEST ROUTES - Only for non-authenticated users */}
          <Route element={<GuestRoute />}> 
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* PROTECTED ROUTES - Require authentication */}
          <Route element={<ProtectedRoute />}> 
            <Route path="/" element={<RoleBasedHome />} />
            <Route path="/app" element={<UserDashboard />} /> {/* UserDashboard */} 
          </Route>

          {/* ADMIN ROUTES - Require admin role */}
          <Route element={<AdminRoute />}> 
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}


