import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AutoLogout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/login') return;
    
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // Thời gian chờ 30 phút theo yêu cầu (30 * 60 * 1000)
      timeoutId = setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        navigate('/login?logout=true');
      }, 30 * 60 * 1000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [navigate, location.pathname]);

  return children;
}
