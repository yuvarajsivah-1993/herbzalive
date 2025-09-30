import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Appointment } from '../../types';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const PatientDashboard: React.FC = () => {
  const { user, myAppointments } = useAuth();
  const navigate = useNavigate();

  const upcomingAppointments = myAppointments
    .filter(app => app.status === 'Registered' && app.start.toDate() > new Date())
    .sort((a, b) => a.start.seconds - b.start.seconds);


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Patient Dashboard</h1>
      <p>Welcome to your dashboard.</p>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Upcoming Appointments</h2>
        {upcomingAppointments.length > 0 ? (
          <div className="mt-4 space-y-4">
            {upcomingAppointments.map(app => (
              <div key={app.id} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold">{app.treatmentName}</p>
                  <p>with {app.doctorName}</p>
                  <p>{app.start.toDate().toLocaleString()}</p>
                </div>
                
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-500">You have no upcoming appointments.</p>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;