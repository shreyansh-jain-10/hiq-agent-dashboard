import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { Users, UserPlus, Mail, Shield, AlertCircle, CheckCircle, Loader2, LogOut, Eye, EyeOff, Copy, Check, MapPin, Plus, X, Edit, Trash2, MoreVertical } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [sites, setSites] = useState([])
  const [userSites, setUserSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userRole, setUserRole] = useState('user') // 'user', 'reviewer', 'admin'
  const [selectedSites, setSelectedSites] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  // Site management state
  const [showSiteForm, setShowSiteForm] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [siteDisplayName, setSiteDisplayName] = useState('')

  // User editing state
  const [editingUser, setEditingUser] = useState(null)
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('user')
  const [editSelectedSites, setEditSelectedSites] = useState([])
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchSites()
    fetchUserSites()
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setSites(data || [])
    } catch (err) {
      console.error('Error fetching sites:', err)
      setError(err.message)
    }
  }, [])

  const fetchUserSites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_sites')
        .select(`
          *,
          sites!inner(name, display_name),
          users!user_sites_user_id_fkey(email)
        `)

      if (error) throw error
      setUserSites(data || [])
    } catch (err) {
      console.error('Error fetching user sites:', err)
      setError(err.message)
    }
  }, [])

  const generatePassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setPassword(password)
  }

  const handleCreateSite = async (e) => {
    e.preventDefault()

    if (!siteName.trim() || !siteDisplayName.trim()) {
      setError('Site name and display name are required')
      return
    }

    try {
      const { data, error } = await supabase.rpc('create_site', {
        site_name: siteName.trim(),
        site_display_name: siteDisplayName.trim()
      })

      if (error) throw error

      if (data.success) {
        setSuccess(`Site "${siteDisplayName}" created successfully!`)
        await fetchSites()

        // Reset form
        setSiteName('')
        setSiteDisplayName('')
        setShowSiteForm(false)

        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to create site')
      }
    } catch (err) {
      console.error('Create site error:', err)
      setError(err.message || 'Failed to create site')
    }
  }

  const handleSiteToggle = (siteId) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    )
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()

    // Prevent double submission
    if (creating) return

    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!password.trim()) {
      setError('Password is required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setCreating(true)
    try {
      console.log('Creating user:', email) // Debug log

      // Use RPC function to create user with sites
      const { data, error } = await supabase.rpc('create_user_with_sites', {
        user_email: email.trim(),
        user_password: password,
        user_role: userRole,
        site_ids: selectedSites.length > 0 ? selectedSites : null,
        assigned_by_user_id: null // Will use the created user's ID
      })

      if (error) throw error

      if (data.success) {
        setSuccess(`User created successfully! Email: ${email}${selectedSites.length > 0 ? ` with ${data.sites_assigned} site(s) assigned` : ''}`)

        // Refresh the data
        await Promise.all([fetchUsers(), fetchUserSites()])

        // Clear form after 3 seconds
        setTimeout(() => {
          resetForm()
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to create user')
      }
    } catch (err) {
      console.error('Create user error:', err)
      setError(err.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEmail('')
    setPassword('')
    setUserRole('user')
    setSelectedSites([])
    setShowPassword(false)
    setError(null)
    setSuccess(null)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const getUserRole = (user) => {
    if (typeof user?.role === 'string') return user.role.toLowerCase()
    if (typeof user?.is_admin === 'boolean') return user.is_admin ? 'admin' : 'user'
    return 'user'
  }

  const getIsAdmin = (user) => {
    return getUserRole(user) === 'admin'
  }

  const getInitial = (user) => {
    const name = user?.email || 'U'
    const first = String(name).trim().charAt(0)
    return first ? first.toUpperCase() : 'U'
  }

  const getUserSites = (userId) => {
    return userSites.filter(us => us.user_id === userId)
  }

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === siteId)
    return site ? site.display_name : 'Unknown Site'
  }

  const handleRemoveSiteAssignment = async (userId, siteId) => {
    try {
      const { data, error } = await supabase.rpc('remove_site_assignment', {
        user_id: userId,
        site_id: siteId
      })

      if (error) throw error

      if (data.success) {
        setSuccess('Site assignment removed successfully!')
        await fetchUserSites()

        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to remove site assignment')
      }
    } catch (err) {
      console.error('Remove site assignment error:', err)
      setError(err.message || 'Failed to remove site assignment')
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setEditEmail(user.email)
    setEditRole(getUserRole(user))
    setEditSelectedSites(getUserSites(user.id).map(us => us.site_id))
    setShowEditForm(true)
    setError(null)
    setSuccess(null)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()

    if (!editingUser) return

    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      // Use RPC function to update user role and sites

      const { data, error } = await supabase.rpc("update_user_role_and_sites", {
        p_user_id: editingUser.id,
        p_new_role: editRole,
        p_site_ids: editSelectedSites.length > 0 ? editSelectedSites : null
      });

      if (error) throw error

      if (data.success) {
        setSuccess(`User updated successfully!`)
        await Promise.all([fetchUsers(), fetchUserSites()])

        // Reset edit form
        setShowEditForm(false)
        setEditingUser(null)
        setEditEmail('')
        setEditRole('user')
        setEditSelectedSites([])

        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to update user')
      }
    } catch (err) {
      console.error('Update user error:', err)
      setError(err.message || 'Failed to update user')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete user "${user.email}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      // Use RPC function to delete user completely
      const { data, error } = await supabase.rpc("delete_user_completely", {
        p_user_id: user.id
      });

      if (error) throw error

      if (data.success) {
        setSuccess(`User "${user.email}" deleted successfully!`)
        await Promise.all([fetchUsers(), fetchUserSites()])

        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to delete user')
      }
    } catch (err) {
      console.error('Delete user error:', err)
      setError(err.message || 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditSiteToggle = (siteId) => {
    setEditSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Matching main app style */}
      <header className="bg-card border-b border-border p-6">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-10 rounded-xl bg-black text-white grid place-items-center font-bold tracking-wider">
                HiQ
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">User & Site Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 border border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-[76rem] mx-auto p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold text-foreground">{users.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admins</p>
                  <p className="text-3xl font-bold text-foreground">{users.filter(u => getIsAdmin(u)).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviewers</p>
                  <p className="text-3xl font-bold text-foreground">{users.filter(u => getUserRole(u) === 'reviewer').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-900/30 rounded-xl">
                  <UserPlus className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Regular Users</p>
                  <p className="text-3xl font-bold text-foreground">{users.filter(u => getUserRole(u) === 'user').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Sites</p>
                  <p className="text-3xl font-bold text-foreground">{sites.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 active:scale-[0.99] transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Add New User
              </button>
            )}

            {!showSiteForm && (
              <button
                onClick={() => setShowSiteForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted active:scale-[0.99] transition-all"
              >
                <MapPin className="w-5 h-5" />
                Add New Site
              </button>
            )}
          </div>

          {/* Create User Form */}
          {showForm && (
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-6">Create New User</h2>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
                  <AlertCircle className="mt-0.5 shrink-0" size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200/60 bg-green-50/80 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 px-3 py-2">
                  <CheckCircle className="mt-0.5 shrink-0" size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-background text-foreground transition-colors"
                    placeholder="user@example.com"
                    required
                    disabled={creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-background text-foreground transition-colors"
                        placeholder="Enter password"
                        required
                        minLength={6}
                        disabled={creating}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted transition"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted active:scale-[0.99] transition-all whitespace-nowrap"
                      disabled={creating}
                    >
                      Generate
                    </button>
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="p-2.5 rounded-xl border border-border hover:bg-muted active:scale-[0.99] transition-all"
                      disabled={!password || creating}
                    >
                      {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-background text-foreground transition-colors"
                    disabled={creating}
                  >
                    <option value="user">User</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {userRole === 'user' && 'Can access basic features'}
                    {userRole === 'reviewer' && 'Can review and moderate content'}
                    {userRole === 'admin' && 'Full administrative access'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Assign Sites (Optional)</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-border rounded-xl p-3">
                    {sites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sites available. Create sites first.</p>
                    ) : (
                      sites.map((site) => (
                        <label key={site.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSites.includes(site.id)}
                            onChange={() => handleSiteToggle(site.id)}
                            className="rounded border-border"
                            disabled={creating}
                          />
                          <span className="text-sm text-foreground">{site.display_name}</span>
                          <span className="text-xs text-muted-foreground">({site.name})</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which sites this user should have access to
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 disabled:opacity-60 active:scale-[0.99] transition-all"
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
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted active:scale-[0.99] transition-all"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create Site Form */}
          {showSiteForm && (
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-6">Create New Site</h2>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
                  <AlertCircle className="mt-0.5 shrink-0" size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200/60 bg-green-50/80 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 px-3 py-2">
                  <CheckCircle className="mt-0.5 shrink-0" size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              <form onSubmit={handleCreateSite} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Site Name</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-background text-foreground transition-colors"
                    placeholder="site-name"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Internal identifier (lowercase, no spaces)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
                  <input
                    type="text"
                    value={siteDisplayName}
                    onChange={(e) => setSiteDisplayName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-background text-foreground transition-colors"
                    placeholder="Site Display Name"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Human-readable name shown in the interface</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 active:scale-[0.99] transition-all"
                  >
                    <MapPin size={18} />
                    Create Site
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSiteForm(false)
                      setSiteName('')
                      setSiteDisplayName('')
                      setError(null)
                      setSuccess(null)
                    }}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted active:scale-[0.99] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit User Form */}
          {showEditForm && editingUser && (
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-6">Edit User: {editingUser.email}</h2>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
                  <AlertCircle className="mt-0.5 shrink-0" size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200/60 bg-green-50/80 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 px-3 py-2">
                  <CheckCircle className="mt-0.5 shrink-0" size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    disabled
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-background text-foreground transition-colors"
                    disabled={creating}
                  >
                    <option value="user">User</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editRole === 'user' && 'Can access basic features'}
                    {editRole === 'reviewer' && 'Can review and moderate content'}
                    {editRole === 'admin' && 'Full administrative access'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Assign Sites</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-border rounded-xl p-3">
                    {sites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sites available.</p>
                    ) : (
                      sites.map((site) => (
                        <label key={site.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editSelectedSites.includes(site.id)}
                            onChange={() => handleEditSiteToggle(site.id)}
                            className="rounded border-border"
                            disabled={creating}
                          />
                          <span className="text-sm text-foreground">{site.display_name}</span>
                          <span className="text-xs text-muted-foreground">({site.name})</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which sites this user should have access to
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 disabled:opacity-60 active:scale-[0.99] transition-all"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit size={18} />
                        Update User
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false)
                      setEditingUser(null)
                      setEditEmail('')
                      setEditRole('user')
                      setEditSelectedSites([])
                      setError(null)
                      setSuccess(null)
                    }}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted active:scale-[0.99] transition-all"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">All Users</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No users found. Create your first user above.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Sites
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                              {getInitial(user)}
                            </div>
                            <span className="font-medium text-foreground">{user?.email || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail size={14} />
                            {user?.email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const role = getUserRole(user)
                            if (role === 'admin') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  <Shield size={12} />
                                  Admin
                                </span>
                              )
                            } else if (role === 'reviewer') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  <Users size={12} />
                                  Reviewer
                                </span>
                              )
                            } else {
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                                  User
                                </span>
                              )
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {getUserSites(user.id).length === 0 ? (
                              <span className="text-xs text-muted-foreground">No sites assigned</span>
                            ) : (
                              getUserSites(user.id).map((userSite) => (
                                <span
                                  key={userSite.site_id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                >
                                  <MapPin size={10} />
                                  {getSiteName(userSite.site_id)}
                                  <button
                                    onClick={() => handleRemoveSiteAssignment(user.id, userSite.site_id)}
                                    className="ml-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full p-0.5 transition"
                                    title="Remove site assignment"
                                  >
                                    <X size={8} />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="Edit user"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={deleting}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                              title="Delete user"
                            >
                              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sites Table */}
          <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">All Sites</h2>
            </div>

            {sites.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No sites found. Create your first site above.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Site
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sites.map((site) => (
                      <tr key={site.id} className="hover:bg-muted/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-medium">
                              <MapPin size={14} />
                            </div>
                            <span className="font-medium text-foreground">{site.display_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <code className="px-2 py-1 bg-muted rounded text-xs">{site.name}</code>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${site.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                            {site.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {site.created_at ? new Date(site.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}