import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Appointment, DoctorDocument, DayOfWeek, PatientDocument, Treatment, NewAppointmentData, AppointmentStatus } from '../types';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCalendar, faChevronLeft, faChevronRight, faFilter, faTimes,
    faCheckCircle, faClock, faTimesCircle, faUserMd, faHourglassHalf, faSearch,
    faPencilAlt, faTrashAlt, faFileMedical, faUser, faList, faTh
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import Pagination from '../components/ui/Pagination';
import DateRangePicker from '../components/ui/DateRangePicker';


// --- SearchableSelect Component ---
export interface SearchableOption {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchableText?: string;
}

interface SearchableSelectProps {
  label: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

// FIX: Export SearchableSelect to allow its use in other components.
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label, options, value, onChange, placeholder, required, disabled
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

  useEffect(() => {
    setSearchTerm(selectedOption ? selectedOption.label : '');
  }, [selectedOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (!selectedOption) setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = useMemo(() => options.filter(opt => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return opt.label.toLowerCase().includes(term) ||
             opt.secondaryLabel?.toLowerCase().includes(term) ||
             opt.searchableText?.toLowerCase().includes(term);
  }), [options, searchTerm]);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (value) onChange('');
    if (!isOpen) setIsOpen(true);
  };
  
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && '*'}</label>
      <div className="relative" ref={containerRef}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text" value={searchTerm} onChange={handleInputChange} onFocus={() => setIsOpen(true)}
          placeholder={placeholder} disabled={disabled}
          className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
        />
        {isOpen && !disabled && (
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg">
            <ul className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                <li key={opt.value} onClick={() => handleSelect(opt.value)} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                  <div className="font-medium">{opt.label}</div>
                  {opt.secondaryLabel && <div className="text-xs text-slate-500">{opt.secondaryLabel}</div>}
                </li>
              )) : (
                <li className="px-4 py-2 text-sm text-slate-500">No results found.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Constants and Configuration ---
const HOUR_HEIGHT_PX = 80;
const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_STATUSES: AppointmentStatus[] = ['Registered', 'Finished', 'Encounter', 'Waiting Payment', 'Cancelled', 'No Show'];

const statusStyles: { [key in Appointment['status']]: { color: string; icon: IconDefinition; label: string } } = {
    Finished: { color: 'bg-green-100 text-green-800 border-l-green-500 dark:bg-green-900/50 dark:text-green-300 dark:border-l-green-500', icon: faCheckCircle, label: 'Finished' },
    Encounter: { color: 'bg-blue-100 text-blue-800 border-l-blue-500 dark:bg-blue-900/50 dark:text-blue-300 dark:border-l-blue-500', icon: faUserMd, label: 'Encounter' },
    Registered: { color: 'bg-pink-100 text-pink-800 border-l-pink-500 dark:bg-pink-900/50 dark:text-pink-300 dark:border-l-pink-500', icon: faClock, label: 'Registered' },
    'Waiting Payment': { color: 'bg-yellow-100 text-yellow-800 border-l-yellow-500 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-l-yellow-500', icon: faHourglassHalf, label: 'Waiting Payment' },
    Cancelled: { color: 'bg-slate-100 text-slate-800 border-l-slate-500 dark:bg-slate-800 dark:text-slate-300 dark:border-l-slate-500', icon: faTimesCircle, label: 'Cancelled' },
    'No Show': { color: 'bg-orange-100 text-orange-800 border-l-orange-500 dark:bg-orange-900/50 dark:text-orange-300 dark:border-l-orange-500', icon: faUser, label: 'No Show' },
};

// --- Helper Functions ---
const getStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getEndOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const addDays = (date: Date, days: number) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    return newDate;
};

// --- Sub-components ---
const AddAppointmentModal: React.FC<{
  isOpen: boolean; onClose: () => void; onAdd: () => void; appointmentData: { doctor: DoctorDocument; start: Date } | null;
}> = ({ isOpen, onClose, onAdd, appointmentData }) => {
    const { patients: allPatientsFromContext, treatments: allTreatmentsFromContext, addAppointment, currentLocation } = useAuth();
    
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    const doctorTreatments = useMemo(() => appointmentData ? allTreatmentsFromContext.filter(t => t.id && appointmentData.doctor.assignedTreatments.includes(t.id)) : [], [allTreatmentsFromContext, appointmentData]);
    
    const activePatients = useMemo(() => {
        if (!currentLocation) return [];
        return allPatientsFromContext.filter(p => p.status === 'active' && p.locationId === currentLocation.id);
    }, [allPatientsFromContext, currentLocation]);

    const patientOptions = useMemo((): SearchableOption[] => activePatients.map(p => ({ value: p.id, label: p.name, secondaryLabel: `ID: ${p.patientId}`, searchableText: `${p.name} ${p.patientId} ${p.phone}` })), [activePatients]);
    const treatmentOptions = useMemo((): SearchableOption[] => doctorTreatments.map(t => ({ value: t.id!, label: t.name, secondaryLabel: `${t.duration} min` })), [doctorTreatments]);

    useEffect(() => {
        if (isOpen && appointmentData) {
            setStartTime(appointmentData.start);
            setEndTime(appointmentData.start);
            setSelectedTreatmentId('');
            setSelectedPatientId('');
            setError('');
        }
    }, [isOpen, appointmentData]);


    useEffect(() => {
        if (selectedTreatmentId && startTime) {
            const treatment = doctorTreatments.find(t => t.id === selectedTreatmentId);
            if (treatment) setEndTime(new Date(startTime.getTime() + treatment.duration * 60000));
        }
    }, [selectedTreatmentId, startTime, doctorTreatments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId || !selectedTreatmentId || !appointmentData) { setError('Please select a patient and a treatment.'); return; }
        const treatment = doctorTreatments.find(t => t.id === selectedTreatmentId);
        if (!treatment) { setError('Selected treatment not found.'); return; }
        setLoading(true); setError('');
        try {
            await addAppointment({ patientId: selectedPatientId, doctorId: appointmentData.doctor.id!, start: startTime, end: endTime, treatmentName: treatment.name, status: 'Registered' });
            addToast('Appointment created successfully!', 'success'); onAdd(); onClose();
        } catch (err: any) {
            const msg = err.message || 'Failed to create appointment.'; setError(msg); addToast(msg, 'error');
        } finally { setLoading(false); }
    };
    
    if (!isOpen || !appointmentData) return null;
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4"><form onSubmit={handleSubmit}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-800"><h2 className="text-xl font-bold">New Appointment</h2><p className="text-sm text-slate-500 mt-1">For Dr. {appointmentData.doctor.name} at {formatTime(startTime)}</p></div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    <SearchableSelect label="Patient" options={patientOptions} value={selectedPatientId} onChange={setSelectedPatientId} placeholder="Search by name, ID, or phone..." required />
                    <SearchableSelect label="Treatment" options={treatmentOptions} value={selectedTreatmentId} onChange={setSelectedTreatmentId} placeholder="Search treatments..." required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Time" id="start-time" type="time" value={startTime.toTimeString().substring(0,5)} onChange={e => { const newStart = new Date(startTime); const [h, m] = e.target.value.split(':'); newStart.setHours(Number(h), Number(m)); setStartTime(newStart); }} />
                        <Input label="End Time" id="end-time" type="time" value={endTime.toTimeString().substring(0,5)} readOnly disabled />
                    </div>
                </div>
                <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t"><Button type="button" variant="light" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={loading}>{loading ? 'Scheduling...' : 'Schedule Appointment'}</Button></div>
            </form></div>
        </div>
    );
};

const EditAppointmentModal: React.FC<{
  isOpen: boolean; onClose: () => void; onUpdate: () => void; appointment: Appointment | null; onDeleteRequest: (appointment: Appointment) => void;
}> = ({ isOpen, onClose, onUpdate, appointment, onDeleteRequest }) => {
    const { patients: allPatientsFromContext, treatments: allTreatmentsFromContext, getDoctorById, updateAppointment } = useAuth();
    const [doctor, setDoctor] = useState<DoctorDocument | null>(null);
    
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    const [status, setStatus] = useState<AppointmentStatus>('Registered');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [error, setError] = useState('');
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    const doctorTreatments = useMemo(() => doctor ? allTreatmentsFromContext.filter(t => t.id && doctor.assignedTreatments.includes(t.id)) : [], [allTreatmentsFromContext, doctor]);
    const patientOptions = useMemo((): SearchableOption[] => allPatientsFromContext.map(p => ({ value: p.id, label: p.name, secondaryLabel: `ID: ${p.patientId}`, searchableText: `${p.name} ${p.patientId} ${p.phone}` })), [allPatientsFromContext]);
    const treatmentOptions = useMemo((): SearchableOption[] => doctorTreatments.map(t => ({ value: t.id!, label: t.name, secondaryLabel: `${t.duration} min` })), [doctorTreatments]);
    
    useEffect(() => {
        if (isOpen && appointment) {
            setIsFetchingData(true);
            setError('');
            getDoctorById(appointment.doctorId)
            .then((doc) => {
                setDoctor(doc);
    
                setSelectedPatientId(appointment.patientId);
                const treatment = allTreatmentsFromContext.find(t => t.name === appointment.treatmentName);
                if (treatment) setSelectedTreatmentId(treatment.id || '');
                setStartTime(appointment.start.toDate());
                setEndTime(appointment.end.toDate());
                setStatus(appointment.status);
            })
            .catch(() => addToast('Failed to load doctor data.', 'error'))
            .finally(() => setIsFetchingData(false));
        }
    }, [isOpen, appointment, getDoctorById, addToast, allTreatmentsFromContext]);


    useEffect(() => {
        if (selectedTreatmentId && startTime) {
            const treatment = doctorTreatments.find(t => t.id === selectedTreatmentId);
            if (treatment) setEndTime(new Date(startTime.getTime() + treatment.duration * 60000));
        }
    }, [selectedTreatmentId, startTime, doctorTreatments]);

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId || !selectedTreatmentId || !appointment) { setError('Patient and treatment are required.'); return; }
        const treatment = doctorTreatments.find(t => t.id === selectedTreatmentId);
        if (!treatment) { setError('Selected treatment not found.'); return; }
        setIsSubmitting(true); setError('');
        try {
            await updateAppointment(appointment.id, { patientId: selectedPatientId, doctorId: appointment.doctorId, start: startTime, end: endTime, treatmentName: treatment.name, status });
            addToast('Appointment updated successfully!', 'success'); onUpdate(); onClose();
        } catch (err: any) {
            const msg = err.message || 'Failed to update appointment.'; setError(msg); addToast(msg, 'error');
        } finally { setIsSubmitting(false); }
    };

    if (!isOpen || !appointment) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4"><form onSubmit={handleUpdateSubmit}>
                <div className="p-6 border-b"><h2 className="text-xl font-bold">Edit Appointment</h2><p className="text-sm text-slate-500 mt-1">For {appointment.patientName}</p></div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {error && <p className="text-sm text-red-500 bg-red-100 p-3 rounded-lg">{error}</p>}
                    <SearchableSelect label="Patient" options={patientOptions} value={selectedPatientId} onChange={setSelectedPatientId} placeholder="Search by name, ID, or phone..." required disabled={isFetchingData} />
                    <SearchableSelect label="Treatment" options={treatmentOptions} value={selectedTreatmentId} onChange={setSelectedTreatmentId} placeholder="Search treatments..." required disabled={isFetchingData} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Time" id="start-time" type="time" value={startTime.toTimeString().substring(0,5)} onChange={e => { const newStart = new Date(startTime); const [h, m] = e.target.value.split(':'); newStart.setHours(Number(h), Number(m)); setStartTime(newStart); }} disabled={isFetchingData} />
                        <Input label="End Time" id="end-time" type="time" value={endTime.toTimeString().substring(0,5)} readOnly disabled />
                    </div>
                    <Select label="Status" id="status" value={status} onChange={e => setStatus(e.target.value as AppointmentStatus)} disabled={isFetchingData}>
                        <option value="Registered">Registered</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="No Show">No Show</option>
                    </Select>
                </div>
                <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t">
                    <Button type="button" variant="danger" onClick={() => onDeleteRequest(appointment)} disabled={isFetchingData || isSubmitting}>Delete</Button>
                    <div className="flex space-x-3">
                        <Button type="button" variant="light" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isFetchingData || isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Appointment'}</Button>
                    </div>
                </div>
            </form></div>
        </div>
    );
};

const AppointmentCard: React.FC<{ appointment: Appointment, onClick: (e: React.MouseEvent) => void, onContextMenu: (e: React.MouseEvent) => void, calendarStartHour: number }> = ({ appointment, onClick, onContextMenu, calendarStartHour }) => {
    const start = appointment.start.toDate();
    const end = appointment.end.toDate();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const top = ((start.getHours() - calendarStartHour) * 60 + start.getMinutes()) / 60 * HOUR_HEIGHT_PX;
    const height = (durationMinutes / 60) * HOUR_HEIGHT_PX;
    const style = statusStyles[appointment.status] || statusStyles.Registered;
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
        <div onClick={onClick} onContextMenu={onContextMenu} className={`absolute w-[95%] left-[2.5%] p-2 rounded-lg border-l-4 ${style.color} overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400 transition-shadow`} style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}>
            <div className="flex flex-col h-full text-xs"><div className="flex justify-between items-start">
                    <p className="font-semibold truncate">{appointment.patientName}</p>
                    <div className="flex items-center flex-shrink-0"><FontAwesomeIcon icon={style.icon} className="mr-1" /><span>{style.label}</span></div>
                </div>
                <p className="opacity-80">{formatTime(start)} &gt; {formatTime(end)}</p>
                <div className="mt-auto"><span className="bg-white dark:bg-slate-700/80 px-2 py-0.5 rounded-full">{appointment.treatmentName}</span></div>
            </div>
        </div>
    );
};

const UnavailableSlot: React.FC<{ top: number; height: number; }> = ({ top, height }) => (
    <div
        className="absolute w-full bg-slate-100 dark:bg-slate-800/50 border-y border-dashed border-slate-300 dark:border-slate-700 pointer-events-none"
        style={{ top: `${top}px`, height: `${height}px` }}
        aria-hidden="true"
    />
);

const DoctorColumn: React.FC<{ doctor: DoctorDocument; appointments: Appointment[]; onClick: (e: React.MouseEvent<HTMLDivElement>) => void; onAppointmentClick: (app: Appointment) => void; onAppointmentContextMenu: (e: React.MouseEvent, app: Appointment) => void; currentDate: Date; calendarStartHour: number; calendarEndHour: number; onDragStart: (e: React.DragEvent<HTMLDivElement>, doctorId: string) => void; onDragOver: (e: React.DragEvent<HTMLDivElement>) => void; onDrop: (e: React.DragEvent<HTMLDivElement>, targetDoctorId: string) => void; isDragging: boolean; isDragOver: boolean; }> = ({ doctor, appointments, onClick, onAppointmentClick, onAppointmentContextMenu, currentDate, calendarStartHour, calendarEndHour, onDragStart, onDragOver, onDrop, isDragging, isDragOver }) => {
    const dayOfWeek = DAY_NAMES[currentDate.getDay()];
    const workingHour = doctor.workingHours[dayOfWeek];
    
    const unavailableSlots = useMemo(() => {
        const slots = [];
        if (workingHour) {
            const [startH, startM] = workingHour.start.split(':').map(Number);
            const [endH, endM] = workingHour.end.split(':').map(Number);

            const workStartMinutes = (startH - calendarStartHour) * 60 + startM;
            const workEndMinutes = (endH - calendarStartHour) * 60 + endM;

            if (workStartMinutes > 0) {
                slots.push({ key: 'before', top: 0, height: (workStartMinutes / 60) * HOUR_HEIGHT_PX });
            }

            const calendarEndMinutes = (calendarEndHour - calendarStartHour) * 60;
            if (workEndMinutes < calendarEndMinutes) {
                const top = (workEndMinutes / 60) * HOUR_HEIGHT_PX;
                const height = ((calendarEndMinutes - workEndMinutes) / 60) * HOUR_HEIGHT_PX;
                slots.push({ key: 'after', top, height });
            }
        } else {
            slots.push({ key: 'all-day', top: 0, height: (calendarEndHour - calendarStartHour) * HOUR_HEIGHT_PX });
        }
        return slots;
    }, [doctor.workingHours, dayOfWeek, calendarStartHour, calendarEndHour]);
    
    return (
        <div className={`flex-shrink-0 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}>
            <div 
                className={`h-24 flex items-center p-4 border-b sticky top-0 bg-white dark:bg-slate-900 z-10 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                draggable={true}
                onDragStart={(e) => onDragStart(e, doctor.id!)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, doctor.id!)}
            >
                <Avatar 
                    avatar={
                        doctor.profilePhotoUrl
                        ? { type: 'image', value: doctor.profilePhotoUrl }
                        : { type: 'initials', value: doctor.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-teal-500' }
                    }
                    size="md" 
                />
                <div className="ml-3 overflow-hidden">
                    <p className="font-semibold truncate">{doctor.name}</p>
                    <p className="text-sm text-slate-500">{appointments.length} patient(s)</p>
                </div>
            </div>
            <div className="relative cursor-pointer" onClick={onClick}>
                {Array.from({ length: calendarEndHour - calendarStartHour }).map((_, i) => (<div key={i} className="h-[80px] border-b border-slate-200 dark:border-slate-800" />))}
                {unavailableSlots.map(slot => <UnavailableSlot key={slot.key} top={slot.top} height={slot.height} />)}
                {appointments.map(app => <AppointmentCard key={app.id} appointment={app} calendarStartHour={calendarStartHour} onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }} onContextMenu={(e) => onAppointmentContextMenu(e, app)} />)}
            </div>
        </div>
    );
};

const WeekView: React.FC<{ currentDate: Date; doctors: DoctorDocument[]; appointments: Appointment[], onAppointmentClick: (app: Appointment) => void; onAppointmentContextMenu: (e: React.MouseEvent, app: Appointment) => void; calendarStartHour: number; calendarEndHour: number; }> = ({ currentDate, doctors, appointments, onAppointmentClick, onAppointmentContextMenu, calendarStartHour, calendarEndHour }) => {
    const weekDates = useMemo(() => { const startOfWeek = new Date(currentDate); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i)); }, [currentDate]);
    const doctorColors = useMemo(() => { const colors = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#ec4899']; const map: { [id: string]: string } = {}; doctors.forEach((doc, i) => { map[doc.id!] = colors[i % colors.length]; }); return map; }, [doctors]);
    const appointmentsByDay = useMemo(() => {
        const grouped: { [key: string]: Appointment[] } = {}; weekDates.forEach(date => { const key = date.toDateString(); const start = getStartOfDay(date); const end = getEndOfDay(date); grouped[key] = appointments.filter(app => { const appDate = app.start.toDate(); return appDate >= start && appDate <= end; }); }); return grouped;
    }, [appointments, weekDates]);

    return (
        <div className="flex flex-1">
            {weekDates.map((date, index) => (
                <div key={index} className="flex-1 min-w-[140px] md:min-w-[160px] lg:min-w-[180px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="h-24 flex flex-col items-center justify-center p-2 border-b sticky top-0 bg-white dark:bg-slate-900 z-10"><p className="font-semibold">{DAY_NAMES[date.getDay()]}</p><p className="text-2xl font-bold">{date.getDate()}</p></div>
                    <div className="relative">
                        {Array.from({ length: calendarEndHour - calendarStartHour }).map((_, i) => (<div key={i} className="h-[80px] border-b border-slate-200 dark:border-slate-800" />))}
                        {appointmentsByDay[date.toDateString()].map(app => {
                            const start = app.start.toDate(); const end = app.end.toDate(); const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60); const top = ((start.getHours() - calendarStartHour) * 60 + start.getMinutes()) / 60 * HOUR_HEIGHT_PX; const height = (durationMinutes / 60) * HOUR_HEIGHT_PX; const doctorColor = doctorColors[app.doctorId] || '#64748b';
                            return (<div key={app.id} onClick={() => onAppointmentClick(app)} onContextMenu={(e) => onAppointmentContextMenu(e, app)} className="absolute w-[95%] left-[2.5%] p-2 rounded-lg text-white overflow-hidden shadow-sm cursor-pointer hover:ring-2 ring-offset-2 dark:ring-offset-slate-900" style={{ top: `${top}px`, height: `${height}px`, backgroundColor: doctorColor, borderLeft: `4px solid ${doctorColor}`, '--tw-ring-color': doctorColor } as React.CSSProperties}><p className="text-xs font-bold truncate">{app.patientName}</p><p className="text-xs opacity-90 truncate">{app.doctorName}</p><p className="text-xs opacity-90 truncate">{app.treatmentName}</p></div>);
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const TimeAxis: React.FC<{ calendarStartHour: number; calendarEndHour: number }> = ({ calendarStartHour, calendarEndHour }) => {
    const hours = Array.from({ length: calendarEndHour - calendarStartHour + 1 }, (_, i) => calendarStartHour + i);
    return (
        <div className="w-24 border-r flex-shrink-0 bg-white dark:bg-slate-900 sticky left-0 z-20">
            <div className="h-24 border-b"></div>
            {hours.slice(0, -1).map(hour => (<div key={hour} className="h-[80px] text-right pr-4 border-b -mt-px"><span className="text-sm text-slate-500 relative -top-2.5 font-medium">{new Date(0, 0, 0, hour).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</span></div>))}
        </div>
    );
};

const CurrentTimeIndicator: React.FC<{ calendarStartHour: number; calendarEndHour: number }> = ({ calendarStartHour, calendarEndHour }) => {
    const [top, setTop] = useState(0);
    useEffect(() => { const updatePosition = () => { const now = new Date(); const minutesSinceStart = (now.getHours() - calendarStartHour) * 60 + now.getMinutes(); setTop((minutesSinceStart / 60) * HOUR_HEIGHT_PX); }; updatePosition(); const interval = setInterval(updatePosition, 60000); return () => clearInterval(interval); }, [calendarStartHour]);
    if (top < 0 || top > (calendarEndHour - calendarStartHour) * HOUR_HEIGHT_PX) return null;
    return (<div className="absolute left-0 right-0 z-30" style={{ top: `${top + 96}px` }}><div className="relative h-px bg-red-500 ml-24"><div className="absolute -left-1.5 -top-[5px] text-xs text-red-500 font-bold bg-white dark:bg-slate-900 pr-2">{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div></div></div>);
};

const AppointmentList: React.FC<{
    appointments: Appointment[];
    onAppointmentClick: (app: Appointment) => void;
    onAppointmentContextMenu: (e: React.MouseEvent, app: Appointment) => void;
}> = ({ appointments, onAppointmentClick, onAppointmentContextMenu }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    
    const totalPages = Math.ceil(appointments.length / itemsPerPage);
    const paginatedAppointments = appointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStatusBadge = (status: AppointmentStatus) => {
        const style = statusStyles[status] || { color: 'bg-slate-100 text-slate-800' };
        return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${style.color}`}>{status}</span>;
    };

    return (
        <div className="p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date & Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Treatment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedAppointments.map(app => (
                                <tr key={app.id} onClick={() => onAppointmentClick(app)} onContextMenu={(e) => onAppointmentContextMenu(e, app)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{app.patientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{app.doctorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{app.start.toDate().toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{app.treatmentName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(app.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={appointments.length}
                    itemsOnPage={paginatedAppointments.length}
                />
            </div>
        </div>
    );
};


const ReservationsScreen: React.FC = () => {
    const { user, deleteAppointment, doctors: allDoctors, patients: allPatients, currentLocation } = useAuth();
    console.log("ReservationsScreen - currentLocation (initial):", currentLocation);
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week' | 'list'>('day');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAppointmentData, setNewAppointmentData] = useState<{ doctor: DoctorDocument; start: Date } | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; appointment: Appointment } | null>(null);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<Appointment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Filter states
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>([]);
    const filterRef = useRef<HTMLDivElement>(null);

    // List view states
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [listDateRange, setListDateRange] = useState({ start: startOfMonth, end: today });
    const [listSearchTerm, setListSearchTerm] = useState('');

    // Day view Draggable states
    const [orderedDoctors, setOrderedDoctors] = useState<DoctorDocument[]>([]);
    const [draggedDoctorId, setDraggedDoctorId] = useState<string | null>(null);
    const [dragOverDoctorId, setDragOverDoctorId] = useState<string | null>(null);

    const activePatients = useMemo(() => allPatients.filter(p => p.status === 'active'), [allPatients]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        let start, end;
        if (view === 'list') {
            start = getStartOfDay(listDateRange.start);
            end = getEndOfDay(listDateRange.end);
        } else {
            start = getStartOfDay(currentDate);
            end = addDays(getEndOfDay(currentDate), view === 'week' ? 6 : 0);
        }

        let q = db.collection("appointments")
            .where("hospitalId", "==", user.hospitalId)
            .where("start", ">=", start)
            .where("start", "<=", end);

        if (currentLocation) {
            q = q.where("locationId", "==", currentLocation.id);
        }

        const unsubscribe = q.onSnapshot(snapshot => {
            const appointmentData = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(), start: doc.data().start, end: doc.data().end,
            } as Appointment));
            setAppointments(appointmentData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching appointments:", error);
            addToast("Failed to load calendar data.", "error");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentDate, view, user, addToast, listDateRange, currentLocation]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenu && contextMenu.x > 0) setContextMenu(null);
            if (isFilterOpen && filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
        };
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('contextmenu', handleClickOutside, { capture: true });
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('contextmenu', handleClickOutside, { capture: true });
        };
    }, [contextMenu, isFilterOpen]);

    const filteredAppointments = useMemo(() => {
        let appointmentsToFilter = appointments;
        if (view === 'list' && listSearchTerm) {
            const term = listSearchTerm.toLowerCase();
            appointmentsToFilter = appointmentsToFilter.filter(app =>
                app.patientName.toLowerCase().includes(term) ||
                app.doctorName.toLowerCase().includes(term) ||
                app.treatmentName.toLowerCase().includes(term)
            );
        }

        return appointmentsToFilter.filter(app => {
            const doctorMatch = selectedDoctorIds.length === 0 || selectedDoctorIds.includes(app.doctorId);
            const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(app.status);
            const patientMatch = !selectedPatientId || app.patientId === selectedPatientId;
            return doctorMatch && statusMatch && patientMatch;
        });
    }, [appointments, selectedDoctorIds, selectedStatuses, selectedPatientId, view, listSearchTerm]);

    const doctorsForUI = useMemo(() => {
        let filteredByLocation = allDoctors;
        if (currentLocation) {
            filteredByLocation = allDoctors.filter(doc => doc.assignedLocations && doc.assignedLocations.includes(currentLocation.id));
        } else if (user?.roleName !== 'doctor') {
            // If no location is selected, and user is not a doctor (who can only see themselves), show no one.
            filteredByLocation = [];
        }
    
        if (user?.roleName === 'doctor' && user.doctorId) {
            return filteredByLocation.filter(d => d.id === user.doctorId);
        }
        return filteredByLocation;
    }, [allDoctors, user, currentLocation]);
    
    const workingDoctorsToday = useMemo(() => {
        const dayOfWeek = DAY_NAMES[currentDate.getDay()];
        let doctorsForToday = doctorsForUI.filter(doc => doc.workingDays.includes(dayOfWeek) && doc.status === 'active');
        if (selectedDoctorIds.length > 0) doctorsForToday = doctorsForToday.filter(doc => doc.id && selectedDoctorIds.includes(doc.id));
        return doctorsForToday;
    }, [doctorsForUI, currentDate, selectedDoctorIds]);
    
    // Initialize and update orderedDoctors for drag-and-drop
    useEffect(() => {
        const savedOrder = localStorage.getItem('doctorOrder');
        const orderedIds = savedOrder ? JSON.parse(savedOrder) : [];
        const sortedDoctors = [...workingDoctorsToday].sort((a, b) => {
            const indexA = orderedIds.indexOf(a.id);
            const indexB = orderedIds.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
        setOrderedDoctors(sortedDoctors);
    }, [workingDoctorsToday]);

    const { calendarStartHour, calendarEndHour } = useMemo(() => {
        if (loading || doctorsForUI.length === 0) return { calendarStartHour: 8, calendarEndHour: 18 };
        let minHour = 24, maxHour = 0;
        const doctorsToCheck = view === 'day' ? workingDoctorsToday : doctorsForUI;
        if (view === 'day' && doctorsToCheck.length === 0) return { calendarStartHour: 8, calendarEndHour: 18 };
        doctorsToCheck.forEach(doc => {
            Object.values(doc.workingHours).forEach(wh => {
                if (wh && wh.start && wh.end) {
                    const startH = parseInt(wh.start.split(':')[0], 10), endH = parseInt(wh.end.split(':')[0], 10), endM = parseInt(wh.end.split(':')[1], 10);
                    if (startH < minHour) minHour = startH;
                    const effectiveEndHour = endM > 0 ? endH + 1 : endH;
                    if (effectiveEndHour > maxHour) maxHour = effectiveEndHour;
                }
            });
        });
        const finalStartHour = minHour < 24 ? minHour : 8, finalEndHour = maxHour > 0 ? maxHour : 18;
        if (finalEndHour - finalStartHour < 8) return { calendarStartHour: 8, calendarEndHour: 18 };
        return { calendarStartHour: finalStartHour, calendarEndHour: finalEndHour };
    }, [loading, doctorsForUI, view, currentDate, workingDoctorsToday]);

    const appointmentsByDoctorToday = useMemo(() => {
        const grouped: { [key: string]: Appointment[] } = {}; const start = getStartOfDay(currentDate); const end = getEndOfDay(currentDate);
        filteredAppointments.forEach(app => { const appDate = app.start.toDate(); if (appDate >= start && appDate <= end) { if (!grouped[app.doctorId]) grouped[app.doctorId] = []; grouped[app.doctorId].push(app); } }); return grouped;
    }, [filteredAppointments, currentDate]);

    const handleNav = (days: number) => setCurrentDate(prev => addDays(prev, days));
    const handleToday = () => setCurrentDate(new Date());
    
    const handleDeleteAppointment = async () => {
        if (!confirmDeleteModal) return;
        setIsDeleting(true);
        try {
            await deleteAppointment(confirmDeleteModal.id);
            addToast('Appointment deleted successfully!', 'success');
        } catch (err) { addToast('Failed to delete appointment.', 'error'); console.error(err); } 
        finally { setIsDeleting(false); setConfirmDeleteModal(null); }
    };

    const handleDayGridClick = (doctor: DoctorDocument, e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect(); const offsetY = e.clientY - rect.top; const minutesFromStart = (offsetY / HOUR_HEIGHT_PX) * 60; const snappedMinutes = Math.floor(minutesFromStart / doctor.slotInterval) * doctor.slotInterval;
        const clickedTime = new Date(currentDate); clickedTime.setHours(calendarStartHour, 0, 0, 0); clickedTime.setMinutes(snappedMinutes);
        const isBooked = appointments.some(app => app.doctorId === doctor.id && clickedTime >= app.start.toDate() && clickedTime < app.end.toDate()); if (isBooked) { addToast("This time slot is already booked.", "warning"); return; }
        const dayOfWeek = DAY_NAMES[clickedTime.getDay()]; const workingHour = doctor.workingHours[dayOfWeek];
        if (workingHour) { const [startH, startM] = workingHour.start.split(':').map(Number); const [endH, endM] = workingHour.end.split(':').map(Number); const workStartTime = new Date(clickedTime); workStartTime.setHours(startH, startM, 0, 0); const workEndTime = new Date(clickedTime); workEndTime.setHours(endH, endM, 0, 0); if (clickedTime < workStartTime || clickedTime >= workEndTime) { addToast("Cannot book outside of doctor's working hours.", "warning"); return; }
        } else { addToast("Doctor is not scheduled for this day.", "warning"); return; }
        setNewAppointmentData({ doctor, start: clickedTime }); setIsAddModalOpen(true);
    };
    
    const handleAppointmentClick = (appointment: Appointment) => {
        if (user?.roleName === 'doctor') navigate(`/hospitals/${user.hospitalSlug}/appointments/${appointment.id}/consultation`);
        else {
            if (appointment.status === 'Waiting Payment') { navigate(`/hospitals/${user?.hospitalSlug}/sales`, { state: { openInvoiceForAppointmentId: appointment.id } }); return; }
            if (['Encounter', 'Finished'].includes(appointment.status)) { addToast(`This appointment is ${appointment.status.toLowerCase()} and cannot be edited.`, 'info'); return; }
            setEditingAppointment(appointment);
        }
    };

    const handleAppointmentContextMenu = (e: React.MouseEvent, appointment: Appointment) => {
        if (['Encounter', 'Waiting Payment', 'Finished'].includes(appointment.status)) { e.preventDefault(); return; }
        e.preventDefault(); e.stopPropagation();
        setContextMenu({ x: e.pageX, y: e.pageY, appointment });
    };

    const handleDoctorFilterChange = (doctorId: string) => setSelectedDoctorIds(prev => prev.includes(doctorId) ? prev.filter(id => id !== doctorId) : [...prev, doctorId]);
    const handleStatusFilterChange = (status: AppointmentStatus) => setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    const handleClearFilters = () => { setSelectedDoctorIds([]); setSelectedPatientId(''); setSelectedStatuses([]); };
    const patientOptions = useMemo((): SearchableOption[] => [{ value: '', label: 'All Patients' }, ...activePatients.map(p => ({ value: p.id, label: p.name, secondaryLabel: `ID: ${p.patientId}`, searchableText: `${p.name} ${p.patientId} ${p.phone}` }))], [activePatients]);
    const activeFilterCount = selectedDoctorIds.length + (selectedPatientId ? 1 : 0) + selectedStatuses.length;

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, doctorId: string) => {
        e.dataTransfer.setData('doctorId', doctorId);
        setDraggedDoctorId(doctorId);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetDoctorId: string) => {
        e.preventDefault();
        if (draggedDoctorId && draggedDoctorId !== targetDoctorId) {
            setDragOverDoctorId(targetDoctorId);
        }
    };
    const handleDragLeave = () => setDragOverDoctorId(null);
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetDoctorId: string) => {
        e.preventDefault();
        const sourceDoctorId = e.dataTransfer.getData('doctorId');
        if (sourceDoctorId === targetDoctorId) return;

        const sourceIndex = orderedDoctors.findIndex(d => d.id === sourceDoctorId);
        const targetIndex = orderedDoctors.findIndex(d => d.id === targetDoctorId);
        if (sourceIndex === -1 || targetIndex === -1) return;

        const newOrder = [...orderedDoctors];
        const [removed] = newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, removed);

        setOrderedDoctors(newOrder);
        localStorage.setItem('doctorOrder', JSON.stringify(newOrder.map(d => d.id)));
        setDragOverDoctorId(null);
    };
    const handleDragEnd = () => {
        setDraggedDoctorId(null);
        setDragOverDoctorId(null);
    };


    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            <AddAppointmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={() => {}} appointmentData={newAppointmentData} />
            <EditAppointmentModal isOpen={!!editingAppointment} onClose={() => setEditingAppointment(null)} onUpdate={() => {}} appointment={editingAppointment} onDeleteRequest={(app) => { setEditingAppointment(null); setConfirmDeleteModal(app); }} />
            {confirmDeleteModal && <ConfirmationModal isOpen={true} onClose={() => setConfirmDeleteModal(null)} onConfirm={handleDeleteAppointment} title="Delete Appointment" message={`Are you sure you want to delete the appointment for ${confirmDeleteModal.patientName}? This action cannot be undone.`} confirmButtonText="Delete" confirmButtonVariant="danger" loading={isDeleting} />}
            {contextMenu && (
                <div style={{ top: contextMenu.y, left: contextMenu.x }} className="absolute z-50 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5" onClick={(e) => e.stopPropagation()}>
                    <div className="py-1">
                        <button onClick={() => { if(user) navigate(`/hospitals/${user.hospitalSlug}/patients/${contextMenu.appointment.patientId}`); setContextMenu(null); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faUser} className="w-4 h-4 mr-3" /> View Patient Details</button>
                        {user?.roleName === 'doctor' && (
                             <button onClick={() => { navigate(`/hospitals/${user.hospitalSlug}/appointments/${contextMenu.appointment.id}/consultation`); setContextMenu(null); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faFileMedical} className="w-4 h-4 mr-3" /> Go to Consultation</button>
                        )}
                        <button onClick={() => { setEditingAppointment(contextMenu.appointment); setContextMenu(null); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> Edit Appointment</button>
                        <button onClick={() => { setConfirmDeleteModal(contextMenu.appointment); setContextMenu(null); }} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete</button>
                    </div>
                </div>
            )}
            <div className="p-4 border-b bg-white dark:bg-slate-900"><div className="flex items-center justify-between">
                <div className="flex items-center space-x-8"><button className="pb-2 font-semibold text-blue-600 border-b-2 border-blue-600">Calendar</button></div>
                <div className="flex items-center space-x-4">
                    {view !== 'list' && (<>
                        <Button variant="light" onClick={handleToday}>Today</Button>
                        <div className="flex items-center"><button onClick={() => handleNav(view === 'week' ? -7 : -1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faChevronLeft} className="w-5 h-5"/></button><span className="font-semibold mx-4 w-48 text-center">{currentDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span><button onClick={() => handleNav(view === 'week' ? 7 : 1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faChevronRight} className="w-5 h-5"/></button></div>
                    </>)}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border"><Button size="sm" variant={view === 'day' ? 'light' : 'ghost'} onClick={() => setView('day')} className="!rounded-md shadow-sm"><FontAwesomeIcon icon={faTh} className="mr-2"/>Day</Button><Button size="sm" variant={view === 'week' ? 'light' : 'ghost'} onClick={() => setView('week')} className="!rounded-md">Week</Button><Button size="sm" variant={view === 'list' ? 'light' : 'ghost'} onClick={() => setView('list')} className="!rounded-md"><FontAwesomeIcon icon={faList} className="mr-2"/>List</Button></div>
                    {user?.roleName !== 'doctor' && (
                      <div ref={filterRef} className="relative">
                          <Button variant="light" onClick={() => setIsFilterOpen(prev => !prev)}>
                              <FontAwesomeIcon icon={faFilter} className="mr-2"/>Filters
                              {activeFilterCount > 0 && <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>}
                          </Button>
                          {isFilterOpen && (
                              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl z-20 border border-slate-200 dark:border-slate-700">
                                  <div className="p-4 border-b border-slate-200 dark:border-slate-700"><h3 className="font-semibold text-slate-800 dark:text-slate-200">Filter Appointments</h3></div>
                                  <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                                      <div>
                                          <label className="font-semibold text-sm text-slate-700 dark:text-slate-300 block mb-2">Doctors</label>
                                          <div className="space-y-2">{allDoctors.map(d => (<label key={d.id} className="flex items-center"><input type="checkbox" checked={selectedDoctorIds.includes(d.id!)} onChange={() => handleDoctorFilterChange(d.id!)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/><span className="ml-2 text-sm">{d.name}</span></label>))}</div>
                                      </div>
                                      <SearchableSelect label="Patient" options={patientOptions} value={selectedPatientId} onChange={setSelectedPatientId} placeholder="Search patients..." />
                                      <div>
                                          <label className="font-semibold text-sm text-slate-700 dark:text-slate-300 block mb-2">Status</label>
                                          <div className="space-y-2">{ALL_STATUSES.map(s => (<label key={s} className="flex items-center"><input type="checkbox" checked={selectedStatuses.includes(s)} onChange={() => handleStatusFilterChange(s)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/><span className="ml-2 text-sm">{s}</span></label>))}</div>
                                      </div>
                                  </div>
                                  <div className="p-3 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-b-lg border-t border-slate-200 dark:border-slate-700">
                                      <Button variant="ghost" size="sm" onClick={handleClearFilters}>Clear All</Button>
                                      <Button variant="primary" size="sm" onClick={() => setIsFilterOpen(false)}>Apply</Button>
                                  </div>
                              </div>
                          )}
                      </div>
                    )}
                </div>
            </div></div>
            {view === 'list' && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <div className="md:col-span-2"><DateRangePicker value={listDateRange} onChange={setListDateRange} /></div>
                    <Input label="" value={listSearchTerm} onChange={e => setListSearchTerm(e.target.value)} placeholder="Search in list..." icon={<FontAwesomeIcon icon={faSearch} />} />
                </div>
            )}
            <div className="flex-1 overflow-auto relative">
                {loading ? <div className="flex justify-center items-center h-full text-slate-500">Loading calendar...</div>
                : view === 'day' ? (
                    <div className="flex min-h-full" onDragLeave={handleDragLeave} onDragEnd={handleDragEnd}>
                        <TimeAxis calendarStartHour={calendarStartHour} calendarEndHour={calendarEndHour} />
                        <div className="flex-1 flex">{orderedDoctors.length > 0 ? orderedDoctors.map(doc => (<DoctorColumn key={doc.id} doctor={doc} appointments={appointmentsByDoctorToday[doc.id!] || []} onClick={(e) => handleDayGridClick(doc, e)} onAppointmentClick={handleAppointmentClick} onAppointmentContextMenu={handleAppointmentContextMenu} currentDate={currentDate} calendarStartHour={calendarStartHour} calendarEndHour={calendarEndHour} onDragStart={handleDragStart} onDragOver={(e) => handleDragOver(e, doc.id!)} onDrop={handleDrop} isDragging={draggedDoctorId === doc.id} isDragOver={dragOverDoctorId === doc.id} />)) : <div className="flex-1 flex items-center justify-center p-8"><p className="text-slate-500">No doctors match the current filters for today.</p></div>}</div>
                    </div>
                ) : view === 'week' ? (
                    <div className="flex min-h-full"><TimeAxis calendarStartHour={calendarStartHour} calendarEndHour={calendarEndHour} /><WeekView currentDate={currentDate} doctors={doctorsForUI} appointments={filteredAppointments} onAppointmentClick={handleAppointmentClick} onAppointmentContextMenu={handleAppointmentContextMenu} calendarStartHour={calendarStartHour} calendarEndHour={calendarEndHour} /></div>
                ) : (
                    <AppointmentList appointments={filteredAppointments} onAppointmentClick={handleAppointmentClick} onAppointmentContextMenu={handleAppointmentContextMenu} />
                )}
                 {view !== 'list' && !loading && <CurrentTimeIndicator calendarStartHour={calendarStartHour} calendarEndHour={calendarEndHour} />}
            </div>
        </div>
    );
};
export default ReservationsScreen;
