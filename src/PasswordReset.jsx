import { useState } from 'react'
import { supabase } from './supabaseClient'
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function PasswordReset({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black" />
        <div className="absolute -z-10 blur-3xl opacity-40 dark:opacity-30 pointer-events-none" aria-hidden>
          <div className="size-[28rem] rounded-full bg-green-300/30 absolute -top-20 -left-10" />
          <div className="size-[32rem] rounded-full bg-blue-300/20 absolute -bottom-24 -right-16" />
        </div>

        <div className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] px-7 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-3">Check Your Email</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We've sent a password reset link to <strong>{email}</strong>. 
            Click the link in the email to reset your password.
          </p>

          <button
            onClick={onBack}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
            Back to Login
          </button>
        </div>
      </div>
    )
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
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] px-7 py-8 space-y-6"
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-black text-white grid place-items-center font-bold tracking-wider">HiQ</div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Reset Password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enter your email to receive a reset link</p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
            We'll send a reset link to this email address
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-black/30"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Sending...
            </>
          ) : (
            <>
              <Mail size={18} />
              Send Reset Link
            </>
          )}
        </button>

        {/* Back to login */}
        <button
          type="button"
          onClick={onBack}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} />
          Back to Login
        </button>
      </form>
    </div>
  )
}