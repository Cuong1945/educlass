import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../api/axiosClient'

export default function Sidebar({ role, activePath }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    navigate('/login?logout=true')
  }

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">{role === 'ADMIN' ? 'Admin' : 'Teacher'}</h2>

      {role === 'ADMIN' && (
        <>
          <Link
            to="/admin/dashboard"
            className={`nav-item${activePath === '/admin/dashboard' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-gauge" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/admin/classes"
            className={`nav-item${activePath === '/admin/classes' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-school" />
            <span>Manage Class</span>
          </Link>
          <Link
            to="/admin/users"
            className={`nav-item${activePath === '/admin/users' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-users-gear" />
            <span>Manage Users</span>
          </Link>
          <Link
            to="/admin/students"
            className={`nav-item${activePath === '/admin/students' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-user-graduate" />
            <span>Manage Students</span>
          </Link>
          <Link
            to="/admin/reports"
            className={`nav-item${activePath === '/admin/reports' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-user-check" />
            <span>Attendance Report</span>
          </Link>
          <Link
            to="/admin/score-report"
            className={`nav-item${activePath === '/admin/score-report' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-chart-line" />
            <span>Score Report</span>
          </Link>
          <Link
            to="/admin/search"
            className={`nav-item${activePath === '/admin/search' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-earth-americas" />
            <span>Global Search</span>
          </Link>
        </>
      )}

      {role === 'TEACHER' && (
        <>
          <Link
            to="/teacher/dashboard"
            className={`nav-item${activePath === '/teacher/dashboard' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-gauge" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/teacher/classes"
            className={`nav-item${activePath === '/teacher/classes' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-chalkboard-user" />
            <span>My Classes</span>
          </Link>
          <Link
            to="/teacher/students"
            className={`nav-item${activePath === '/teacher/students' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-user-graduate" />
            <span>My Students</span>
          </Link>
          <Link
            to="/teacher/attendance"
            className={`nav-item${activePath === '/teacher/attendance' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-clipboard-user" />
            <span>Take Attendance</span>
          </Link>
          <Link
            to="/teacher/scores"
            className={`nav-item${activePath === '/teacher/scores' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-pen-nib" />
            <span>Enter Scores</span>
          </Link>
          <Link
            to="/teacher/search"
            className={`nav-item${activePath === '/teacher/search' ? ' active' : ''}`}
          >
            <i className="fa-solid fa-magnifying-glass" />
            <span>Search Students</span>
          </Link>
        </>
      )}

      <button type="button" className="btn-link nav-item" onClick={handleLogout}>
        <i className="fa-solid fa-right-from-bracket" />
        <span>Logout</span>
      </button>
    </aside>
  )
}
