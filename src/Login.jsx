import { useState } from 'react'
import { supabase } from './supabaseClient'

const USERNAME_DOMAIN = 'app.local' // we’ll map username → username@app.local
const ALLOWED_USERNAME = 'HiQAdmin' // hard gate to your single user

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (username !== ALLOWED_USERNAME) {
      setError('Invalid username')
      return
    }
    setLoading(true)
    try {
      const email = `${username}@${USERNAME_DOMAIN}`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // session listener in App.jsx will swap the UI
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white dark:bg-gray-900 border rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-gray-500">Use your username and password.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm">Username</label>
          <input
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 rounded-lg bg-black text-white disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
