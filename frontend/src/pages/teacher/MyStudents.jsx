import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import axiosClient from '../../api/axiosClient'

export default function MyStudents() {
  const location = useLocation()

  const [students, setStudents] = useState([])
  const [myClasses, setMyClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchMyClasses = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/classes/my-classes')
      setMyClasses(data)
    } catch { /* silent */ }
  }, [])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedClass) params.classId = selectedClass
      const { data } = await axiosClient.get('/students/my-students', { params })
      setStudents(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [selectedClass])

  useEffect(() => {
    fetchMyClasses()
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [selectedClass])

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB')
  }

  const getClassLabel = (s) => s.classId?.className || '—'

  const getLevelColor = (s) => {
    const lvl = s.classId?.level
    if (lvl === 'BEGINNER') return 'level-beginner'
    if (lvl === 'INTERMEDIATE') return 'level-intermediate'
    return 'level-advanced'
  }

  const getLevelLabel = (s) => {
    const lvl = s.classId?.level
    if (lvl === 'BEGINNER') return 'Beginner'
    if (lvl === 'INTERMEDIATE') return 'Intermediate'
    if (lvl === 'ADVANCED') return 'Advanced'
    return lvl || ''
  }

  return (
    <div className="layout">
      <Sidebar role="TEACHER" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>My Students</h1>
            <p>View students enrolled in your assigned classes.</p>
          </div>
        </header>

        {/* Class filter */}
        <section className="panel card">
          <h3>Select Class</h3>
          <div className="filter-form">
            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="classFilter">Class</label>
                <select
                  id="classFilter"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">All My Classes</option>
                  {myClasses.map((c) => (
                    <option key={c._id} value={c._id}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Student table */}
        {loading ? (
          <div className="panel card">
            <p style={{ textAlign: 'center', color: '#999' }}>Loading...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="panel card">
            <p className="empty-message">No students found in your classes.</p>
          </div>
        ) : (
          <section className="panel card">
            <h3>Student List ({students.length})</h3>
            <div className="table-wrap">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Date of Birth</th>
                    <th>Phone</th>
                    <th>Class</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s._id}>
                      <td>{idx + 1}</td>
                      <td><strong>{s.name}</strong></td>
                      <td>{formatDate(s.dob)}</td>
                      <td>{s.phone}</td>
                      <td>{getClassLabel(s)}</td>
                      <td>
                        {s.classId && (
                          <span className={`level-chip ${getLevelColor(s)}`}>
                            {getLevelLabel(s)}
                          </span>
                        )}
                      </td>
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
