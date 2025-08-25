import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import ResponseDisplay from './components/ResponseDisplay'
import './App.css'
import { Moon, Sun } from 'lucide-react'

function App() {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [response, setResponse] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null) // NEW
  const [theme, setTheme] = useState('light')

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent)
    setResponse(null)            // Clear previous response when switching agents
    setUploadedFileName(null)    // Clear previous file name
  }

  // UPDATED: receive both { result, fileName } from FileUpload
  const handleResponse = ({ result, fileName }) => {
    setResponse(result)          // only the parsed result goes to ResponseDisplay.response
    setUploadedFileName(fileName) // keep the original filename for banner & PDF names
  }

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const handleThemeChange = (newTheme) => setTheme(newTheme)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        selectedAgent={selectedAgent}
        onAgentSelect={handleAgentSelect}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border p-6">
          <div className="w-full flex justify-between items-center">
            <div>
              {selectedAgent ? (
                <div>
                  <h1 className="text-2xl font-semibold text-foreground mb-2">
                    {selectedAgent.name}
                  </h1>
                  <p className="text-muted-foreground">
                    {selectedAgent.description}
                  </p>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-semibold text-foreground mb-2">
                    HIQ Agent Testing Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Select an agent from the sidebar to begin testing
                  </p>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
                className="w-full flex cursor-pointer items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-sm">
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* File Upload Section */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">File Upload</h2>
              <FileUpload
                agent={selectedAgent}
                onResponse={handleResponse} // now receives { result, fileName }
              />
            </div>

            {/* Response Section */}
            {response && (
              <div>
                <ResponseDisplay
                  response={response}
                  fileName={uploadedFileName} // NEW: shows in header & names PDFs
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
