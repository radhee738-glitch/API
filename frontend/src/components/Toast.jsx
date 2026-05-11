import { useEffect } from 'react';

const toastStyles = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  minWidth: '280px',
  maxWidth: '420px',
  padding: '16px 20px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  zIndex: 9999,
  animation: 'fadeIn 0.3s ease-out',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
};

const typeStyles = {
  success: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#6ee7b7',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  info: {
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
};

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = { ...toastStyles, ...(typeStyles[type] || typeStyles.info) };

  return (
    <div style={styles}>
      <div style={{ flex: 1, fontWeight: 500 }}>{message}</div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          opacity: 0.7,
          cursor: 'pointer',
          padding: '4px',
          fontSize: '1rem',
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
