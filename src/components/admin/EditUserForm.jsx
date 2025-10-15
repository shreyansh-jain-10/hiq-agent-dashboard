import { useState, useEffect } from 'react'
import { Edit, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { getUserRole, getIsAdmin } from '@/utils/userUtils'
import { getUserSites } from '@/utils/siteUtils'
import { supabase } from '@/lib/supabaseClient'

export default function EditUserForm({ 
  user, 
  sites, 
  userSites, 
  onUserUpdated, 
  onCancel 
}) {
  const [editRole, setEditRole] = useState('user')
  const [editSelectedSites, setEditSelectedSites] = useState([])
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (user) {
      setEditRole(getUserRole(user))
      setEditSelectedSites(getUserSites(user.id, userSites).map((us) => us.site_id))
    }
  }, [user, userSites])

  const handleEditSiteToggle = (siteId) => {
    setEditSelectedSites((prev) => 
      prev.includes(siteId) 
        ? prev.filter((id) => id !== siteId) 
        : [...prev, siteId]
    )
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    if (!user || updating) return
    
    setUpdating(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { data, error } = await supabase.rpc('update_user_role_and_sites', {
        p_user_id: user.id,
        p_new_role: editRole,
        p_site_ids: editSelectedSites.length > 0 ? editSelectedSites : null,
      })
      
      if (error) throw error
      
      if (data.success) {
        setSuccess('User updated successfully!')
        onUserUpdated()
        setTimeout(() => {
          onCancel()
        }, 2000)
      } else {
        throw new Error(data.error || 'Failed to update user')
      }
    } catch (err) {
      setError(err.message || 'Failed to update user')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = () => {
    setEditRole('user')
    setEditSelectedSites([])
    setError(null)
    setSuccess(null)
    onCancel()
  }

  if (!user) return null

  return (
    <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground mb-6">Edit User: {user.email}</h2>
      
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
          <label className="block text-sm font-medium text-foreground mb-2">Role</label>
          <select 
            value={editRole} 
            onChange={(e) => setEditRole(e.target.value)} 
            className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black bg-background text-foreground transition-colors" 
            disabled={updating}
          >
            <option value="user">User</option>
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
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
                    disabled={updating} 
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
            disabled={updating} 
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-medium shadow-sm hover:bg-black/90 disabled:opacity-60 active:scale-[0.99] transition-all"
          >
            {updating ? (
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
            onClick={handleCancel} 
            className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted active:scale-[0.99] transition-all" 
            disabled={updating}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
