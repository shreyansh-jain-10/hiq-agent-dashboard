import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuthSession } from '@/hooks/useAuthSession'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'
  const { session, checking } = useAuthSession()

  useEffect(() => {
    setError(null)
  }, [email, password])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
      <div className="absolute -z-10 blur-3xl opacity-40 dark:opacity-30 pointer-events-none" aria-hidden>
        <div className="size-[28rem] rounded-full bg-indigo-300/30 absolute -top-20 -left-10" />
        <div className="size-[32rem] rounded-full bg-fuchsia-300/20 absolute -bottom-24 -right-16" />
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] px-7 py-8 space-y-6"
        aria-describedby={error ? 'login-error' : undefined}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-black text-white grid place-items-center font-bold tracking-wider">HiQ</div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Welcome</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sign in with your credentials</p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            id="login-error"
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <Mail size={18} className="text-slate-400" />
            </span>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-white dark:bg-slate-900 dark:border-slate-800 dark:focus:ring-black/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="Enter your email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            {capsLock && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">Caps Lock is on</span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <Lock size={18} className="text-slate-400" />
            </span>
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-white dark:bg-slate-900 dark:border-slate-800 dark:focus:ring-black/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              title={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={18} className="text-slate-500" /> : <Eye size={18} className="text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-black/30 dark:focus-visible:ring-black/60"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  )
}



