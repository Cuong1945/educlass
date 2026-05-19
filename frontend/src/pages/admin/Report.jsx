import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import axiosClient from '../../api/axiosClient'

export default function Report() {
  const location = useLocation()

  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchClasses = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/classes')
      setClasses(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    
    try {
      const params = {}
      if (selectedClass) params.classId = selectedClass

      const { data } = await axiosClient.get('/attendance/report', { params })
      setReportData(data.report || data)
    } catch (err) {
      setReportData([])
      const msg = err.response?.data?.message || 'Failed to load report'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }, [selectedClass])

  useEffect(() => {
    fetchReport()
  }, [selectedClass])

  const getRateBadge = (rate) => {
    if (rate >= 80) return 'badge-present'
    if (rate >= 50) return 'badge-warning'
    return 'badge-absent'
  }

  return (
    <div className="layout">
      <Sidebar role="ADMIN" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>Attendance Report</h1>
            <p>Monitor student attendance statistics by class.</p>
          </div>
        </header>

        <section className="panel card">
          <h3>Filter Report</h3>
          <div className="filter-form">
            <div className="filter-grid" style={{ gridTemplateColumns: 'minmax(250px, 400px)' }}>
              <div className="filter-group">
                <label htmlFor="reportClass">Class</label>
                <select
                  id="reportClass"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">Select a class...</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="panel card">
          <h3>Report Data</h3>
          
          {loading ? (
             <p style={{ textAlign: 'center', color: '#999', margin: '40px 0' }}>Loading report data...</p>
          ) : errorMessage ? (
            <div className="empty-message">
              <i className="fa-solid fa-folder-open" style={{ fontSize: '32px', color: '#ccc', marginBottom: '10px' }} />
              <p style={{ color: '#eb5757', fontWeight: '500' }}>{errorMessage}</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="empty-message">No data found.</div>
          ) : (
            <div className="table-wrap">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Phone</th>
                    <th style={{ textAlign: 'center' }}>Total Sessions</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Absent</th>
                    <th style={{ textAlign: 'right' }}>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={row.studentId}>
                      <td>{idx + 1}</td>
                      <td><strong>{row.name}</strong></td>
                      <td>{row.phone}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.totalSessions}</td>
                      <td style={{ textAlign: 'center', color: '#166534', fontWeight: '600' }}>{row.present}</td>
                      <td style={{ textAlign: 'center', color: '#991b1b', fontWeight: '600' }}>{row.absent}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`att-badge ${getRateBadge(row.attendanceRate)}`}>
                          {row.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
