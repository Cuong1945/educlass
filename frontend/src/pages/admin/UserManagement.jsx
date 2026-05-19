import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Modal from '../../components/Modal'
import axiosClient from '../../api/axiosClient'

const ROLES = ['ADMIN', 'TEACHER']

const emptyAdd = { username: '', email: '', password: '', role: '', idCard: '', fullName: '', phone: '', dob: '', gender: '' }
const emptyEdit = { username: '', email: '', role: '', enabled: true, newPassword: '' }

export default function UserManagement() {
  const location = useLocation()

  const [users, setUsers] = useState([])
  const [keyword, setKeyword] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  const [addForm, setAddForm] = useState(emptyAdd)
  const [addErrors, setAddErrors] = useState({})

  const [editForm, setEditForm] = useState(emptyEdit)
  const [editId, setEditId] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)

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

  const fetchUsers = useCallback(async () => {
    try {
      const params = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      if (selectedRole) params.role = selectedRole
      const { data } = await axiosClient.get('/users', { params })
      setUsers(data)
    } catch {
      showError('Unable to load user list')
    }
  }, [keyword, selectedRole])

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleFilter = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleClearFilter = () => {
    setKeyword('')
    setSelectedRole('')
    setTimeout(() => fetchUsers(), 0)
  }

  // ---- ADD ----
  const validateAdd = () => {
    const errs = {}
    if (!addForm.username.trim() || !addForm.email.trim() || !addForm.password.trim() || !addForm.role || !addForm.idCard.trim() || !addForm.fullName.trim() || !addForm.phone.trim() || !addForm.dob || !addForm.gender) {
        errs.global = 'Please fill in all required fields.';
    }
    if (addForm.password.trim() && addForm.password.trim().length < 6) {
        errs.password = 'Password must be at least 6 characters.';
    }
    return errs
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    const errs = validateAdd()
    if (Object.keys(errs).length) { 
        if (errs.global) showError(errs.global);
        else if (errs.password) showError(errs.password);
        setAddErrors(errs); 
        return;
    }
    setSubmitting(true)
    try {
      const res = await axiosClient.post('/users', {
        username: addForm.username.trim(),
        email: addForm.email.trim(),
        password: addForm.password.trim(),
        role: addForm.role,
        idCard: addForm.idCard.trim(),
        fullName: addForm.fullName.trim(),
        phone: addForm.phone.trim(),
        dob: addForm.dob,
        gender: addForm.gender
      })
      setAddModal(false)
      setAddForm(emptyAdd)
      setAddErrors({})
      showSuccess(res.data.message || 'Account created successfully.')
      fetchUsers()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- EDIT ----
  const openEdit = (u) => {
    setEditId(u._id)
    setEditForm({
      username: u.username,
      email: u.email,
      role: u.role,
      enabled: u.enabled,
      newPassword: '',
    })
    setEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await axiosClient.put(`/users/${editId}`, {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        enabled: editForm.enabled,
        newPassword: editForm.newPassword,
      })
      setEditModal(false)
      showSuccess('User updated successfully')
      fetchUsers()
    } catch (err) {
      showError(err.response?.data?.message || 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- DELETE ----
  const openDelete = (u) => {
    setDeleteTarget(u)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await axiosClient.delete(`/users/${deleteTarget._id}`)
      setDeleteModal(false)
      setDeleteTarget(null)
      showSuccess('User deleted successfully')
      fetchUsers()
    } catch (err) {
      showError(err.response?.data?.message || 'Delete failed')
      setDeleteModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="layout">
      <Sidebar role="ADMIN" activePath={location.pathname} />

      <main className="content">
        <header className="content-header">
          <div className="header-titles">
            <h1>User Management</h1>
            <p>Manage accounts by User model, with role filtering and username/email search.</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => { setAddForm(emptyAdd); setAddErrors({}); setAddModal(true) }}
            >
              <i className="fa-solid fa-user-plus" />
              <span>Add User</span>
            </button>
          </div>
        </header>

        {successMessage && <div className="alert success">{successMessage}</div>}
        {errorMessage && <div className="alert error">{errorMessage}</div>}

        {/* Filter */}
        <section className="panel card">
          <h3>User Filter</h3>
          <form onSubmit={handleFilter} className="filter-form">
            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="keyword">Keyword</label>
                <input
                  id="keyword"
                  name="keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search by username or email"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="role">Role</label>
                <select id="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  <option value="">All Roles</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="filter-actions">
              <button className="btn-primary" type="submit">Filter</button>
              <button type="button" className="btn-outline" onClick={handleClearFilter}>Clear Filter</button>
            </div>
          </form>
        </section>

        {/* Table */}
        <section className="panel card">
          <h3>User List</h3>
          <div className="table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-row">No user data available.</td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={u._id}>
                      <td>{idx + 1}</td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td><span className="role-chip">{u.role}</span></td>
                      <td>
                        <span className={`status-chip${u.enabled ? ' active' : ' inactive'}`}>
                          {u.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn-icon btn-edit"
                            title="Edit"
                            onClick={() => openEdit(u)}
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-delete"
                            title="Delete"
                            onClick={() => openDelete(u)}
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

      {/* Modal Thêm */}
      <Modal id="addUserModal" title="Add User" show={addModal} onClose={() => setAddModal(false)}>
        <form onSubmit={handleAddSubmit} className="modal-form">
          <div className="form-grid">
            <div>
              <label htmlFor="addUsername">Username *</label>
              <input
                id="addUsername"
                type="text"
                value={addForm.username}
                maxLength="30"
                onChange={(e) => setAddForm((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="addPassword">Password *</label>
              <input
                id="addPassword"
                type="password"
                value={addForm.password}
                maxLength="10"
                onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="addGender">Gender *</label>
              <select
                id="addGender"
                value={addForm.gender}
                onChange={(e) => setAddForm((p) => ({ ...p, gender: e.target.value }))}
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="addFullName">Full Name *</label>
              <input
                id="addFullName"
                type="text"
                value={addForm.fullName}
                maxLength="50"
                onChange={(e) => setAddForm((p) => ({ ...p, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="addIdCard">ID Card / ID *</label>
              <input
                id="addIdCard"
                type="text"
                value={addForm.idCard}
                maxLength="50"
                onChange={(e) => setAddForm((p) => ({ ...p, idCard: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="addEmail">Email *</label>
              <input
                id="addEmail"
                type="email"
                value={addForm.email}
                maxLength="50"
                onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="addPhone">Phone Number *</label>
              <input
                id="addPhone"
                type="text"
                value={addForm.phone}
                maxLength="50"
                onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="addDob">Date of Birth *</label>
              <input
                id="addDob"
                type="date"
                value={addForm.dob}
                onChange={(e) => setAddForm((p) => ({ ...p, dob: e.target.value }))}
              />
            </div>
            <div className="full-width">
              <label htmlFor="addRoleName">Role *</label>
              <select
                id="addRoleName"
                value={addForm.role}
                onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="">Select Role</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setAddModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>Create Account</button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit */}
      <Modal id="editUserModal" title="Edit User" show={editModal} onClose={() => setEditModal(false)}>
        <form onSubmit={handleEditSubmit} className="modal-form">
          <div className="form-grid">
            <div>
              <label htmlFor="editUsername">Username</label>
              <input
                id="editUsername"
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="editEmail">Email</label>
              <input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="editRoleName">Role</label>
              <select
                id="editRoleName"
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="editEnabled">Status</label>
              <select
                id="editEnabled"
                value={editForm.enabled ? 'true' : 'false'}
                onChange={(e) => setEditForm((p) => ({ ...p, enabled: e.target.value === 'true' }))}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="full-width">
              <label htmlFor="editNewPassword">New password (leave blank if no change)</label>
              <input
                id="editNewPassword"
                type="password"
                value={editForm.newPassword}
                onChange={(e) => setEditForm((p) => ({ ...p, newPassword: e.target.value }))}
                minLength={6}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={() => setEditModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Modal Delete */}
      <Modal id="deleteUserModal" title="Delete User" show={deleteModal} size="sm" onClose={() => setDeleteModal(false)}>
        <p className="modal-message">
          Are you sure you want to delete user &quot;{deleteTarget?.username}&quot;?
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
