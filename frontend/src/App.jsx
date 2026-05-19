import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import UserManagement from './pages/admin/UserManagement'
import ClassManagement from './pages/admin/ClassManagement'
import StudentManagement from './pages/admin/StudentManagement'
import Report from './pages/admin/Report'
import ScoreReport from './pages/admin/ScoreReport'
import GlobalSearch from './pages/GlobalSearch'
import TeacherDashboard from './pages/teacher/Dashboard'
import MyClasses from './pages/teacher/MyClasses'
import MyStudents from './pages/teacher/MyStudents'
import TakeAttendance from './pages/teacher/TakeAttendance'
import EnterScore from './pages/teacher/EnterScore'
import PrivateRoute from './components/PrivateRoute'
import AutoLogout from './components/AutoLogout'
import ChatBot from './components/ChatBot'

function AppContent() {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('token'))
  }, [location])

  return (
    <>
      <AutoLogout>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute role="ADMIN">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute role="ADMIN">
                <UserManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <PrivateRoute role="ADMIN">
                <ClassManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <PrivateRoute role="ADMIN">
                <StudentManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <PrivateRoute role="ADMIN">
                <Report />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/score-report"
            element={
              <PrivateRoute role="ADMIN">
                <ScoreReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/search"
            element={
              <PrivateRoute role="ADMIN">
                <GlobalSearch role="ADMIN" />
              </PrivateRoute>
            }
          />

          <Route
            path="/teacher/dashboard"
            element={
              <PrivateRoute role="TEACHER">
                <TeacherDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <PrivateRoute role="TEACHER">
                <MyClasses />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/search"
            element={
              <PrivateRoute role="TEACHER">
                <GlobalSearch role="TEACHER" />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <PrivateRoute role="TEACHER">
                <MyStudents />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <PrivateRoute role="TEACHER">
                <TakeAttendance />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/scores"
            element={
              <PrivateRoute role="TEACHER">
                <EnterScore />
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AutoLogout>
      <ChatBot />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
