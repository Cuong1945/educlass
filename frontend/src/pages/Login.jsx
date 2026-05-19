import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import Modal from '../components/Modal'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [toastError, setToastError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotStatus, setForgotStatus] = useState({ type: '', msg: '' })

  const loggedOut = location.pathname === '/login' && location.search.includes('logout=true')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (token && role) {
      navigate(role === 'ADMIN' ? '/admin/dashboard' : '/teacher/dashboard', { replace: true })
    }
  }, [navigate])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await axiosClient.post('/auth/login', {
        username: form.username,
        password: form.password,
        rememberMe: rememberMe
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.user.role)
      localStorage.setItem('username', data.user.username)
      navigate(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/teacher/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng.';
      setError(msg)
      setToastError(msg)
      setTimeout(() => setToastError(''), 3500)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotStatus({ type: '', msg: '' })
    try {
      const { data } = await axiosClient.post('/auth/forgot-password', { email: forgotEmail })
      setForgotStatus({ type: 'success', msg: data.message })
    } catch (err) {
      setForgotStatus({ type: 'error', msg: err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.' })
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="modern-login-page">
      <div className="modern-login-container">
        {/* Cột trái (Banner) */}
        <div className="modern-login-banner">
          {/* Lớp phủ mờ */}
          <div className="modern-login-banner-overlay"></div>
          <div className="modern-login-banner-text">
            Hệ thống quản lý lớp học<br />
            <strong>Educlass</strong>
          </div>
        </div>

        {/* Cột phải (Form) */}
        <div className="modern-login-form-wrapper">
          <div className="modern-login-content">
            <div className="modern-login-header">
              <div className="modern-login-logo">
                {/* Bạn sẽ thay src ảnh logo vào đây */}
                <img src="/logo.png" alt="" style={{ backgroundColor: '#fff', border: '1px solid #eee' }} />
              </div>
              <h1 className="modern-login-title">Đăng Nhập</h1>
              <p className="modern-login-subtitle">Hệ thống quản lý lớp học Educlass</p>
            </div>

            {loggedOut && (
              <div className="alert success" style={{ marginBottom: '16px' }}>
                Bạn đã đăng xuất thành công.
              </div>
            )}

            <form onSubmit={handleSubmit} className="modern-login-form">
              <div className="form-group">
                <label htmlFor="username">Tài khoản</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="admin"
                  minLength={3}
                  maxLength={30}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mật khẩu"
                    minLength={6}
                    maxLength={10}
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    <i className={showPassword ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash'}></i>
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ</span>
                </label>
                <button type="button" onClick={() => setShowForgotModal(true)} className="forgot-password-btn">
                  Quên mật khẩu?
                </button>
              </div>

              {error && (
                <div className="alert-box error-box">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn-modern-login" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {toastError && (
        <div className="toast-container">
          <div className="toast error">
            <i className="fa-solid fa-circle-exclamation toast-icon"></i>
            <span>{toastError}</span>
          </div>
        </div>
      )}

      <Modal
        title="Quên mật khẩu?"
        show={showForgotModal}
        onClose={() => {
          setShowForgotModal(false)
          setForgotStatus({ type: '', msg: '' })
          setForgotEmail('')
        }}
        size="sm"
      >
        <div className="modal-body" style={{ padding: '20px' }}>
          {forgotStatus.msg ? (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '40px', color: forgotStatus.type === 'success' ? '#1f8f49' : '#cf2f2f', marginBottom: '15px' }}>
                <i className={forgotStatus.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'}></i>
              </div>
              <p style={{ lineHeight: '1.6', color: '#444', marginBottom: '20px' }}>
                {forgotStatus.msg}
              </p>
              <button 
                className="btn-modern-login" 
                style={{ width: 'auto', padding: '8px 25px' }} 
                onClick={() => {
                  if (forgotStatus.type === 'success') setShowForgotModal(false)
                  setForgotStatus({ type: '', msg: '' })
                }}
              >
                {forgotStatus.type === 'success' ? 'Đóng' : 'Thử lại'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                Nhập email của bạn để nhận hướng dẫn khôi phục mật khẩu.
              </p>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Email khôi phục</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{ marginTop: '5px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn-outline" 
                  style={{ flex: 1, height: '44px' }}
                  onClick={() => setShowForgotModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn-modern-login" 
                  style={{ flex: 2, height: '44px', marginTop: 0 }}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
              <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
                <strong>Lưu ý:</strong> Nếu không nhận được email, vui lòng liên hệ Ban quản trị: 0123.456.789
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  )
}
