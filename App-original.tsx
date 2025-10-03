// FIX: Update react-router-dom imports for v6 compatibility.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import DashboardScreen from './screens/DashboardScreen';
import PatientsScreen from './screens/PatientsScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import Sidebar from './components/layout/Sidebar';
import NotFoundScreen from './screens/NotFoundScreen';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/layout/Header';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/layout/ToastContainer';

// Placeholder screens for all sidebar links
import ReservationsScreen from './screens/ReservationsScreen';
import TreatmentsScreen from './screens/TreatmentsScreen';
import StaffScreen from './screens/StaffScreen';
import AccountsScreen from './screens/AccountsScreen';
import SalesScreen from './screens/SalesScreen';
import ExpensesScreen from './screens/ExpensesScreen.tsx';
import PayrollScreen from './screens/PayrollScreen';
import StocksScreen from './screens/StocksScreen';
import VendorsScreen from './screens/VendorsScreen';
import VendorDetailsScreen from './screens/VendorDetailsScreen';
import PeripheralsScreen from './screens/PeripheralsScreen';
import PeripheralDetailsScreen from './screens/PeripheralDetailsScreen'; // New Peripheral Details Screen
import ReportScreen from './screens/ReportScreen';
import UserDetailsScreen from './screens/UserDetailsScreen';
import TreatmentDetailsScreen from './screens/TreatmentDetailsScreen';
import PatientDetailsScreen from './screens/PatientDetailsScreen';
import DoctorsScreen from './screens/DoctorsScreen';
import DoctorDetailsScreen from './screens/DoctorDetailsScreen';
import ConsultationScreen from './screens/ConsultationScreen';
import ProfileScreen from './screens/ProfileScreen'; // New Profile Screen
import HospitalSettingsScreen from './screens/HospitalSettingsScreen'; // New Settings Screen
import HospitalLocationsScreen from './screens/HospitalLocationsScreen'; // New Locations Screen
// FIX: Module '"file:///screens/InvoiceSettingsScreen"' has no default export.
// The import for InvoiceSettingsScreen was changed from a default import to a named import to match the actual exports in the file.
import { InvoiceSettingsScreen, ModernInvoice, ClassicInvoice, SimpleInvoice, ColorfulInvoice, MinimalInvoice, ThermalReceipt } from './screens/InvoiceSettingsScreen';
import TaxRatesScreen from './screens/TaxRatesScreen'; // New Settings Screen
import NotificationsScreen from './screens/NotificationsScreen'; // New Settings Screen
import StockItemDetailsScreen from './screens/StockItemDetailsScreen'; // New Stock Item Details Screen
import StockOrderDetailsScreen from './screens/StockOrderDetailsScreen'; // New Stock Order Details Screen
import StockReturnDetailsScreen from './screens/StockReturnDetailsScreen'; // New Stock Return Details Screen
import StockTransferDetailsScreen from './screens/StockTransferDetailsScreen'; // New Stock Transfer Details Screen
import POSScreen from './screens/POSScreen';
import POSSalesScreen from './screens/POSSalesScreen';
import SuperAdminDashboard from './screens/SuperAdminDashboard';
import SuperAdminHospitalDetailsScreen from './screens/SuperAdminHospitalDetailsScreen';
import SuperAdminSubscriptionsScreen from './screens/SuperAdminSubscriptionsScreen';
import SuspendedScreen from './screens/SuspendedScreen';
import ExpenseDetailsScreen from './screens/ExpenseDetailsScreen';
import EmployeeDetailsScreen from './screens/payroll/EmployeeDetailsScreen';
import LoanDetailsScreen from './screens/payroll/LoanDetailsScreen';



// Import Modals for centralized handling
// FIX: The AddPatientModal is already handled in ProtectedLayout. This import is not needed.
import { AddDoctorModal } from './screens/DoctorsScreen';
import { AddTreatmentModal } from './screens/TreatmentsScreen';
import { AddProductModal } from './screens/StocksScreen';
import { AddVendorModal } from './screens/VendorsScreen';
import { NewAppointmentData, PatientDocument, DoctorDocument, Treatment, NewPatientData, NewDoctorData, NewTreatmentData, DayOfWeek, SubscriptionPackage, NewStockItemData, NewVendorData, A4Design, ThermalDesign, Invoice, POSSale, ConsultationType } from './types';
import { SearchableOption, SearchableSelect } from './screens/ReservationsScreen';
import { useToast } from './hooks/useToast';
import { useFormatting } from './utils/formatting';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faClock, faUndo, faCheckCircle, faBell, faPrint } from '@fortawesome/free-solid-svg-icons';
import Select from './components/ui/Select';
import UpgradeModal from './components/ui/UpgradeModal';
import Card from './components/ui/Card';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import SuperAdminTransactionsScreen from './screens/SuperAdminTransactionsScreen';
import SuperAdminSettingsScreen from './screens/SuperAdminSettingsScreen';
import { AddPatientModal } from './screens/PatientsScreen';
import PatientLayout from './components/layout/PatientLayout';
import PatientDashboard from './screens/patient/PatientDashboard';
import PatientConsultationsScreen from './screens/patient/PatientConsultationsScreen';
import PatientHealthRecordsScreen from './screens/patient/PatientHealthRecordsScreen';
import PatientTreatmentJourneyScreen from './screens/patient/PatientTreatmentJourneyScreen';
import PatientNewAppointmentScreen from './screens/patient/PatientNewAppointmentScreen';
import PatientProfileScreen from './screens/patient/PatientProfileScreen';
import SupportScreen from './screens/SupportScreen';
import ChatScreen from './screens/ChatScreen';
import OnboardingModal from './components/ui/OnboardingModal';
import BulkOperationsScreen from './screens/BulkOperationsScreen';

const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const routeTitles: { [key: string]: string } = {
  'dashboard': 'Dashboard',
  'reservations': 'Reservations',
  'patients': 'Patient',
  'treatments': 'Treatments',
  'doctors': 'Doctors',
  'staff': 'User Management',
  'accounts': 'Accounts',
  'sales': 'Sales',
  'pos': 'Point of Sale',
  'pos-sales': 'POS Sales',
  'expenses': 'Expenses',
  'payroll': 'Payroll',
  'stocks': 'Stocks',
  'vendors': 'Vendors',
  'peripherals': 'Peripherals',
  'report': 'Report',
  'appointments': 'Appointments',
  'profile': 'My Profile',
  'hospital-settings': 'Hospital Settings',
  'locations': 'Locations',
  'invoice-settings': 'Invoice Settings',
  'tax-rates': 'Tax Rates',
  'notifications': 'Notification Settings',
  'subscription': 'Subscription',
  'chat': 'Chat',
};

// --- Add Reservation Modal ---
interface AddReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewAppointmentData) => Promise<void>;
    currentLocation: any; // Replace 'any' with actual type
    patients: any[]; // Replace 'any' with actual type
    doctors: any[]; // Replace 'any' with actual type
    treatments: any[]; // Replace 'any' with actual type
    getAppointments: (start: Date, end: Date) => Promise<any[]>; // Replace 'any' with actual type
}

const AddReservationModal: React.FC<AddReservationModalProps> = ({ isOpen, onClose, onSave, currentLocation, patients, doctors, treatments, getAppointments }) => {
    const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const [error, setError] = useState('');
    const { addToast } = useToast();
    const { formatTime } = useFormatting();
    const modalRef = useRef<HTMLDivElement>(null);

    const [doctorId, setDoctorId] = useState<string | null>(null);
    const [date, setDate] = useState<string | null>(null);
    const [treatmentId, setTreatmentId] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [time, setTime] = useState<string | null>(null);
    const [patientId, setPatientId] = useState<string | null>(null);
    const [consultationType, setConsultationType] = useState<ConsultationType>('direct');

    const activePatients = useMemo(() => {
        if (!currentLocation) return [];
        return patients.filter(p => p.status === 'active' && p.locationId === currentLocation.id);
    }, [patients, currentLocation]);

    const activeDoctors = useMemo(() =>
        doctors.filter(d =>
            d.status === 'active' &&
            currentLocation && d.assignedLocations && d.assignedLocations.includes(currentLocation.id)
        ), [doctors, currentLocation]
    );

    const patientOptions: SearchableOption[] = useMemo(() => activePatients.map(p => ({ value: p.id, label: p.name, secondaryLabel: `ID: ${p.patientId}` })), [activePatients]);
    const doctorOptions: SearchableOption[] = useMemo(() => activeDoctors.map(d => ({ value: d.id!, label: d.name, secondaryLabel: d.specialty })), [activeDoctors]);

    const availableTreatments = useMemo(() => {
        if (!doctorId) return [];
        const doctor = activeDoctors.find(d => d.id === doctorId);
        if (!doctor) return [];
        return treatments.filter(t => t.id && doctor.assignedTreatments.includes(t.id));
    }, [doctorId, activeDoctors, treatments]);
    
    const treatmentOptions: SearchableOption[] = useMemo(() => availableTreatments.map(t => ({ value: t.id!, label: t.name, secondaryLabel: `${t.duration} min` })), [availableTreatments]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[999] flex justify-center items-center p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4 p-6 text-center transform transition-all" ref={modalRef} onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Add New Reservation</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div>
                        <label htmlFor="patient-select" className="block text-left text-sm font-medium text-slate-700 dark:text-slate-300">Patient</label>
                        <SearchableSelect
                            id="patient-select"
                            options={patientOptions}
                            value={patientId}
                            onChange={(value) => setPatientId(value)}
                            placeholder="Select Patient"
                        />
                    </div>
                    <div>
                        <label htmlFor="doctor-select" className="block text-left text-sm font-medium text-slate-700 dark:text-slate-300">Doctor</label>
                        <SearchableSelect
                            id="doctor-select"
                            options={doctorOptions}
                            value={doctorId}
                            onChange={(value) => setDoctorId(value)}
                            placeholder="Select Doctor"
                        />
                    </div>
                    <div>
                        <label htmlFor="treatment-select" className="block text-left text-sm font-medium text-slate-700 dark:text-slate-300">Treatment</label>
                        <SearchableSelect
                            id="treatment-select"
                            options={treatmentOptions}
                            value={treatmentId}
                            onChange={(value) => setTreatmentId(value)}
                            placeholder="Select Treatment"
                            isDisabled={!doctorId}
                        />
                    </div>
                    <div>
                        <label htmlFor="date-input" className="block text-left text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                        <Input
                            id="date-input"
                            type="date"
                            value={date || ''}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div>
                        <label htmlFor="time-select" className="block text-left text-sm font-medium text-slate-700 dark:text-slate-300">Time</label>
                        <Select
                            id="time-select"
                            options={availableSlots.map(slot => ({ value: slot, label: slot }))}
                            value={time || ''}
                            onChange={(e) => setTime(e.target.value)}
                            placeholder={loadingSlots ? "Loading slots..." : "Select Time"}
                            isDisabled={!date || !doctorId || !treatmentId || loadingSlots}
                        />
                    </div>
                    <div>
                        <label htmlFor="consultation-type-select" className="block text-left text-sm font-medium text-slate-700 dark:text-slate-300">Consultation Type</label>
                        <Select
                            id="consultation-type-select"
                            options={[{ value: 'direct', label: 'Direct' }, { value: 'online', label: 'Online' }]}
                            value={consultationType}
                            onChange={(e) => setConsultationType(e.target.value as ConsultationType)}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <Button type="button" variant="light" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> : null}
                            Add Reservation
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    const activeDoctors = useMemo(() =>
        doctors.filter(d =>
            d.status === 'active' &&
            currentLocation && d.assignedLocations && d.assignedLocations.includes(currentLocation.id)
        ), [doctors, currentLocation]
    );

    const patientOptions: SearchableOption[] = useMemo(() => activePatients.map(p => ({ value: p.id, label: p.name, secondaryLabel: `ID: ${p.patientId}` })), [activePatients]);
    const doctorOptions: SearchableOption[] = useMemo(() => activeDoctors.map(d => ({ value: d.id!, label: d.name, secondaryLabel: d.specialty })), [activeDoctors]);

    const availableTreatments = useMemo(() => {
        if (!doctorId) return [];
        const doctor = activeDoctors.find(d => d.id === doctorId);
        if (!doctor) return [];
        return treatments.filter(t => t.id && doctor.assignedTreatments.includes(t.id));
    }, [doctorId, activeDoctors, treatments]);
    
    const treatmentOptions: SearchableOption[] = useMemo(() => availableTreatments.map(t => ({ value: t.id!, label: t.name, secondaryLabel: `${t.duration} min` })), [availableTreatments]);

    const resetForm = () => {
        setPatientId(''); setDoctorId(''); setTreatmentId(''); 
        setDate(new Date().toISOString().split('T')[0]); setTime('');
        setConsultationType('direct');
        setError('');
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId || !doctorId || !treatmentId || !date || !time) {
            setError('Please fill all fields.');
            return;
        }
        
        const selectedTreatment = treatments.find(t => t.id === treatmentId);
        if (!selectedTreatment) {
            setError('Selected treatment not found.');
            return;
        }

        const [hours, minutes] = time.split(':').map(Number);
        const start = new Date(date);
        start.setHours(hours, minutes, 0, 0);
        // Ensure the date part is correct, especially for cross-timezone issues
        const [year, month, day] = date.split('-').map(Number);
        start.setFullYear(year, month - 1, day);


        const end = new Date(start.getTime() + selectedTreatment.duration * 60000);

        setIsSubmitting(true);
        setError('');
        try {
            // REAL-TIME CHECK
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            
            const allAppointmentsForDay = await getAppointments(dayStart, dayEnd);
            const doctorAppointments = allAppointmentsForDay.filter(app => app.doctorId === doctorId && app.status !== 'Cancelled');
            
            const isSlotTaken = doctorAppointments.some(app => {
                const appStart = app.start.toDate();
                const appEnd = app.end.toDate();
                // Check for overlap: (StartA < EndB) and (EndA > StartB)
                return (appStart < end) && (appEnd > start);
            });

            if (isSlotTaken) {
                addToast("This time slot has just been booked. Please select another one.", "warning");
                throw new Error("This time slot has just been booked. Please select another one.");
            }
            await onSave({
                patientId, doctorId, start, end, 
                treatmentName: selectedTreatment.name,
                status: 'Registered',
                consultationType
            });
        } catch (err: any) {
            // Error is handled by the calling component (handleGenericSave), which shows a toast.
            // We just set the local error for display inside the modal.
            setError(err.message || 'Failed to add reservation.');
        } finally {
            setIsSubmitting(false);
        }
    };

interface SubscriptionExpiredModalProps {  isOpen: boolean;
}

const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({ isOpen }) => {
  const { user, switchToFreePlan, getSubscriptionPackages, initiatePaymentForPackage } = useAuth();
  const { addToast } = useToast();
  const { formatCurrency } = useFormatting();
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // packageId or 'switch'
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getSubscriptionPackages()
        .then(setPackages)
        .catch(() => addToast("Could not load subscription packages.", "error"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, getSubscriptionPackages, addToast]);


  const handleSwitchToFree = async () => {
    setActionLoading('switch');
    try {
        await switchToFreePlan();
        addToast("You have been switched to the Free Plan.", "success");
    } catch (error: any) {
        addToast(error.message || "Failed to switch to free plan.", "error");
    } finally {
        setActionLoading(null);
    }
  };

  const handleRenew = async (pkg: SubscriptionPackage, interval: 'monthly' | 'quarterly' | 'yearly') => {
      if(!pkg.id) return;
      setActionLoading(pkg.id);
      try {
          await initiatePaymentForPackage(pkg, interval);
          setTimeout(() => setActionLoading(null), 2000);
      } catch(e: any) {
          addToast(e.message || "Could not start payment process.", "error");
          setActionLoading(null);
      }
  };

  const getPrice = (pkg: SubscriptionPackage, interval: 'monthly' | 'quarterly' | 'yearly') => {
    return pkg.prices?.[interval] ?? 0;
  };

  const calculateSavePercent = (pkg: SubscriptionPackage, interval: 'quarterly' | 'yearly') => {
      const monthlyPrice = pkg.prices?.monthly ?? 0;
      if (monthlyPrice <= 0) return 0;

      const intervalPrice = pkg.prices?.[interval] ?? 0;
      const monthlyEquivalent = interval === 'quarterly' ? intervalPrice / 3 : intervalPrice / 12;
      
      if (monthlyEquivalent >= monthlyPrice) return 0;
      
      const saving = 1 - (monthlyEquivalent / monthlyPrice);
      return Math.round(saving * 100);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[999] flex justify-center items-start p-4 pt-10 pb-10 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl m-4 p-8 text-center transform transition-all flex flex-col">
        <FontAwesomeIcon icon={faClock} className="text-7xl text-yellow-500 mb-6 mx-auto" />
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100" id="modal-title">
          Subscription Expired
        </h3>
        <div className="mt-2">
          <p className="text-md text-slate-600 dark:text-slate-400">
            Your access to premium features has ended. To continue using the portal, please renew your subscription or switch to our free plan.
          </p>
        </div>
        
        {loading ? (
             <div className="mt-8 flex justify-center items-center h-48"><FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-slate-500"/></div>
        ) : (
            <>
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1.5 border dark:border-slate-600 max-w-sm mx-auto my-8">
                <Button size="sm" variant={selectedInterval === 'monthly' ? 'light' : 'ghost'} onClick={() => setSelectedInterval('monthly')} className="!rounded-md shadow-sm w-full">Monthly</Button>
                <Button size="sm" variant={selectedInterval === 'quarterly' ? 'light' : 'ghost'} onClick={() => setSelectedInterval('quarterly')} className="!rounded-md w-full">Quarterly</Button>
                <Button size="sm" variant={selectedInterval === 'yearly' ? 'light' : 'ghost'} onClick={() => setSelectedInterval('yearly')} className="!rounded-md w-full">Yearly</Button>
            </div>
            <div className="mt-8 -mx-8 px-8 pb-4 overflow-x-auto">
                <div className="flex space-x-6 min-w-max pb-2">
                    {packages.map(pkg => {
                        const isCurrentPlan = user?.subscriptionPackageId === pkg.id;
                        const isFree = (pkg.prices?.monthly ?? 0) === 0;
                        const quarterlySave = calculateSavePercent(pkg, 'quarterly');
                        const yearlySave = calculateSavePercent(pkg, 'yearly');
                        let savings = 0;
                        if (selectedInterval === 'quarterly') savings = quarterlySave;
                        if (selectedInterval === 'yearly') savings = yearlySave;

                        return (
                        <div key={pkg.id} className="relative pt-3 flex-shrink-0 w-80">
                            {isCurrentPlan && !isFree && (
                                <div className="absolute top-0 right-4 bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg z-10">
                                    Your Expired Plan
                                </div>
                            )}
                            {savings > 0 && !isFree && <div className="absolute top-0 left-4 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg z-10">Save {savings}%</div>}
                            <Card className="text-left !p-0 flex flex-col h-full">
                                <div className="p-6 flex-grow">
                                    <h4 className="text-xl font-bold">{pkg.name}</h4>
                                     {isFree ? (
                                        <p className="text-3xl font-extrabold">Free</p>
                                    ) : (
                                        <p className="mt-2 text-3xl font-extrabold">{formatCurrency(getPrice(pkg, selectedInterval))}<span className="text-base font-medium text-slate-500">/{selectedInterval === 'monthly' ? 'mo' : selectedInterval === 'quarterly' ? 'qtr' : 'yr'}</span></p>
                                    )}
                                    <p className="mt-2 text-sm text-slate-500 min-h-[40px]">{pkg.description}</p>
                                    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        {pkg.maxUsers > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>Up to {pkg.maxUsers} staff users</span></li>}
                                        {pkg.maxDoctors > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>Up to {pkg.maxDoctors} doctors</span></li>}
                                        {pkg.maxPatients > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>Up to {pkg.maxPatients} patients</span></li>}
                                        {pkg.maxTreatments > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>Up to {pkg.maxTreatments} treatments</span></li>}
                                        {pkg.maxProducts > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>Up to {pkg.maxProducts} stock products</span></li>}
                                        {pkg.maxReservationsPerMonth > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>{pkg.maxReservationsPerMonth} reservations/month</span></li>}
                                        {pkg.maxSalesPerMonth > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>{pkg.maxSalesPerMonth} sales/month</span></li>}
                                        {pkg.maxExpensesPerMonth > 0 && <li className="flex items-start"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2 flex-shrink-0 mt-1 h-4 w-4" /> <span>{pkg.maxExpensesPerMonth} expenses/month</span></li>}
                                    </ul>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg mt-auto">
                                    <Button
                                        size="lg"
                                        variant={isCurrentPlan ? 'success' : isFree ? 'light' : 'primary'}
                                        onClick={() => isFree ? handleSwitchToFree() : handleRenew(pkg, selectedInterval)}
                                        disabled={!!actionLoading || isCurrentPlan}
                                        className="w-full"
                                    >
                                        {actionLoading === (isFree ? 'switch' : pkg.id)
                                            ? 'Processing...'
                                            : isCurrentPlan
                                            ? 'Your Current Plan'
                                            : isFree
                                            ? 'Switch to Free Plan'
                                            : `Choose ${pkg.name}`}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )})}
                </div>
            </div>
            </>
        )}
      </div>
    </div>
  );
};

interface SubscriptionReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenew: () => void;
  expiryDate?: Date;
  planName?: string;
  planInterval?: string;
}



const SubscriptionReminderModal: React.FC<SubscriptionReminderModalProps> = ({ isOpen, onClose, onRenew, expiryDate, planName, planInterval }) => {
  const { formatDate } = useFormatting();
  if (!isOpen) return null;

  const formattedDate = expiryDate
    ? formatDate(expiryDate)
    : 'soon';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[998] flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4 p-8 text-center transform transition-all">
        <FontAwesomeIcon icon={faBell} className="text-7xl text-blue-500 mb-6" />
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Subscription Renewal Reminder
        </h3>
        <div className="mt-2">
          <p className="text-md text-slate-600 dark:text-slate-400">
            Your <strong>{planName || 'Premium'} {planInterval}</strong> plan is expiring on <strong>{formattedDate}</strong>.
            <br />
            Renew now to maintain uninterrupted access to all your features.
          </p>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={onRenew}
            className="w-full sm:w-auto"
          >
            Renew Now
          </Button>
          <Button
            size="lg"
            variant="light"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Remind Me Later
          </Button>
        </div>
      </div>
    </div>
  );
};

const PrintPreviewModal: React.FC = () => {
    // FIX: Get invoiceToPrint and setInvoiceToPrint from useAuth context
    const { user, invoiceToPrint, setInvoiceToPrint, getPatientById } = useAuth();
    const { formatDate, formatTime, formatCurrency } = useFormatting();
    const [patient, setPatient] = useState<Partial<PatientDocument>>({});

    useEffect(() => {
        if (!invoiceToPrint) return;
        const { invoice } = invoiceToPrint;
        const patientName = (invoice as Invoice).patientName || (invoice as POSSale).patientName;
        const patientId = (invoice as Invoice).patientId || (invoice as POSSale).patientId;

        if (patientId && patientId !== 'walk-in') {
            getPatientById(patientId).then(p => {
                setPatient(p || { name: patientName });
            }).catch(() => {
                setPatient({ name: patientName });
            });
        } else {
            setPatient({ name: patientName });
        }
    }, [invoiceToPrint, getPatientById]);

    if (!invoiceToPrint || !user) return null;

    const { invoice, type } = invoiceToPrint;
    const settings = type === 'Treatment' 
        ? user.hospitalInvoiceSettings?.treatmentInvoice 
        : user.hospitalInvoiceSettings?.posInvoice;

    if (!settings) {
        // FIX: Use setInvoiceToPrint from context to close the modal
        setInvoiceToPrint(null);
        alert("Invoice settings are not configured. Please configure them in the settings page.");
        return null;
    }

    const a4Designs: { [key in A4Design]: React.FC<any> } = {
        modern: ModernInvoice,
        classic: ClassicInvoice,
        simple: SimpleInvoice,
        colorful: ColorfulInvoice,
        minimal: MinimalInvoice,
    };

    const thermalDesigns: { [key in ThermalDesign]: React.FC<any> } = {
        receipt: ThermalReceipt,
    };

    let InvoiceComponent: React.FC<any> | null = null;
    if (settings.printerType === 'A4') {
        InvoiceComponent = a4Designs[settings.design as A4Design];
    } else {
        InvoiceComponent = thermalDesigns[settings.design as ThermalDesign];
    }

    const hospital = {
        name: user.hospitalName,
        address: user.hospitalAddress,
        phone: user.hospitalPhone,
        email: user.hospitalEmail,
        currency: user.hospitalCurrency,
        logoUrl: user.hospitalLogoUrl,
        gstin: user.hospitalGstin,
        dlNo: user.hospitalDlNo,
        cinNo: user.hospitalCinNo,
        fssaiNo: user.hospitalFssaiNo,
        website: user.hospitalWebsite,
        telephone: user.hospitalTelephone,
    };
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <style>{`
                @media screen {
                    .printable-area {
                        display: none;
                    }
                }
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        width: 210mm;
                        height: 297mm;
                    }
                    .no-print {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .printable-area table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .printable-area thead {
                        display: table-header-group;
                    }
                    .printable-area tfoot {
                        display: table-footer-group;
                    }
                    .printable-area tbody {
                        display: table-row-group;
                    }
                    .printable-area tr {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
            <div className="fixed inset-0 bg-black bg-opacity-75 z-[998] flex justify-center items-center p-4 no-print">
                <div className="bg-slate-200 dark:bg-slate-800 rounded-lg shadow-xl w-auto h-full max-h-[95vh] flex flex-col print-modal-content-wrapper">
                    <div className="p-4 bg-white dark:bg-slate-900 flex justify-between items-center rounded-t-lg">
                        <h3 className="text-lg font-bold">Print Preview</h3>
                        <div>
                            <Button variant="primary" onClick={handlePrint}><FontAwesomeIcon icon={faPrint} className="mr-2"/>Print</Button>
                            {/* FIX: Use setInvoiceToPrint from context to close the modal */}
                            <Button variant="light" onClick={() => setInvoiceToPrint(null)} className="ml-2">Close</Button>
                        </div>
                    </div>
                    <div className="p-4 overflow-auto">
                        <div className="print-modal-content mx-auto" style={{ zoom: settings.printerType === 'A4' ? 0.8 : 1 }}>
                           {InvoiceComponent ? <InvoiceComponent hospital={hospital} patient={patient} invoice={invoice} type={type} footerText={settings.footerText} formatDate={formatDate} formatTime={formatTime} formatCurrency={formatCurrency} /> : <p>Selected template not found.</p>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="printable-area">
                {InvoiceComponent && <InvoiceComponent hospital={hospital} patient={patient} invoice={invoice} type={type} footerText={settings.footerText} formatDate={formatDate} formatTime={formatTime} formatCurrency={formatCurrency} />}
            </div>
        </>
    );
};




const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useEffect(() => {
    if (!loading && user && user.roleName === 'owner' && user.hospitalId && user.hospitalOnboardingComplete === false) {
      setShowOnboardingModal(true);
    } else {
      setShowOnboardingModal(false);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950">
        <div className="text-2xl font-semibold text-slate-700 dark:text-slate-300">Loading Portal...</div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <PrintPreviewModal />
      {user && user.roleName === 'owner' && user.hospitalId && user.hospitalOnboardingComplete === false && (
        <OnboardingModal isOpen={showOnboardingModal} onClose={() => setShowOnboardingModal(false)} />
      )}
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : user.isSuperAdmin ? (
            <>
                <Route path="/super-admin" element={<SuperAdminLayout />}>
                    <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
                    <Route path="dashboard" element={<SuperAdminDashboard />} />
                    <Route path="subscriptions" element={<SuperAdminSubscriptionsScreen />} />
                    <Route path="transactions" element={<SuperAdminTransactionsScreen />} />
                    <Route path="settings" element={<SuperAdminSettingsScreen />} />
                    <Route path="hospitals/:hospitalId" element={<SuperAdminHospitalDetailsScreen />} />
                </Route>
                <Route path="*" element={<Navigate to="/super-admin/dashboard" />} />
            </>
        ) : user.roleName === 'patient' ? (
            <>
                <Route path="/patient/*" element={<PatientLayout />} />

                <Route path="*" element={<Navigate to="/patient/dashboard" />} />
            </>
        ) : user.hospitalSlug ? (
          <>
            <Route path="/hospitals/:hospitalSlug/*" element={<ProtectedLayout />} />
            <Route path="*" element={<Navigate to={`/hospitals/${user.hospitalSlug}/dashboard`} />} />
          </>
        ) : (
            // Fallback for an authenticated user with no slug (shouldn't happen)
            <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </>
  );
};

type ActiveModal = 'patient' | 'doctor' | 'treatment' | 'reservation' | 'stockItem' | 'vendor' | null;





import { useDoctors, useTreatments } from './hooks/management/useClinicManagement';
import { useFileUpload } from './hooks/useFileUpload';


const ProtectedLayout: React.FC = () => {
  const { user, addAppointment, addPatient, addDoctor, addStock, addVendor, initiatePaymentForPackage } = useAuth();
  const { hospitalSlug } = useParams<{ hospitalSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { uploadFile } = useFileUpload();

  const { patients } = usePatientCare(user, uploadFile);
  const { doctors } = useClinicManagement(user, uploadFile);
  const { treatments } = useClinicManagement(user, uploadFile);

  // State for centralized modal management
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [upgradeModalInfo, setUpgradeModalInfo] = useState({ isOpen: false, message: '' });
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const reminderCheckPerformed = useRef(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [isSidebarOpen, setSidebarOpen] = useState(false);


  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.hospitalSlug !== hospitalSlug) {
    return <Navigate to={`/hospitals/${user.hospitalSlug}/dashboard`} />;
  }
  
  if (user.hospitalStatus === 'inactive') {
      return <SuspendedScreen />;
  }
  
  const isSubscriptionExpired = user.hospitalSubscriptionExpiryDate && user.hospitalSubscriptionExpiryDate.toDate() < new Date();
  const isPaidPlan = (user.subscriptionPackage?.prices?.monthly ?? 0) > 0;

  useEffect(() => {
    if (isSubscriptionExpired && isPaidPlan) {
      setIsRenewalModalOpen(true);
    } else {
      setIsRenewalModalOpen(false);
    }
  }, [isSubscriptionExpired, isPaidPlan, user?.uid]);
  
  useEffect(() => {
    if (reminderCheckPerformed.current || !user || !user.hospitalSubscriptionExpiryDate || isSubscriptionExpired) {
        return;
    }
    reminderCheckPerformed.current = true;

    if (!isPaidPlan) return;

    const now = new Date();
    const expiry = user.hospitalSubscriptionExpiryDate.toDate();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    if (expiry > now && expiry <= threeDaysFromNow) {
        setIsReminderModalOpen(true);
    }
  }, [user, isPaidPlan, isSubscriptionExpired]);


  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prevState => {
      const newState = !prevState;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  };
  
  const handleRenewFromReminder = () => {
    setIsReminderModalOpen(false);
    if (user?.subscriptionPackage && user?.hospitalSubscriptionInterval) {
      initiatePaymentForPackage(user.subscriptionPackage, user.hospitalSubscriptionInterval);
    } else {
      addToast("Could not find your subscription package. Please renew from the settings page.", "error");
      navigate(`/hospitals/${user?.hospitalSlug}/hospital-settings`, { state: { openSubscriptionTab: true } });
    }
  };

  const getTitleForRoute = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean);
    const parent = segments[segments.length - 2];
    const lastSegment = segments[segments.length - 1];
  
    if (parent === 'staff' && lastSegment !== 'staff') {
      return 'User Details';
    }
    if (parent === 'treatments' && lastSegment !== 'treatments') {
        return 'Treatment Details';
    }
    if (parent === 'patients' && lastSegment !== 'patients') {
        return 'Patient Details';
    }
    if (parent === 'doctors' && lastSegment !== 'doctors') {
        return 'Doctor Details';
    }
    if (parent === 'stocks' && lastSegment !== 'stocks' && !segments.includes('orders') && !segments.includes('returns') && !segments.includes('transfers')) {
        return 'Stock Item Details';
    }
    if (parent === 'orders' && segments[segments.length - 3] === 'stocks') {
        return 'Stock Order Details';
    }
    if (parent === 'returns' && segments[segments.length - 3] === 'stocks') {
        return 'Stock Return Details';
    }
    if (parent === 'transfers' && segments[segments.length - 3] === 'stocks') {
        return 'Stock Transfer Details';
    }
    if (parent === 'peripherals' && lastSegment !== 'peripherals') {
        return lastSegment === 'new' ? 'New Peripheral' : 'Peripheral Details';
    }
    if (parent === 'vendors' && lastSegment !== 'vendors') {
        return 'Vendor Details';
    }
    if (parent === 'expenses' && lastSegment !== 'expenses') {
        return 'Expense Details';
    }
    if (parent === 'employees' && segments[segments.length - 3] === 'payroll') {
        return 'Employee Details';
    }
    if (parent === 'loans' && segments[segments.length - 3] === 'payroll') {
        return 'Loan Details';
    }
    if (lastSegment === 'consultation') {
        return 'Consultation';
    }
  
    const routeKey = lastSegment || 'dashboard';
    const baseTitle = routeTitles[routeKey] || 'Zendenta Portal';
    
    return baseTitle;
  };
  
  const currentTitle = getTitleForRoute(location.pathname);
  
  const closeModal = () => setActiveModal(null);
  
  const handleGenericSave = async (addFunction: (data: any) => Promise<any>, data: any, type: string) => {
    try {
        await addFunction(data);
        addToast(`${type} added successfully!`, 'success');
        closeModal();
    } catch (err: any) {
        if (err.message.startsWith('LIMIT_REACHED')) {
            const resource = err.message.split(':')[1] || 'items';
            setUpgradeModalInfo({
                isOpen: true,
                message: `You've reached the maximum number of ${resource} for your plan. Please upgrade to add more.`
            });
            closeModal();
        } else {
            addToast(err.message || `Failed to add ${type}.`, 'error');
            // Re-throw for modal-specific error handling if needed
            throw err;
        }
    }
  };


  return (
    <div className="flex h-screen text-slate-800 dark:text-slate-200">
      <SubscriptionReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onRenew={handleRenewFromReminder}
        expiryDate={user?.hospitalSubscriptionExpiryDate?.toDate()}
        planName={user?.subscriptionPackage?.name}
        planInterval={user?.hospitalSubscriptionInterval}
      />
      <SubscriptionExpiredModal isOpen={isRenewalModalOpen} />
      <UpgradeModal
        isOpen={upgradeModalInfo.isOpen}
        onClose={() => setUpgradeModalInfo({ isOpen: false, message: '' })}
        message={upgradeModalInfo.message}
      />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        isCollapsed={isSidebarCollapsed} 
        hospitalSlug={hospitalSlug!}
      />
      <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
          <Header 
            title={currentTitle} 
            setSidebarOpen={setSidebarOpen}
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebarCollapse={toggleSidebarCollapse}
            hospitalSlug={hospitalSlug!}
            setActiveModal={setActiveModal}
          />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="dashboard" element={<DashboardScreen />} />
              <Route path="reservations" element={<ReservationsScreen />} />
              <Route path="patients/:patientId" element={<PatientDetailsScreen />} />
              <Route path="patients" element={<PatientsScreen />} />
              <Route path="treatments/:treatmentId" element={<TreatmentDetailsScreen />} />
              <Route path="treatments" element={<TreatmentsScreen />} />
              <Route path="doctors/:doctorId" element={<DoctorDetailsScreen />} />
              <Route path="doctors" element={<DoctorsScreen />} />
              <Route path="staff/:userId" element={<UserDetailsScreen />} />
              <Route path="staff" element={<StaffScreen />} />
              <Route path="accounts" element={<AccountsScreen />} />
              <Route path="sales" element={<SalesScreen />} />
              <Route path="pos" element={<POSScreen />} />
              <Route path="pos-sales" element={<POSSalesScreen />} />
              <Route path="expenses/:expenseId" element={<ExpenseDetailsScreen />} />
              <Route path="expenses" element={<ExpensesScreen />} />
              <Route path="payroll/employees/:employeeId" element={<EmployeeDetailsScreen />} />
              <Route path="payroll/loans/:loanId" element={<LoanDetailsScreen />} />
              <Route path="payroll" element={<PayrollScreen />} />
              <Route path="stocks/orders/:orderId" element={<StockOrderDetailsScreen />} />
              <Route path="stocks/returns/:returnId" element={<StockReturnDetailsScreen />} />
              <Route path="stocks/transfers/:transferId" element={<StockTransferDetailsScreen />} />
              <Route path="stocks/:stockItemId" element={<StockItemDetailsScreen />} />
              <Route path="stocks" element={<StocksScreen />} />
              <Route path="vendors/:vendorId" element={<VendorDetailsScreen />} />
              <Route path="vendors" element={<VendorsScreen />} />
              <Route path="peripherals" element={<PeripheralsScreen />} />
              <Route path="peripherals/:peripheralId" element={<PeripheralDetailsScreen />} />
              <Route path="report" element={<ReportScreen />} />
              <Route path="appointments/:appointmentId/consultation" element={<ConsultationScreen />} />
              <Route path="appointments" element={<AppointmentsScreen />} />
              <Route path="profile" element={<ProfileScreen />} />
              <Route path="hospital-settings" element={<HospitalSettingsScreen />} />
              <Route path="locations" element={<HospitalLocationsScreen />} />
              <Route path="bulk-operations" element={<BulkOperationsScreen />} />
              <Route path="invoice-settings" element={<InvoiceSettingsScreen />} />
              <Route path="tax-rates" element={<TaxRatesScreen />} />
              <Route path="notifications" element={<NotificationsScreen />} />
              <Route path="chat" element={<ChatScreen />} />
              <Route path="*" element={<NotFoundScreen />} />
            </Routes>
        </main>
      </div>

      {/* Centralized Modals */}
      <AddReservationModal 
        isOpen={activeModal === 'reservation'}
        onClose={closeModal}
        onSave={(data: NewAppointmentData) => handleGenericSave(addAppointment, data, 'Reservation')}
        currentLocation={user?.hospital?.currentLocation} 
        patients={patients}
        doctors={doctors}
        treatments={treatments}
        getAppointments={getAppointments}
      />
      <AddPatientModal
        isOpen={activeModal === 'patient'}
        onClose={closeModal}
        onAdd={(data: NewPatientData) => handleGenericSave(addPatient, data, 'Patient')}
      />
      <AddDoctorModal
        isOpen={activeModal === 'doctor'}
        onClose={closeModal}
        onAdd={(data: NewDoctorData) => handleGenericSave(addDoctor, data, 'Doctor')}
      />
      <AddTreatmentModal
        isOpen={activeModal === 'treatment'}
        onClose={closeModal}
        onAdd={(data: NewTreatmentData) => handleGenericSave(addTreatment, data, 'Treatment')}
      />
      <AddProductModal
        isOpen={activeModal === 'stockItem'}
        onClose={closeModal}
        onSave={(data) => handleGenericSave(addStock, data, 'Product')}
        productToEdit={null}
      />
      <AddVendorModal
        isOpen={activeModal === 'vendor'}
        onClose={closeModal}
        onSave={(data: NewVendorData) => handleGenericSave(addVendor, data, 'Vendor')}
      />
      
    </div>
  );
};


export default App;