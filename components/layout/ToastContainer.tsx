import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faInfoCircle, faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Toast, ToastType } from '../../context/ToastContext';

const icons: Record<ToastType, any> = {
  success: faCheckCircle,
  error: faTimesCircle,
  info: faInfoCircle,
  warning: faExclamationTriangle,
};

const colors: Record<ToastType, string> = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600',
    warning: 'bg-yellow-500 border-yellow-600',
};


const ToastMessage: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 4700); // Start exit animation before removal

        const removeTimer = setTimeout(() => {
            onRemove(toast.id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(removeTimer);
        };
    }, [toast.id, onRemove]);


    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300); // Wait for animation
    };

    return (
        <div
            className={`flex items-center text-white p-4 rounded-lg shadow-lg my-2 transition-all duration-300 ease-in-out transform ${colors[toast.type]} ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
            role="alert"
        >
            <FontAwesomeIcon icon={icons[toast.type]} className="w-6 h-6 mr-3" />
            <div className="flex-1 font-medium">{toast.message}</div>
            <button onClick={handleRemove} className="ml-4 p-1 rounded-full hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white">
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
            </button>
        </div>
    );
};


const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] w-full max-w-xs">
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
