import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import axiosClient from '../../api/axiosClient'

export default function EnterScore() {
  const location = useLocation()

  const [myClasses, setMyClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedClassLevel, setSelectedClassLevel] = useState('')
  const [students, setStudents] = useState([])
  
  // records: { studentId: { midterm: '', final: '', oral: '', average: '' } }
  const [records, setRecords] = useState({})
  const [originalRecords, setOriginalRecords] = useState({})
  
  const [alreadyEntered, setAlreadyEntered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const showSuccess = (msg) => { setSuccessMessage(msg); setErrorMessage(''); setTimeout(() => setSuccessMessage(''), 3000) }
  const showError = (msg) => { setErrorMessage(msg); setSuccessMessage(''); setTimeout(() => setErrorMessage(''), 5000) }

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data } = await axiosClient.get('/classes/my-classes')
        setMyClasses(data)
      } catch { /* silent */ }
    }
    fetchClasses()
  }, [])

  const checkExistingScores = useCallback(async () => {
    if (!selectedClassId) return false
    try {
      const { data } = await axiosClient.get('/scores', { params: { classId: selectedClassId } })
      if (data && data.length > 0) {
        setAlreadyEntered(true)
        // fill existing scores for display
        const filled = {}
        data.forEach(s => {
          filled[s.studentId._id] = {
            midterm: s.midterm.toString(),
            final: s.final.toString(),
            oral: s.oral !== null ? s.oral.toString() : '',
            average: s.average.toString()
          }
        })
        setRecords(filled)
        setOriginalRecords(JSON.parse(JSON.stringify(filled)))
        return true
      }
      return false
    } catch {
      return false
    }
  }, [selectedClassId])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      setAlreadyEntered(false)
      const hasScores = await checkExistingScores()
      
      const params = {}
      if (selectedClassId) params.classId = selectedClassId
      
      const { data } = await axiosClient.get('/students/my-students', { params })
      setStudents(data)

      if (!hasScores) {
        // init empty grid
        const init = {}
        data.forEach(s => {
          init[s._id] = { midterm: '', final: '', oral: '', average: '' }
        })
        setRecords(init)
      }
    } catch {
      showError('Failed to fetch students.')
    } finally {
      setIsEditing(false)
      setLoading(false)
    }
  }, [selectedClassId, checkExistingScores])

  useEffect(() => {
    fetchStudents()
  }, [selectedClassId])

  const handleClassChange = (e) => {
    const cid = e.target.value
    setSelectedClassId(cid)
    if (cid) {
      const cls = myClasses.find(c => c._id === cid)
      setSelectedClassLevel(cls?.level || '')
    } else {
      setSelectedClassLevel('')
    }
  }

  const isKidsClass = selectedClassLevel === 'KIDS'

  const calculateAverage = (mid, fin, orl) => {
    const m = parseFloat(mid)
    const f = parseFloat(fin)
    const o = parseFloat(orl)
    
    const isValid = (val) => !isNaN(val) && val >= 0 && val <= 100

    if (isValid(m) && isValid(f)) {
      if (isValid(o)) {
        return ((m + f + o) / 3).toFixed(2)
      } else if (!isKidsClass && (orl === '' || orl === undefined)) {
        return ((m + f) / 2).toFixed(2)
      }
    }
    return ''
  }

  const handleScoreChange = (studentId, field, value) => {
    if (alreadyEntered && !isEditing) return

    setRecords(prev => {
      const studentRecord = { ...prev[studentId], [field]: value }
      // auto calculate average
      studentRecord.average = calculateAverage(studentRecord.midterm, studentRecord.final, studentRecord.oral)
      return { ...prev, [studentId]: studentRecord }
    })
  }

  const validateScores = () => {
    for (const student of students) {
      const r = records[student._id]
      if (!r.midterm || !r.final) return 'Score is required for all students (Midterm and Final)'
      
      const m = parseFloat(r.midterm)
      const f = parseFloat(r.final)
      if (isNaN(m) || isNaN(f)) return 'Score must be a number'
      if (m < 0 || m > 100 || f < 0 || f > 100) return 'Score must be between 0 and 100'

      if (isKidsClass) {
        if (!r.oral || r.oral.trim() === '') return 'Oral score is required for kids class'
      }

      if (r.oral && r.oral.trim() !== '') {
        const o = parseFloat(r.oral)
        if (isNaN(o)) return 'Score must be a number (Oral)'
        if (o < 0 || o > 100) return 'Score must be between 0 and 100 (Oral)'
      }
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateScores()
    if (validationError) {
      showError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const payloadRecords = students.map(s => ({
        studentId: s._id,
        midterm: records[s._id].midterm,
        final: records[s._id].final,
        oral: records[s._id].oral
      }))

      const res = await axiosClient.post('/scores', {
        classId: selectedClassId,
        records: payloadRecords
      })

      showSuccess(res.data.message || 'Scores saved successfully')
      setAlreadyEntered(true)
      setIsEditing(false)
      fetchStudents() // refresh internal state
    } catch (err) {
      showError(err.response?.data?.message || 'Cannot save scores')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    const validationError = validateScores()
    if (validationError) {
      showError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const payloadRecords = students.map(s => ({
        studentId: s._id,
        midterm: records[s._id].midterm,
        final: records[s._id].final,
        oral: records[s._id].oral
      }))

      const res = await axiosClient.put(`/scores/${selectedClassId}`, {
        records: payloadRecords
      })

      showSuccess(res.data.message || 'Scores updated successfully')
      setIsEditing(false)
      fetchStudents() // refetch to get updated dates
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update scores')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEditing = () => {
    setRecords(JSON.parse(JSON.stringify(originalRecords)))
    setIsEditing(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  return (
    <div className="layout">
      <Sidebar role="TEACHER" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>Enter Scores</h1>
            <p>Input midterm, final, and oral scores for students.</p>
          </div>
        </header>

        {successMessage && <div className="alert success">{successMessage}</div>}
        {errorMessage && <div className="alert error">{errorMessage}</div>}

        <section className="panel card">
          <h3>Select Class</h3>
          <div className="filter-form">
            <div className="filter-grid" style={{ gridTemplateColumns: 'minmax(250px, 400px)' }}>
              <div className="filter-group">
                <label htmlFor="scoreClass">Class</label>
                <select
                  id="scoreClass"
                  value={selectedClassId}
                  onChange={handleClassChange}
                >
                  <option value="">Select a class to enter scores...</option>
                  {myClasses.map((c) => (
                    <option key={c._id} value={c._id}>{c.className} {c.level === 'KIDS' ? '(Kids)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="panel card">
            <p style={{ textAlign: 'center', color: '#999' }}>Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="panel card">
            <p className="empty-message">No students found.</p>
          </div>
        ) : students.length > 0 ? (
          <section className="panel card">
            <div className="attendance-header">
              <h3>Score Sheet {isKidsClass && <span className="att-badge badge-warning" style={{marginLeft: '10px'}}>KIDS CLASS (Oral required)</span>}</h3>
              {alreadyEntered && !isEditing && (
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <span className="att-badge badge-present" style={{fontSize: '14px', padding: '6px 16px'}}>
                    <i className="fa-solid fa-lock" style={{marginRight: '6px'}}/> Scores Locked
                  </span>
                  <button type="button" className="btn-sm" style={{background: '#f1f5f9', color: '#334155'}} onClick={() => setIsEditing(true)}>
                    <i className="fa-solid fa-pen-to-square" /> Edit
                  </button>
                </div>
              )}
              {alreadyEntered && isEditing && (
                <span className="att-badge badge-warning" style={{fontSize: '14px', padding: '6px 16px'}}>
                  <i className="fa-solid fa-pen-to-square" style={{marginRight: '6px'}}/> Editing Mode
                </span>
              )}
            </div>

            {!selectedClassId && (
              <div className="alert info" style={{ marginBottom: '20px' }}>
                <i className="fa-solid fa-circle-info" /> <b>Preview Mode:</b> Please select a specific class to enter scores.
              </div>
            )}

            {alreadyEntered && !isEditing && selectedClassId && (
              <div className="alert info" style={{ marginBottom: '20px' }}>
                <i className="fa-solid fa-circle-info" /> Scores have already been entered and saved for this class. Click <b>Edit</b> to make corrections.
              </div>
            )}

            <div className="table-wrap">
              <table className="user-table score-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th style={{ width: '130px' }}>Midterm</th>
                    <th style={{ width: '130px' }}>Final</th>
                    <th style={{ width: '130px' }}>Oral {isKidsClass ? <span style={{color: 'red'}}>*</span> : <span style={{color: '#999', fontWeight: 'normal'}}>(Opt)</span>}</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => {
                    const r = records[s._id] || {}
                    // error highlighting
                    const isErr = (val) => val !== '' && (isNaN(val) || val < 0 || val > 100)
                    
                    return (
                      <tr key={s._id} className={(alreadyEntered && !isEditing) ? 'row-locked' : ''}>
                        <td>{idx + 1}</td>
                        <td><strong>{s.name}</strong></td>
                        <td style={{ color: '#64748b' }}>{s.classId?.className || '—'}</td>
                        <td>
                          <input
                            type="number"
                            min="0" max="100" step="0.1"
                            placeholder="0 - 100"
                            className={`score-input ${isErr(r.midterm) ? 'input-error' : ''}`}
                            value={r.midterm ?? ''}
                            onChange={(e) => handleScoreChange(s._id, 'midterm', e.target.value)}
                            disabled={!selectedClassId || (alreadyEntered && !isEditing)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0" max="100" step="0.1"
                            placeholder="0 - 100"
                            className={`score-input ${isErr(r.final) ? 'input-error' : ''}`}
                            value={r.final ?? ''}
                            onChange={(e) => handleScoreChange(s._id, 'final', e.target.value)}
                            disabled={!selectedClassId || (alreadyEntered && !isEditing)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0" max="100" step="0.1"
                            placeholder={isKidsClass ? '0 - 100 (Req)' : '0 - 100'}
                            className={`score-input ${isErr(r.oral) ? 'input-error' : ''}`}
                            value={r.oral ?? ''}
                            onChange={(e) => handleScoreChange(s._id, 'oral', e.target.value)}
                            disabled={!selectedClassId || (alreadyEntered && !isEditing)}
                          />
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <div className={`score-avg ${r.average ? 'has-value' : ''}`}>
                            {r.average || '—'}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!alreadyEntered && selectedClassId && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ padding: '12px 32px', fontSize: '15px' }}
                >
                  <i className="fa-solid fa-floppy-disk" style={{marginRight: '8px'}} /> Save Scores
                </button>
              </div>
            )}

            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-sm"
                  onClick={handleCancelEditing}
                  disabled={submitting}
                  style={{ padding: '12px 24px', fontSize: '15px', border: '1px solid #cbd5e1', background: 'white', color: '#334155' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleUpdate}
                  disabled={submitting}
                  style={{ padding: '12px 32px', fontSize: '15px', background: '#eab308' }}
                >
                  <i className="fa-solid fa-floppy-disk" style={{marginRight: '8px'}} /> Update Scores
                </button>
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  )
}
