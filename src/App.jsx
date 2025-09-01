// App.jsx
// If you're on Next.js App Router, add: "use client"
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import ResponseDisplay from './components/ResponseDisplay'
import './App.css'
import { Moon, Sun, LogOut } from 'lucide-react'

// ✨ add these:
import { supabase } from './supabaseClient'
import Login from './Login'

function App() {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [response, setResponse] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)
  const [theme, setTheme] = useState('light')

  // ✨ auth state
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  // ✨ fetch session on mount + subscribe to changes
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session ?? null)
      setChecking(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
    })
    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent)
    setResponse(null)
    setUploadedFileName(null)
  }
  const handleResponse = ({ result, fileName }) => {
    setResponse(result)
    setUploadedFileName(fileName)
  }
  const handleThemeChange = (newTheme) => setTheme(newTheme)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // No reload needed — the onAuthStateChange above will set session=null and show <Login/>
  }

  // ✨ gate: while checking avoid flicker
  if (checking) return null
  // ✨ not logged in → show Login screen
  if (!session) return <Login />

  // Logged in → your original UI
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

            <div className="flex items-center gap-3">
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
            <div className={[!response ? 'min-h-[60vh] flex items-center justify-center' : ''].join(' ')}>
              <FileUpload agent={selectedAgent} onResponse={handleResponse} />
            </div>
            {response && (
              <div className="bg-card border rounded-lg p-6 max-w-6xl mx-auto">
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
