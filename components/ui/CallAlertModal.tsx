import React, { useState, useEffect } from 'react';
import Button from './Button';
import { Appointment } from '../../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faClock, faUserCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useFormatting } from '@/utils/formatting';

interface CallAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinCall: (appointment: Appointment) => void;
  appointment: Appointment;
}

const CallAlertModal: React.FC<CallAlertModalProps> = ({ isOpen, onClose, onJoinCall, appointment }) => {
  const [callDuration, setCallDuration] = useState(0);
  const { formatDuration, formatDateTime } = useFormatting();

  useEffect(() => {
    if (isOpen && appointment.callStartTime) {
      const startTime = appointment.callStartTime.toDate().getTime();
      const interval = setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(duration);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCallDuration(0);
    }
  }, [isOpen, appointment.callStartTime]);

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>
        <div className="text-center p-6">
          <div className="mb-4">
            {appointment.doctorPhotoUrl ? (
              <img src={appointment.doctorPhotoUrl} alt="Doctor" className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-blue-500" />
            ) : (
              <FontAwesomeIcon icon={faUserCircle} className="text-blue-500 text-6xl mx-auto" />
            )}
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Incoming Video Call</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-1">From: <span className="font-medium">Dr. {appointment.doctorName}</span></p>
          <p className="text-slate-600 dark:text-slate-300 mb-4">For: <span className="font-medium">{appointment.treatmentName}</span> at {formatDateTime(appointment.start.toDate())}</p>
          
          {appointment.callStartTime && (
            <div className="flex items-center justify-center text-slate-700 dark:text-slate-200 mb-4 p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
              <FontAwesomeIcon icon={faClock} className="mr-2 text-lg" />
              <span className="font-medium text-lg">Call Duration: {formatDuration(callDuration)}</span>
            </div>
          )}

          <div className="flex justify-center space-x-4 mt-6">
            <Button variant="secondary" onClick={onClose}>Dismiss</Button>
            <Button variant="primary" onClick={() => onJoinCall(appointment)} icon={<FontAwesomeIcon icon={faVideo} className="mr-2" />}>Join Call</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallAlertModal;