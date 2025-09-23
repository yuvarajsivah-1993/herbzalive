import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';

const SuspendedScreen: React.FC = () => {
    const { logout } = useAuth();
    return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-white dark:bg-slate-950 p-8">
            <FontAwesomeIcon icon={faBan} className="text-7xl text-red-500 mb-6" />
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200">Account Suspended</h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-md">
                Your hospital's account has been suspended by the administrator. Please contact support for more information.
            </p>
            <Button variant="primary" onClick={logout} className="mt-8">
                Logout
            </Button>
        </div>
    );
};

export default SuspendedScreen;
