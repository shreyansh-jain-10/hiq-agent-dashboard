import { useState } from 'react'
import { Mail, Shield, Users, MapPin, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getUserRole, getIsAdmin, getInitial } from '@/utils/userUtils'
import { getUserSites, getSiteName } from '@/utils/siteUtils'
import { supabase } from '@/lib/supabaseClient'

export default function UsersTable({ 
  users, 
  sites, 
  userSites, 
  loading, 
  onUserEdit, 
  onUserDelete, 
  onUserSitesUpdate 
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [deleting, setDeleting] = useState(false)
  const itemsPerPage = 5

  const handleRemoveSiteAssignment = async (userId, siteId) => {
    try {
      const { data, error } = await supabase.rpc('remove_site_assignment', {
        p_user_id: userId,
        p_site_id: siteId
      })      
      if (error) throw error
      if (data.success) {
        onUserSitesUpdate()
      } else {
        throw new Error(data.error || 'Failed to remove site assignment')
      }
    } catch (err) {
      console.error('Failed to remove site assignment:', err.message)
    }
  }

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete user "${user.email}"? This action cannot be undone.`)) return
    setDeleting(true)
    try {
      await onUserDelete(user)
    } finally {
      setDeleting(false)
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(users.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = users.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const getRoleBadge = (user) => {
    const role = getUserRole(user)
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <Shield size={12} />
          Admin
        </span>
      )
    }
    if (role === 'reviewer') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <Users size={12} />
          Reviewer
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
        User
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">All Users</h2>
        </div>
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">All Users</h2>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          No users found. Create your first user above.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">All Users</h2>
      </div>
      
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <table className="w-full min-w-[600px]">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sites</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {paginatedUsers.map((user) => (
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
                  {getRoleBadge(user)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {getUserSites(user.id, userSites).length === 0 ? (
                      <span className="text-xs text-muted-foreground">No sites assigned</span>
                    ) : (
                      getUserSites(user.id, userSites).map((userSite) => (
                        <span key={userSite.site_id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          <MapPin size={10} />
                          {getSiteName(userSite.site_id, sites)}
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
                      onClick={() => onUserEdit(user)} 
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
      
      {/* Pagination Controls */}
      {users.length > 0 && (
        <div className="p-6 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, users.length)} of {users.length} users
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
