// FIX: Update react-router-dom imports for v6 compatibility.
import React from 'react';
import { Link, useMatch } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AppModules } from '../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShieldHeart, faBuilding, faTachometerAlt, faCalendarDays, faUsers, faStethoscope, faUser,
  faCreditCard, faChartLine, faBox, faDesktop, faChartPie,
  faCog, faMapMarkedAlt, faFileInvoice, faPercent, faMoneyBillWave, faCashRegister, faReceipt, faBell, faTruck, faFileInvoiceDollar, faComments, faFileCsv
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';


interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCollapsed: boolean;
  hospitalSlug: string;
}

interface NavItem {
    name: string;
    href: string;
    icon: IconDefinition;
    module: AppModules;
}

const clinicNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: faTachometerAlt, module: 'dashboard' },
  { name: 'Reservations', href: '/reservations', icon: faCalendarDays, module: 'reservations' },
  { name: 'Patients', href: '/patients', icon: faUsers, module: 'patients' },
  { name: 'Treatments', href: '/treatments', icon: faStethoscope, module: 'treatments' },
  { name: 'Doctors', href: '/doctors', icon: faStethoscope, module: 'doctors' },
  { name: 'User Management', href: '/staff', icon: faUser, module: 'staff' },
  { name: 'Chat', href: '/chat', icon: faComments, module: 'chat' },
];

const financeNav: NavItem[] = [
    { name: 'Accounts', href: '/accounts', icon: faCreditCard, module: 'accounts' },
    { name: 'Sales', href: '/sales', icon: faChartLine, module: 'sales' },
    { name: 'POS', href: '/pos', icon: faCashRegister, module: 'pos' },
    { name: 'POS Sales', href: '/pos-sales', icon: faReceipt, module: 'pos-sales' },
    { name: 'Expenses', href: '/expenses', icon: faMoneyBillWave, module: 'expenses' },
    { name: 'Payroll', href: '/payroll', icon: faFileInvoiceDollar, module: 'payroll' },
    { name: 'Report', href: '/report', icon: faChartPie, module: 'report' },
];

const physicalAssetNav: NavItem[] = [
    { name: 'Stocks', href: '/stocks', icon: faBox, module: 'stocks' },
    { name: 'Vendors', href: '/vendors', icon: faTruck, module: 'vendors' },
    { name: 'Peripherals', href: '/peripherals', icon: faDesktop, module: 'peripherals' },
];

const settingsNav: NavItem[] = [
    { name: 'Hospital Settings', href: '/hospital-settings', icon: faCog, module: 'hospital-settings' },
    { name: 'Locations', href: '/locations', icon: faMapMarkedAlt, module: 'hospital-settings' },
    { name: 'Bulk Operations', href: '/bulk-operations', icon: faFileCsv, module: 'bulk-operations' },
    { name: 'Invoice Settings', href: '/invoice-settings', icon: faFileInvoice, module: 'invoice-settings' },
    { name: 'Tax rates', href: '/tax-rates', icon: faPercent, module: 'tax-rates' },
    { name: 'Notifications', href: '/notifications', icon: faBell, module: 'notifications' },
];

const otherNav: NavItem[] = [];

// FIX: Create a helper component to use hooks for checking active state, which is not possible in a loop.
const NavItemLink: React.FC<{ item: NavItem, isCollapsed: boolean, hospitalSlug: string }> = ({ item, isCollapsed, hospitalSlug }) => {
    const fullPath = `/hospitals/${hospitalSlug}${item.href}`;
    // FIX: `useRouteMatch` is replaced by `useMatch` in react-router-dom v6.
    // The `end` prop replaces `exact` for matching the end of the path.
    const match = useMatch({ path: `${fullPath}/*`, end: item.href === '/dashboard' });
    const isActive = !!match;

    return (
        <Link to={fullPath}>
            <div className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                isActive
                    ? 'bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                } ${isCollapsed ? 'justify-center' : ''}`
            }>
                <FontAwesomeIcon
                    icon={item.icon}
                    className={`flex-shrink-0 h-5 w-5 transition-colors duration-150 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                    } ${!isCollapsed ? 'mr-3' : ''}`}
                    aria-hidden="true"
                />
                {!isCollapsed && <span className="flex-1">{item.name}</span>}
            </div>
        </Link>
    );
};


const NavList: React.FC<{ items: NavItem[], title?: string, isCollapsed: boolean, hospitalSlug: string }> = ({ items, title, isCollapsed, hospitalSlug }) => {
    const { user } = useAuth();
    
    if (!user || !user.permissions) return null;

    const accessibleItems = items.filter(item => user.permissions![item.module] !== 'none');

    if (accessibleItems.length === 0) return null;

    return (
        <div>
            {title && (isCollapsed ? <hr className="mx-3 my-3 border-slate-200 dark:border-slate-700" /> : <h3 className="px-3 text-xs font-semibold uppercase text-slate-500 tracking-wider">{title}</h3>)}
            <div className="space-y-1">
            {accessibleItems.map((item) => (
                <NavItemLink key={item.name} item={item} isCollapsed={isCollapsed} hospitalSlug={hospitalSlug} />
            ))}
            </div>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setSidebarOpen, isCollapsed, hospitalSlug }) => {
  const { user } = useAuth();
  
  const hospitalAddressString = user?.hospitalAddress 
    ? `${user.hospitalAddress.street}, ${user.hospitalAddress.city}`
    : '';

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full flex flex-col z-40 transform transition-all duration-300 ease-in-out md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full'} 
        ${isCollapsed ? 'md:w-20' : 'md:w-72'} 
        bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800`}>
        
        {/* Sidebar Header */}
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center flex-shrink-0 px-2 h-16">
              <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                  <FontAwesomeIcon icon={faShieldHeart} className="h-8 w-auto text-blue-600 flex-shrink-0" />
                  {!isCollapsed && <span className="ml-2 text-2xl font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">Zendenta</span>}
              </div>
          </div>
          
          {user && (
            <div className={`mt-6 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 scale-95 invisible' : 'opacity-100 h-auto scale-100 visible'}`}>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center">
                    <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 p-2 rounded-md border border-slate-200 dark:border-slate-600">
                        {user.hospitalLogoUrl && user.hospitalLogoUrl !== 'https://via.placeholder.com/150' ? (
                            <img src={user.hospitalLogoUrl} alt={`${user.hospitalName} logo`} className="h-6 w-6 object-cover rounded" />
                        ) : (
                            <FontAwesomeIcon icon={faBuilding} className="h-6 w-6 text-slate-600 dark:text-slate-300"/>
                        )}
                    </div>
                    <div className="ml-3 overflow-hidden">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.hospitalName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{hospitalAddressString}</p>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-grow min-h-0 overflow-y-auto">
            <nav className="p-4 pt-0" aria-label="Sidebar">
                <div className="px-2 space-y-4">
                  <NavList items={clinicNav} title="Clinic" isCollapsed={isCollapsed} hospitalSlug={hospitalSlug} />
                  <NavList items={financeNav} title="Finance" isCollapsed={isCollapsed} hospitalSlug={hospitalSlug} />
                  <NavList items={physicalAssetNav} title="Physical Asset" isCollapsed={isCollapsed} hospitalSlug={hospitalSlug} />
                  <NavList items={settingsNav} title="Settings" isCollapsed={isCollapsed} hospitalSlug={hospitalSlug} />
                  <NavList items={otherNav} isCollapsed={isCollapsed} hospitalSlug={hospitalSlug} />
                </div>
            </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;