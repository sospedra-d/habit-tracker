import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import DashboardLayout from './layouts/DashboardLayout'
import Habits from './pages/Habits'
import Pomodoro from './pages/Pomodoro'
import DashboardPage from './pages/Dashboard'
import Todos from './pages/Todos'

function ProtectedRoute({ session, children }) {
  const location = useLocation()
  
  if (session === undefined) return null // still loading
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  
  return children
}

function App() {
  const [session, setSession] = useState(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Show nothing while checking auth initially to prevent flicker
  if (session === undefined) return null

  return (
    <Routes>
      <Route 
        path="/login" 
        element={session ? <Navigate to="/habits" replace /> : <Login />} 
      />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute session={session}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/habits" replace />} />
        <Route path="habits" element={<Habits />} />
        <Route path="pomodoro" element={<Pomodoro />} />
        <Route path="estadisticas" element={<DashboardPage />} />
        <Route path="tareas" element={<Todos />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
