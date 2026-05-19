import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Modal from '../../components/Modal'
import axiosClient from '../../api/axiosClient'

const emptyForm = { name: '', dob: '', phone: '', classId: '', parentName: '', parentPhone: '' }

export default function StudentManagement() {
  const location = useLocation()

  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [keyword, setKeyword] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // searchable class dropdown
  const [classSearch, setClassSearch] = useState('')
  const [showClassDropdown, setShowClassDropdown] = useState(false)

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setErrorMessage('')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const showError = (msg) => {
    setErrorMessage(msg)
    setSuccessMessage('')
  }

  const fetchStudents = useCallback(async () => {
    try {
      const params = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      if (filterClass) params.classId = filterClass
      const { data } = await axiosClient.get('/students', { params })
      setStudents(data)
    } catch {
      showError('Unable to load student list')
    }
  }, [keyword, filterClass])

  const fetchClasses = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/classes')
      setClasses(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchStudents()
    fetchClasses()
  }, [])

  const handleFilter = (e) => {
    e.preventDefault()
    fetchStudents()
  }

  const handleClearFilter = () => {
    setKeyword('')
    setFilterClass('')
    setTimeout(() => fetchStudents(), 0)
  }

  // ---- VALIDATE ----
  const validate = (data) => {
    if (!data.name || !data.name.trim()) return 'Name is required'
    if (data.name.trim().length > 100) return 'Name must be less than 100 characters'
    if (!data.dob) return 'Invalid date of birth'
    const dobDate = new Date(data.dob)
    if (isNaN(dobDate.getTime()) || dobDate >= new Date()) return 'Invalid date of birth'
    if (!data.phone || !data.phone.trim()) return 'Phone number is required'
    if (!/^\d{10}$/.test(data.phone.trim())) return 'Phone number must be exactly 10 digits'
    if (!data.classId) return 'Class not found'
    return null
  }

  // ---- CREATE ----
  const openAdd = () => {
    setForm(emptyForm)
    setClassSearch('')
    setShowClassDropdown(false)
    setErrorMessage('')
    setAddModal(true)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    const err = validate(form)
    if (err) { showError(err); return }
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        dob: `${form.dob}T12:00:00.000Z`,
        phone: form.phone,
        classId: form.classId,
        parentName: form.parentName,
        parentPhone: form.parentPhone
      }
      const res = await axiosClient.post('/students', payload)
      setAddModal(false)
      setForm(emptyForm)
      showSuccess(res.data.message || 'Student created successfully')
      fetchStudents()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create student')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- EDIT ----
  const openEdit = (s) => {
    setEditId(s._id)
    setForm({
      name: s.name,
      dob: s.dob ? s.dob.split('T')[0] : '',
      phone: s.phone,
      classId: s.classId?._id || '',
      parentName: s.parentName || '',
      parentPhone: s.parentPhone || ''
    })
    setClassSearch(s.classId?.className || '')
    setShowClassDropdown(false)
    setErrorMessage('')
    setEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    const err = validate(form)
    if (err) { showError(err); return }
    setSubmitting(true)
    try {
      const res = await axiosClient.put(`/students/${editId}`, {
        name: form.name.trim(),
        dob: form.dob,
        phone: form.phone.trim(),
        classId: form.classId,
      })
      setEditModal(false)
      showSuccess(res.data.message || 'Student updated successfully')
      fetchStudents()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update student')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- DELETE ----
  const openDelete = (s) => {
    setDeleteTarget(s)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await axiosClient.delete(`/students/${deleteTarget._id}`)
      setDeleteModal(false)
      setDeleteTarget(null)
      showSuccess('Student deleted successfully')
      fetchStudents()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete student')
      setDeleteModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Searchable class dropdown helpers ----
  const filteredClasses = classes.filter((c) => {
    const label = c.className.toLowerCase()
    return label.includes(classSearch.toLowerCase())
  })

  const selectClass = (c) => {
    setForm((p) => ({ ...p, classId: c._id }))
    setClassSearch(c.className)
    setShowClassDropdown(false)
  }

  const formatDate = (d) => {
    if (!d) return ''
    const date = new Date(d)
    return date.toLocaleDateString('en-GB')
  }

  const getClassLabel = (student) => {
    if (!student.classId) return '—'
    return student.classId.className || '—'
  }

  const getLevelColor = (student) => {
    if (!student.classId) return ''
    const lvl = student.classId.level
    if (lvl === 'BEGINNER') return 'level-beginner'
    if (lvl === 'INTERMEDIATE') return 'level-intermediate'
    return 'level-advanced'
  }

  const getLevelLabel = (student) => {
    if (!student.classId) return ''
    const lvl = student.classId.level
    if (lvl === 'BEGINNER') return 'Beginner'
    if (lvl === 'INTERMEDIATE') return 'Intermediate'
    if (lvl === 'ADVANCED') return 'Advanced'
    return lvl
  }

  // ---- FORM JSX (reused for Add & Edit) ----
  const renderForm = (onSubmit, submitLabel, modalVisible) => (
    <form onSubmit={onSubmit} className="modal-form">
      {errorMessage && modalVisible && <div className="alert error" style={{ marginBottom: '12px' }}>{errorMessage}</div>}
      <div className="form-grid">
        <div>
          <label htmlFor="studentName">Student Name *</label>
          <input
            id="studentName"
            type="text"
            value={form.name}
            maxLength="100"
            placeholder="Enter student full name"
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="studentDob">Date of Birth *</label>
          <input
            id="studentDob"
            type="date"
            value={form.dob}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="studentPhone">Phone Number *</label>
          <input
            id="studentPhone"
            type="text"
            value={form.phone}
            maxLength="10"
            placeholder="e.g. 0901234567"
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setForm((p) => ({ ...p, phone: val }))
            }}
          />
        </div>
        <div>
          <label htmlFor="studentClassSearch">Class *</label>
          <div className="searchable-select">
            <input
              id="studentClassSearch"
              type="text"
              value={classSearch}
              placeholder="Type to search class..."
              autoComplete="off"
              onChange={(e) => {
                setClassSearch(e.target.value)
                setForm((p) => ({ ...p, classId: '' }))
                setShowClassDropdown(true)
              }}
              onFocus={() => setShowClassDropdown(true)}
            />
            {showClassDropdown && (
              <ul className="searchable-select-list">
                {filteredClasses.length === 0 ? (
                  <li className="searchable-select-empty">No class found</li>
                ) : (
                  filteredClasses.map((c) => (
                    <li
                      key={c._id}
                      className={`searchable-select-item${form.classId === c._id ? ' selected' : ''}`}
                      onMouseDown={() => selectClass(c)}
                    >
                      <strong>{c.className}</strong>
                      <span className="searchable-select-sub">Cap: {c.capacity}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="studentParentName">Parent Name (Opt)</label>
          <input
            id="studentParentName"
            type="text"
            value={form.parentName || ''}
            maxLength="100"
            placeholder="Enter parent name"
            onChange={(e) => setForm((p) => ({ ...p, parentName: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="studentParentPhone">Parent Phone (Opt)</label>
          <input
            id="studentParentPhone"
            type="text"
            value={form.parentPhone || ''}
            maxLength="10"
            placeholder="e.g. 0901234567"
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setForm((p) => ({ ...p, parentPhone: val }))
            }}
          />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-outline" onClick={() => { setAddModal(false); setEditModal(false) }}>
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
            <h1>Manage Students</h1>
            <p>Add and manage students enrolled in Chinese language classes.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="btn-primary" onClick={openAdd}>
              <i className="fa-solid fa-plus" />
              <span>Add Student</span>
            </button>
          </div>
        </header>

        {successMessage && <div className="alert success">{successMessage}</div>}
        {errorMessage && !addModal && !editModal && <div className="alert error">{errorMessage}</div>}

        {/* Filter */}
        <section className="panel card">
          <h3>Filter Students</h3>
          <form onSubmit={handleFilter} className="filter-form">
            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="filterKeyword">Search</label>
                <input
                  id="filterKeyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search by name or phone..."
                />
              </div>
              <div className="filter-group">
                <label htmlFor="filterStudentClass">Class</label>
                <select
                  id="filterStudentClass"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.className}</option>
                  ))}
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
          <h3>Student List</h3>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">No students found.</td>
                  </tr>
                ) : (
                  students.map((s, idx) => (
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
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn-icon btn-edit"
                            title="Edit"
                            onClick={() => openEdit(s)}
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-delete"
                            title="Delete"
                            onClick={() => openDelete(s)}
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

      {/* Modal Add */}
      <Modal id="addStudentModal" title="Add New Student" show={addModal} onClose={() => setAddModal(false)}>
        {renderForm(handleAddSubmit, 'Add Student', addModal)}
      </Modal>

      {/* Modal Edit */}
      <Modal id="editStudentModal" title="Edit Student" show={editModal} onClose={() => setEditModal(false)}>
        {renderForm(handleEditSubmit, 'Save Changes', editModal)}
      </Modal>

      {/* Modal Delete */}
      <Modal id="deleteStudentModal" title="Delete Student" show={deleteModal} size="sm" onClose={() => setDeleteModal(false)}>
        <p className="modal-message">
          Are you sure you want to delete student &quot;{deleteTarget?.name}&quot;?
        </p>
        <div className="modal-form compact">
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setDeleteModal(false)}>Cancel</button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={submitting}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
