import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PatientSidebar from './PatientSidebar';
import PatientHeader from './PatientHeader';
import PatientDashboard from '../../screens/patient/PatientDashboard';
import PatientConsultationsScreen from '../../screens/patient/PatientConsultationsScreen';
import PatientHealthRecordsScreen from '../../screens/patient/PatientHealthRecordsScreen';
import PatientTreatmentJourneyScreen from '../../screens/patient/PatientTreatmentJourneyScreen';
import PatientNewAppointmentScreen from '../../screens/patient/PatientNewAppointmentScreen';
import PatientProfileScreen from '../../screens/patient/PatientProfileScreen';
import SupportScreen from '../../screens/SupportScreen'; // Assuming a generic support screen
import NotFoundScreen from '../../screens/NotFoundScreen';
import PatientTransactionsScreen from '../../screens/patient/PatientTransactionsScreen';
import PatientNotesScreen from '../../screens/patient/PatientNotesScreen';
import PatientConsultationDetailScreen from '../../screens/patient/PatientConsultationDetailScreen';

const PatientLayout: React.FC = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
            <PatientSidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col min-w-0 md:ml-72">
                <PatientHeader setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 overflow-y-auto">
                    <Routes>
                        <Route path="dashboard" element={<PatientDashboard />} />
                        <Route path="consultations/:consultationId" element={<PatientConsultationDetailScreen />} />
                        <Route path="consultations" element={<PatientConsultationsScreen />} />
                        <Route path="health-records" element={<PatientHealthRecordsScreen />} />
                        <Route path="treatment-journey" element={<PatientTreatmentJourneyScreen />} />
                        <Route path="new-appointment" element={<PatientNewAppointmentScreen />} />
                        <Route path="transactions" element={<PatientTransactionsScreen />} />
                        <Route path="notes" element={<PatientNotesScreen />} />
                        <Route path="profile" element={<PatientProfileScreen />} />
                        <Route path="support" element={<SupportScreen />} />
                        <Route path="/" element={<Navigate to="dashboard" replace />} />
                        <Route path="*" element={<NotFoundScreen />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default PatientLayout;
