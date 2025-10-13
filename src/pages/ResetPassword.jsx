import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isValidSession, setIsValidSession] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tokenUsed, setTokenUsed] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!window.location.hash || window.location.hash === '#') {
      setTokenUsed(true)
      setChecking(false)
      setTimeout(() => {
        navigate('/forgot-password', { replace: true })
      }, 2000)
    }
  }, [navigate])

  useEffect(() => {
    if (tokenUsed) return
    
    const checkRecoverySession = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const type = hashParams.get('type')
        const accessToken = hashParams.get('access_token')
        
        if (type === 'recovery' && accessToken) {
          setIsValidSession(true)
          setChecking(false)
          return
        }

        setError('Invalid or expired reset link. Please request a new one.')
        setChecking(false)
      } catch (_err) {
        setError('Error validating reset link')
        setChecking(false)
      }
    }

    checkRecoverySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
        setChecking(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [tokenUsed])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match!')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage('✅ Password updated successfully! Redirecting to login...')
      await supabase.auth.signOut()
      window.history.replaceState(null, '', '/reset-password')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (tokenUsed) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
        <div className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] px-7 py-8 text-center">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200/60 bg-blue-50/80 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 px-4 py-3 mb-6">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div className="text-left">
              <h3 className="font-semibold mb-1">Reset Link Already Used</h3>
              <p className="text-sm">This password reset link has already been used or is invalid.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Redirecting to request a new link...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-600" />
        </div>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          <p className="text-sm text-slate-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!isValidSession && error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
        <div className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] px-7 py-8">
          <div className="flex items-start gap-2 rounded-xl border border-yellow-200/60 bg-yellow-50/80 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/40 dark:text-yellow-300 px-4 py-3 mb-6">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <h3 className="font-semibold mb-1">Invalid or Expired Reset Link</h3>
              <p className="text-sm">The password reset link is invalid or has expired. Password reset links expire after 1 hour.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium hover:bg-black/90"
          >
            <ArrowLeft size={18} />
            Request New Reset Link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
      <div className="absolute -z-10 blur-3xl opacity-40 dark:opacity-30 pointer-events-none">
        <div className="size-[28rem] rounded-full bg-blue-300/30 absolute -top-20 -left-10" />
        <div className="size-[32rem] rounded-full bg-purple-300/20 absolute -bottom-24 -right-16" />
      </div>

      <form
        onSubmit={handleUpdatePassword}
        className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] px-7 py-8 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-black text-white grid place-items-center font-bold tracking-wider">HiQ</div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Set New Password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enter a strong password below</p>
          </div>
        </div>

        {message && (
          <div className="flex items-start gap-2 rounded-xl border border-green-200/60 bg-green-50/80 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 px-3 py-2">
            <CheckCircle className="mt-0.5 shrink-0" size={18} />
            <span className="text-sm">{message}</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <Lock size={18} className="text-slate-400" />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-white dark:bg-slate-900 dark:border-slate-800"
              placeholder="Enter new password"
              required
              minLength={6}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {showPassword ? <EyeOff size={18} className="text-slate-500" /> : <Eye size={18} className="text-slate-500" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Minimum 6 characters</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <Lock size={18} className="text-slate-400" />
            </span>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-white dark:bg-slate-900 dark:border-slate-800"
              placeholder="Confirm new password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
        </div>

        {password && (
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Password strength: 
            {password.length < 6 && <span className="text-red-600 ml-1 font-medium">Too short</span>}
            {password.length >= 6 && password.length < 8 && <span className="text-yellow-600 ml-1 font-medium">Weak</span>}
            {password.length >= 8 && password.length < 12 && <span className="text-blue-600 ml-1 font-medium">Medium</span>}
            {password.length >= 12 && <span className="text-green-600 ml-1 font-medium">Strong</span>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Updating password...
            </>
          ) : (
            'Update Password'
          )}
        </button>

        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
          After updating, you'll be redirected to login with your new password
        </p>
      </form>
    </div>
  )
}



