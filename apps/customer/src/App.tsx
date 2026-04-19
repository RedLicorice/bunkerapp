import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Login         from '@/pages/Login'
import Register      from '@/pages/Register'
import Schedule      from '@/pages/Schedule'
import Courses       from '@/pages/Courses'
import Swap          from '@/pages/Swap'
import Notifications from '@/pages/Notifications'
import Profile       from '@/pages/Profile'

export default function App() {
  useAuthInit()
  return (
    <HashRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/schedule" replace />} />
        <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
        <Route path="/courses"  element={<ProtectedRoute><Courses /></ProtectedRoute>} />
        <Route path="/swap/:bookingId" element={<ProtectedRoute><Swap /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/profile"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  )
}
