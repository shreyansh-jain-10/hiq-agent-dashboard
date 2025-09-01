import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import ResponseDisplay from './components/ResponseDisplay'
import './App.css'
import { Moon, Sun } from 'lucide-react'


// ✨ add:
import { supabase } from './supabaseClient'
import Login from './Login'

function App() {
  // existing state...
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

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session || null)
      setChecking(false)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess || null)
    })
    return () => { mounted = false; sub?.subscription?.unsubscribe?.() }
  }, [])

  const logout = async () => { await supabase.auth.signOut() }

  if (checking) return null
  if (!session) return <Login />

  // …your existing UI here (unchanged) …
  return (
    <div className="flex h-screen bg-background">
      <Sidebar selectedAgent={selectedAgent} onAgentSelect={setSelectedAgent} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b p-6 flex items-center justify-between">
          <div>
            {/* your current title/description */}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <button onClick={logout} className="px-3 py-2 border rounded-lg">Logout</button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-[76rem] mx-auto p-6 space-y-6">
            <div className={[!response ? 'min-h-[60vh] flex items-center justify-center' : ''].join(' ')}>
              <FileUpload agent={selectedAgent} onResponse={({ result, fileName }) => { setResponse(result); setUploadedFileName(fileName) }} />
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
