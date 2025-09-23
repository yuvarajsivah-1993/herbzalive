import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { useAuth } from '../../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket } from '@fortawesome/free-solid-svg-icons';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, message }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const handleUpgrade = () => {
    onClose();
    navigate(`/hospitals/${user?.hospitalSlug}/hospital-settings`, { state: { openSubscriptionTab: true } });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4 p-6 text-center">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
            <FontAwesomeIcon icon={faRocket} className="h-6 w-6 text-blue-600" aria-hidden="true" />
        </div>
        <h3 className="text-lg leading-6 font-bold text-slate-900 dark:text-slate-100 mt-4" id="modal-title">
          Upgrade Required
        </h3>
        <div className="mt-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {message}
          </p>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleUpgrade}
          >
            Upgrade Plan
          </Button>
           <Button
            type="button"
            variant="light"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;