import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { DoctorDocument, DoctorUpdateData, DayOfWeek, Treatment, WorkingHours, UserDocument } from '../types';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPhone, faEnvelope, faStethoscope, faTimes, faLock, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { db } from '../services/firebase';
import PhotoCaptureInput from '../components/ui/PhotoCaptureInput';
// FIX: Add MultiSelect to handle assigned locations.
import MultiSelect, { MultiSelectOption } from '../components/ui/MultiSelect';


const ALL_DAYS: { key: DayOfWeek, display: string }[] = [
    { key: 'Sun', display: 'Sunday' }, { key: 'Mon', display: 'Monday' }, { key: 'Tue', display: 'Tuesday' },
    { key: 'Wed', display: 'Wednesday' }, { key: 'Thu', display: 'Thursday' }, { key: 'Fri', display: 'Friday' },
    { key: 'Sat', display: 'Saturday' },
];

const ResetPasswordModal: React.FC<{
  userEmail: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}> = ({ userEmail, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await onConfirm(password);
            onClose();
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Reset Password</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Set a new password for {userEmail}.
                    </p>
                    <div className="mt-4">
                        <Input 
                            id="new-password" 
                            label="New Password" 
                            type="password" 
                            required 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} 
                        />
                    </div>
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                    <div className="flex justify-end space-x-2 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Set New Password'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Reusable components copied from DoctorsScreen
const TreatmentsMultiSelect: React.FC<{
  allTreatments: Treatment[]; selectedTreatmentIds: string[]; onChange: (ids: string[]) => void; disabled?: boolean;
}> = ({ allTreatments, selectedTreatmentIds, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedTreatments = useMemo(() => allTreatments.filter(t => t.id && selectedTreatmentIds.includes(t.id)), [allTreatments, selectedTreatmentIds]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleTreatment = (treatmentId: string) => onChange(selectedTreatmentIds.includes(treatmentId) ? selectedTreatmentIds.filter(id => id !== treatmentId) : [...selectedTreatmentIds, treatmentId]);
  const removeTreatment = (treatmentId: string) => onChange(selectedTreatmentIds.filter(id => id !== treatmentId));

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Treatments</label>
      <div className="relative" ref={containerRef}>
        <div onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 min-h-[46px] ${disabled ? 'bg-slate-100 dark:bg-slate-800 opacity-70' : 'cursor-pointer'}`}>
          <div className="flex flex-wrap gap-2 items-center">
            {selectedTreatments.length > 0 ? selectedTreatments.map(t => (
              <div key={t.id} className="flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium px-2.5 py-1 rounded-full">
                <span>{t.name}</span>
                {!disabled && <button type="button" onClick={(e) => { e.stopPropagation(); if (t.id) removeTreatment(t.id); }} className="ml-2 -mr-1 flex-shrink-0 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-800 hover:text-blue-600 focus:outline-none"><FontAwesomeIcon icon={faTimes} className="h-3 w-3" /></button>}
              </div>
            )) : <span className="text-slate-400 dark:text-slate-500">Select treatments...</span>}
          </div>
        </div>
        {isOpen && !disabled && <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">{allTreatments.length > 0 ? allTreatments.map(t => (<label key={t.id} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><input type="checkbox" checked={!!t.id && selectedTreatmentIds.includes(t.id)} onChange={() => t.id && toggleTreatment(t.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span className="ml-3">{t.name}</span></label>)) : <div className="p-4 text-sm text-slate-500">No treatments found.</div>}</div>}
      </div>
    </div>
  );
};
const DayOfWeekSelector: React.FC<{ selectedDays: DayOfWeek[], onChange: (days: DayOfWeek[]) => void, disabled?: boolean }> = ({ selectedDays, onChange, disabled }) => {
    const toggleDay = (day: DayOfWeek) => onChange(selectedDays.includes(day) ? selectedDays.filter(d => d !== day) : [...selectedDays, day]);
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Working Days*</label>
            <div className="flex flex-wrap gap-2">{ALL_DAYS.map(({ key, display }) => (<button type="button" key={key} onClick={() => toggleDay(key)} disabled={disabled} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedDays.includes(key) ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}>{display}</button>))}</div>
        </div>
    );
};
const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3></div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">{footer}</div>}
    </div>
);


const DoctorDetailsScreen: React.FC = () => {
    const { doctorId } = useParams<{ doctorId: string }>();
    const navigate = useNavigate();
    const { user: currentUser, getDoctorById, updateDoctor, deleteDoctor, getTreatments, updateDoctorStatus, resetUserPasswordByAdmin, hospitalLocations } = useAuth();
    
    const [doctor, setDoctor] = useState<DoctorDocument | null>(null);
    const [associatedUser, setAssociatedUser] = useState<UserDocument | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [allTreatments, setAllTreatments] = useState<Treatment[]>([]);
    const { addToast } = useToast();
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmButtonText: string; variant: 'primary' | 'danger'; } | null>(null);

    // FIX: Add 'assignedLocations' to the initial form data state to match the DoctorUpdateData type.
    const [formData, setFormData] = useState<Omit<DoctorUpdateData, 'profilePhoto'>>({ name: '', specialty: '', phone: '', email: '', workingDays: [], workingHours: {}, slotInterval: 30, assignedTreatments: [], employmentType: 'Full-time', assignedLocations: [] });
    const [newProfilePhoto, setNewProfilePhoto] = useState<File | string | null>(null);
    const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

    const locationOptions = useMemo((): MultiSelectOption[] =>
        hospitalLocations.map(loc => ({ value: loc.id, label: loc.name })),
        [hospitalLocations]
    );

    const populateForm = useCallback((docData: DoctorDocument) => {
        // FIX: Include 'assignedLocations' when populating the form to ensure it's available for updates.
        setFormData({ name: docData.name, specialty: docData.specialty, phone: docData.phone, email: docData.email, workingDays: docData.workingDays, workingHours: docData.workingHours, slotInterval: docData.slotInterval, assignedTreatments: docData.assignedTreatments, employmentType: docData.employmentType, assignedLocations: docData.assignedLocations || [] });
        setNewProfilePhoto(null);
        setIsPhotoRemoved(false);
    }, []);

    const fetchDoctor = useCallback(async () => {
        if (!doctorId) return;
        setPageLoading(true);
        try {
            const docData = await getDoctorById(doctorId);
            if (docData) {
                setDoctor(docData);
                populateForm(docData);
                if (currentUser?.permissions.doctors === 'write') {
                    getTreatments().then(setAllTreatments);
                     const usersRef = db.collection('users');
                     const userQuery = await usersRef.where('doctorId', '==', doctorId).limit(1).get();
                     if (!userQuery.empty) {
                         const userDoc = userQuery.docs[0];
                         setAssociatedUser({ id: userDoc.id, ...userDoc.data() } as UserDocument);
                     } else {
                         setAssociatedUser(null);
                     }
                }
            } else {
                addToast('Doctor not found.', 'error');
                navigate(`/hospitals/${currentUser?.hospitalSlug}/doctors`);
            }
        } catch (e) {
            addToast('Failed to fetch doctor data.', 'error');
        } finally {
            setPageLoading(false);
        }
    }, [doctorId, getDoctorById, populateForm, addToast, navigate, currentUser, getTreatments]);

    useEffect(() => { fetchDoctor(); }, [fetchDoctor]);

    const handleUpdate = async () => {
        if (!doctorId) return;
        setActionLoading('update');
        try {
            const updateData: DoctorUpdateData = { ...formData };
            if (newProfilePhoto) {
                updateData.profilePhoto = newProfilePhoto;
            } else if (isPhotoRemoved) {
                updateData.profilePhoto = null;
            }

            await updateDoctor(doctorId, updateData);
            await fetchDoctor();
            setIsEditing(false);
            addToast('Doctor details updated successfully!', 'success');
        } catch (err) {
            addToast('Failed to update doctor.', 'error');
            if (doctor) populateForm(doctor);
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleStatusChange = () => {
        if (!doctorId || !doctor) return;
        const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
        setConfirmation({
            isOpen: true,
            title: `Mark as ${newStatus}`,
            message: `Are you sure you want to mark this doctor as ${newStatus}?`,
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading('status');
                try {
                    await updateDoctorStatus(doctorId, newStatus);
                    await fetchDoctor();
                    addToast(`Doctor marked as ${newStatus}.`, 'success');
                } catch (err) {
                    addToast('Failed to update status.', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: `Mark as ${newStatus}`,
            variant: 'primary',
        });
    };

    const handleConfirmPasswordReset = async (newPassword: string) => {
        if (!associatedUser || !associatedUser.id) {
            addToast("Associated user account not found.", "error");
            return;
        }
        setActionLoading('password');
        try {
            await resetUserPasswordByAdmin(associatedUser.id, newPassword);
            setIsResetModalOpen(false);
            addToast(`Password for ${doctor?.email} has been reset.`, 'success');
        } catch (err) {
            addToast('Failed to reset password.', 'error');
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleDelete = () => {
        if (!doctorId) return;
        setConfirmation({
            isOpen: true, title: 'Delete Doctor', message: 'Are you sure you want to permanently delete this doctor? This action cannot be undone.',
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading('delete');
                try {
                    await deleteDoctor(doctorId);
                    addToast('Doctor deleted successfully!', 'success');
                    navigate(`/hospitals/${currentUser?.hospitalSlug}/doctors`);
                } catch (err) {
                    addToast('An error occurred while deleting the doctor.', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: 'Delete Doctor', variant: 'danger',
        });
    };

    const handleWorkingDaysChange = (days: DayOfWeek[]) => {
      setFormData(prev => {
          const newWorkingHours: WorkingHours = {};
          days.forEach(day => { newWorkingHours[day] = prev.workingHours[day] || { start: '09:00', end: '17:00' }; });
          return { ...prev, workingDays: days, workingHours: newWorkingHours };
      });
    };
    const handleTimeChange = (day: DayOfWeek, part: 'start' | 'end', value: string) => setFormData(prev => ({...prev, workingHours: {...prev.workingHours, [day]: { ...prev.workingHours[day], [part]: value }}}));

    if (pageLoading && !doctor) return <div className="p-8">Loading doctor details...</div>;
    if (!doctor) return <div className="p-8">Doctor could not be loaded.</div>;
    
    const canWrite = currentUser?.permissions.doctors === 'write';
    const isActionInProgress = !!actionLoading;

    return (
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="mb-6 lg:col-span-3">
                <Button variant="light" onClick={() => navigate(-1)}>
                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back
                </Button>
            </div>
            {isResetModalOpen && doctor && (
                <ResetPasswordModal 
                    userEmail={doctor.email}
                    onClose={() => setIsResetModalOpen(false)}
                    onConfirm={handleConfirmPasswordReset}
                />
            )}
            {confirmation?.isOpen && <ConfirmationModal isOpen={confirmation.isOpen} onClose={() => setConfirmation(null)} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} confirmButtonText={confirmation.confirmButtonText} confirmButtonVariant={confirmation.variant} loading={isActionInProgress} />}
            
            <div className="lg:col-span-2 space-y-8">
                <DetailCard 
                    title="Doctor Information"
                    footer={canWrite ? (isEditing ? (
                        <div className="flex justify-end gap-2">
                            <Button variant="light" onClick={() => { setIsEditing(false); if (doctor) populateForm(doctor); }} disabled={actionLoading === 'update'}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate} disabled={isActionInProgress}>{actionLoading === 'update' ? 'Saving...' : 'Save Changes'}</Button>
                        </div>
                    ) : (<Button variant="primary" onClick={() => setIsEditing(true)}>Edit Profile</Button>)) : undefined}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isEditing && (
                            <div className="md:col-span-2">
                                <PhotoCaptureInput onPhotoTaken={(photo) => {
                                    setNewProfilePhoto(photo);
                                    setIsPhotoRemoved(!photo);
                                }} />
                            </div>
                        )}
                        <Input id="name" label="Full Name*" type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={!isEditing} icon={<FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-400" />} />
                        <Input id="specialty" label="Specialty*" type="text" required value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} disabled={!isEditing} icon={<FontAwesomeIcon icon={faStethoscope} className="h-5 w-5 text-gray-400" />} />
                        <Input id="phone" label="Phone*" type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled={!isEditing} icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
                        <Input id="email" label="Email*" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!isEditing} icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
                        <div className="md:col-span-2">
                            <MultiSelect
                                label="Assigned Locations"
                                options={locationOptions}
                                selectedValues={formData.assignedLocations}
                                onChange={ids => setFormData({...formData, assignedLocations: ids})}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="md:col-span-2"><DayOfWeekSelector selectedDays={formData.workingDays} onChange={handleWorkingDaysChange} disabled={!isEditing} /></div>
                        {formData.workingDays.length > 0 && isEditing && (
                            <div className="md:col-span-2 mt-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 bg-slate-50 dark:bg-slate-800/50">
                                <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2">Set Working Hours</h4>
                                {ALL_DAYS.filter(d => formData.workingDays.includes(d.key)).map(({ key, display }) => (
                                    <div key={key} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
                                        <span className="font-medium text-sm">{display}</span>
                                        <Input id={`start-${key}`} label="Start Time" type="time" value={formData.workingHours[key]?.start || ''} onChange={(e) => handleTimeChange(key, 'start', e.target.value)} required />
                                        <Input id={`end-${key}`} label="End Time" type="time" value={formData.workingHours[key]?.end || ''} onChange={(e) => handleTimeChange(key, 'end', e.target.value)} required />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="md:col-span-2"><TreatmentsMultiSelect allTreatments={allTreatments} selectedTreatmentIds={formData.assignedTreatments} onChange={ids => setFormData({...formData, assignedTreatments: ids})} disabled={!isEditing} /></div>
                        <Select id="employmentType" label="Employment Type*" required value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value as any})} disabled={!isEditing}>
                            <option>Full-time</option><option>Part-time</option>
                        </Select>
                        <Input id="slotInterval" label="Slot Interval (minutes)*" type="number" required value={formData.slotInterval} onChange={e => setFormData({...formData, slotInterval: parseInt(e.target.value, 10) || 0})} disabled={!isEditing} />
                    </div>
                </DetailCard>

                {canWrite && (
                    <DetailCard title="Danger Zone">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">This action is permanent and cannot be undone.</p>
                        <Button variant="danger" onClick={handleDelete} disabled={isActionInProgress}>{actionLoading === 'delete' ? 'Deleting...' : 'Delete Doctor Record'}</Button>
                    </DetailCard>
                )}
            </div>

            <div className="space-y-8">
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col items-center text-center">
                    <Avatar 
                        avatar={
                            doctor.profilePhotoUrl
                            ? { type: 'image', value: doctor.profilePhotoUrl }
                            : { type: 'initials', value: doctor.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-teal-500' }
                        } 
                        size="lg" 
                    />
                    <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-200">{doctor.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.email}</p>
                    <span className={`mt-2 px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doctor.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                        {doctor.status}
                    </span>
                </div>
                {canWrite && (
                    <DetailCard title="Actions">
                        <div className="space-y-3 flex flex-col">
                            <Button variant="light" onClick={handleStatusChange} disabled={isActionInProgress}>
                                {actionLoading === 'status' ? 'Updating...' : doctor.status === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
                            </Button>
                            <Button
                                variant="light"
                                onClick={() => setIsResetModalOpen(true)}
                                disabled={isActionInProgress || !associatedUser || associatedUser.status === 'invited'}
                                title={!associatedUser ? "No user account linked to this doctor" : associatedUser.status === 'invited' ? "User has not completed signup" : ""}
                            >
                                {actionLoading === 'password' ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </div>
                    </DetailCard>
                )}
            </div>
        </div>
    );
};

export default DoctorDetailsScreen;
