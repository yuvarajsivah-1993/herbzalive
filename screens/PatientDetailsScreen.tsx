import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// FIX: Update react-router-dom imports for v6 compatibility
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PatientDocument, PatientUpdateData, PatientMedicalInfo, PatientDocumentFile, PatientNote, Appointment, Consultation, AppointmentStatus } from '../types';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import TagInput from '../components/ui/TagInput';
import AddressInput from '../components/ui/AddressInput';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPhone, faEnvelope, faVenusMars, faBirthdayCake, faFirstAid, faNotesMedical, faMapMarkerAlt, faUserShield, faIdCard, faCalendarCheck, faRulerVertical, faWeight, faTint, faHeartbeat, faWaveSquare, faFileMedical, faStickyNote, faCalendarAlt, faUpload, faFilePdf, faTrash, faExternalLinkAlt, faPaperPlane, faChartLine, faStethoscope } from '@fortawesome/free-solid-svg-icons';
import { Timestamp } from 'firebase/firestore';
import Pagination from '../components/ui/Pagination';
import { db } from '../services/firebase';
import PhotoCaptureInput from '../components/ui/PhotoCaptureInput';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';


const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
        {footer && (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">
                {footer}
            </div>
        )}
    </div>
);

const PhotoPreviewModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
                <img src={imageUrl} alt="Patient full size" className="w-auto h-auto max-w-full max-h-full rounded-lg" />
            </div>
        </div>
    );
};

// New Component for Patient Journey Timeline
interface TimelineEvent {
  date: Date;
  type: 'registration' | 'diagnosis' | 'treatment';
  title: string;
  description: string;
  icon: IconDefinition;
}

const PatientJourneyTimeline: React.FC<{
  patient: PatientDocument;
  appointments: Appointment[];
  consultations: Consultation[];
  formatDate: (date: Date) => string;
}> = ({ patient, appointments, consultations, formatDate }) => {

  const events = useMemo((): TimelineEvent[] => {
    const allEvents: TimelineEvent[] = [];

    // 1. Registration Event
    allEvents.push({
      date: patient.registeredAt.toDate(),
      type: 'registration',
      title: 'Patient Registered',
      description: `Registered with Patient ID: ${patient.patientId}`,
      icon: faUser,
    });

    // 2. Appointment Events
    appointments.forEach(app => {
      allEvents.push({
        date: app.start.toDate(),
        type: 'treatment',
        title: `Treatment: ${app.treatmentName}`,
        description: `With Dr. ${app.doctorName}. Status: ${app.status}`,
        icon: faStethoscope,
      });
    });

    // 3. Diagnosis Events
    consultations.forEach(con => {
      if (con.diagnosis && con.diagnosis.trim() !== '') {
        allEvents.push({
          date: con.createdAt.toDate(),
          type: 'diagnosis',
          title: `Diagnosis Recorded`,
          description: con.diagnosis,
          icon: faNotesMedical,
        });
      }
    });

    // Sort all events by date, descending
    return allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [patient, appointments, consultations]);

  if (events.length <= 1) {
    return (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
            <FontAwesomeIcon icon={faChartLine} className="h-12 w-12 mb-4 text-slate-300 dark:text-slate-700" />
            <h3 className="text-lg font-semibold">Not enough data for a timeline.</h3>
            <p className="text-sm">More events like appointments and diagnoses will appear here.</p>
        </div>
    );
  }

  return (
    <DetailCard title="Patient Journey">
        <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 pl-8 py-4">
            {events.map((event, index) => {
                let iconBgColor = 'bg-slate-400';
                if (event.type === 'registration') iconBgColor = 'bg-blue-500';
                if (event.type === 'treatment') iconBgColor = 'bg-teal-500';
                if (event.type === 'diagnosis') iconBgColor = 'bg-indigo-500';
                
                return (
                    <div key={index} className="mb-10 relative">
                        {/* Dot on the timeline */}
                        <div className={`absolute -left-[45px] top-1 h-6 w-6 ${iconBgColor} rounded-full flex items-center justify-center ring-8 ring-white dark:ring-slate-900`}>
                            <FontAwesomeIcon icon={event.icon} className="h-3 w-3 text-white" />
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                            <time className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {formatDate(event.date)}
                            </time>
                            <h4 className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-200">{event.title}</h4>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{event.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    </DetailCard>
  );
};




import { useFormatting } from '@/utils/formatting';

const PatientDetailsScreen: React.FC = () => {
    const { patientId } = useParams<{ patientId: string }>();
    // FIX: Use navigate for v6 compatibility
    const navigate = useNavigate();
    const { user: currentUser, updatePatient, deletePatient, updatePatientStatus, addPatientNote, deletePatientNote, uploadPatientDocument, deletePatientDocument } = useAuth();
    
    const [patient, setPatient] = useState<PatientDocument | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const { addToast } = useToast();
    const { formatDate, formatDateTime } = useFormatting();
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmButtonText: string; variant: 'primary' | 'danger'; } | null>(null);
    const [activeTab, setActiveTab] = useState('info');
    const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
    
    // Notes state
    const [newNote, setNewNote] = useState('');
    const [noteLoading, setNoteLoading] = useState(false);

    // Documents state
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination states
    const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
    const [documentsItemsPerPage, setDocumentsItemsPerPage] = useState(5);
    const [notesCurrentPage, setNotesCurrentPage] = useState(1);
    const [notesItemsPerPage, setNotesItemsPerPage] = useState(5);
    const [appointmentsCurrentPage, setAppointmentsCurrentPage] = useState(1);
    const [appointmentsItemsPerPage, setAppointmentsItemsPerPage] = useState(10);


    // Form state
    const [formData, setFormData] = useState<PatientUpdateData>({
        name: '', gender: 'Male', dateOfBirth: '', phone: '', email: '', emergencyContact: '', address: '', primaryDiagnosis: '', allergies: [], medicalHistory: '', medicalInfo: {}
    });

    const populateForm = useCallback((patientData: PatientDocument) => {
        setFormData({
            name: patientData.name,
            gender: patientData.gender,
            dateOfBirth: patientData.dateOfBirth,
            phone: patientData.phone,
            email: patientData.email || '',
            emergencyContact: patientData.emergencyContact,
            address: patientData.address,
            primaryDiagnosis: patientData.primaryDiagnosis,
            allergies: patientData.allergies || [],
            medicalHistory: patientData.medicalHistory || '',
            medicalInfo: patientData.medicalInfo || {},
        });
    }, []);

    useEffect(() => {
        if (!patientId || !currentUser?.hospitalId) {
            return;
        }

        setPageLoading(true);
        const unsubscribers: (() => void)[] = [];

        // Patient Document Listener
        const patientUnsub = db.collection('patients').doc(patientId)
            .onSnapshot(doc => {
                if (doc.exists && doc.data()?.hospitalId === currentUser.hospitalId) {
                    const patientData = { id: doc.id, ...doc.data() } as PatientDocument;
                    setPatient(patientData);
                    populateForm(patientData);
                } else {
                    addToast("Patient not found or you don't have permission to view it.", "error");
                    navigate(`/hospitals/${currentUser?.hospitalSlug}/patients`);
                }
                setPageLoading(false);
            }, err => {
                console.error("Patient listener error:", err);
                addToast("Failed to load patient data in real-time.", "error");
                setPageLoading(false);
                navigate(`/hospitals/${currentUser?.hospitalSlug}/patients`);
            });
        unsubscribers.push(patientUnsub);

        // Appointments Listener
        const appointmentsUnsub = db.collection("appointments")
            .where("hospitalId", "==", currentUser.hospitalId)
            .where("patientId", "==", patientId)
            .onSnapshot(snapshot => {
                const appointmentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
                appointmentData.sort((a, b) => b.start.seconds - a.start.seconds);
                setAppointments(appointmentData);
            }, err => {
                console.error("Appointments listener error:", err);
                addToast("Failed to load appointments in real-time.", "error");
            });
        unsubscribers.push(appointmentsUnsub);

        // Consultations Listener
        const consultationsUnsub = db.collection("consultations")
            .where("hospitalId", "==", currentUser.hospitalId)
            .where("patientId", "==", patientId)
            .onSnapshot(snapshot => {
                const consultationData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation));
                consultationData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
                setConsultations(consultationData);
            }, err => {
                console.error("Consultations listener error:", err);
                addToast("Failed to load consultations in real-time.", "error");
            });
        unsubscribers.push(consultationsUnsub);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [patientId, currentUser?.hospitalId, currentUser?.hospitalSlug, addToast, navigate, populateForm]);

    const upcomingAppointments = useMemo(() => {
        const now = new Date();
        return appointments
            .filter(app => app.start.toDate() > now && app.status !== 'Cancelled' && app.status !== 'No Show')
            .sort((a, b) => a.start.seconds - b.start.seconds);
    }, [appointments]);

    const pastAppointments = useMemo(() => {
        const now = new Date();
        return appointments.filter(app => app.start.toDate() <= now);
    }, [appointments]);

    const nextVisitDate = useMemo(() => {
        // Consultations are already sorted descending by created date in the context
        const latestConsultationWithNextVisit = consultations.find(c => c.nextVisitDate);
        return latestConsultationWithNextVisit?.nextVisitDate?.toDate() || null;
    }, [consultations]);

    // Paginated Data
    const sortedDocuments = useMemo(() => {
        if (!patient?.documents) return [];
        return [...patient.documents].sort((a,b) => b.uploadedAt.seconds - a.uploadedAt.seconds);
    }, [patient?.documents]);
    
    const totalDocumentPages = useMemo(() => Math.ceil(sortedDocuments.length / documentsItemsPerPage), [sortedDocuments.length, documentsItemsPerPage]);
    const paginatedDocuments = useMemo(() => {
        const startIndex = (documentsCurrentPage - 1) * documentsItemsPerPage;
        return sortedDocuments.slice(startIndex, startIndex + documentsItemsPerPage);
    }, [sortedDocuments, documentsCurrentPage, documentsItemsPerPage]);

    const sortedNotes = useMemo(() => {
        if (!patient?.notes) return [];
        return [...patient.notes].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [patient?.notes]);
    
    const totalNotePages = useMemo(() => Math.ceil(sortedNotes.length / notesItemsPerPage), [sortedNotes.length, notesItemsPerPage]);
    const paginatedNotes = useMemo(() => {
        const startIndex = (notesCurrentPage - 1) * notesItemsPerPage;
        return sortedNotes.slice(startIndex, startIndex + notesItemsPerPage);
    }, [sortedNotes, notesCurrentPage, notesItemsPerPage]);
    
    const totalAppointmentPages = useMemo(() => Math.ceil(pastAppointments.length / appointmentsItemsPerPage), [pastAppointments.length, appointmentsItemsPerPage]);
    const paginatedAppointments = useMemo(() => {
        const startIndex = (appointmentsCurrentPage - 1) * appointmentsItemsPerPage;
        return pastAppointments.slice(startIndex, startIndex + appointmentsItemsPerPage);
    }, [pastAppointments, appointmentsCurrentPage, appointmentsItemsPerPage]);


    const handleInputChange = (field: keyof Omit<PatientUpdateData, 'medicalInfo'>, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMedicalInfoChange = (field: keyof PatientMedicalInfo, value: any) => {
        setFormData(prev => ({ ...prev, medicalInfo: { ...prev.medicalInfo, [field]: value } }));
    };

    const handlePhotoChange = (photo: File | string | null) => {
        setFormData(prev => ({ ...prev, profilePhoto: photo }));
    };

    const handleUpdate = async () => {
        if (!patientId) return;
        setActionLoading('update');
        try {
            await updatePatient(patientId, formData);
            setIsEditing(false);
            addToast('Patient details updated successfully!', 'success');
        } catch (err) {
            addToast('Failed to update patient.', 'error');
            if (patient) populateForm(patient); // Revert changes on fail
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleStatusChange = () => {
        if (!patientId || !patient) return;
        const newStatus = patient.status === 'active' ? 'inactive' : 'active';
        setConfirmation({
            isOpen: true,
            title: `Mark as ${newStatus}`,
            message: `Are you sure you want to mark this patient as ${newStatus}?`,
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading('status');
                try {
                    await updatePatientStatus(patientId, newStatus);
                    setPatient(prev => prev ? { ...prev, status: newStatus } : null);
                    addToast(`Patient marked as ${newStatus}.`, 'success');
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
    
    const handleDelete = () => {
        if (!patientId) return;
        setConfirmation({
            isOpen: true,
            title: 'Delete Patient',
            message: 'Are you sure you want to permanently delete this patient? This action cannot be undone.',
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading('delete');
                try {
                    await deletePatient(patientId);
                    addToast('Patient deleted successfully!', 'success');
                    // FIX: Use navigate for v6 navigation
                    navigate(`/hospitals/${currentUser?.hospitalSlug}/patients`);
                } catch (err) {
                    addToast('An error occurred while deleting the patient.', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: 'Delete Patient',
            variant: 'danger',
        });
    };

    const handleAddNote = async () => {
        if (!patientId || !newNote.trim()) return;
        setNoteLoading(true);
        try {
            await addPatientNote(patientId, newNote);
            setNewNote('');
            addToast('Note added successfully.', 'success');
        } catch (error) {
            addToast('Failed to add note.', 'error');
        } finally {
            setNoteLoading(false);
        }
    };
    
    const handleDeleteNoteRequest = (note: PatientNote) => {
        if (!patientId) return;
        setConfirmation({
            isOpen: true,
            title: 'Delete Note',
            message: 'Are you sure you want to permanently delete this note?',
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading(`delete-note-${note.id}`);
                try {
                    await deletePatientNote(patientId, note.id);
                    addToast('Note deleted successfully.', 'success');
                } catch (err) {
                    addToast('Failed to delete note.', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: 'Delete Note',
            variant: 'danger',
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !patientId) return;
        setUploadingFile(true);
        try {
            await uploadPatientDocument(patientId, file);
            addToast('Document uploaded successfully.', 'success');
        } catch (error) {
            addToast('Failed to upload document.', 'error');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteDocument = (docFile: PatientDocumentFile) => {
         if (!patientId) return;
         setConfirmation({
            isOpen: true,
            title: 'Delete Document',
            message: `Are you sure you want to delete the file "${docFile.name}"? This action is permanent.`,
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading(`delete-doc-${docFile.id}`);
                try {
                    await deletePatientDocument(patientId, docFile);
                    addToast('Document deleted successfully.', 'success');
                } catch (err) {
                    addToast('Failed to delete document.', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: 'Delete Document',
            variant: 'danger',
        });
    };

    const calculateAge = (dob: string): number | string => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    
    const calculateBMI = useMemo(() => {
        const heightM = Number(formData.medicalInfo?.height) / 100;
        const weightKg = Number(formData.medicalInfo?.weight);
        if (heightM > 0 && weightKg > 0) {
            return (weightKg / (heightM * heightM)).toFixed(2);
        }
        return 'N/A';
    }, [formData.medicalInfo?.height, formData.medicalInfo?.weight]);

    const getStatusBadge = (status: AppointmentStatus) => {
        const baseClasses = "px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full";
        switch (status) {
            case 'Finished': return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
            case 'Encounter': return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300`;
            case 'Registered': return `${baseClasses} bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300`;
            case 'Waiting Payment': return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
            case 'Cancelled': return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
            case 'No Show': return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300`;
            default: return `${baseClasses} bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300`;
        }
    };

    if (pageLoading && !patient) return <div className="p-8">Loading patient details...</div>;
    if (!patient) return <div className="p-8">Patient could not be loaded.</div>;

    const canWrite = currentUser?.permissions.patients === 'write';
    const isActionInProgress = !!actionLoading;

    const TabButton: React.FC<{ tabId: string; title: string; icon: any; }> = ({ tabId, title, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center whitespace-nowrap py-3 px-4 font-medium text-sm rounded-t-lg transition-colors border-b-2 ${
            activeTab === tabId
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
        >
            <FontAwesomeIcon icon={icon} className="w-4 h-4 mr-2" />
            {title}
        </button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {isPhotoPreviewOpen && patient.profilePhotoUrl && <PhotoPreviewModal imageUrl={patient.profilePhotoUrl} onClose={() => setIsPhotoPreviewOpen(false)} />}
            {confirmation?.isOpen && (
                <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmButtonText={confirmation.confirmButtonText}
                    confirmButtonVariant={confirmation.variant}
                    loading={isActionInProgress}
                />
            )}
            <div className="lg:col-span-2 space-y-8">
                <nav className="flex space-x-2 border-b border-slate-200 dark:border-slate-800" aria-label="Tabs">
                    <TabButton tabId="info" title="Patient Information" icon={faUser} />
                    <TabButton tabId="journey" title="Patient Journey" icon={faChartLine} />
                    <TabButton tabId="docs" title="Documents & Files" icon={faFileMedical} />
                    <TabButton tabId="notes" title="Notes" icon={faStickyNote} />
                    <TabButton tabId="appointments" title="Past Appointments" icon={faCalendarAlt} />
                </nav>

                <div className="space-y-8">
                {activeTab === 'info' && (
                    <>
                        <DetailCard 
                            title="Personal & Contact Information"
                            footer={ canWrite ? (
                                isEditing ? (
                                    <div className="flex justify-end gap-2">
                                        <Button variant="light" onClick={() => { setIsEditing(false); if (patient) populateForm(patient); }} disabled={actionLoading === 'update'}>Cancel</Button>
                                        <Button variant="primary" onClick={handleUpdate} disabled={isActionInProgress}>
                                            {actionLoading === 'update' ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                                )
                            ): undefined}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {isEditing && (
                                    <div className="md:col-span-2">
                                        <PhotoCaptureInput
                                            initialPhotoUrl={patient.profilePhotoUrl}
                                            onPhotoTaken={handlePhotoChange}
                                        />
                                    </div>
                                )}
                                <Input id="patientId" label="Patient ID" type="text" value={patient.patientId} disabled icon={<FontAwesomeIcon icon={faIdCard} className="h-5 w-5 text-gray-400" />} />
                                <Input id="registeredAt" label="Registered On" type="text" value={formatDateTime(patient.registeredAt.toDate())} disabled icon={<FontAwesomeIcon icon={faCalendarCheck} className="h-5 w-5 text-gray-400" />} />
                                <Input id="name" label="Full Name" type="text" required value={formData.name} onChange={e => handleInputChange('name', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-400" />} />
                                <Input id="email" label="Email" type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
                                <Input id="phone" label="Phone" type="tel" required value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
                                <Input id="emergencyContact" label="Emergency Contact" type="tel" required value={formData.emergencyContact} onChange={e => handleInputChange('emergencyContact', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faUserShield} className="h-5 w-5 text-gray-400" />} />
                                <Select id="gender" label="Gender" required value={formData.gender} onChange={e => handleInputChange('gender', e.target.value)} disabled={!isEditing}>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </Select>
                                <Input id="dateOfBirth" label="Date of Birth" type="date" required value={formData.dateOfBirth} onChange={e => handleInputChange('dateOfBirth', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faBirthdayCake} className="h-5 w-5 text-gray-400" />} />
                                <div className="md:col-span-2">
                                    <AddressInput id="address" label="Address" value={formData.address} onChange={(val) => handleInputChange('address', val)} disabled={!isEditing} required/>
                                </div>
                                <div className="md:col-span-2">
                                    <Input id="primaryDiagnosis" label="Primary Diagnosis" type="text" required value={formData.primaryDiagnosis} onChange={e => handleInputChange('primaryDiagnosis', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faFirstAid} className="h-5 w-5 text-gray-400" />} />
                                </div>
                                <div className="md:col-span-2">
                                    <TagInput label="Allergies" tags={formData.allergies} setTags={(tags) => handleInputChange('allergies', tags)} placeholder="Enter known allergies" />
                                </div>
                                <div className="md:col-span-2">
                                    <Textarea id="medicalHistory" label="Medical History" value={formData.medicalHistory} onChange={e => handleInputChange('medicalHistory', e.target.value)} placeholder="Enter relevant medical history" />
                                </div>
                            </div>
                        </DetailCard>
                        <DetailCard title="Medical Information">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input id="height" label="Height (cm)" type="number" value={formData.medicalInfo?.height || ''} onChange={e => handleMedicalInfoChange('height', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faRulerVertical} className="h-5 w-5 text-gray-400" />} />
                                <Input id="weight" label="Weight (kg)" type="number" value={formData.medicalInfo?.weight || ''} onChange={e => handleMedicalInfoChange('weight', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faWeight} className="h-5 w-5 text-gray-400" />} />
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">BMI</label><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">{calculateBMI}</div></div>
                                <Input id="bloodGroup" label="Blood Group" type="text" value={formData.medicalInfo?.bloodGroup || ''} onChange={e => handleMedicalInfoChange('bloodGroup', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faTint} className="h-5 w-5 text-gray-400" />} />
                                <Input id="bloodPressure" label="Blood Pressure" type="text" placeholder="e.g., 120/80" value={formData.medicalInfo?.bloodPressure || ''} onChange={e => handleMedicalInfoChange('bloodPressure', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faHeartbeat} className="h-5 w-5 text-gray-400" />} />
                                <Input id="heartRate" label="Heart Rate (bpm)" type="number" value={formData.medicalInfo?.heartRate || ''} onChange={e => handleMedicalInfoChange('heartRate', e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faWaveSquare} className="h-5 w-5 text-gray-400" />} />
                                <Input id="bloodSugar" label="Blood Sugar" type="text" value={formData.medicalInfo?.bloodSugar || ''} onChange={e => handleMedicalInfoChange('bloodSugar', e.target.value)} disabled={!isEditing} />
                                <Input id="hemoglobin" label="Hemoglobin" type="text" value={formData.medicalInfo?.hemoglobin || ''} onChange={e => handleMedicalInfoChange('hemoglobin', e.target.value)} disabled={!isEditing} />
                            </div>
                        </DetailCard>

                        {canWrite && (
                            <DetailCard title="Danger Zone">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    This action is permanent and cannot be undone.
                                </p>
                                <Button variant="danger" onClick={handleDelete} disabled={isActionInProgress}>
                                   {actionLoading === 'delete' ? 'Deleting...' : 'Delete Patient Record'}
                                </Button>
                            </DetailCard>
                        )}
                    </>
                )}
                 {activeTab === 'journey' && (
                    <PatientJourneyTimeline
                        patient={patient}
                        appointments={appointments}
                        consultations={consultations}
                        formatDate={formatDate}
                    />
                )}
                {activeTab === 'docs' && (
                    <DetailCard title="Patient Documents">
                        {canWrite && (
                            <div className="mb-6 p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                                    <FontAwesomeIcon icon={faUpload} className="mr-2" />
                                    {uploadingFile ? 'Uploading...' : 'Upload New Document'}
                                </Button>
                                <p className="text-xs text-slate-500 mt-2">Max file size: 10MB</p>
                            </div>
                        )}
                        <div className="space-y-3">
                            {paginatedDocuments.length > 0 ? (
                                paginatedDocuments.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center">
                                            <FontAwesomeIcon icon={faFilePdf} className="h-6 w-6 text-red-500 mr-4" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{doc.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Uploaded by {doc.uploadedBy} on {formatDate(doc.uploadedAt.toDate())}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                                            </a>
                                            {canWrite && (
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc)} disabled={isActionInProgress} aria-label="Delete document">
                                                    <FontAwesomeIcon icon={faTrash} className="text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-4">No documents have been uploaded for this patient.</p>
                            )}
                        </div>
                        {sortedDocuments.length > 0 && (
                            <Pagination
                                currentPage={documentsCurrentPage}
                                totalPages={totalDocumentPages}
                                onPageChange={setDocumentsCurrentPage}
                                itemsPerPage={documentsItemsPerPage}
                                onItemsPerPageChange={(size) => { setDocumentsItemsPerPage(size); setDocumentsCurrentPage(1); }}
                                totalItems={sortedDocuments.length}
                                itemsOnPage={paginatedDocuments.length}
                            />
                        )}
                    </DetailCard>
                )}
                {activeTab === 'notes' && (
                     <DetailCard title="Patient Notes">
                        {canWrite && (
                            <div className="mb-6">
                                <Textarea id="newNote" label="Add a new note" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Type your note here..." />
                                <div className="text-right mt-2">
                                    <Button onClick={handleAddNote} disabled={noteLoading || !newNote.trim()}>
                                        <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                                        {noteLoading ? 'Adding...' : 'Add Note'}
                                    </Button>
                                </div>
                            </div>
                        )}
                         <div className="space-y-4">
                            {paginatedNotes.length > 0 ? (
                                paginatedNotes.map(note => (
                                    <div key={note.id} className="group relative p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.text}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">By {note.createdBy} on {formatDateTime(note.createdAt.toDate())}</p>
                                        {canWrite && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteNoteRequest(note)} disabled={isActionInProgress} aria-label="Delete note">
                                                    <FontAwesomeIcon icon={faTrash} className="text-red-500" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                 <p className="text-center text-slate-500 dark:text-slate-400 py-4">No notes found for this patient.</p>
                            )}
                         </div>
                         {sortedNotes.length > 0 && (
                            <Pagination
                                currentPage={notesCurrentPage}
                                totalPages={totalNotePages}
                                onPageChange={setNotesCurrentPage}
                                itemsPerPage={notesItemsPerPage}
                                onItemsPerPageChange={(size) => { setNotesItemsPerPage(size); setNotesCurrentPage(1); }}
                                totalItems={sortedNotes.length}
                                itemsOnPage={paginatedNotes.length}
                            />
                        )}
                    </DetailCard>
                )}
                {activeTab === 'appointments' && (
                    <DetailCard title="Past Appointments">
                        <div className="space-y-3">
                            {paginatedAppointments.length > 0 ? paginatedAppointments.map(appt => {
                                const hasConsultation = consultations.some(c => c.appointmentId === appt.id);
                                return (
                                    <div key={appt.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div>
                                            <p className="font-semibold">{appt.treatmentName} with {appt.doctorName}</p>
                                            <p className="text-sm text-slate-500">{formatDateTime(appt.start.toDate())}</p>
                                        </div>
                                        {hasConsultation ? (
                                            <Button size="sm" variant="light" onClick={() => navigate(`/hospitals/${currentUser?.hospitalSlug}/appointments/${appt.id}/consultation`)}>
                                                View Consultation
                                            </Button>
                                        ) : (
                                            <span className={getStatusBadge(appt.status)}>{appt.status}</span>
                                        )}
                                    </div>
                                )
                            }) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-8">No appointment history found.</p>
                            )}
                        </div>
                        {pastAppointments.length > 0 && (
                             <Pagination
                                currentPage={appointmentsCurrentPage}
                                totalPages={totalAppointmentPages}
                                onPageChange={setAppointmentsCurrentPage}
                                itemsPerPage={appointmentsItemsPerPage}
                                onItemsPerPageChange={(size) => { setAppointmentsItemsPerPage(size); setAppointmentsCurrentPage(1); }}
                                totalItems={pastAppointments.length}
                                itemsOnPage={paginatedAppointments.length}
                            />
                        )}
                    </DetailCard>
                )}
                </div>
            </div>

            <div className="space-y-8">
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col items-center text-center">
                    {patient.profilePhotoUrl ? (
                        <button onClick={() => setIsPhotoPreviewOpen(true)} className="relative group">
                            <Avatar avatar={{ type: 'image', value: patient.profilePhotoUrl }} size="lg" className="!w-32 !h-32 text-5xl" />
                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity">
                                <p className="text-white opacity-0 group-hover:opacity-100 text-sm font-semibold">View Photo</p>
                            </div>
                        </button>
                    ) : (
                        <Avatar 
                            avatar={{ type: 'initials', value: patient.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-blue-600' }} 
                            size="lg" 
                            className="!w-32 !h-32 text-5xl"
                        />
                    )}
                    <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-200">{patient.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{patient.email || 'No email provided'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Age: {calculateAge(patient.dateOfBirth)}</p>
                    <span className={`mt-2 px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        patient.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                        {patient.status}
                    </span>
                    {nextVisitDate && (
                        <div className="mt-4 w-full p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center justify-center">
                                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                                Next Visit Recommended
                            </p>
                            <p className="text-md font-bold text-blue-600 dark:text-blue-400">{formatDate(nextVisitDate)}</p>
                        </div>
                    )}
                </div>
                <DetailCard title="Upcoming Appointments">
                    <div className="space-y-3">
                        {upcomingAppointments.length > 0 ? (
                            upcomingAppointments.map(appt => (
                                <div key={appt.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div>
                                        <p className="font-semibold">{appt.treatmentName}</p>
                                        <p className="text-sm text-slate-500">with {appt.doctorName}</p>
                                        <p className="text-sm text-slate-500">{formatDateTime(appt.start.toDate())}</p>
                                    </div>
                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300`}>
                                        {appt.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                                No upcoming appointments.
                            </p>
                        )}
                    </div>
                </DetailCard>
                {canWrite && (
                    <DetailCard title="Actions">
                        <div className="space-y-3 flex flex-col">
                            <Button variant="light" onClick={handleStatusChange} disabled={isActionInProgress}>
                                {actionLoading === 'status' ? 'Updating...' : patient.status === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
                            </Button>
                        </div>
                    </DetailCard>
                )}
            </div>
        </div>
    );
};

export default PatientDetailsScreen;