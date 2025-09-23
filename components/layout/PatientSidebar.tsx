import React from 'react';
import { Link, useMatch } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faStethoscope, faFileMedicalAlt, faChartLine, faCalendarPlus, faCommentDots, faUserCog, faShieldHeart, faBuilding, faFileInvoiceDollar, faStickyNote } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface PatientSidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface NavItem {
    name: string;
    href: string;
    icon: IconDefinition;
}

const patientNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/patient/dashboard', icon: faTachometerAlt },
    { name: 'My Consultations', href: '/patient/consultations', icon: faStethoscope },
    { name: 'Health Records', href: '/patient/health-records', icon: faFileMedicalAlt },
    { name: 'Treatment Journey', href: '/patient/treatment-journey', icon: faChartLine },
    { name: 'New Appointment', href: '/patient/new-appointment', icon: faCalendarPlus },
    { name: 'Transactions', href: '/patient/transactions', icon: faFileInvoiceDollar },
    { name: 'Notes', href: '/patient/notes', icon: faStickyNote },
    { name: 'Message', href: '/patient/support', icon: faCommentDots },
    { name: 'My Profile', href: '/patient/profile', icon: faUserCog },
];

const NavItemLink: React.FC<{ item: NavItem, onClick: () => void }> = ({ item, onClick }) => {
    const match = useMatch({ path: `${item.href}/*` });
    const isActive = !!match;

    return (
        <Link to={item.href} onClick={onClick}>
            <div className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActive
                    ? 'bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`
            }>
                <FontAwesomeIcon
                    icon={item.icon}
                    className={`flex-shrink-0 h-5 w-5 mr-3 transition-colors duration-150 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                    }`}
                />
                <span className="flex-1">{item.name}</span>
                 {item.name === 'Message' && <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">Soon</span>}
            </div>
        </Link>
    );
};

const PatientSidebar: React.FC<PatientSidebarProps> = ({ isSidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      ></div>

      <div className={`fixed top-0 left-0 h-full flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full'} 
        md:w-72 
        bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800`}>
        
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center flex-shrink-0 px-2 h-16">
              <FontAwesomeIcon icon={faShieldHeart} className="h-8 w-auto text-blue-600 flex-shrink-0" />
              <span className="ml-2 text-2xl font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">Zendenta</span>
          </div>
          
          {user && (
            <div className="mt-6 flex-shrink-0">
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center">
                    <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 p-2 rounded-md border border-slate-200 dark:border-slate-600">
                        {user.hospitalLogoUrl ? (
                            <img src={user.hospitalLogoUrl} alt={`${user.hospitalName} logo`} className="h-6 w-6 object-cover rounded" />
                        ) : (
                            <FontAwesomeIcon icon={faBuilding} className="h-6 w-6 text-slate-600 dark:text-slate-300"/>
                        )}
                    </div>
                    <div className="ml-3 overflow-hidden">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.hospitalName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Your Health Portal</p>
                    </div>
                </div>
            </div>
          )}
        </div>

        <div className="flex-grow min-h-0 overflow-y-auto">
            <nav className="p-4 pt-0" aria-label="Sidebar">
                <div className="px-2 space-y-2">
                    {patientNavItems.map(item => (
                        <NavItemLink key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
                    ))}
                </div>
            </nav>
        </div>
      </div>
    </>
  );
};

export default PatientSidebar;