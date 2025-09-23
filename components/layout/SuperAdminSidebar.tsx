import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faExchangeAlt, faCog, faBuilding, faShieldHeart } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

const NavItem: React.FC<{ to: string; icon: any; children: React.ReactNode; paths: string[], isCollapsed: boolean }> = ({ to, icon, children, paths, isCollapsed }) => {
    const location = useLocation();
    const isActive = paths.some(path => location.pathname.startsWith(path));

    return (
        <Link to={to} title={isCollapsed ? String(children) : undefined} className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isActive
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''}`}>
            <FontAwesomeIcon icon={icon} className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 flex-1">{children}</span>}
        </Link>
    );
};

interface SuperAdminSidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCollapsed: boolean;
}

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ isSidebarOpen, setSidebarOpen, isCollapsed }) => {
    const { user, logout } = useAuth();

    const getAvatarProps = () => {
        if (!user) return { type: 'initials' as const, value: '?', color: 'bg-slate-500' };
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        return { type: 'initials' as const, value: initials || 'SA', color: 'bg-blue-600' };
    };

    return (
        <>
            {/* Mobile sidebar overlay */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            ></div>

            {/* Sidebar */}
            <div className={`fixed top-0 left-0 h-full bg-slate-900 text-white flex flex-col z-40 transform transition-all duration-300 ease-in-out lg:translate-x-0 
                ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full'} 
                ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
                
                <div className={`flex items-center h-16 px-6 border-b border-slate-800 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
                    <FontAwesomeIcon icon={faShieldHeart} className="h-8 w-auto text-blue-500 flex-shrink-0" />
                    {!isCollapsed && <span className="ml-3 text-xl font-bold">Zendenta</span>}
                </div>
                
                <div className={`px-4 py-4 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 h-0 invisible' : 'opacity-100'}`}>
                    <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">Super Admin</div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavItem to="/super-admin/dashboard" icon={faBuilding} paths={['/super-admin/dashboard', '/super-admin/hospitals']} isCollapsed={isCollapsed}>Hospitals</NavItem>
                    <NavItem to="/super-admin/subscriptions" icon={faCreditCard} paths={['/super-admin/subscriptions']} isCollapsed={isCollapsed}>Subscriptions</NavItem>
                    <NavItem to="/super-admin/transactions" icon={faExchangeAlt} paths={['/super-admin/transactions']} isCollapsed={isCollapsed}>Transactions</NavItem>
                    <NavItem to="/super-admin/settings" icon={faCog} paths={['/super-admin/settings']} isCollapsed={isCollapsed}>Business Settings</NavItem>
                </nav>
                
                <div className="p-4 border-t border-slate-800 mt-auto">
                    <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
                        <Avatar avatar={getAvatarProps()} size="md" />
                        {!isCollapsed && (
                            <div className="ml-3 overflow-hidden">
                                <p className="text-sm font-semibold truncate">{user?.name}</p>
                                <p className="text-xs text-slate-400">Super Administrator</p>
                            </div>
                        )}
                    </div>
                     <Button variant="light" onClick={logout} className={`w-full mt-4 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 invisible' : 'opacity-100'}`}>Logout</Button>
                </div>
            </div>
        </>
    );
};

export default SuperAdminSidebar;
