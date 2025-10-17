import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, Loader2, ChevronRight, Filter, ChevronLeft, ChevronDown, BarChart3, MapPin, Upload, CheckCircle2, Clock3 } from 'lucide-react'

export default function ReportsTable() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assignedSiteIds, setAssignedSiteIds] = useState([])
  const [assignedSites, setAssignedSites] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Get pagination and filter params from URL
  const currentPage = parseInt(searchParams.get('page') || '1')
  const selectedSiteId = searchParams.get('site') || 'all'
  const itemsPerPage = 10

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (userData) {
        const { data: userSites } = await supabase
          .from('user_sites')
          .select(`
            site_id,
            sites!inner(id, name, display_name)
          `)
          .eq('user_id', userData.id)
        
        const siteIds = userSites?.map(s => s.site_id) || []
        const sites = userSites?.map(s => s.sites) || []
        
        setAssignedSiteIds(siteIds)
        setAssignedSites(sites)
      }
    } catch (err) {
      console.error('Error getting user:', err)
    }
  }

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      
      if (assignedSiteIds.length === 0) {
        setReports([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      // Calculate offset for pagination
      const offset = (currentPage - 1) * itemsPerPage

      // Build the query
      let query = supabase
        .from('reports')
        .select(`
          *,
          domains (id, domain_name, status),
          uploaded_by_user:users!reports_uploaded_by_fkey(email),
          reviewed_by_user:users!reports_reviewed_by_fkey(email),
          site:sites(name, display_name)
        `, { count: 'exact' })
        .in('site_id', assignedSiteIds)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)

      // Apply site filter if not 'all'
      if (selectedSiteId !== 'all') {
        query = query.eq('site_id', selectedSiteId)
      }

      const { data, error, count } = await query
      
      if (error) throw error
      console.log('📊 Fetched', data?.length || 0, 'reports (page', currentPage, 'of', Math.ceil((count || 0) / itemsPerPage), ')')
      setReports(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [assignedSiteIds, currentPage, selectedSiteId, itemsPerPage])

  const fetchMetrics = useCallback(async () => {
    try {
      if (assignedSiteIds.length === 0) {
        setMetrics({
          totalReports: 0,
          totalSites: 0,
          todayUploads: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          queued: 0
        })
        return
      }

      // Get total count for all assigned sites
      const { count: totalReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('site_id', assignedSiteIds)

      // Get today's uploads
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { count: todayUploads } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('site_id', assignedSiteIds)
        .gte('uploaded_at', today.toISOString())
        .lt('uploaded_at', tomorrow.toISOString())

      // Get status counts
      const { count: approved } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('site_id', assignedSiteIds)
        .eq('status', 'approved')

      const { count: rejected } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('site_id', assignedSiteIds)
        .eq('status', 'rejected')

      const { count: pending } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('site_id', assignedSiteIds)
        .eq('status', 'processing')

      const { count: queued } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('site_id', assignedSiteIds)
        .eq('status', 'queued')

      setMetrics({
        totalReports: totalReports || 0,
        totalSites: assignedSites ? assignedSites.length : 0,
        todayUploads: todayUploads || 0,
        approved: approved || 0,
        rejected: rejected || 0,
        pending: pending || 0,
        queued: queued || 0
      })
    } catch (error) {
      console.error('Error calculating metrics:', error)
    }
  }, [assignedSiteIds, assignedSites])

  useEffect(() => {
    initializeData()
  }, [])

  useEffect(() => {
    if (assignedSiteIds.length > 0) {
      fetchReports()
    }
  }, [assignedSiteIds, fetchReports])

  useEffect(() => {
    if (assignedSiteIds.length === 0) return

    console.log('⚡ Setting up real-time for reports list')
    
    const channel = supabase
      .channel('reports_list_realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          console.log('📥 Report change:', payload.eventType, payload.new || payload.old)
          
          if (payload.eventType === 'INSERT') {
            // Check if the new report should be visible on current page
            const isVisible = assignedSiteIds.includes(payload.new.site_id) && 
              (selectedSiteId === 'all' || payload.new.site_id === selectedSiteId)
            
            if (isVisible) {
              // Refetch current page to maintain pagination
              fetchReports()
              // Also update metrics
              fetchMetrics()
            }
          } else if (payload.eventType === 'UPDATE') {
            // Check if the updated report is on current page
            const isOnCurrentPage = reports.some(r => r.id === payload.new.id)
            if (isOnCurrentPage) {
              fetchReportById(payload.new.id)
            }
            // Update metrics as status might have changed
            fetchMetrics()
          } else if (payload.eventType === 'DELETE') {
            // Check if the deleted report was on current page
            const isOnCurrentPage = reports.some(r => r.id === payload.old.id)
            if (isOnCurrentPage) {
              setReports(prev => prev.filter(report => report.id !== payload.old.id))
              // Refetch to maintain pagination
              fetchReports()
            }
            // Update metrics
            fetchMetrics()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'domains' },
        (payload) => {
          console.log('📥 Domain updated:', payload.new.domain_name, 'status:', payload.new.status)
          
          setReports(prev =>
            prev.map(report => {
              if (!report.domains) return report
              
              const hasThisDomain = report.domains.some(d => d.id === payload.new.id)
              if (!hasThisDomain) return report
              
              const updatedDomains = report.domains.map(domain =>
                domain.id === payload.new.id
                  ? { ...domain, status: payload.new.status }
                  : domain
              )
              
              return { ...report, domains: updatedDomains }
            })
          )
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to reports list realtime')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error:', err)
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Realtime subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('🔌 Realtime connection closed')
        } else {
          console.log('📡 Subscription status:', status)
        }
      })
    
    return () => {
      console.log('🧹 Cleaning up reports list subscription')
      supabase.removeChannel(channel)
    }
  }, [assignedSiteIds, fetchReports, fetchMetrics])



  const fetchReportById = async (id) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          domains (id, domain_name, status),
          uploaded_by_user:users!reports_uploaded_by_fkey(email),
          reviewed_by_user:users!reports_reviewed_by_fkey(email),
          site:sites(name, display_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setReports(prev => prev.map(r => (r.id === id ? data : r)))
    } catch (err) {
      console.error('Error fetching updated report:', err)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      queued: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    }
    
    const icons = {
      queued: Clock,
      processing: Clock,
      approved: CheckCircle,
      rejected: XCircle
    }

    const Icon = icons[status] || Clock
    const style = styles[status] || styles.processing

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
        <Icon size={12} />
        {status}
      </span>
    )
  }

  const handleReportClick = (reportId) => {
    navigate(`/app/report/${reportId}`)
  }

  // URL parameter handlers
  const updatePage = (page) => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('page', page.toString())
    setSearchParams(newSearchParams)
  }

  const updateSiteFilter = (siteId) => {
    const newSearchParams = new URLSearchParams(searchParams)
    if (siteId === 'all') {
      newSearchParams.delete('site')
    } else {
      newSearchParams.set('site', siteId)
    }
    newSearchParams.set('page', '1') // Reset to first page when filter changes
    setSearchParams(newSearchParams)
  }
  
  // Metrics calculations - we'll need to fetch these separately for accurate counts
  const [metrics, setMetrics] = useState({
    totalReports: 0,
    totalSites: 0,
    todayUploads: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    queued: 0
  })


  // Fetch metrics when assigned sites change
  useEffect(() => {
    if (assignedSiteIds.length > 0) {
      fetchMetrics()
    }
  }, [assignedSiteIds, assignedSites])

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  // Pagination handlers
  const goToPage = (page) => {
    updatePage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      updatePage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      updatePage(currentPage - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Don't render if we don't have the necessary data yet
  if (!reports || !Array.isArray(reports)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Metrics Table */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-foreground">Dashboard Metrics</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Reports */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Reports</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{metrics.totalReports}</div>
            </div>

            {/* Total Sites */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Assigned Sites</span>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">{metrics.totalSites}</div>
            </div>

            {/* Today's Uploads */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Today's Uploads</span>
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{metrics.todayUploads}</div>
            </div>

            {/* Approved */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Approved</span>
              </div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{metrics.approved}</div>
            </div>

            {/* Rejected */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Rejected</span>
              </div>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">{metrics.rejected}</div>
            </div>

            {/* Pending */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock3 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{metrics.pending}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Reports for Review</h2>
            <div className="flex items-center gap-4">
              {/* Site Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedSiteId}
                  onChange={(e) => updateSiteFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Sites</option>
                  {assignedSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.display_name || site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {metrics.pending} pending
                </span>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalCount} total reports)
                </span>
              </div>
            </div>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {selectedSiteId === 'all' 
              ? 'No reports found for your assigned sites'
              : `No reports found for ${assignedSites.find(s => s.id === selectedSiteId)?.display_name || 'selected site'}`
            }
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/50">
              {reports.map((report) => {
              const domains = report.domains || []
              const domainStats = {
                total: domains.length,
                approved: domains.filter(d => d.status === 'approved').length,
                rejected: domains.filter(d => d.status === 'rejected').length,
                pending: domains.filter(d => d.status === 'pending').length
              }

              return (
                <div 
                  key={report.id}
                  onClick={() => handleReportClick(report.id)}
                  className="p-6 hover:bg-muted/30 transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">Report #{report.report_number}</h3>
                          {getStatusBadge(report.status)}
                        </div>
                        <p className="text-sm text-foreground font-mono">{report.filename}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Site: {report.site?.display_name || 'N/A'}</span>
                          <span>Uploaded: {new Date(report.uploaded_at).toLocaleDateString()}</span>
                        </div>
                        {domainStats.total > 0 && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="text-muted-foreground font-medium">
                              {domainStats.total} {domainStats.total === 1 ? 'Domain' : 'Domains'}:
                            </span>
                            {domainStats.approved > 0 && (
                              <span className="text-green-600 dark:text-green-400">
                                ✓ {domainStats.approved} approved
                              </span>
                            )}
                            {domainStats.rejected > 0 && (
                              <span className="text-red-600 dark:text-red-400">
                                ✗ {domainStats.rejected} rejected
                              </span>
                            )}
                            {domainStats.pending > 0 && (
                              <span className="text-yellow-600 dark:text-yellow-400">
                                ⏱ {domainStats.pending} pending
                              </span>
                            )}
                          </div>
                        )}
                        {report.reviewed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reviewed: {new Date(report.reviewed_at).toLocaleDateString()}
                          </p>
                        )}
                        {report.reviewed_by_user && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reviewed by: <span className="font-medium text-foreground">{report.reviewed_by_user.email}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition" />
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousPage}
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
                          onClick={() => goToPage(page)}
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
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{endIndex} of {totalCount} reports
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}