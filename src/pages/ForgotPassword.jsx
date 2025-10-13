import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setMessage('Password reset email sent! Check your inbox and follow the link to reset your password.')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
      <div className="absolute -z-10 blur-3xl opacity-40 dark:opacity-30 pointer-events-none" aria-hidden>
        <div className="size-[28rem] rounded-full bg-blue-300/30 absolute -top-20 -left-10" />
        <div className="size-[32rem] rounded-full bg-purple-300/20 absolute -bottom-24 -right-16" />
      </div>

      <form
        onSubmit={handleResetPassword}
        className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] px-7 py-8 space-y-6"
        aria-describedby={error ? 'forgot-error' : undefined}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-black text-white grid place-items-center font-bold tracking-wider">HiQ</div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Reset password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enter your email to receive a reset link</p>
          </div>
        </div>

        {/* Success message */}
        {message && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-green-200/60 bg-green-50/80 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 px-3 py-2"
          >
            <CheckCircle className="mt-0.5 shrink-0" size={18} />
            <span className="text-sm">{message}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            id="forgot-error"
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
              disabled={loading}
            />
          </div>
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
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </button>

        {/* Back to login */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to login
          </button>
        </div>
      </form>
    </div>
  )
}



