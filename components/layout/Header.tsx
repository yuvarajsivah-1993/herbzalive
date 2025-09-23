import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faPlus, faQuestionCircle, faUserCircle, faChevronDown, faMoon, faSignOutAlt, faBars, faAnglesLeft, faAnglesRight, faSpinner,
  faCalendarDays, faUserPlus, faUserDoctor, faStethoscope, faPills, faDesktop, faBox, faTruck, faMapMarkedAlt
} from '@fortawesome/free-solid-svg-icons';
import Avatar from '../ui/Avatar';
import { PatientDocument, DoctorDocument } from '../../types';
import { Link } from 'react-router-dom';

type ActiveModal = 'patient' | 'doctor' | 'treatment' | 'reservation' | 'stockItem' | 'vendor' | null;

interface HeaderProps {
  title: string;
  setSidebarOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebarCollapsed?: boolean;
  toggleSidebarCollapse?: () => void;
  hospitalSlug: string;
  setActiveModal: (modal: ActiveModal) => void;
}

const LocationSwitcher: React.FC = () => {
    const { user, hospitalLocations, currentLocation, setCurrentLocation } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user || !hospitalLocations || hospitalLocations.length <= 1) {
        return null;
    }

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <FontAwesomeIcon icon={faMapMarkedAlt} className="text-slate-500" />
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{currentLocation?.name || 'Select Location'}</span>
                <FontAwesomeIcon icon={faChevronDown} className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-30">
                    <div className="py-1">
                        {hospitalLocations.map(location => (
                            <button
                                key={location.id}
                                onClick={() => { setCurrentLocation(location.id); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm ${currentLocation?.id === location.id ? 'font-bold bg-slate-100 dark:bg-slate-700' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                {location.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const Header: React.FC<HeaderProps> = ({ title, setSidebarOpen, isSidebarCollapsed, toggleSidebarCollapse, hospitalSlug, setActiveModal }) => {
  const { user, logout, patients, doctors } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ patients: PatientDocument[], doctors: DoctorDocument[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'patients' | 'doctors'>('patients');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        setIsSearching(true);
        try {
          const patientsData = patients;
          const doctorsData = doctors;
          const lowerCaseQuery = searchTerm.toLowerCase();

          const filteredPatients = patientsData.filter(p =>
            p.name.toLowerCase().includes(lowerCaseQuery) ||
            p.phone.includes(lowerCaseQuery) ||
            (p.email && p.email.toLowerCase().includes(lowerCaseQuery)) ||
            p.patientId.toLowerCase().includes(lowerCaseQuery)
          );

          const filteredDoctors = doctorsData.filter(d =>
            d.name.toLowerCase().includes(lowerCaseQuery) ||
            d.phone.includes(lowerCaseQuery) ||
            d.email.toLowerCase().includes(lowerCaseQuery)
          );

          setSearchResults({ patients: filteredPatients, doctors: filteredDoctors });
          
          if (filteredPatients.length >= filteredDoctors.length) {
            setActiveTab('patients');
          } else {
            setActiveTab('doctors');
          }

        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults(null);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, patients, doctors]);
  
  // Outside click handler for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
       if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
          setSearchTerm('');
          setSearchResults(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleResetSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };


  const getAvatarProps = () => {
      if (!user) return { type: 'initials' as const, value: '?', color: 'bg-slate-500' };
      if (user.profilePhotoUrl) {
          return { type: 'image' as const, value: user.profilePhotoUrl };
      }
      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
      return { type: 'initials' as const, value: initials || '?', color: 'bg-blue-600' };
  }
  
  const roleDisplay = user?.roleName === 'owner'
    ? 'Owner'
    : user?.roleName === 'admin'
    ? 'Admin'
    : user?.roleName === 'doctor'
        ? 'Doctor'
        : 'Staff';

  const canWrite = (module: keyof typeof user.permissions) => user?.permissions?.[module] === 'write';

  return (
    <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen && setSidebarOpen(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden mr-2"
            aria-label="Open sidebar"
          >
            <FontAwesomeIcon icon={faBars} className="w-6 h-6 text-slate-500 dark:text-slate-400" />
          </button>
          <button
            onClick={toggleSidebarCollapse}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hidden md:block mr-2"
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
        
        <div className="flex items-center space-x-2 lg:space-x-4">
            <LocationSwitcher />
          <div ref={searchContainerRef} className="relative hidden md:block">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
            <input 
              type="text"
              placeholder="Search patients, doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-40 lg:w-80 border border-slate-300 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            {searchTerm.length > 1 && (
                <div className="absolute top-full mt-2 w-full lg:w-[450px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-30">
                    {isSearching ? (
                        <div className="p-8 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-3" />
                            Searching...
                        </div>
                    ) : searchResults ? (
                        <div>
                            <div className="flex border-b border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setActiveTab('patients')}
                                    className={`flex-1 p-3 font-semibold transition-colors text-sm ${activeTab === 'patients' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Patients ({searchResults.patients.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('doctors')}
                                    className={`flex-1 p-3 font-semibold transition-colors text-sm ${activeTab === 'doctors' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Doctors ({searchResults.doctors.length})
                                </button>
                            </div>
                            <ul className="max-h-80 overflow-y-auto p-2">
                                {activeTab === 'patients' && (
                                    searchResults.patients.length > 0 ? (
                                        searchResults.patients.map(p => (
                                            <li key={p.id}>
                                                <Link to={`/hospitals/${user?.hospitalSlug}/patients/${p.id}`} onClick={handleResetSearch} className="flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                                     <Avatar avatar={p.profilePhotoUrl ? { type: 'image', value: p.profilePhotoUrl } : { type: 'initials', value: p.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-indigo-500' }} />
                                                     <div className="ml-3">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{p.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Patient ID: {p.patientId}</p>
                                                     </div>
                                                </Link>
                                            </li>
                                        ))
                                    ) : <li className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No patients found.</li>
                                )}
                                {activeTab === 'doctors' && (
                                    searchResults.doctors.length > 0 ? (
                                        searchResults.doctors.map(d => (
                                            <li key={d.id}>
                                                <Link to={`/hospitals/${user?.hospitalSlug}/doctors/${d.id}`} onClick={handleResetSearch} className="flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                                    <Avatar avatar={d.profilePhotoUrl ? { type: 'image', value: d.profilePhotoUrl } : { type: 'initials', value: d.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-teal-500' }} />
                                                     <div className="ml-3">
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{d.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{d.specialty}</p>
                                                     </div>
                                                </Link>
                                            </li>
                                        ))
                                    ) : <li className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No doctors found.</li>
                                )}
                            </ul>
                        </div>
                    ) : null}
                </div>
            )}
          </div>
          
          <div ref={addMenuRef} className="relative">
            <button
              onClick={() => setIsAddMenuOpen(prev => !prev)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
              aria-label="Add new item"
              aria-haspopup="true"
              aria-expanded={isAddMenuOpen}
            >
              <FontAwesomeIcon icon={faPlus} className="w-6 h-6" />
            </button>
            {isAddMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-30">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="add-menu-button">
                  {canWrite('reservations') && (
                    <button onClick={() => { setActiveModal('reservation'); setIsAddMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                      <FontAwesomeIcon icon={faCalendarDays} className="w-5 h-5 mr-3 text-slate-400" /> Add Reservation
                    </button>
                  )}
                  {canWrite('patients') && (
                    <button onClick={() => { setActiveModal('patient'); setIsAddMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                      <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5 mr-3 text-slate-400" /> Add Patient
                    </button>
                  )}
                  {canWrite('doctors') && (
                    <button onClick={() => { setActiveModal('doctor'); setIsAddMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                      <FontAwesomeIcon icon={faUserDoctor} className="w-5 h-5 mr-3 text-slate-400" /> Add Doctor
                    </button>
                  )}
                   {canWrite('vendors') && (
                    <button onClick={() => { setActiveModal('vendor'); setIsAddMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                      <FontAwesomeIcon icon={faTruck} className="w-5 h-5 mr-3 text-slate-400" /> Add Vendor
                    </button>
                  )}
                  {canWrite('treatments') && (
                    <button onClick={() => { setActiveModal('treatment'); setIsAddMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                      <FontAwesomeIcon icon={faStethoscope} className="w-5 h-5 mr-3 text-slate-400" /> Add Treatment
                    </button>
                  )}
                  {canWrite('peripherals') && (
                    <Link to={`/hospitals/${hospitalSlug}/peripherals/new`} onClick={() => setIsAddMenuOpen(false)} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                        <FontAwesomeIcon icon={faDesktop} className="w-5 h-5 mr-3 text-slate-400" /> Add Peripheral
                    </Link>
                  )}
                  {canWrite('stocks') && (
                    <button onClick={() => { setActiveModal('stockItem'); setIsAddMenuOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                        <FontAwesomeIcon icon={faBox} className="w-5 h-5 mr-3 text-slate-400" /> Add Product
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div ref={dropdownRef} className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-700 pl-4 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-expanded={isDropdownOpen}>
                <Avatar avatar={getAvatarProps()} size="sm" />
                <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'Administrator'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{roleDisplay}</p>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
                 <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-30">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <Link to={`/hospitals/${hospitalSlug}/profile`} onClick={() => setIsDropdownOpen(false)} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                            <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5 mr-3" /> My Profile
                        </Link>
                        <button className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                            <FontAwesomeIcon icon={faQuestionCircle} className="w-5 h-5 mr-3" /> Help
                        </button>
                         <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300" role="menuitem">
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faMoon} className="w-5 h-5 mr-3" /> Dark Theme
                            </div>
                            <button onClick={toggleTheme} className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-blue-500 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`} aria-label="Toggle dark theme">
                                <span className={`inline-block w-5 h-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                        <button onClick={logout} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700" role="menuitem">
                           <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5 mr-3" /> Logout
                        </button>
                    </div>
                 </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;