import { useState, useRef, useEffect, useCallback } from 'react'
import axiosClient from '../api/axiosClient'

// Các câu hỏi gợi ý nhanh
const QUICK_REPLIES = [
  { label: '📊 Thống kê tổng quan', text: 'Cho tôi xem thống kê tổng quan hệ thống' },
  { label: '🏫 Danh sách lớp học', text: 'Liệt kê tất cả các lớp học' },
  { label: '🏆 Top học sinh điểm cao', text: 'Học sinh nào có điểm trung bình cao nhất?' },
  { label: '📅 Tỉ lệ điểm danh', text: 'Tỉ lệ điểm danh tổng thể là bao nhiêu?' },
  { label: '⚠️ Học sinh vắng nhiều', text: 'Học sinh nào vắng nhiều nhất?' },
  { label: '👩‍🏫 Danh sách giáo viên', text: 'Có bao nhiêu giáo viên trong hệ thống?' },
]

const GREETING = 'Xin chào, tôi là trợ lý AI của hệ thống EduClass. Tôi có thể hỗ trợ bạn giải đáp các thông tin về khóa học, lịch trình hoặc tra cứu dữ liệu đào tạo.\n\nBạn cần tôi hỗ trợ thông tin gì?'

function formatTime(date) {
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: GREETING, time: new Date() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [showQuickReplies, setShowQuickReplies] = useState(true)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // Auto-scroll khi có tin mới
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Focus input khi mở
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setUnread(0)
    }
  }, [open])

  // Theo dõi vị trí scroll để hiển thị nút scroll-to-bottom
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distFromBottom > 120)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (textOverride) => {
    const text = (textOverride || input).trim()
    if (!text || loading) return

    setShowQuickReplies(false)
    const userMsg = { role: 'user', text, time: new Date() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const history = updatedMessages.slice(1).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
      }))

      const res = await axiosClient.post('/chatbot', {
        message: text,
        history: history.slice(0, -1),
      })

      const botMsg = { role: 'bot', text: res.data.reply, time: new Date() }
      setMessages((prev) => [...prev, botMsg])

      // Tăng badge nếu cửa sổ đang đóng
      if (!open) setUnread((n) => n + 1)
    } catch (err) {
      const errMsg =
        err.response?.data?.message || 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.'
      setMessages((prev) => [...prev, { role: 'bot', text: errMsg, time: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{ role: 'bot', text: GREETING, time: new Date() }])
    setShowQuickReplies(true)
    setUnread(0)
  }

  const copyMessage = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1800)
    } catch {
      // clipboard not available
    }
  }

  // Render markdown-like text
  const renderText = (text) => {
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    if (html.includes('<li>')) {
      html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    }
    html = html.replace(/\n/g, '<br/>')
    return html
  }

  const charCount = input.length
  const charLimit = 500

  return (
    <>
      {/* Floating button */}
      <button
        id="chatbot-toggle"
        className="chatbot-fab"
        onClick={() => { setOpen(!open); setUnread(0) }}
        title="AI Assistant"
      >
        {open ? (
          <i className="fa-solid fa-xmark" />
        ) : (
          <i className="fa-solid fa-robot" />
        )}
        {!open && unread > 0 && (
          <span className="chatbot-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="chatbot-window" id="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-header-avatar">
                <i className="fa-solid fa-robot" />
              </div>
              <div className="chatbot-header-info">
                <span className="chatbot-header-name">EduClass AI</span>
                <span className="chatbot-header-status">Trực tuyến</span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button onClick={clearChat} title="Bắt đầu cuộc trò chuyện mới">
                <i className="fa-solid fa-rotate-left" />
              </button>
              <button onClick={() => setOpen(false)} title="Đóng">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="chatbot-messages"
            id="chatbot-messages"
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chatbot-msg ${msg.role === 'user' ? 'chatbot-msg-user' : 'chatbot-msg-bot'}`}
              >
                {msg.role === 'bot' && (
                  <div className="chatbot-avatar">
                    <i className="fa-solid fa-robot" />
                  </div>
                )}
                <div className="chatbot-msg-content">
                  <div
                    className="chatbot-bubble"
                    dangerouslySetInnerHTML={{ __html: renderText(msg.text) }}
                    onClick={() => copyMessage(msg.text, i)}
                    title="Click để sao chép"
                  />
                  <div className={`chatbot-meta ${msg.role === 'user' ? 'chatbot-meta-user' : ''}`}>
                    {copiedIdx === i ? (
                      <span className="chatbot-copied"><i className="fa-solid fa-check" /> Đã sao chép</span>
                    ) : (
                      <span className="chatbot-time">{msg.time ? formatTime(msg.time) : ''}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-msg chatbot-msg-bot">
                <div className="chatbot-avatar">
                  <i className="fa-solid fa-robot" />
                </div>
                <div className="chatbot-bubble chatbot-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {showQuickReplies && !loading && (
            <div className="chatbot-quick-replies">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr.text}
                  className="chatbot-quick-btn"
                  onClick={() => sendMessage(qr.text)}
                >
                  {qr.label}
                </button>
              ))}
            </div>
          )}

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button className="chatbot-scroll-btn" onClick={scrollToBottom} title="Xuống cuối">
              <i className="fa-solid fa-chevron-down" />
            </button>
          )}

          {/* Input */}
          <div className="chatbot-input-area">
            <div className="chatbot-input-wrapper">
              <input
                id="chatbot-input"
                ref={inputRef}
                type="text"
                placeholder="Nhập tin nhắn..."
                value={input}
                onChange={(e) => e.target.value.length <= charLimit && setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                maxLength={charLimit}
              />
              {charCount > 0 && (
                <span className={`chatbot-char-count ${charCount > charLimit * 0.85 ? 'chatbot-char-warn' : ''}`}>
                  {charCount}/{charLimit}
                </span>
              )}
            </div>
            <button
              id="chatbot-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
