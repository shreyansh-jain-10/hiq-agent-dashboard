import { useState } from 'react'
import { UserPlus, AlertCircle, CheckCircle, Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { generatePassword, sendConfirmationEmail } from '@/utils/userUtils'
import { supabase } from '@/lib/supabaseClient'

export default function CreateUserForm({ 
  sites, 
  onUserCreated, 
  onCancel 
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userRole, setUserRole] = useState('user')
  const [selectedSites, setSelectedSites] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSiteToggle = (siteId) => {
    setSelectedSites((prev) => 
      prev.includes(siteId) 
        ? prev.filter((id) => id !== siteId) 
        : [...prev, siteId]
    )
  }

  const handleGeneratePassword = () => {
    const newPassword = generatePassword()
    setPassword(newPassword)
  }

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_e) {}
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
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
      const { data, error } = await supabase.rpc('create_user_with_sites', {
        user_email: email.trim(),
        user_password: password,
        user_role: userRole,
        site_ids: selectedSites.length > 0 ? selectedSites : null,
        assigned_by_user_id: null,
      })
      
      if (error) throw error
      
      if (data.success) {
        // Get assigned sites names for the email
        const assignedSitesNames = selectedSites.length > 0 
          ? selectedSites.map(siteId => sites.find(s => s.id === siteId)?.display_name).filter(Boolean)
          : []
        
        // Send confirmation email
        const emailSent = await sendConfirmationEmail(email.trim(), password, userRole, assignedSitesNames)
        
        const successMessage = `User created successfully! Email: ${email}${selectedSites.length > 0 ? ` with ${data.sites_assigned} site(s) assigned` : ''}${emailSent ? ' - Confirmation email sent!' : ' - Warning: Could not send confirmation email'}`
        setSuccess(successMessage)
        
        onUserCreated()
        
        // Reset form after success
        setTimeout(() => {
          resetForm()
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to create user')
      }
    } catch (err) {
      setError(err.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setUserRole('user')
    setSelectedSites([])
    setShowPassword(false)
    setError(null)
    setSuccess(null)
    onCancel()
  }

  return (
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
              onClick={handleGeneratePassword} 
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
  )
}
