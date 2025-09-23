import React, { useRef, useEffect } from 'react';
import Button from './Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
// FIX: Made message optional and added children to support custom content.
  message?: string;
  children?: React.ReactNode;
  confirmButtonText?: string;
  confirmButtonVariant?: 'primary' | 'danger';
  loading?: boolean;
  zIndex?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmButtonText = 'Confirm',
  confirmButtonVariant = 'primary',
  loading = false,
  zIndex = 'z-50',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-60 ${zIndex} flex justify-center items-center`}>
      <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4 p-6">
        <div className="flex items-start">
          <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmButtonVariant === 'danger' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50'} sm:mx-0 sm:h-10 sm:w-10`}>
             <FontAwesomeIcon icon={faExclamationTriangle} className={`h-6 w-6 ${confirmButtonVariant === 'danger' ? 'text-red-600' : 'text-blue-600'}`} aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-bold text-slate-900 dark:text-slate-100" id="modal-title">
              {title}
            </h3>
            <div className="mt-2">
              {children ? children : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
          <Button
            type="button"
            variant={confirmButtonVariant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmButtonText}
          </Button>
          <Button
            type="button"
            variant="light"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;