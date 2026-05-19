import { useEffect } from 'react'

export default function Modal({ id, title, show, onClose, size, children }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && show) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [show, onClose])

  useEffect(() => {
    if (show) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => document.body.classList.remove('modal-open')
  }, [show])

  if (!show) return null

  return (
    <div
      id={id}
      className="modal-backdrop show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <section
        className={`modal-card${size === 'sm' ? ' modal-sm' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            &times;
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
