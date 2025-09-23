import React, { useMemo } from 'react';
import { Appointment, AppointmentStatus } from '../types';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { Timestamp } from 'firebase/firestore';


const AppointmentsScreen: React.FC = () => {
  // FIX: Added 'locationId' to mock data to satisfy the Appointment type.
  const appointments: Appointment[] = useMemo(() => [
    { 
      id: 'a001', 
      patientId: 'p001',
      patientName: 'John Doe', 
      doctorId: 'd001',
      doctorName: 'Dr. Alice Williams', 
      start: Timestamp.fromDate(new Date('2023-12-01T10:00:00')), 
      end: Timestamp.fromDate(new Date('2023-12-01T10:30:00')),
      treatmentName: 'Routine Checkup', 
      status: 'Registered',
      hospitalId: 'h001',
      locationId: 'l001'
    },
    { 
      id: 'a002', 
      patientId: 'p002',
      patientName: 'Jane Smith', 
      doctorId: 'd002',
      doctorName: 'Dr. Bob Brown', 
      start: Timestamp.fromDate(new Date('2023-12-01T11:30:00')), 
      end: Timestamp.fromDate(new Date('2023-12-01T12:00:00')),
      treatmentName: 'Follow-up', 
      status: 'Encounter',
      hospitalId: 'h001',
      locationId: 'l001'
    },
    { 
      id: 'a003', 
      patientId: 'p003',
      patientName: 'Michael Johnson', 
      doctorId: 'd003',
      doctorName: 'Dr. Carol White', 
      start: Timestamp.fromDate(new Date('2023-11-28T14:00:00')), 
      end: Timestamp.fromDate(new Date('2023-11-28T14:45:00')),
      treatmentName: 'Consultation', 
      status: 'Finished',
      hospitalId: 'h001',
      locationId: 'l001'
    },
    { 
      id: 'a004', 
      patientId: 'p004',
      patientName: 'Emily Davis', 
      doctorId: 'd001',
      doctorName: 'Dr. Alice Williams', 
      start: Timestamp.fromDate(new Date('2023-11-25T09:00:00')), 
      end: Timestamp.fromDate(new Date('2023-11-25T09:15:00')),
      treatmentName: 'Flu Shot', 
      status: 'Cancelled',
      hospitalId: 'h001',
      locationId: 'l001'
    },
    { 
      id: 'a005', 
      patientId: 'p005',
      patientName: 'Robert Brown', 
      doctorId: 'd004',
      doctorName: 'Dr. David Green', 
      start: Timestamp.fromDate(new Date('2023-12-02T15:30:00')), 
      end: Timestamp.fromDate(new Date('2023-12-02T16:00:00')),
      treatmentName: 'Physical Exam', 
      status: 'Waiting Payment',
      hospitalId: 'h001',
      locationId: 'l001'
    },
  ], []);

  const getStatusBadge = (status: AppointmentStatus) => {
    const baseClasses = "px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status) {
      case 'Registered': return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300`;
      case 'Finished': return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
      case 'Cancelled': return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
      case 'Encounter': return `${baseClasses} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300`;
      case 'Waiting Payment': return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
      default: return baseClasses;
    }
  };

  const formatAppointmentTime = (start: Timestamp) => {
    if (!start) return 'N/A';
    return start.toDate().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 flex justify-end items-center border-b border-slate-200 dark:border-slate-800">
            <Button variant="primary">
              <FontAwesomeIcon icon={faPlus} className="w-5 h-5 mr-2" />
              Schedule Appointment
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Patient</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Doctor</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{appt.patientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{appt.doctorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatAppointmentTime(appt.start)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{appt.treatmentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={getStatusBadge(appt.status)}>{appt.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Details</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
};

export default AppointmentsScreen;