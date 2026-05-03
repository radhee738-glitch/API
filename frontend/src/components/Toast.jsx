import { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  let bgClass = 'bg-blue-100 text-blue-800 border-blue-200';
  if (type === 'success') bgClass = 'alert-success';
  if (type === 'error') bgClass = 'alert';

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all transform fade-in ${bgClass}`} style={{ zIndex: 9999, minWidth: '250px' }}>
      <div className="font-medium flex-1">{message}</div>
      <button onClick={onClose} className="text-current opacity-70 hover:opacity-100 p-1">
        ✕
      </button>
    </div>
  );
};

export default Toast;
