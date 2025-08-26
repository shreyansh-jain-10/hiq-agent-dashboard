// FileUpload.jsx
import { useState, useCallback, useRef, useMemo } from 'react'
import { Upload, FileText, File, X, Loader2, ShieldCheck, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

export default function FileUpload({ agent, onResponse }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [hasResult, setHasResult] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const fileIcon = useMemo(() => {
    if (!selectedFile) return File
    const ext = (selectedFile.name.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf') return FileText
    return File
  }, [selectedFile])

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragOver(false) }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) { setSelectedFile(files[0]); setError(null); setHasResult(false) }
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) { setSelectedFile(files[0]); setError(null); setHasResult(false) }
  }

  const removeFile = () => {
    setSelectedFile(null); setError(null); setHasResult(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadFile = async () => {
    if (!selectedFile || !agent) return
    setIsUploading(true); setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(agent.webhook, { method: 'POST', body: formData })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const text = await response.text()
      let result; try { result = JSON.parse(text) } catch { result = text }

      // IMPORTANT: bubble up the filename along with the parsed result
      onResponse?.({ result, fileName: selectedFile.name })

      setHasResult(true)
      setSelectedFile(null)
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

  const StepItem = ({ index, title, desc, state }) => {
    const isDone = state === 'done'
    const isCurrent = state === 'current'
    const circleCls = isDone
      ? 'bg-green-100 text-green-700 border-green-200'
      : isCurrent
        ? 'bg-blue-100 text-blue-700 border-blue-200'
        : 'bg-gray-100 text-gray-600 border-gray-200'
    return (
      <li className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-sm font-semibold ${circleCls}`}>
          {isDone ? <CheckCircle className="w-5 h-5" /> : index}
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">{desc}</div>
        </div>
      </li>
    )
  }

  const step1State = hasResult ? 'done' : (isUploading ? 'pending' : 'current')
  const step2State = isUploading ? 'current' : (hasResult ? 'done' : 'pending')
  const step3State = hasResult ? 'current' : 'pending'

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-card border rounded-2xl p-10 text-center max-w-md shadow-sm">
          <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-3">Select an Agent</h2>
          <p className="text-base text-muted-foreground mb-6">
            Choose an agent from the sidebar to enable file upload.
          </p>
        </div>
      </div>
    )
  }

  const DropIcon = fileIcon

  return (

    <div className="space-y-6">

      <h2
        id="file-upload-heading"
        className="text-2xl font-bold tracking-tight text-foreground text-center"
      >
        File Upload
      </h2>

      {/* How it works */}
      <div className="border rounded-2xl p-5 bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm">
        <h3 className="font-semibold mb-3">How it works</h3>
        <ol className="grid gap-4 md:grid-cols-3">
          <StepItem index={1} state={step1State} title="Upload report" desc="Drag & drop or select the waste report you want to process, then upload it." />
          <StepItem index={2} state={step2State} title="Processing" desc="Wait for all agents to process the report." />
          <StepItem index={3} state={step3State} title="View & download" desc="View agents' outputs or download a PDF of the responses." />
        </ol>
      </div>

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
        <div
          className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity ${isDragOver ? 'opacity-100' : 'opacity-0'}`}
          style={{ boxShadow: '0 0 0 6px rgba(59,130,246,0.12) inset, 0 30px 80px -20px rgba(59,130,246,0.25)' }}
        />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <h3 className="text-lg font-semibold mb-2">{isDragOver ? 'Drop your file here' : 'Upload a file'}</h3>
        <p className="text-muted-foreground mb-5">Drag & drop your file here, or click to browse</p>

        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" id="file-input" accept=".pdf" />
        <Button asChild variant="outline" className="relative overflow-hidden active:scale-[0.99] transition-transform">
          <label htmlFor="file-input" className="cursor-pointer">Browse Files</label>
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
            <Button onClick={uploadFile} disabled={isUploading} className="flex-1 cursor-pointer active:scale-[0.99] transition-transform">
              {isUploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>) : ('Upload & Process')}
            </Button>
          </div>

          {isUploading && (
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/2 rounded-full animate-[shimmer_1.2s_infinite]" style={{
                background: 'linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.55) 50%, rgba(59,130,246,0.15) 100%)'
              }} />
            </div>
          )}

          <style jsx>{`
            @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
          `}</style>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
          <p className="text-destructive font-medium">Upload Error</p>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}
