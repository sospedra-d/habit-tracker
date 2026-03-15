import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardLayout from './layouts/DashboardLayout'
import Habits from './pages/Habits'
import Pomodoro from './pages/Pomodoro'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/habits" replace />} />
        <Route path="habits" element={<Habits />} />
        <Route path="pomodoro" element={<Pomodoro />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
