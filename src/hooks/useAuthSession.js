import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useAuthSession() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    let active = true

    async function fetchRole(userId) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', userId)
          .single()
        if (!active) return
        setUserRole(error ? null : (data?.role ?? null))
      } catch (_e) {
        if (active) setUserRole(null)
      }
    }

    async function init() {
      try {
        setChecking(true)
        const { data } = await supabase.auth.getSession()
        if (!active) return
        const nextSession = data?.session ?? null
        setSession(nextSession)
        const userId = nextSession?.user?.id
        if (userId) {
          await fetchRole(userId)
        } else {
          setUserRole(null)
        }
      } finally {
        if (active) setChecking(false)
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return
      const nextSession = newSession ?? null
      setSession(nextSession)
      const userId = nextSession?.user?.id
      if (!userId) {
        setUserRole(null)
        return
      }
      // fire-and-forget; no need to set checking here
      fetchRole(userId)
    })

    return () => {
      active = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  return { session, checking, userRole }
}


