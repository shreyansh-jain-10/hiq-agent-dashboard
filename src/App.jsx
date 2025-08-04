import { useState } from 'react'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import ResponseDisplay from './components/ResponseDisplay'
import './App.css'

function App() {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [response, setResponse] = useState(null)

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent)
    setResponse(null) // Clear previous response when switching agents
  }

  const handleResponse = (responseData) => {
    setResponse(responseData)
  }

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
          <div className="max-w-4xl">
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
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* File Upload Section */}
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">File Upload(File should be less than 35 mb)</h2>
              <FileUpload 
                agent={selectedAgent} 
                onResponse={handleResponse} 
              />
            </div>

            {/* Response Section */}
            {response && (
              <div>
                <ResponseDisplay response={response} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

