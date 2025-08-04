import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

export default function ResponseDisplay({ response }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  if (!response) {
    return null
  }

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

  const formatValue = (value, depth = 0) => {
    if (value === null) return <span className="text-muted-foreground">null</span>
    if (value === undefined) return <span className="text-muted-foreground">undefined</span>
    if (typeof value === 'boolean') return <span className="text-blue-600">{value.toString()}</span>
    if (typeof value === 'number') return <span className="text-green-600">{value}</span>
    if (typeof value === 'string') {
      if (depth === 0) {
        // Top-level string: show as preformatted block, NOT monospace
        return <pre className="text-sm whitespace-pre-wrap">{value}</pre>
      }
      // Nested string
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

  return (
    <div className="bg-card border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left hover:text-primary transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <h3 className="font-medium">Agent Response</h3>
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
          <div className={
            typeof response === 'string'
              ? "bg-muted/30 rounded-md p-4 text-sm whitespace-pre-wrap overflow-auto max-h-96"
              : "bg-muted/30 rounded-md p-4 font-mono text-sm overflow-auto max-h-96"
          }>
            {formatValue(response)}
          </div>
        </div>
      )}
    </div>
  )
}
