import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Modal from '../../components/Modal'
import axiosClient from '../../api/axiosClient'

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'KIDS', label: 'Kids (Thiếu nhi)' },
]

const emptyForm = { className: '', level: '', schedule: '', capacity: '' }

export default function ClassManagement() {
  const location = useLocation()

  const [classes, setClasses] = useState([])
  const [keyword, setKeyword] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [assignModal, setAssignModal] = useState(false)

  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [assignClassId, setAssignClassId] = useState(null)
  const [assignClassName, setAssignClassName] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [teachers, setTeachers] = useState([])
  const [teacherSearch, setTeacherSearch] = useState('')
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setErrorMessage('')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const showError = (msg) => {
    setErrorMessage(msg)
    setSuccessMessage('')
  }

  const fetchClasses = useCallback(async () => {
    try {
      const params = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      if (selectedLevel) params.level = selectedLevel
      const { data } = await axiosClient.get('/classes', { params })
      setClasses(data)
    } catch {
      showError('Unable to load class list')
    }
  }, [keyword, selectedLevel])

  const fetchTeachers = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/users', { params: { role: 'TEACHER' } })
      setTeachers(data.filter((u) => u.enabled))
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchClasses()
    fetchTeachers()
  }, [])

  const handleFilter = (e) => {
    e.preventDefault()
    fetchClasses()
  }

  const handleClearFilter = () => {
    setKeyword('')
    setSelectedLevel('')
    setTimeout(() => fetchClasses(), 0)
  }

  // ---- VALIDATE ----
  const validate = (data) => {
    if (!data.className.trim() || !data.level || !data.schedule.trim() || data.capacity === '') {
      return 'Please fill in all required fields.'
    }
    const cap = Number(data.capacity)
    if (!Number.isInteger(cap) || cap <= 0) {
      return 'Capacity must be greater than 0.'
    }
    if (data.className.trim().length < 3 || data.className.trim().length > 50) {
      return 'Class name must be between 3 and 50 characters.'
    }
    return null
  }

  // ---- CREATE ----
  const openAdd = () => {
    setForm(emptyForm)
    setErrorMessage('')
    setAddModal(true)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    const err = validate(form)
    if (err) { showError(err); return }
    setSubmitting(true)
    try {
      const res = await axiosClient.post('/classes', {
        className: form.className.trim(),
        level: form.level,
        schedule: form.schedule.trim(),
        capacity: Number(form.capacity),
      })
      setAddModal(false)
      setForm(emptyForm)
      showSuccess(res.data.message || 'Class created successfully.')
      fetchClasses()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create class')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- EDIT ----
  const openEdit = (c) => {
    setEditId(c._id)
    setForm({
      className: c.className,
      level: c.level,
      schedule: c.schedule,
      capacity: c.capacity,
    })
    setErrorMessage('')
    setEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    const err = validate(form)
    if (err) { showError(err); return }
    setSubmitting(true)
    try {
      const res = await axiosClient.put(`/classes/${editId}`, {
        className: form.className.trim(),
        level: form.level,
        schedule: form.schedule.trim(),
        capacity: Number(form.capacity),
      })
      setEditModal(false)
      showSuccess(res.data.message || 'Class updated successfully.')
      fetchClasses()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update class')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- DELETE ----
  const openDelete = (c) => {
    setDeleteTarget(c)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await axiosClient.delete(`/classes/${deleteTarget._id}`)
      setDeleteModal(false)
      setDeleteTarget(null)
      showSuccess('Class deleted successfully.')
      fetchClasses()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete class')
      setDeleteModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- ASSIGN TEACHER ----
  const openAssign = (c) => {
    setAssignClassId(c._id)
    setAssignClassName(c.className)
    setSelectedTeacherId(c.teacher?._id || '')
    setTeacherSearch(c.teacher ? (c.teacher.fullName || c.teacher.username) : '')
    setShowTeacherDropdown(false)
    setErrorMessage('')
    setAssignModal(true)
  }

  const filteredTeachers = teachers.filter((t) => {
    const name = (t.fullName || t.username || '').toLowerCase()
    return name.includes(teacherSearch.toLowerCase())
  })

  const selectTeacher = (t) => {
    setSelectedTeacherId(t._id)
    setTeacherSearch(t.fullName || t.username)
    setShowTeacherDropdown(false)
  }

  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTeacherId) { showError('Please select a Teacher.'); return }
    setSubmitting(true)
    try {
      const res = await axiosClient.put(`/classes/${assignClassId}/assign`, { teacherId: selectedTeacherId })
      setAssignModal(false)
      showSuccess(res.data.message || 'Teacher assigned successfully.')
      fetchClasses()
    } catch (err) {
      showError(err.response?.data?.message || 'Unable to assign Teacher. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getLevelLabel = (val) => {
    const found = LEVELS.find((l) => l.value === val)
    return found ? found.label : val
  }

  const getLevelColor = (val) => {
    if (val === 'BEGINNER') return 'level-beginner'
    if (val === 'INTERMEDIATE') return 'level-intermediate'
    return 'level-advanced'
  }

  // ---- FORM JSX (reused for Add & Edit) ----
  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="modal-form">
      <div className="form-grid">
        <div>
          <label htmlFor="className">Class Name *</label>
          <input
            id="className"
            type="text"
            value={form.className}
            maxLength="50"
            placeholder="e.g. HSK 1 – Beginner"
            onChange={(e) => setForm((p) => ({ ...p, className: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="level">Level *</label>
          <select
            id="level"
            value={form.level}
            onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
          >
            <option value="">Select Level</option>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="schedule">Schedule *</label>
          <input
            id="schedule"
            type="text"
            value={form.schedule}
            maxLength="100"
            placeholder="e.g. Mon, Fri – 18:00~20:00"
            onChange={(e) => setForm((p) => ({ ...p, schedule: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="capacity">Capacity *</label>
          <input
            id="capacity"
            type="number"
            min="1"
            max="100"
            value={form.capacity}
            placeholder="e.g. 30"
            onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
          />
        </div>
      </div>
      <div className="modal-actions">
        <button
          type="button"
          className="btn-outline"
          onClick={() => { setAddModal(false); setEditModal(false) }}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  )

  return (
    <div className="layout">
      <Sidebar role="ADMIN" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>Manage Class</h1>
            <p>Create and manage Chinese courses organized by level and schedule.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="btn-primary" onClick={openAdd}>
              <i className="fa-solid fa-plus" />
              <span>Create Class</span>
            </button>
          </div>
        </header>

        {successMessage && <div className="alert success">{successMessage}</div>}
        {errorMessage && <div className="alert error">{errorMessage}</div>}

        {/* Filter */}
        <section className="panel card">
          <h3>Filter Classes</h3>
          <form onSubmit={handleFilter} className="filter-form">
            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="filterKeyword">Search</label>
                <input
                  id="filterKeyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search by class name..."
                />
              </div>
              <div className="filter-group">
                <label htmlFor="filterLevel">Level</label>
                <select
                  id="filterLevel"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="KIDS">Kids (Thiếu nhi)</option>
                </select>
              </div>
            </div>
            <div className="filter-actions">
              <button className="btn-primary" type="submit">Filter</button>
              <button type="button" className="btn-outline" onClick={handleClearFilter}>Clear</button>
            </div>
          </form>
        </section>

        {/* Table */}
        <section className="panel card">
          <h3>Class List</h3>
          <div className="table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Class Name</th>
                  <th>Level</th>
                  <th>Schedule</th>
                  <th>Capacity</th>
                  <th>Teacher</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">No classes found.</td>
                  </tr>
                ) : (
                  classes.map((c, idx) => (
                    <tr key={c._id}>
                      <td>{idx + 1}</td>
                      <td><strong>{c.className}</strong></td>
                      <td>
                        <span className={`level-chip ${getLevelColor(c.level)}`}>
                          {getLevelLabel(c.level)}
                        </span>
                      </td>
                      <td>{c.schedule}</td>
                      <td>{c.capacity}</td>
                      <td>
                        {c.teacher
                          ? <span className="role-chip">{c.teacher.fullName || c.teacher.username}</span>
                          : <span className="status-chip inactive">Unassigned</span>
                        }
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn-icon btn-assign"
                            title="Assign Teacher"
                            onClick={() => openAssign(c)}
                          >
                            <i className="fa-solid fa-user-check" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-edit"
                            title="Edit"
                            onClick={() => openEdit(c)}
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-delete"
                            title="Delete"
                            onClick={() => openDelete(c)}
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal Create */}
      <Modal id="addClassModal" title="Create New Class" show={addModal} onClose={() => setAddModal(false)}>
        {renderForm(handleAddSubmit, 'Create Class')}
      </Modal>

      {/* Modal Edit */}
      <Modal id="editClassModal" title="Edit Class" show={editModal} onClose={() => setEditModal(false)}>
        {renderForm(handleEditSubmit, 'Save Changes')}
      </Modal>

      {/* Modal Delete */}
      <Modal id="deleteClassModal" title="Delete Class" show={deleteModal} size="sm" onClose={() => setDeleteModal(false)}>
        <p className="modal-message">
          Are you sure you want to delete class &quot;{deleteTarget?.className}&quot;?
        </p>
        <div className="modal-form compact">
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setDeleteModal(false)}>Cancel</button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={submitting}>Delete</button>
          </div>
        </div>
      </Modal>

      {/* Modal Assign Teacher */}
      <Modal id="assignTeacherModal" title={`Assign Teacher – ${assignClassName}`} show={assignModal} size="sm" onClose={() => setAssignModal(false)}>
        <form onSubmit={handleAssignSubmit} className="modal-form">
          <div className="searchable-select-wrapper">
            <label htmlFor="teacherSearch">Select Teacher *</label>
            <div className="searchable-select">
              <input
                id="teacherSearch"
                type="text"
                value={teacherSearch}
                placeholder="Type to search teacher..."
                autoComplete="off"
                onChange={(e) => {
                  setTeacherSearch(e.target.value)
                  setSelectedTeacherId('')
                  setShowTeacherDropdown(true)
                }}
                onFocus={() => setShowTeacherDropdown(true)}
              />
              {showTeacherDropdown && (
                <ul className="searchable-select-list">
                  {filteredTeachers.length === 0 ? (
                    <li className="searchable-select-empty">No teacher found</li>
                  ) : (
                    filteredTeachers.map((t) => (
                      <li
                        key={t._id}
                        className={`searchable-select-item${selectedTeacherId === t._id ? ' selected' : ''}`}
                        onMouseDown={() => selectTeacher(t)}
                      >
                        <strong>{t.fullName || t.username}</strong>
                        {t.fullName && <span className="searchable-select-sub">{t.username}</span>}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setAssignModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>Assign</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
