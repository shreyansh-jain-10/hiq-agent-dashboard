import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'

const MAX_CHARS = 10000
// Adjust these to your real agent names if needed
const AGENT_OPTIONS = [
  'Document Checker',
  'Sample Adequacy',
  'Waste Organiser',
  'Danger Detector',
  'EPA rule book',
  'Recycling Hunter'
]

export default function BugReport({ selectedAgent, defaultFileName = '', onClose }) {
  const [agentName, setAgentName] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [desc, setDesc] = useState('')
  const [fileName, setFileName] = useState(defaultFileName || '')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null) // { ok: boolean, msg: string }

  // Prefill Agent name from selected agent if present
  useEffect(() => {
    if (selectedAgent?.name) {
      const match = AGENT_OPTIONS.find(a => a.toLowerCase() === selectedAgent.name.toLowerCase())
      setAgentName(match || '')
    }
  }, [selectedAgent?.name])

  // Update file name when an upload completes later
  useEffect(() => {
    if (defaultFileName) setFileName(defaultFileName)
  }, [defaultFileName])

  const remaining = useMemo(() => ({
    expected: MAX_CHARS - (expected?.length || 0),
    actual: MAX_CHARS - (actual?.length || 0),
    desc: MAX_CHARS - (desc?.length || 0),
  }), [expected, actual, desc])

  const invalid = useMemo(() => {
    if (!agentName) return 'Please select an agent.'
    if (!expected.trim()) return 'Expected output is required.'
    if (!actual.trim()) return 'Actual output is required.'
    if (!desc.trim()) return 'Bug description is required.'
    return null
  }, [agentName, expected, actual, desc])

  const submit = async () => {
    setSending(true); setStatus(null)
    try {
      if (invalid) throw new Error(invalid)

      const payload = {
        agent_name: agentName,
        expected_output: expected.slice(0, MAX_CHARS),
        actual_output: actual.slice(0, MAX_CHARS),
        bug_description: desc.slice(0, MAX_CHARS),
        context_file_name: fileName || '',
        trace_id: `br_${crypto.randomUUID()}`
      }

      const res = await fetch('https://gluagents.xyz/webhook/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus({ ok: true, msg: 'Thanks! Your report was logged.' })
      setExpected(''); setActual(''); setDesc('')
    } catch (e) {
      setStatus({ ok: false, msg: e.message || 'Submit failed' })
    } finally { setSending(false) }
  }

  const FieldLabel = ({ children, hint }) => (
    <div className="flex items-center justify-between">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{children}</label>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal container */}
      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-8 overflow-auto">
        <div className="w-full max-w-3xl bg-card border rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                Bug report
              </div>
              <h2 className="text-lg font-semibold text-foreground">Help us fix this</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-5">
              Fill the details below. Fields marked with * are required.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Agent Name */}
              <div className="md:col-span-1">
                <FieldLabel>Agent Name *</FieldLabel>
                <select
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                >
                  <option value="">Select an agent</option>
                  {AGENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {!agentName && <p className="mt-1 text-xs text-gray-400">Choose the agent involved</p>}
              </div>

              {/* File Name */}
              <div className="md:col-span-1">
                <FieldLabel>File Name</FieldLabel>
                <input
                  type="text"
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  placeholder="report.pdf"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                />
              </div>

              {/* Expected */}
              <div className="md:col-span-1">
                <FieldLabel hint={`${remaining.expected} left`}>Expected output *</FieldLabel>
                <textarea
                  rows={4}
                  value={expected}
                  onChange={e => setExpected(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              {/* Actual */}
              <div className="md:col-span-1">
                <FieldLabel hint={`${remaining.actual} left`}>Actual output *</FieldLabel>
                <textarea
                  rows={4}
                  value={actual}
                  onChange={e => setActual(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              {/* Description (full width) */}
              <div className="md:col-span-2">
                <FieldLabel hint={`${remaining.desc} left`}>Bug description*</FieldLabel>
                <textarea
                  rows={5}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>
            </div>

            {/* Status */}
            {status && (
              <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm border
                ${status.ok
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800 dark:text-green-300'
                  : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-300'
                }`}>
                {status.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{status.msg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={sending}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-black/80 disabled:opacity-60 inline-flex items-center gap-2"
                type="button"
              >
                {sending ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>) : 'Submit bug'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
