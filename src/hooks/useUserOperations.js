import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export const useUserOperations = () => {
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const createUser = async (userData) => {
    setCreating(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { data, error } = await supabase.rpc('create_user_with_sites', {
        user_email: userData.email.trim(),
        user_password: userData.password,
        user_role: userData.role,
        site_ids: userData.siteIds.length > 0 ? userData.siteIds : null,
        assigned_by_user_id: null,
      })
      
      if (error) throw error
      
      if (data.success) {
        setSuccess(`User created successfully! Email: ${userData.email}${userData.siteIds.length > 0 ? ` with ${data.sites_assigned} site(s) assigned` : ''}`)
        return { success: true, data }
      } else {
        throw new Error(data.error || 'Failed to create user')
      }
    } catch (err) {
      setError(err.message || 'Failed to create user')
      return { success: false, error: err.message }
    } finally {
      setCreating(false)
    }
  }

  const updateUser = async (userId, userData) => {
    setCreating(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { data, error } = await supabase.rpc('update_user_role_and_sites', {
        p_user_id: userId,
        p_new_role: userData.role,
        p_site_ids: userData.siteIds.length > 0 ? userData.siteIds : null,
      })
      
      if (error) throw error
      
      if (data.success) {
        setSuccess('User updated successfully!')
        return { success: true, data }
      } else {
        throw new Error(data.error || 'Failed to update user')
      }
    } catch (err) {
      setError(err.message || 'Failed to update user')
      return { success: false, error: err.message }
    } finally {
      setCreating(false)
    }
  }

  const deleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete user "${user.email}"? This action cannot be undone.`)) {
      return { success: false, cancelled: true }
    }
    
    setDeleting(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { data, error } = await supabase.rpc('delete_user_completely', { p_user_id: user.id })
      
      if (error) throw error
      
      if (data.success) {
        setSuccess(`User "${user.email}" deleted successfully!`)
        return { success: true, data }
      } else {
        throw new Error(data.error || 'Failed to delete user')
      }
    } catch (err) {
      setError(err.message || 'Failed to delete user')
      return { success: false, error: err.message }
    } finally {
      setDeleting(false)
    }
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  return {
    creating,
    deleting,
    error,
    success,
    createUser,
    updateUser,
    deleteUser,
    clearMessages
  }
}
