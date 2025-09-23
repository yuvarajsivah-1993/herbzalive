import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faUserCircle, faChevronDown, faMoon, faSignOutAlt, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../ui/Avatar';
import { Link } from 'react-router-dom';

interface PatientHeaderProps {
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PatientHeader: React.FC<PatientHeaderProps> = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getAvatarProps = () => {
    if (!user) return { type: 'initials' as const, value: '?', color: 'bg-slate-500' };
    if (user.profilePhotoUrl) {
        return { type: 'image' as const, value: user.profilePhotoUrl };
    }
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    return { type: 'initials' as const, value: initials || '?', color: 'bg-blue-600' };
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Open sidebar"
        >
            <FontAwesomeIcon icon={faBars} className="w-6 h-6 text-slate-500 dark:text-slate-400" />
        </button>
        <div className="flex-1"></div>
        <div ref={dropdownRef} className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-3 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <Avatar avatar={getAvatarProps()} size="sm" />
                <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'Patient'}</p>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
                 <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-30">
                    <div className="py-1">
                        <Link to="/patient/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5 mr-3" /> My Profile
                        </Link>
                        <Link to="/patient/support" onClick={() => setIsDropdownOpen(false)} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                           <FontAwesomeIcon icon={faQuestionCircle} className="w-5 h-5 mr-3" /> Help & Support
                        </Link>
                         <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                            <div className="flex items-center"><FontAwesomeIcon icon={faMoon} className="w-5 h-5 mr-3" /> Dark Theme</div>
                            <button onClick={toggleTheme} className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-blue-500 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <span className={`inline-block w-5 h-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                        <button onClick={logout} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                           <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5 mr-3" /> Logout
                        </button>
                    </div>
                 </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default PatientHeader;
