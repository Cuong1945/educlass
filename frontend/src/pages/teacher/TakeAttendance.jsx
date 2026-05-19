import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import axiosClient from '../../api/axiosClient'

export default function TakeAttendance() {
  const location = useLocation()

  const [myClasses, setMyClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState({})
  const [history, setHistory] = useState([])
  const [historyRecords, setHistoryRecords] = useState([])
  const [viewDate, setViewDate] = useState('')

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [alreadyTaken, setAlreadyTaken] = useState(false)

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setErrorMessage('')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const showError = (msg) => {
    setErrorMessage(msg)
    setSuccessMessage('')
  }

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data } = await axiosClient.get('/classes/my-classes')
        setMyClasses(data)
      } catch { /* silent */ }
    }
    fetchClasses()
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const params = {}
      if (selectedClass) params.classId = selectedClass
      
      const { data } = await axiosClient.get('/students/my-students', { params })
      setStudents(data)
      const init = {}
      data.forEach((s) => { init[s._id] = '' })
      setRecords(init)
    } catch { /* silent */ }
  }, [selectedClass])

  const checkExistingAttendance = useCallback(async () => {
    if (!selectedClass || !selectedDate) return
    try {
      const { data } = await axiosClient.get('/attendance', { params: { classId: selectedClass, date: selectedDate } })
      if (data.length > 0) {
        setAlreadyTaken(true)
        const filled = {}
        data.forEach((r) => { filled[r.studentId._id] = r.status })
        setRecords(filled)
      } else {
        setAlreadyTaken(false)
      }
    } catch {
      setAlreadyTaken(false)
    }
  }, [selectedClass, selectedDate])

  const fetchHistory = useCallback(async () => {
    if (!selectedClass) { setHistory([]); return }
    try {
      const { data } = await axiosClient.get('/attendance/history', { params: { classId: selectedClass } })
      setHistory(data)
    } catch { /* silent */ }
  }, [selectedClass])

  useEffect(() => {
    fetchStudents()
    fetchHistory()
    setAlreadyTaken(false)
    setViewDate('')
    setHistoryRecords([])
  }, [selectedClass])

  useEffect(() => {
    checkExistingAttendance()
  }, [selectedClass, selectedDate])

  const setStatus = (studentId, status) => {
    if (alreadyTaken) return
    setRecords((prev) => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status) => {
    if (alreadyTaken) return
    const updated = {}
    students.forEach((s) => { updated[s._id] = status })
    setRecords(updated)
  }

  const handleSubmit = async () => {
    // Validate all have status
    const missing = students.some((s) => !records[s._id])
    if (missing) {
      showError('All students must have attendance status')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        classId: selectedClass,
        date: selectedDate,
        records: students.map((s) => ({
          studentId: s._id,
          status: records[s._id],
        })),
      }
      const res = await axiosClient.post('/attendance', payload)
      showSuccess(res.data.message || 'Attendance saved successfully')
      setAlreadyTaken(true)
      fetchHistory()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save attendance')
    } finally {
      setSubmitting(false)
    }
  }

  const viewHistoryDate = async (dateStr) => {
    setViewDate(dateStr)
    try {
      const { data } = await axiosClient.get('/attendance', { params: { classId: selectedClass, date: dateStr } })
      setHistoryRecords(data)
    } catch { /* silent */ }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB')

  const presentCount = Object.values(records).filter((v) => v === 'PRESENT').length
  const absentCount = Object.values(records).filter((v) => v === 'ABSENT').length

  return (
    <div className="layout">
      <Sidebar role="TEACHER" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>Take Attendance</h1>
            <p>Record attendance for students in your class.</p>
          </div>
        </header>

        {successMessage && <div className="alert success">{successMessage}</div>}
        {errorMessage && <div className="alert error">{errorMessage}</div>}

        {/* Class & Date Selection */}
        <section className="panel card">
          <h3>Session Details</h3>
          <div className="filter-form">
            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="attendClass">Class</label>
                <select
                  id="attendClass"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">Select a class</option>
                  {myClasses.map((c) => (
                    <option key={c._id} value={c._id}>{c.className}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="attendDate">Date</label>
                <input
                  id="attendDate"
                  type="date"
                  value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Attendance Form */}
        {students.length > 0 && (
          <section className="panel card">
            <div className="attendance-header">
              <h3>Student Attendance {selectedClass ? '' : '(Read-only Preview)'}</h3>
              {!alreadyTaken && selectedClass && (
                <div className="attendance-quick-actions">
                  <button type="button" className="btn-sm btn-present" onClick={() => markAll('PRESENT')}>
                    <i className="fa-solid fa-check" /> All Present
                  </button>
                  <button type="button" className="btn-sm btn-absent" onClick={() => markAll('ABSENT')}>
                    <i className="fa-solid fa-xmark" /> All Absent
                  </button>
                </div>
              )}
            </div>

            {alreadyTaken && selectedClass && (
              <div className="alert info" style={{ marginBottom: '16px' }}>
                <i className="fa-solid fa-circle-info" /> Attendance already recorded for this date.
              </div>
            )}
            {!selectedClass && (
              <div className="alert info" style={{ marginBottom: '16px' }}>
                <i className="fa-solid fa-circle-info" /> Please select a specific class to record attendance.
              </div>
            )}

            {/* Summary chips */}
            <div className="attendance-summary">
              <span className="att-chip att-total">
                <i className="fa-solid fa-users" /> Total: {students.length}
              </span>
              <span className="att-chip att-present">
                <i className="fa-solid fa-circle-check" /> Present: {presentCount}
              </span>
              <span className="att-chip att-absent">
                <i className="fa-solid fa-circle-xmark" /> Absent: {absentCount}
              </span>
            </div>

            <div className="table-wrap">
              <table className="user-table attendance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Phone</th>
                    <th>Class</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s._id} className={records[s._id] === 'PRESENT' ? 'row-present' : records[s._id] === 'ABSENT' ? 'row-absent' : ''}>
                      <td>{idx + 1}</td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.phone}</td>
                      <td>{s.classId?.className || '—'}</td>
                      <td>
                        <div className="status-toggle">
                          <button
                            type="button"
                            className={`toggle-btn toggle-present${records[s._id] === 'PRESENT' ? ' active' : ''}`}
                            onClick={() => setStatus(s._id, 'PRESENT')}
                            disabled={alreadyTaken || !selectedClass}
                          >
                            <i className="fa-solid fa-check" /> Present
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn toggle-absent${records[s._id] === 'ABSENT' ? ' active' : ''}`}
                            onClick={() => setStatus(s._id, 'ABSENT')}
                            disabled={alreadyTaken || !selectedClass}
                          >
                            <i className="fa-solid fa-xmark" /> Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!alreadyTaken && selectedClass && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ padding: '12px 32px', fontSize: '15px' }}
                >
                  <i className="fa-solid fa-floppy-disk" /> Save Attendance
                </button>
              </div>
            )}
          </section>
        )}

        {students.length === 0 && (
          <div className="panel card">
            <p className="empty-message">No students found.</p>
          </div>
        )}

        {/* Attendance History */}
        {selectedClass && history.length > 0 && (
          <section className="panel card">
            <h3>Attendance History</h3>
            <div className="history-chips">
              {history.map((d) => {
                const ds = new Date(d).toISOString().split('T')[0]
                return (
                  <button
                    key={ds}
                    type="button"
                    className={`history-chip${viewDate === ds ? ' active' : ''}`}
                    onClick={() => viewHistoryDate(ds)}
                  >
                    {formatDate(d)}
                  </button>
                )
              })}
            </div>

            {viewDate && historyRecords.length > 0 && (
              <div className="table-wrap" style={{ marginTop: '16px' }}>
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((r, idx) => (
                      <tr key={r._id} className={r.status === 'PRESENT' ? 'row-present' : 'row-absent'}>
                        <td>{idx + 1}</td>
                        <td><strong>{r.studentId?.name || '—'}</strong></td>
                        <td>
                          <span className={`att-badge ${r.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}`}>
                            {r.status === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
