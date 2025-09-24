import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { DoctorDocument, NewDoctorData, DayOfWeek, Treatment, WorkingHours, Address } from '../types';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faPlus, faStethoscope, faSort, faTimes, faEllipsisV, faTrashAlt, faEnvelope, faPhone, faUser, faPencilAlt, faCheckCircle, faTimesCircle, faSearch, faThLarge, faList } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../components/ui/Avatar';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import PhotoCaptureInput from '../components/ui/PhotoCaptureInput';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/ui/Pagination';
// FIX: Add MultiSelect component to allow selection of assigned locations.
import MultiSelect, { MultiSelectOption } from '../components/ui/MultiSelect';
import { usePaginationSettings } from '../hooks/usePaginationSettings';

const ALL_DAYS: { key: DayOfWeek, display: string }[] = [
    { key: 'Sun', display: 'Sunday' },
    { key: 'Mon', display: 'Monday' },
    { key: 'Tue', display: 'Tuesday' },
    { key: 'Wed', display: 'Wednesday' },
    { key: 'Thu', display: 'Thursday' },
    { key: 'Fri', display: 'Friday' },
    { key: 'Sat', display: 'Saturday' },
];

const weekDays: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WorkingDaysIndicator: React.FC<{ days: DayOfWeek[] }> = ({ days }) => (
  <div className="flex space-x-1 justify-center">
    {weekDays.map(day => {
      const isActive = days.includes(day);
      const dayInitial = day.charAt(0);
      return (
        <span
          key={day}
          title={day}
          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
            isActive
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}
        >
          {dayInitial}
        </span>
      );
    })}
  </div>
);

const TreatmentsMultiSelect: React.FC<{
  allTreatments: Treatment[];
  selectedTreatmentIds: string[];
  onChange: (ids: string[]) => void;
}> = ({ allTreatments, selectedTreatmentIds, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTreatments = useMemo(() => allTreatments.filter(t => t.id && selectedTreatmentIds.includes(t.id)), [allTreatments, selectedTreatmentIds]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleTreatment = (treatmentId: string) => {
    const newSelection = selectedTreatmentIds.includes(treatmentId)
      ? selectedTreatmentIds.filter(id => id !== treatmentId)
      : [...selectedTreatmentIds, treatmentId];
    onChange(newSelection);
  };

  const removeTreatment = (treatmentId: string) => {
      onChange(selectedTreatmentIds.filter(id => id !== treatmentId));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Treatments</label>
      <div className="relative" ref={containerRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 min-h-[46px] cursor-pointer"
        >
          <div className="flex flex-wrap gap-2 items-center">
            {selectedTreatments.length > 0 ? (
              selectedTreatments.map(treatment => (
                <div key={treatment.id} className="flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium px-2.5 py-1 rounded-full">
                  <span>{treatment.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if(treatment.id) removeTreatment(treatment.id); }}
                    className="ml-2 -mr-1 flex-shrink-0 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-800 hover:text-blue-600 focus:outline-none"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Select treatments...</span>
            )}
          </div>
        </div>
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {allTreatments.length > 0 ? allTreatments.map(treatment => (
              <label key={treatment.id} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!treatment.id && selectedTreatmentIds.includes(treatment.id)}
                  onChange={() => { if (treatment.id) toggleTreatment(treatment.id) }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3">{treatment.name}</span>
              </label>
            )) : <div className="p-4 text-sm text-slate-500">No treatments found. Please add treatments first.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

const DayOfWeekSelector: React.FC<{ selectedDays: DayOfWeek[], onChange: (days: DayOfWeek[]) => void }> = ({ selectedDays, onChange }) => {
    const toggleDay = (day: DayOfWeek) => {
        const newSelection = selectedDays.includes(day)
            ? selectedDays.filter(d => d !== day)
            : [...selectedDays, day];
        onChange(newSelection);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Working Days*</label>
            <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(({ key, display }) => (
                    <button
                        type="button"
                        key={key}
                        onClick={() => toggleDay(key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                            selectedDays.includes(key)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {display}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const AddDoctorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: NewDoctorData) => Promise<void>;
}> = ({ isOpen, onClose, onAdd }) => {
  const { getTreatments, hospitalLocations } = useAuth();
  const [allTreatments, setAllTreatments] = useState<Treatment[]>([]);
  
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<Address>({ street: '', city: '', country: '', pincode: '' });
  const [workingDays, setWorkingDays] = useState<DayOfWeek[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [slotInterval, setSlotInterval] = useState(30);
  const [assignedTreatments, setAssignedTreatments] = useState<string[]>([]);
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Part-time'>('Full-time');
  const [profilePhoto, setProfilePhoto] = useState<File | string | null>(null);
  const [assignedLocations, setAssignedLocations] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  const locationOptions = useMemo((): MultiSelectOption[] =>
      hospitalLocations.map(loc => ({ value: loc.id, label: loc.name })),
      [hospitalLocations]
  );

  useEffect(() => {
    if (isOpen) {
        getTreatments().then(setAllTreatments).catch(err => {
            console.error("Failed to fetch treatments", err);
            addToast('Could not load treatments.', 'error');
        });
    }
  }, [isOpen, getTreatments, addToast]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  const resetForm = () => {
    setName(''); setSpecialty(''); setPhone(''); setEmail(''); setWorkingDays([]);
    setWorkingHours({}); setSlotInterval(30); setAssignedTreatments([]);
    setEmploymentType('Full-time'); setError(''); setProfilePhoto(null);
    setAddress({ street: '', city: '', country: '', pincode: '' });
    setAssignedLocations([]);
  }

  const handleClose = () => {
    resetForm();
    onClose();
  }

  const handleTimeChange = (day: DayOfWeek, part: 'start' | 'end', value: string) => {
    setWorkingHours(prev => ({
        ...prev,
        [day]: {
            ...prev[day],
            [part]: value
        }
    }));
  };

  const handleAddressChange = (part: keyof Address, value: string) => {
    setAddress(prev => ({ ...prev, [part]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !specialty || !phone || !email || workingDays.length === 0) {
        setError('Please fill all required fields.');
        addToast('Please fill all required fields.', 'error');
        return;
    }
    setError('');
    setLoading(true);
    try {
        await onAdd({
            name, specialty, phone, email, address,
            workingDays, workingHours, slotInterval, assignedTreatments,
            employmentType, profilePhoto: profilePhoto || undefined,
            // FIX: Add missing 'assignedLocations' property to satisfy the NewDoctorData type.
            assignedLocations
        });
        // Success is handled by the `onAdd` function (`handleGenericSave`)
    } catch (err: any) {
        // Handle errors re-thrown by `handleGenericSave`
        const errorMessage = err.message || 'Failed to add doctor.';
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const newWorkingHours: WorkingHours = {};
    workingDays.forEach(day => {
        if (!workingHours[day]) {
            newWorkingHours[day] = { start: '09:00', end: '17:00' };
        } else {
            newWorkingHours[day] = workingHours[day];
        }
    });
    // Remove days that are no longer selected
    Object.keys(workingHours).forEach(day => {
        if (!workingDays.includes(day as DayOfWeek)) {
            delete workingHours[day as DayOfWeek];
        }
    });
    setWorkingHours(newWorkingHours);
  }, [workingDays]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start py-10 overflow-y-auto">
      <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl m-4 transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add New Doctor</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter doctor's information to create a new record and user account.</p>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5 text-slate-500" />
            </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {error && <p className="text-sm text-red-500 mb-4 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                <div className="lg:col-span-3">
                    <PhotoCaptureInput onPhotoTaken={setProfilePhoto} />
                </div>
                <Input id="name" label="Full Name*" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Enter doctor's full name" icon={<FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-400" />} />
                <Input id="specialty" label="Specialty*" type="text" required value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g., General Physician" icon={<FontAwesomeIcon icon={faStethoscope} className="h-5 w-5 text-gray-400" />} />
                <Input id="phone" label="Phone Number*" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
                <Input id="email" label="Email*" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email address" icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
                
                <Input id="street" label="Street*" type="text" required value={address.street} onChange={e => handleAddressChange('street', e.target.value)} />
                <Input id="city" label="City*" type="text" required value={address.city} onChange={e => handleAddressChange('city', e.target.value)} />
                <Input id="country" label="Country*" type="text" required value={address.country} onChange={e => handleAddressChange('country', e.target.value)} />
                <Input id="pincode" label="Pincode*" type="text" required value={address.pincode} onChange={e => handleAddressChange('pincode', e.target.value)} />

                <div className="lg:col-span-3">
                  <MultiSelect
                      label="Assigned Locations*"
                      options={locationOptions}
                      selectedValues={assignedLocations}
                      onChange={setAssignedLocations}
                  />
                </div>

                <div className="lg:col-span-3"><DayOfWeekSelector selectedDays={workingDays} onChange={setWorkingDays} /></div>
                
                {workingDays.length > 0 && (
                    <div className="lg:col-span-3 mt-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 bg-slate-50 dark:bg-slate-800/50">
                        <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2">Set Working Hours</h4>
                        {ALL_DAYS.filter(d => workingDays.includes(d.key)).map(({ key, display }) => (
                            <div key={key} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
                                <span className="font-medium text-sm">{display}</span>
                                <Input id={`start-${key}`} label="Start Time" type="time" value={workingHours[key]?.start || ''} onChange={(e) => handleTimeChange(key, 'start', e.target.value)} required />
                                <Input id={`end-${key}`} label="End Time" type="time" value={workingHours[key]?.end || ''} onChange={(e) => handleTimeChange(key, 'end', e.target.value)} required />
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="lg:col-span-3"><TreatmentsMultiSelect allTreatments={allTreatments} selectedTreatmentIds={assignedTreatments} onChange={setAssignedTreatments} /></div>
                <Select id="employmentType" label="Employment Type*" required value={employmentType} onChange={e => setEmploymentType(e.target.value as any)}>
                    <option>Full-time</option><option>Part-time</option>
                </Select>
                <Input id="slotInterval" label="Slot Interval (minutes)*" type="number" required value={slotInterval} onChange={e => setSlotInterval(parseInt(e.target.value, 10) || 0)} placeholder="e.g., 30" />
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg">
            <Button type="button" variant="light" onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="success" disabled={loading}>{loading ? 'Adding Doctor...' : 'Add Doctor'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ActionsDropdown: React.FC<{ onView: () => void; onDelete: () => void; onToggleStatus: () => void; isInactive: boolean; }> = ({ onView, onDelete, onToggleStatus, isInactive }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                        <button onClick={onView} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> View/Edit Details
                        </button>
                         <button onClick={onToggleStatus} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FontAwesomeIcon icon={isInactive ? faCheckCircle : faTimesCircle} className="w-4 h-4 mr-3" /> {isInactive ? 'Mark as Active' : 'Mark as Inactive'}
                        </button>
                        <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const DoctorCard: React.FC<{ doctor: DoctorDocument }> = ({ doctor }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleCardClick = () => {
        if (!doctor.id) return;
        navigate(`/hospitals/${user?.hospitalSlug}/doctors/${doctor.id}`);
    };

    return (
        <div onClick={handleCardClick} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200 flex flex-col text-center items-center p-4">
            <Avatar
                avatar={
                    doctor.profilePhotoUrl
                        ? { type: 'image', value: doctor.profilePhotoUrl }
                        : { type: 'initials', value: doctor.name.split(' ').map(n => n[0]).join('').toUpperCase(), color: 'bg-teal-500' }
                }
                size="lg"
            />
            <h3 className="font-bold text-lg mt-3 text-slate-800 dark:text-slate-100 truncate w-full">{doctor.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty}</p>
            <div className="mt-3">
                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    doctor.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                    {doctor.status}
                </span>
            </div>
            <div className="mt-4">
                <WorkingDaysIndicator days={doctor.workingDays} />
            </div>
        </div>
    );
};


const DoctorsScreen: React.FC = () => {
  const { user, doctors, addDoctor, deleteDoctor, updateDoctorStatus, loading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, doctorId: '', doctorName: '' });
  const [confirmStatusModal, setConfirmStatusModal] = useState<{ isOpen: boolean; doctor: DoctorDocument | null }>({ isOpen: false, doctor: null });

  const [view, setView] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePaginationSettings();

  const canWrite = user?.permissions.doctors === 'write';
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, specialtyFilter, view]);

  const specialties = useMemo(() => ['all', ...Array.from(new Set(doctors.map(d => d.specialty)))], [doctors]);
  
  const filteredDoctors = useMemo(() => {
    return doctors
      .filter(d => statusFilter === 'all' || d.status === statusFilter)
      .filter(d => specialtyFilter === 'all' || d.specialty === specialtyFilter)
      .filter(d => {
        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return d.name.toLowerCase().includes(lowerSearch) || d.specialty.toLowerCase().includes(lowerSearch);
      });
  }, [doctors, searchTerm, statusFilter, specialtyFilter]);
  
  const totalPages = useMemo(() => Math.ceil(filteredDoctors.length / itemsPerPage), [filteredDoctors.length, itemsPerPage]);

  const paginatedDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDoctors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDoctors, currentPage, itemsPerPage]);

  const handleAddDoctor = async (data: NewDoctorData) => {
      await addDoctor(data);
  };

  const handleRowClick = (doctorId: string) => {
    navigate(`/hospitals/${user?.hospitalSlug}/doctors/${doctorId}`);
  };

  const handleDeleteRequest = (doctor: DoctorDocument) => {
    setConfirmDeleteModal({ isOpen: true, doctorId: doctor.id!, doctorName: doctor.name });
  };

  const handleDeleteDoctor = async () => {
    const { doctorId } = confirmDeleteModal;
    try {
        await deleteDoctor(doctorId);
        addToast('Doctor deleted successfully.', 'success');
    } catch (error) {
        addToast('Failed to delete doctor.', 'error');
    } finally {
        setConfirmDeleteModal({ isOpen: false, doctorId: '', doctorName: '' });
    }
  };
  
  const handleStatusToggleRequest = (doctor: DoctorDocument) => {
    setConfirmStatusModal({ isOpen: true, doctor: doctor });
  };

  const handleUpdateStatus = async () => {
    const { doctor } = confirmStatusModal;
    if (!doctor || !doctor.id) return;
    const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
    try {
        await updateDoctorStatus(doctor.id, newStatus);
        addToast(`Doctor status updated to ${newStatus}.`, 'success');
    } catch (error) {
        addToast('Failed to update doctor status.', 'error');
    } finally {
        setConfirmStatusModal({ isOpen: false, doctor: null });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <ConfirmationModal 
            isOpen={confirmDeleteModal.isOpen}
            onClose={() => setConfirmDeleteModal({ isOpen: false, doctorId: '', doctorName: '' })}
            onConfirm={handleDeleteDoctor}
            title="Delete Doctor"
            message={`Are you sure you want to delete Dr. ${confirmDeleteModal.doctorName}? This action cannot be undone.`}
            confirmButtonText="Delete"
            confirmButtonVariant="danger"
        />
        {confirmStatusModal.isOpen && confirmStatusModal.doctor && (
            <ConfirmationModal 
                isOpen={confirmStatusModal.isOpen}
                onClose={() => setConfirmStatusModal({ isOpen: false, doctor: null })}
                onConfirm={handleUpdateStatus}
                title={`Mark as ${confirmStatusModal.doctor.status === 'active' ? 'Inactive' : 'Active'}`}
                message={`Are you sure you want to mark Dr. ${confirmStatusModal.doctor.name} as ${confirmStatusModal.doctor.status === 'active' ? 'inactive' : 'active'}?`}
                confirmButtonText={`Mark as ${confirmStatusModal.doctor.status === 'active' ? 'Inactive' : 'Active'}`}
                confirmButtonVariant="primary"
            />
        )}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <Input label="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or specialty..." icon={<FontAwesomeIcon icon={faSearch} />} />
                <Select label="Filter by Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </Select>
                 <Select label="Filter by Specialty" value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)}>
                    {specialties.map(s => <option key={s} value={s}>{s === 'all' ? 'All Specialties' : s}</option>)}
                </Select>
                <div className="flex items-center justify-end bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border dark:border-slate-700 h-[46px]">
                    <Button size="sm" variant={view === 'grid' ? 'light' : 'ghost'} onClick={() => setView('grid')} className="!rounded-md shadow-sm w-full"><FontAwesomeIcon icon={faThLarge} className="mr-2"/>Grid</Button>
                    <Button size="sm" variant={view === 'list' ? 'light' : 'ghost'} onClick={() => setView('list')} className="!rounded-md w-full"><FontAwesomeIcon icon={faList} className="mr-2"/>List</Button>
                </div>
            </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
             {loading && doctors.length === 0 ? (
                <p className="p-8 text-center text-slate-500">Loading doctors...</p>
            ) : view === 'list' ? (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <TableHeader>Doctor Name</TableHeader>
                                <TableHeader>Specialty</TableHeader>
                                <TableHeader>Working Days</TableHeader>
                                <TableHeader>Status</TableHeader>
                                <TableHeader>Employment</TableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedDoctors.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-6 text-slate-500 dark:text-slate-400">No doctors found.</td></tr>
                            ) : (
                                paginatedDoctors.map((doctor) => (
                                <tr key={doctor.id} onClick={() => handleRowClick(doctor.id!)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                    <div className="flex items-center">
                                        <Avatar avatar={doctor.profilePhotoUrl ? { type: 'image', value: doctor.profilePhotoUrl } : { type: 'initials', value: doctor.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-teal-500' }} />
                                        <span className="ml-3">{doctor.name}</span>
                                    </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{doctor.specialty}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><WorkingDaysIndicator days={doctor.workingDays} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${doctor.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>{doctor.status}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{doctor.employmentType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                                        {canWrite && (
                                            <ActionsDropdown
                                                onView={() => handleRowClick(doctor.id!)}
                                                onDelete={() => handleDeleteRequest(doctor)}
                                                onToggleStatus={() => handleStatusToggleRequest(doctor)}
                                                isInactive={doctor.status === 'inactive'}
                                            />
                                        )}
                                    </td>
                                </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                        totalItems={filteredDoctors.length}
                        itemsOnPage={paginatedDoctors.length}
                    />
                </>
            ) : (
                <>
                    <div className="p-6">
                        {paginatedDoctors.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {paginatedDoctors.map(doctor => (
                                    <DoctorCard key={doctor.id} doctor={doctor} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                <FontAwesomeIcon icon={faStethoscope} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                                <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Doctors Found</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your search or filter returned no results.</p>
                            </div>
                        )}
                    </div>
                     <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                        totalItems={filteredDoctors.length}
                        itemsOnPage={paginatedDoctors.length}
                    />
                </>
            )}
        </div>
        
    </div>
  );
};


const TableHeader: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <div className="flex items-center">
            <span>{children}</span>
            <button className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <FontAwesomeIcon icon={faSort} className="w-3 h-3" />
            </button>
        </div>
    </th>
);

export default DoctorsScreen;
