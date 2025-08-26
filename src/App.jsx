// App.jsx
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import ResponseDisplay from './components/ResponseDisplay'
import './App.css'
import { Moon, Sun } from 'lucide-react'

function App() {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [response, setResponse] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)
  const [theme, setTheme] = useState('light')

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent)
    setResponse(null)
    setUploadedFileName(null)
  }

  const handleResponse = ({ result, fileName }) => {
    setResponse(result)
    setUploadedFileName(fileName)
  }

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  const handleThemeChange = (newTheme) => setTheme(newTheme)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar selectedAgent={selectedAgent} onAgentSelect={handleAgentSelect} />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border p-6">
          <div className="w-full flex justify-between items-center">
            <div>
              {selectedAgent ? (
                <>
                  <h1 className="text-2xl font-semibold text-foreground mb-2">
                    {selectedAgent.name}
                  </h1>
                  <p className="text-muted-foreground">{selectedAgent.description}</p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold text-foreground mb-2">
                    HiQ Agent Testing Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Select an agent from the sidebar to begin testing
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-sm">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* File Upload Section */}
            <div
              className={[
                // Center when there’s no response yet
                !response ? 'min-h-[60vh] flex items-center justify-center' : '',
              ].join(' ')}
            >
              {/* Remove the extra card wrapper —
                  FileUpload handles its own UI and now centers itself internally */}
              <FileUpload agent={selectedAgent} onResponse={handleResponse} />
            </div>

            {/* Response Section */}
            {response && (
              <div className="bg-card border rounded-lg p-6">
                <ResponseDisplay response={response} fileName={uploadedFileName} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
