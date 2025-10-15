import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export const useUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()

    // Set up real-time subscription for users table
    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          console.log('Users change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            setUsers((prev) => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setUsers((prev) => prev.map((user) => 
              user.id === payload.new.id ? payload.new : user
            ))
          } else if (payload.eventType === 'DELETE') {
            setUsers((prev) => prev.filter((user) => user.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(usersSubscription)
    }
  }, [fetchUsers])

  return { users, loading, error, fetchUsers }
}
