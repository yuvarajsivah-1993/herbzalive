import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { PatientDocument, NewPatientData, Consultation } from '../types';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import TagInput from '../components/ui/TagInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// FIX: Import faCheckCircle and faTimesCircle icons
import { faFilter, faThLarge, faList, faPlus, faUsers, faPhone, faEnvelope, faSort, faTimes, faEllipsisV, faPencilAlt, faTrashAlt, faEye, faCheckCircle, faTimesCircle, faFileImport, faFileExport, faDownload, faSearch } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../components/ui/Avatar';
import { useToast } from '../hooks/useToast';
// FIX: Update react-router-dom imports for v6 compatibility
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import AddressInput from '../components/ui/AddressInput';
import PhotoCaptureInput from '../components/ui/PhotoCaptureInput';
import { Timestamp } from 'firebase/firestore';
import Pagination from '../components/ui/Pagination';
import { usePaginationSettings } from '../hooks/usePaginationSettings';

export const AddPatientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: NewPatientData) => Promise<void>;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | string | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

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
    setName(''); setGender('Male'); setDateOfBirth(''); setPhone(''); setEmail('');
    setEmergencyContact(''); setAddress(''); setPrimaryDiagnosis('');
    setAllergies([]); setMedicalHistory(''); setError(''); setProfilePhoto(null);
  }

  const handleClose = () => {
      resetForm();
      onClose();
  }

  const handlePhoneChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setter(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !gender || !dateOfBirth || !phone || !emergencyContact || !address || !primaryDiagnosis) {
        setError('Please fill all required fields.');
        addToast('Please fill all required fields.', 'error');
        return;
    }

    setError('');
    setLoading(true);

    const patientData: NewPatientData = {
      name,
      gender,
      dateOfBirth,
      phone,
      email,
      emergencyContact,
      address,
      primaryDiagnosis,
      allergies,
      medicalHistory,
      profilePhoto: profilePhoto || undefined,
    };

    try {
      await onAdd(patientData);
      // Success is handled by the `onAdd` function (`handleGenericSave`), which will show a toast and close the modal.
    } catch (err: any) {
      // This will only catch errors that `handleGenericSave` re-throws (i.e., not 'LIMIT_REACHED').
      // `handleGenericSave` already shows a toast for these errors.
      // We just need to set the local error state for display inside the modal.
      const errorMessage = err.message || 'Failed to add patient.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start py-10 overflow-y-auto">
      <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl m-4 transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add New Patient</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter patient information to create a new patient record.</p>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5 text-slate-500" />
            </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {error && <p className="text-sm text-red-500 mb-4 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="md:col-span-2">
                    <PhotoCaptureInput onPhotoTaken={setProfilePhoto} />
                </div>
                <Input id="name" label="Full Name*" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Enter patient's full name" />
                <Select id="gender" label="Gender*" required value={gender} onChange={e => setGender(e.target.value as any)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                </Select>
                <Input id="dob" label="Date of Birth*" type="date" required value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                <Input id="phone" label="Phone Number*" type="tel" required value={phone} onChange={handlePhoneChange(setPhone)} placeholder="Enter phone number" />
                <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email address" />
                <Input id="emergencyContact" label="Emergency Contact*" type="tel" required value={emergencyContact} onChange={handlePhoneChange(setEmergencyContact)} placeholder="Enter emergency contact" />
                <div className="md:col-span-2">
                    <AddressInput id="address" label="Address*" value={address} onChange={setAddress} placeholder="Enter patient's full address" required/>
                </div>
                <Input id="primaryDiagnosis" label="Primary Diagnosis*" type="text" required value={primaryDiagnosis} onChange={e => setPrimaryDiagnosis(e.target.value)} placeholder="Enter primary diagnosis" />
                <div className="md:col-span-2">
                    <TagInput label="Allergies" tags={allergies} setTags={setAllergies} placeholder="Enter known allergies" />
                </div>
                <div className="md:col-span-2">
                    <Textarea id="medicalHistory" label="Medical History" value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} placeholder="Enter relevant medical history" />
                </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg">
            <Button type="button" variant="light" onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="success" disabled={loading}>{loading ? 'Adding Patient...' : 'Add Patient'}</Button>
          </div>
        </form>
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

const ActionsDropdown: React.FC<{ onView: () => void; onDelete: () => void; onToggleStatus: () => void; isInactive: boolean }> = ({ onView, onDelete, onToggleStatus, isInactive }) => {
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
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                        <button onClick={onView} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FontAwesomeIcon icon={faEye} className="w-4 h-4 mr-3" /> View Details
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

// Helper function to escape CSV cell content
const escapeCsvCell = (cell: any): string => {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
};

const PatientCard: React.FC<{ patient: PatientDocument; nextVisitDate?: Date }> = ({ patient, nextVisitDate }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleCardClick = () => {
        navigate(`/hospitals/${user?.hospitalSlug}/patients/${patient.id}`);
    };

    return (
        <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200 flex flex-col text-center items-center p-4"
            onClick={handleCardClick}
        >
            <Avatar
                avatar={
                    patient.profilePhotoUrl
                        ? { type: 'image', value: patient.profilePhotoUrl }
                        : { type: 'initials', value: patient.name.split(' ').map(n => n[0]).join('').toUpperCase(), color: 'bg-indigo-500' }
                }
                size="lg" className="!h-24 !w-24 text-3xl"
            />
            <h3 className="font-bold text-lg mt-3 text-slate-800 dark:text-slate-100 truncate w-full">{patient.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{patient.patientId}</p>
             {nextVisitDate && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-2 truncate" title={`Next Visit: ${formatDate(nextVisitDate)}`}>
                    Next Visit: {formatDate(nextVisitDate)}
                </p>
            )}
            <div className="mt-auto pt-2">
                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    patient.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                    {patient.status}
                </span>
            </div>
        </div>
    );
};


import { useFormatting } from '@/utils/formatting';

const PatientsScreen: React.FC = () => {
  const { user, patients, consultations, deletePatient, updatePatientStatus, loading, currentLocation } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { formatDate } = useFormatting();
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmButtonText: string; confirmButtonVariant: 'danger' | 'primary' } | null>(null);
  
  // UI State
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePaginationSettings();

  const canWrite = user?.permissions.patients === 'write';
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateRangeStart, dateRangeEnd, view, currentLocation]);
  
  const nextVisitMap = useMemo(() => {
    const map = new Map<string, Date>();
    const sortedConsultations = [...consultations].sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
    sortedConsultations.forEach(c => {
        if (c.nextVisitDate && !map.has(c.patientId)) {
            map.set(c.patientId, c.nextVisitDate.toDate());
        }
    });
    return map;
  }, [consultations]);

  const handleRowClick = (patientId: string) => {
    navigate(`/hospitals/${user?.hospitalSlug}/patients/${patientId}`);
  };

  const handleDeleteRequest = (patient: PatientDocument) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Patient',
        message: `Are you sure you want to delete ${patient.name}? This action cannot be undone.`,
        onConfirm: () => handleDeletePatient(patient.id),
        confirmButtonText: 'Delete',
        confirmButtonVariant: 'danger'
    });
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
        await deletePatient(patientId);
        addToast('Patient deleted successfully!', 'success');
    } catch (error) {
        addToast('Failed to delete patient.', 'error');
    } finally {
        setConfirmModal(null);
    }
  };

  const handleToggleStatusRequest = (patient: PatientDocument) => {
    const newStatus = patient.status === 'active' ? 'inactive' : 'active';
    setConfirmModal({
        isOpen: true,
        title: `Mark as ${newStatus}`,
        message: `Are you sure you want to mark ${patient.name} as ${newStatus}?`,
        onConfirm: () => handleToggleStatus(patient.id, newStatus),
        confirmButtonText: `Mark as ${newStatus}`,
        confirmButtonVariant: 'primary'
    });
  };

  const handleToggleStatus = async (patientId: string, newStatus: 'active' | 'inactive') => {
      try {
          await updatePatientStatus(patientId, newStatus);
          addToast(`Patient status updated to ${newStatus}.`, 'success');
      } catch (error) {
          addToast('Failed to update patient status.', 'error');
      } finally {
          setConfirmModal(null);
      }
  };
  
  const filteredPatients = useMemo(() => {
    if (!currentLocation) return [];
    return patients
      .filter(p => p.locationId === currentLocation.id)
      .filter(p => {
        if (statusFilter === 'all') return true;
        return p.status === statusFilter;
      })
      .filter(p => {
        const start = dateRangeStart ? new Date(dateRangeStart) : null;
        const end = dateRangeEnd ? new Date(dateRangeEnd) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        if (!start && !end) return true;
        const nextVisit = nextVisitMap.get(p.id);
        if (!nextVisit) return false;
        if (start && end) return nextVisit >= start && nextVisit <= end;
        if (start) return nextVisit >= start;
        if (end) return nextVisit <= end;
        return true;
      })
      .filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) ||
               p.patientId.toLowerCase().includes(term) ||
               p.phone.includes(term);
      });
  }, [patients, currentLocation, statusFilter, dateRangeStart, dateRangeEnd, searchTerm, nextVisitMap]);

  const totalPages = useMemo(() => Math.ceil(filteredPatients.length / itemsPerPage), [filteredPatients.length, itemsPerPage]);
  
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage, itemsPerPage]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  if (!currentLocation) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <FontAwesomeIcon icon={faUsers} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Location Selected</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Please select a hospital location from the header to view and manage patients.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {confirmModal && (
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(null)}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmButtonText={confirmModal.confirmButtonText}
                confirmButtonVariant={confirmModal.confirmButtonVariant}
            />
        )}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm mb-6">
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full md:w-1/3">
                <Input label="" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, ID, phone..." icon={<FontAwesomeIcon icon={faSearch} />} />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">View:</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border dark:border-slate-700">
                    <Button size="sm" variant={view === 'grid' ? 'light' : 'ghost'} onClick={() => setView('grid')} className="!rounded-md shadow-sm"><FontAwesomeIcon icon={faThLarge} /></Button>
                    <Button size="sm" variant={view === 'list' ? 'light' : 'ghost'} onClick={() => setView('list')} className="!rounded-md"><FontAwesomeIcon icon={faList} /></Button>
                </div>
            </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </Select>
            <Input label="Next Visit After" type="date" value={dateRangeStart} onChange={e => setDateRangeStart(e.target.value)} />
            <Input label="Next Visit Before" type="date" value={dateRangeEnd} onChange={e => setDateRangeEnd(e.target.value)} />
            <Button variant="light" onClick={clearFilters}>Clear Filters</Button>
        </div>
      </div>
      
      {loading && patients.length === 0 ? (
        <p className="text-center py-16 text-slate-500">Loading patients...</p>
      ) : view === 'list' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <TableHeader>Patient</TableHeader>
                  <TableHeader>Contact</TableHeader>
                  <TableHeader>Registered On</TableHeader>
                  <TableHeader>Next Visit Recommended</TableHeader>
                  <TableHeader>Status</TableHeader>
                  {canWrite && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedPatients.map(patient => (
                  <tr key={patient.id} onClick={() => handleRowClick(patient.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center">
                        <Avatar avatar={patient.profilePhotoUrl ? { type: 'image', value: patient.profilePhotoUrl } : { type: 'initials', value: patient.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-indigo-500' }} />
                        <div className="ml-4"><div className="text-sm font-medium text-slate-900 dark:text-slate-100">{patient.name}</div><div className="text-sm text-slate-500">{patient.patientId}</div></div>
                    </div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{patient.phone}{patient.email && <div className="text-xs">{patient.email}</div>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatDate(patient.registeredAt.toDate())}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-medium text-blue-600">{nextVisitMap.get(patient.id) ? formatDate(nextVisitMap.get(patient.id)!) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${patient.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>{patient.status}</span></td>
                    {canWrite && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}><ActionsDropdown onView={() => handleRowClick(patient.id)} onDelete={() => handleDeleteRequest(patient)} onToggleStatus={() => handleToggleStatusRequest(patient)} isInactive={patient.status === 'inactive'} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} totalItems={filteredPatients.length} itemsOnPage={paginatedPatients.length}/>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {paginatedPatients.map(patient => <PatientCard key={patient.id} patient={patient} nextVisitDate={nextVisitMap.get(patient.id)} />)}
          </div>
          {filteredPatients.length > 0 && <div className="mt-6"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} totalItems={filteredPatients.length} itemsOnPage={paginatedPatients.length}/></div>}
        </>
      )}
      {filteredPatients.length === 0 && !loading && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <FontAwesomeIcon icon={faUsers} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Patients Found for {currentLocation.name}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your search or filter returned no results for this location.</p>
        </div>
      )}
    </div>
  );
};

export default PatientsScreen;