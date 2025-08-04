import { useState, useCallback } from 'react'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

export default function FileUpload({ agent, onResponse }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)

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

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setSelectedFile(files[0])
      setError(null)
    }
  }, [])

  const removeFile = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

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

      // NEW: Always use .text(), try to parse as JSON, fallback to string
      const text = await response.text()
      let result
      try {
        result = JSON.parse(text)
      } catch {
        result = text
      }
      onResponse(result)
      
      // Clear the file after successful upload
      setSelectedFile(null)
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

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${
          isDragOver ? 'text-primary' : 'text-muted-foreground'
        }`} />
        
        <h3 className="text-lg font-medium mb-2">
          {isDragOver ? 'Drop your file here' : 'Upload a file'}
        </h3>
        
        <p className="text-muted-foreground mb-4">
          Drag and drop your file here, or click to browse
        </p>
        
        <input
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
          accept="*/*"
        />
        
        <Button asChild variant="outline">
          <label htmlFor="file-input" className="cursor-pointer">
            Browse Files
          </label>
        </Button>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="w-8 h-8 text-primary" />
              <div>
                <h4 className="font-medium">{selectedFile.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button
              onClick={uploadFile}
              disabled={isUploading}
              className="flex-1"
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
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-medium">Upload Error</p>
          <p className="text-destructive/80 text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}
