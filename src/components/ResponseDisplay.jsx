import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

export default function ResponseDisplay({ response }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  // per-card expand state kept at the top level so it never resets
  const [expandedMap, setExpandedMap] = useState({})
  const toggleCard = (key) =>
    setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }))
  const isCardExpanded = (key) => !!expandedMap[key]

  if (!response) return null

  // Ordered display names for unified-flow
  const nameMap = [
    { key: 'Document Checker' },
    { key: 'Sample Adequacy' },
    { key: 'Waste Organiser' },
    { key: 'Danger Detector' },
    { key: 'EPA rule book' },
    { key: 'Recycling Hunter' },
  ]

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(
        typeof response === 'string' ? response : JSON.stringify(response, null, 2)
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Detect unified-flow via presence of summary and node-like objects
  const isUnifiedFlow = (resp) => {
    if (!resp || typeof resp !== 'object') return false
    if (!resp.summary || typeof resp.summary !== 'object') return false
    const keys = Object.keys(resp).filter((k) => k !== 'summary')
    return keys.some((k) => {
      const v = resp[k]
      return v && typeof v === 'object' && 'passed' in v && 'output' in v
    })
  }

  // Pretty-printer for non-unified responses or nested objects in cards
  const formatValue = (value, depth = 0) => {
    if (value === null) return <span className="text-muted-foreground">null</span>
    if (value === undefined) return <span className="text-muted-foreground">undefined</span>
    if (typeof value === 'boolean') return <span className="text-blue-600">{value.toString()}</span>
    if (typeof value === 'number') return <span className="text-green-600">{value}</span>
    if (typeof value === 'string') {
      if (depth === 0) return <pre className="text-sm whitespace-pre-wrap">{value}</pre>
      return <span className="text-orange-600">"{value}"</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground">[]</span>
      return (
        <div className="ml-4">
          <span className="text-muted-foreground">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              <span className="text-muted-foreground">{index}: </span>
              {formatValue(item, depth + 1)}
              {index < value.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
          <span className="text-muted-foreground">]</span>
        </div>
      )
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) return <span className="text-muted-foreground">{'{}'}</span>
      return (
        <div className="ml-4">
          <span className="text-muted-foreground">{'{'}</span>
          {keys.map((key, index) => (
            <div key={key} className="ml-4">
              <span className="text-purple-600">"{key}"</span>
              <span className="text-muted-foreground">: </span>
              {formatValue(value[key], depth + 1)}
              {index < keys.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
          <span className="text-muted-foreground">{'}'}</span>
        </div>
      )
    }

    return <span>{String(value)}</span>
  }

  // -------- Unified-flow card UI (single column, scrollable, per-card expand) --------
  const UnifiedCards = ({ data }) => {
    const { summary } = data || {}

    const total =
      summary?.total_nodes ??
      nameMap.filter(({ key }) => data[key] && typeof data[key] === 'object').length
    const passedCount =
      summary?.passed_count ??
      nameMap.filter(({ key }) => data[key]?.passed).length
    const failedCount = summary?.failed_count ?? Math.max(0, total - passedCount)
    const allPassed = !!summary?.all_passed || (total > 0 && failedCount === 0)

    const StatusBadge = ({ passed }) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          passed
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}
      >
        {passed ? 'Passed' : 'Failed'}
      </span>
    )

    const RenderAgentOutput = ({ output, expanded }) => {
      // smaller collapsed height so the expand action is obvious
      const collapsedHeight = 'max-h-56' // ~14rem
      const expandedHeight = 'max-h-[70vh]'
      const baseText = 'bg-muted/30 rounded-md p-4 text-sm whitespace-pre-wrap overflow-y-auto'
      if (output == null) return <p className="text-sm text-muted-foreground">No output</p>
      if (typeof output === 'string') {
        return <div className={`${baseText} ${expanded ? expandedHeight : collapsedHeight}`}>{output}</div>
      }
      return (
        <div className={`bg-muted/30 rounded-md p-4 font-mono text-xs overflow-y-auto ${expanded ? expandedHeight : collapsedHeight}`}>
          {formatValue(output, 1)}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Summary header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg bg-card/50">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                allPassed
                  ? 'bg-green-600 text-white'
                  : failedCount > 0
                  ? 'bg-red-600 text-white'
                  : 'bg-yellow-600 text-white'
              }`}
            >
              {allPassed ? 'All Passed' : failedCount > 0 ? 'Some Failed' : 'Review Needed'}
            </span>
            <div className="text-sm text-muted-foreground">
              <span className="mr-3">Total: <b>{total}</b></span>
              <span className="mr-3">Passed: <b className="text-green-700">{passedCount}</b></span>
              <span>Failed: <b className="text-red-700">{failedCount}</b></span>
            </div>
          </div>
        </div>

        {/* Single-column cards */}
        <div className="flex flex-col gap-4">
          {nameMap.map(({ key }) => {
            const node = data[key]
            if (!node || typeof node !== 'object') return null
            const passed = !!node.passed
            const expanded = isCardExpanded(key)
            return (
              <div
                key={key}
                className="border rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden w-full"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h4 className="font-medium text-lg">{key}</h4>
                  <div className="flex items-center gap-2">
                    <StatusBadge passed={passed} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleCard(key)}
                      title={expanded ? 'Collapse' : 'Expand'}
                    >
                      {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Output</div>
                  <RenderAgentOutput output={node.output} expanded={expanded} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left hover:text-primary transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <h3 className="font-medium">
            {isUnifiedFlow(response) ? 'Agent Responses' : 'Agent Response'}
          </h3>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {isUnifiedFlow(response) ? (
            <UnifiedCards data={response} />
          ) : (
            <div
              className={
                typeof response === 'string'
                  ? 'bg-muted/30 rounded-md p-4 text-sm whitespace-pre-wrap overflow-y-auto max-h-[70vh]'
                  : 'bg-muted/30 rounded-md p-4 font-mono text-sm overflow-y-auto max-h-[70vh]'
              }
            >
              {formatValue(response)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
