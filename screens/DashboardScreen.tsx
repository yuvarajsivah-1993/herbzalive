import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import DoctorDashboard from './DoctorDashboard';
import StaffDashboard from './StaffDashboard';

const DashboardScreen: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading dashboard...</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-red-500">Could not load user data.</div>;
    }

    switch (user.roleName) {
        case 'owner':
        case 'admin':
            return <AdminDashboard />;
        case 'doctor':
            return <DoctorDashboard />;
        case 'staff':
            return <StaffDashboard />;
        default:
            return <div className="p-8">No dashboard available for this user role.</div>;
    }
};

export default DashboardScreen;