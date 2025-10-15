import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export const useSites = () => {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSites()

    // Set up real-time subscription for sites table
    const sitesSubscription = supabase
      .channel('sites-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sites' },
        (payload) => {
          console.log('Sites change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            setSites((prev) => [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name)))
          } else if (payload.eventType === 'UPDATE') {
            setSites((prev) => prev.map((site) => 
              site.id === payload.new.id ? payload.new : site
            ))
          } else if (payload.eventType === 'DELETE') {
            setSites((prev) => prev.filter((site) => site.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sitesSubscription)
    }
  }, [fetchSites])

  return { sites, loading, error, fetchSites }
}
