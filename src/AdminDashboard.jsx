import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Users, UserPlus, Mail, Shield, AlertCircle, CheckCircle, Loader2, LogOut, Eye, EyeOff, Copy, Check } from 'lucide-react'

const USERNAME_DOMAIN = 'app.local'

export default function AdminDashboard({ onLogout }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    if (!username.trim()) {
      setError('Username is required')
      return
    }

    setCreating(true)
    try {
      const email = `${username}@${USERNAME_DOMAIN}`
      const password = generatePassword()
      
      // IMPORTANT: This will call your backend API or Edge Function
      // For now, I'm showing you need to create an API endpoint
      const response = await fetch('YOUR_API_ENDPOINT/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username,
          is_admin: isAdmin
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create user')
      }

      const data = await response.json()

      setGeneratedPassword(password)
      setSuccess(`User created successfully! Save the credentials below.`)
      setUsername('')
      setIsAdmin(false)
      await fetchUsers()
    } catch (err) {
      setError(err.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setUsername('')
    setIsAdmin(false)
    setGeneratedPassword('')
    setShowPassword(false)
    setError(null)
    setSuccess(null)
  }

  const handleLogout = async () => {
    if (typeof onLogout === 'function') {
      onLogout()
      return
    }
    try {
      await supabase.auth.signOut()
    } catch (_e) {
      // swallow; Protected/AdminRoute will redirect on session change
    }
  }

  const getIsAdmin = (user) => {
    if (typeof user?.is_admin === 'boolean') return user.is_admin
    if (typeof user?.role === 'string') return user.role.toLowerCase() === 'admin'
    return false
  }

  const getInitial = (user) => {
    const name = user?.username || user?.email || 'U'
    const first = String(name).trim().charAt(0)
    return first ? first.toUpperCase() : 'U'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-black text-white grid place-items-center font-bold tracking-wider">
              HiQ
            </div>
            <div>
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">User Management</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-600 border border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => getIsAdmin(u)).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <UserPlus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Regular Users</p>
                <p className="text-2xl font-bold">{users.filter(u => !getIsAdmin(u)).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notice about backend requirement */}
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">Backend API Required</p>
              <p className="text-amber-700 dark:text-amber-300">
                To create users, you need to set up a backend API endpoint that uses the Supabase service role key. 
                The "Add New User" feature requires this to work securely.
              </p>
            </div>
          </div>
        </div>

        {/* Add User Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 transition"
          >
            <UserPlus className="w-5 h-5" />
            Add New User
          </button>
        )}

        {/* Create User Form */}
        {showForm && (
          <div className="mb-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Create New User</h2>
            
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && generatedPassword && (
              <div className="mb-4 space-y-3">
                <div className="flex items-start gap-2 rounded-xl border border-green-200/60 bg-green-50/80 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 px-3 py-2">
                  <CheckCircle className="mt-0.5 shrink-0" size={18} />
                  <span className="text-sm">{success}</span>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Username</label>
                    <p className="font-mono text-sm mt-1">{username || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 font-mono text-sm bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border">
                        {showPassword ? generatedPassword : '••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        onClick={copyPassword}
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ Save these credentials now! They won't be shown again.</p>
                </div>
              </div>
            )}

            {!generatedPassword && (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-white dark:bg-slate-900 dark:border-slate-800"
                    placeholder="Enter username"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Will be converted to {username}@{USERNAME_DOMAIN}</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="isAdmin" className="text-sm font-medium">Make this user an admin</label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 disabled:opacity-60"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Create User
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {generatedPassword && (
              <button
                onClick={resetForm}
                className="mt-4 px-4 py-2.5 rounded-xl bg-black text-white font-medium"
              >
                Add Another User
              </button>
            )}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold">All Users</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No users found. Create your first user above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                            {getInitial(user)}
                          </div>
                          <span className="font-medium">{user?.username || user?.email || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail size={14} />
                          {user?.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getIsAdmin(user) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            <Shield size={12} />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}