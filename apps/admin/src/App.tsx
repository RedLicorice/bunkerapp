import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Login         from '@/pages/Login'
import Dashboard     from '@/pages/Dashboard'
import Courses       from '@/pages/Courses'
import Members       from '@/pages/Members'
import Notifications from '@/pages/Notifications'
import SwapRequests  from '@/pages/SwapRequests'

export default function App() {
  useAuthInit()
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/courses"       element={<ProtectedRoute><Courses /></ProtectedRoute>} />
        <Route path="/members"       element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/swap-requests" element={<ProtectedRoute><SwapRequests /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  )
}
