import { useState, useCallback, useRef, useMemo } from 'react'
import { Upload, FileText, File, X, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

/**
 * Premium FileUpload.jsx
 * - Glassmorphism drop zone with animated drag-over state
 * - File preview row with filetype icon
 * - Indeterminate progress bar while uploading
 * - Micro-interactions on buttons (ripple-like scale, subtle glow)
 * - Same external API: props { agent, onResponse }
 */
export default function FileUpload({ agent, onResponse }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const fileIcon = useMemo(() => {
    if (!selectedFile) return File
    const ext = (selectedFile.name.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf') return FileText
    return File
  }, [selectedFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setSelectedFile(files[0])
      setError(null)
    }
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setSelectedFile(files[0])
      setError(null)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadFile = async () => {
    if (!selectedFile || !agent) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(agent.webhook, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Always use text first; try JSON parse, fallback to string
      const text = await response.text()
      let result
      try { result = JSON.parse(text) } catch { result = text }
      onResponse?.(result)

      setSelectedFile(null)
      setIsUploading(false)
      setError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select an Agent</h3>
          <p className="text-muted-foreground">Choose an agent from the sidebar to start testing</p>
        </div>
      </div>
    )
  }

  const DropIcon = fileIcon

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'relative rounded-2xl p-10 text-center transition-all duration-300 border-2 border-dashed',
          'backdrop-blur-sm bg-white/60 dark:bg-gray-900/40',
          isDragOver
            ? 'border-primary shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
            : 'border-border hover:border-primary/50 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]',
        ].join(' ')}
      >
        {/* Glow ring on drag */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity ${isDragOver ? 'opacity-100' : 'opacity-0'}`}
          style={{
            boxShadow: '0 0 0 6px rgba(59,130,246,0.12) inset, 0 30px 80px -20px rgba(59,130,246,0.25)'
          }}
        />

        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <h3 className="text-lg font-semibold mb-2">
          {isDragOver ? 'Drop your file here' : 'Upload a file'}
        </h3>
        <p className="text-muted-foreground mb-5">Drag & drop your file here, or click to browse</p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
          accept=".pdf"
        />

        <Button asChild variant="outline" className="relative overflow-hidden active:scale-[0.99] transition-transform">
          <label htmlFor="file-input" className="cursor-pointer">
            Browse Files
          </label>
        </Button>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span>Your files are processed securely and never shared.</span>
        </div>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-card/70 backdrop-blur-sm border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <DropIcon className="w-5 h-5" />
              </span>
              <div className="text-left">
                <h4 className="font-medium truncate max-w-[60vw]">{selectedFile.name}</h4>
                <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={removeFile} disabled={isUploading} className="hover:bg-destructive/10">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-4 flex gap-2 items-center">
            <Button
              onClick={uploadFile}
              disabled={isUploading}
              className="flex-1 cursor-pointer active:scale-[0.99] transition-transform"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Upload & Process'
              )}
            </Button>
          </div>

          {/* Indeterminate progress bar */}
          {isUploading && (
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/2 rounded-full animate-[shimmer_1.2s_infinite]" style={{
                background: 'linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.55) 50%, rgba(59,130,246,0.15) 100%)'
              }} />
            </div>
          )}

          <style jsx>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
          <p className="text-destructive font-medium">Upload Error</p>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}
