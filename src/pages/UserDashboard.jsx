import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import FileUpload from '@/components/FileUpload'
import ResponseDisplay from '@/components/ResponseDisplay'
import ReportsTable from '@/components/ReportsTable'
import UserReportsTable from '@/components/UserReportsTable'
import '@/App.css'
import { Moon, Sun, LogOut, Bug } from 'lucide-react'
import BugReport from '@/pages/BugReport'
import { supabase } from '@/lib/supabaseClient'
import { useAuthSession } from '@/hooks/useAuthSession'

function UserDashboard() {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [response, setResponse] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)
  const [theme, setTheme] = useState('light')
  const [showBugForm, setShowBugForm] = useState(false)
  const { userRole } = useAuthSession()

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent)
    setResponse(null)
    setUploadedFileName(null)
    setShowBugForm(false) 
  }
  
  const handleResponse = ({ result, fileName }) => {
    setResponse(result)
    setUploadedFileName(fileName)
    setShowBugForm(false) 
  }
  
  const handleThemeChange = (newTheme) => setTheme(newTheme)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isReviewer = userRole === 'reviewer'

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
                    {isReviewer 
                      ? 'Review and approve reports from your assigned sites'
                      : 'Select an agent from the sidebar to begin testing'
                    }
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBugForm(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-foreground hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition"
              >
                <Bug className="w-4 h-4" />
                Report a Bug
              </button>

              <button
                onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-sm">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
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
        <main className="flex-1 overflow-auto">
          <div className="max-w-[76rem] mx-auto p-6 space-y-6">
            {/* File Upload Section */}
            <div className={[!response ? 'min-h-[60vh] flex items-center justify-center' : ''].join(' ')}>
              <FileUpload agent={selectedAgent} onResponse={handleResponse} />
            </div>
            
            {/* Response Display */}
            {response && (
              <div className="bg-card border rounded-lg p-6 max-w-6xl mx-auto">
                <ResponseDisplay response={response} fileName={uploadedFileName} />
              </div>
            )}

            {/* Reports Table - Show for reviewers */}
            {isReviewer && (
              <div className="mt-8">
                <ReportsTable />
              </div>
            )}

            {/* User Reports Table - Show for regular users */}
            {!isReviewer && (
              <div className="mt-8">
                <UserReportsTable />
              </div>
            )}

            {/* Bug Report Form */}
            {showBugForm && (
              <BugReport
                selectedAgent={selectedAgent}
                defaultFileName={uploadedFileName}
                onClose={() => setShowBugForm(false)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default UserDashboard