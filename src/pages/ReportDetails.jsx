import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, Loader2, ArrowLeft, Moon, Sun, LogOut } from 'lucide-react'

export default function ReportDetails() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  useEffect(() => {
    getCurrentUser()
    fetchReportAndDomains()
  }, [reportId])

  useEffect(() => {
    if (!reportId) return
    
    console.log('⚡ Setting up realtime for report:', reportId)
    
    const channel = supabase
      .channel(`report_${reportId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: reportId }
        }
      })
      .on(
        'postgres_changes',
        { 
          event: '*',
          schema: 'public', 
          table: 'reports', 
          filter: `id=eq.${reportId}` 
        },
        (payload) => {
          console.log('📥 Report change:', payload.eventType)
          if (payload.eventType === 'UPDATE') {
            setReport(prev => ({ ...prev, ...payload.new }))
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*',
          schema: 'public', 
          table: 'domains', 
          filter: `report_id=eq.${reportId}` 
        },
        (payload) => {
          console.log('📥 Domain change:', payload.eventType, payload.new?.domain_name)
          
          if (payload.eventType === 'UPDATE') {
            setDomains(prev => 
              prev.map(domain => 
                domain.id === payload.new.id 
                  ? { ...domain, ...payload.new } 
                  : domain
              )
            )
          } else if (payload.eventType === 'INSERT') {
            setDomains(prev => [...prev, payload.new])
          } else if (payload.eventType === 'DELETE') {
            setDomains(prev => prev.filter(domain => domain.id !== payload.old.id))
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to report realtime')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime error:', err)
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Realtime timed out')
        } else if (status === 'CLOSED') {
          console.log('🔌 Realtime closed')
        } else {
          console.log('📡 Status:', status)
        }
      })
    
    return () => {
      console.log('🧹 Cleaning up report subscription')
      supabase.removeChannel(channel)
    }
  }, [reportId])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      setCurrentUserId(data?.id)
    }
  }

  const fetchReportAndDomains = async () => {
    try {
      setLoading(true)

      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          uploaded_by_user:users!reports_uploaded_by_fkey(email),
          reviewed_by_user:users!reports_reviewed_by_fkey(email),
          site:sites(name, display_name)
        `)
        .eq('id', reportId)
        .single()

      if (reportError) throw reportError

      const { data: domainsData, error: domainsError } = await supabase
        .from('domains')
        .select('*')
        .eq('report_id', reportId)
        .order('domain_name', { ascending: true })

      if (domainsError) throw domainsError

      console.log('📊 Loaded report with', domainsData?.length || 0, 'domains')

      setReport(reportData)
      setDomains(domainsData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateReportStatus = async () => {
    try {
      const { data: latestDomains } = await supabase
        .from('domains')
        .select('status')
        .eq('report_id', reportId)

      if (!latestDomains || latestDomains.length === 0) return

      const allApproved = latestDomains.every(d => d.status === 'approved')
      const anyRejected = latestDomains.some(d => d.status === 'rejected')

      let newStatus = 'processing'
      if (allApproved) {
        newStatus = 'approved'
      } else if (anyRejected) {
        newStatus = 'rejected'
      }

      await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId)
    } catch (err) {
      console.error('Error updating report status:', err)
    }
  }

  const handleApproveDomain = async (domainId) => {
    try {
      setProcessing(`domain-${domainId}`)
      setError(null)

      const { error } = await supabase
        .from('domains')
        .update({ 
          status: 'approved',
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', domainId)

      if (error) throw error

      setSuccess('Domain approved!')
      setTimeout(() => setSuccess(null), 2000)
      
      await updateReportStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectDomain = async (domainId, reason) => {
    if (!reason.trim()) {
      setError('Rejection reason is required')
      return
    }

    try {
      setProcessing(`domain-${domainId}`)
      setError(null)

      const { error } = await supabase
        .from('domains')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', domainId)

      if (error) throw error

      setSuccess('Domain rejected!')
      setTimeout(() => setSuccess(null), 2000)
      
      await updateReportStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleApproveAll = async () => {
    try {
      setProcessing('approve-all')
      setError(null)

      const { error: domainError } = await supabase
        .from('domains')
        .update({ 
          status: 'approved',
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString()
        })
        .eq('report_id', reportId)

      if (domainError) throw domainError

      const { error: reportError } = await supabase
        .from('reports')
        .update({ 
          status: 'approved',
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (reportError) throw reportError

      setSuccess('Report and all domains approved!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectAll = async () => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required')
      return
    }

    try {
      setProcessing('reject-all')
      setError(null)

      const { error: domainError } = await supabase
        .from('domains')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectReason,
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString()
        })
        .eq('report_id', reportId)

      if (domainError) throw domainError

      const { error: reportError } = await supabase
        .from('reports')
        .update({ 
          status: 'rejected',
          review_notes: rejectReason,
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (reportError) throw reportError

      setSuccess('Report and all domains rejected!')
      setShowRejectModal(false)
      setRejectReason('')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Report not found</p>
          <button
            onClick={() => navigate('/app')}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-black/90"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-6">
        <div className="max-w-[76rem] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Report #{report.report_number}</h1>
              <p className="text-sm text-muted-foreground">Review domains and approve/reject</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

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

      {/* Content */}
      <main className="max-w-[76rem] mx-auto p-6 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/80 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 px-3 py-2">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-green-200/60 bg-green-50/80 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300 px-3 py-2">
            <CheckCircle className="mt-0.5 shrink-0" size={18} />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Report Info */}
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold text-foreground">{report.filename}</h2>
                {getStatusBadge(report.status)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Site</p>
                  <p className="font-medium">{report.site?.display_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded</p>
                  <p className="font-medium">{new Date(report.uploaded_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded By</p>
                  <p className="font-medium">{report.uploaded_by_user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">File Size</p>
                  <p className="font-medium">{(report.file_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              {report.agents_summary && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm">{report.agents_summary}</p>
                </div>
              )}
              {report.review_notes && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Review Notes:</p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">{report.review_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleApproveAll}
            disabled={processing === 'approve-all'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors font-medium"
          >
            {processing === 'approve-all' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Approve All Domains
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={processing === 'reject-all'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors font-medium"
          >
            <XCircle className="w-5 h-5" />
            Reject All Domains
          </button>
        </div>

        {/* Domains List */}
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Domains ({domains.length})
            </h3>
          </div>
          {domains.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No domains found for this report
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {domains.map((domain) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  onApprove={handleApproveDomain}
                  onReject={handleRejectDomain}
                  processing={processing === `domain-${domain.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-card border rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Reject All Domains</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will reject all domains and the entire report. Please provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background mb-4 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              rows={3}
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleRejectAll}
                disabled={!rejectReason.trim() || processing === 'reject-all'}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {processing === 'reject-all' ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Reject All'
                )}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={processing === 'reject-all'}
                className="flex-1 px-4 py-2 rounded-lg border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DomainCard({ domain, onApprove, onReject, processing }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const handleReject = () => {
    onReject(domain.id, reason)
    setShowReject(false)
    setReason('')
  }

  return (
    <div className="p-6 hover:bg-muted/30 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-medium text-foreground">{domain.domain_name}</h4>
            {domain.status === 'pending' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                <Clock size={12} />
                Pending
              </span>
            )}
            {domain.status === 'approved' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle size={12} />
                Approved
              </span>
            )}
            {domain.status === 'rejected' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <XCircle size={12} />
                Rejected
              </span>
            )}
          </div>
          
          {domain.domain_data && (
            <div className="mb-3">
              <p className="text-sm text-muted-foreground mb-1">Domain Data:</p>
              <pre className="text-xs bg-muted/30 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(domain.domain_data, null, 2)}
              </pre>
            </div>
          )}

          {domain.rejection_reason && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Rejection Reason:</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{domain.rejection_reason}</p>
            </div>
          )}

          {domain.review_notes && (
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">Notes:</span> {domain.review_notes}
            </p>
          )}

          {domain.reviewed_at && (
            <p className="text-xs text-muted-foreground">
              Reviewed: {new Date(domain.reviewed_at).toLocaleDateString()} at {new Date(domain.reviewed_at).toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-start gap-2 ml-4">
          <button
            onClick={() => onApprove(domain.id)}
            disabled={processing}
            className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
            title="Approve domain"
          >
            {processing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowReject(!showReject)}
            disabled={processing}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            title="Reject domain"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showReject && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Rejection Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              rows={3}
              placeholder="Enter rejection reason..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={!reason.trim() || processing}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => {
                setShowReject(false)
                setReason('')
              }}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}