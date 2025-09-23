import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SuperAdminSidebar from './SuperAdminSidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faAnglesLeft, faAnglesRight, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';

const routeTitles: { [key: string]: string } = {
  '/super-admin/dashboard': 'Hospitals Dashboard',
  '/super-admin/subscriptions': 'Subscription Management',
  '/super-admin/transactions': 'All Transactions',
  '/super-admin/settings': 'Business Settings',
};

const getTitleForRoute = (pathname: string): string => {
    if (pathname.match(/^\/super-admin\/hospitals\/.+/)) {
        return 'Hospital Details';
    }
    return routeTitles[pathname] || 'Super Admin';
};

const SuperAdminLayout: React.FC = () => {
    const location = useLocation();
    const title = getTitleForRoute(location.pathname);
    const { user, logout } = useAuth();

    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => localStorage.getItem('superAdminSidebarCollapsed') === 'true'
    );

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(prevState => {
            const newState = !prevState;
            localStorage.setItem('superAdminSidebarCollapsed', String(newState));
            return newState;
        });
    };
    
    const getAvatarProps = () => {
        if (!user) return { type: 'initials' as const, value: '?', color: 'bg-slate-500' };
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        return { type: 'initials' as const, value: initials || 'SA', color: 'bg-blue-600' };
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
            <SuperAdminSidebar 
                isSidebarOpen={isSidebarOpen} 
                setSidebarOpen={setSidebarOpen} 
                isCollapsed={isSidebarCollapsed} 
            />
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
                    <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden mr-2"
                                aria-label="Open sidebar"
                            >
                                <FontAwesomeIcon icon={faBars} className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                            <button
                                onClick={toggleSidebarCollapse}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hidden lg:block mr-2"
                                aria-label="Toggle sidebar"
                            >
                                {isSidebarCollapsed ? (
                                    <FontAwesomeIcon icon={faAnglesRight} className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                ) : (
                                    <FontAwesomeIcon icon={faAnglesLeft} className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                )}
                            </button>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
                        </div>
                        <div className="flex items-center">
                            <Avatar avatar={getAvatarProps()} size="sm" />
                            <div className="hidden sm:block ml-3">
                                <p className="text-sm font-semibold">{user?.name}</p>
                                <p className="text-xs text-slate-500">Super Admin</p>
                            </div>
                             <button onClick={logout} className="ml-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Logout">
                                <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
