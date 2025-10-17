import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, Loader2, ChevronRight, Filter, ChevronLeft } from 'lucide-react'

export default function UserReportsTable() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Get pagination params from URL
  const currentPage = parseInt(searchParams.get('page') || '1')
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
        setCurrentUserId(userData.id)
      }
    } catch (err) {
      console.error('Error getting user:', err)
    }
  }

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!currentUserId) {
        setReports([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      // Calculate offset for pagination
      const offset = (currentPage - 1) * itemsPerPage

      const { data, error, count } = await supabase
        .from('reports')
        .select(`
          *,
          domains (id, domain_name, status),
          uploaded_by_user:users!reports_uploaded_by_fkey(email),
          reviewed_by_user:users!reports_reviewed_by_fkey(email),
          site:sites(name, display_name)
        `, { count: 'exact' })
        .eq('uploaded_by', currentUserId)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)
      
      if (error) throw error
      console.log('📊 Fetched', data?.length || 0, 'user reports (page', currentPage, 'of', Math.ceil((count || 0) / itemsPerPage), ')')
      setReports(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentUserId, currentPage, itemsPerPage])

  useEffect(() => {
    initializeData()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      fetchReports()
    }
  }, [currentUserId, fetchReports])

  useEffect(() => {
    if (!currentUserId) return

    console.log('⚡ Setting up real-time for user reports list')
    
    const channel = supabase
      .channel('user_reports_list_realtime', {
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
            // Only add if uploaded by current user
            if (payload.new.uploaded_by === currentUserId) {
              // Refetch current page to maintain pagination
              fetchReports()
            }
          } else if (payload.eventType === 'UPDATE') {
            // Only update if it's a report uploaded by current user
            if (payload.new.uploaded_by === currentUserId) {
              // Check if the updated report is on current page
              const isOnCurrentPage = reports.some(r => r.id === payload.new.id)
              if (isOnCurrentPage) {
                fetchReportById(payload.new.id)
              } else {
                // Refetch to see if it should appear on current page
                fetchReports()
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Check if the deleted report was on current page
            const isOnCurrentPage = reports.some(r => r.id === payload.old.id)
            if (isOnCurrentPage) {
              setReports(prev => prev.filter(report => report.id !== payload.old.id))
              // Refetch to maintain pagination
              fetchReports()
            }
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
          console.log('✅ Successfully subscribed to user reports list realtime')
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
      console.log('🧹 Cleaning up user reports list subscription')
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchReports])

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
        .eq('uploaded_by', currentUserId)
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

      {/* Reports Table */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">My Reports</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {reports.filter(r => r.status === 'processing').length} pending
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
            No reports uploaded yet. Upload a file to get started!
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

