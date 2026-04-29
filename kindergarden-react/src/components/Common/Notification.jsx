import { useEffect, useState } from 'react';

export const Notification = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getColor = () => {
    switch (type) {
      case 'success': return '#48bb78';
      case 'error': return '#f56565';
      default: return '#4299e1';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        background: getColor(),
        color: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        zIndex: 9999,
        animation: 'slideIn 0.3s ease',
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      {message}
    </div>
  );
};
