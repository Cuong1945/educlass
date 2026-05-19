import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import axiosClient from '../../api/axiosClient'

const LEVELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

export default function MyClasses() {
  const location = useLocation()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMyClasses = async () => {
      try {
        const { data } = await axiosClient.get('/classes/my-classes')
        setClasses(data)
      } catch {
        /* silent */
      } finally {
        setLoading(false)
      }
    }
    fetchMyClasses()
  }, [])

  const getLevelColor = (val) => {
    if (val === 'BEGINNER') return 'level-beginner'
    if (val === 'INTERMEDIATE') return 'level-intermediate'
    return 'level-advanced'
  }

  return (
    <div className="layout">
      <Sidebar role="TEACHER" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>My Classes</h1>
            <p>View the classes assigned to you.</p>
          </div>
        </header>

        {loading ? (
          <div className="panel card">
            <p style={{ textAlign: 'center', color: '#999' }}>Loading...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="panel card">
            <p className="empty-message">You have no assigned classes.</p>
          </div>
        ) : (
          <section className="panel card">
            <h3>Assigned Classes</h3>
            <div className="table-wrap">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Class Name</th>
                    <th>Level</th>
                    <th>Schedule</th>
                    <th>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c, idx) => (
                    <tr key={c._id}>
                      <td>{idx + 1}</td>
                      <td><strong>{c.className}</strong></td>
                      <td>
                        <span className={`level-chip ${getLevelColor(c.level)}`}>
                          {LEVELS[c.level] || c.level}
                        </span>
                      </td>
                      <td>{c.schedule}</td>
                      <td>{c.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
