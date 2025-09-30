import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// FIX: Import DoctorDocument type.
import { Appointment, PatientDocument, Consultation, PrescribedMedicine, ConsultationUpdateData, DoctorDocument, Treatment, StockItem } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import TagInput from '../components/ui/TagInput';
import Avatar from '../components/ui/Avatar';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPrint, faSave, faTimes, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
// FIX: The import now works because SearchableSelect is exported from ReservationsScreen.
import { SearchableOption, SearchableSelect } from './ReservationsScreen'; // Re-using from ReservationsScreen
import { Timestamp } from 'firebase/firestore';


const DetailCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

const PrescriptionRow: React.FC<{
    index: number;
    item: PrescribedMedicine;
    onRemove: (index: number) => void;
    readOnly: boolean;
}> = ({ index, item, onRemove, readOnly }) => (
    <tr className="border-b border-slate-200 dark:border-slate-800">
        <td className="p-2 align-top text-slate-700 dark:text-slate-300">{index + 1}</td>
        <td className="p-2 align-top">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku} - {item.unitType}</p>
        </td>
        <td className="p-2 align-top text-slate-700 dark:text-slate-300">{item.dosage}</td>
        <td className="p-2 align-top text-slate-700 dark:text-slate-300">{item.frequency}</td>
        <td className="p-2 align-top text-slate-700 dark:text-slate-300">{item.duration}</td>
        <td className="p-2 align-top text-slate-700 dark:text-slate-300">{item.notes}</td>
        {!readOnly && (
            <td className="p-2 align-top text-right">
                <Button variant="danger" size="sm" onClick={() => onRemove(index)}><FontAwesomeIcon icon={faTrash} /></Button>
            </td>
        )}
    </tr>
);


import { useFormatting } from '@/utils/formatting';


const ConsultationScreen: React.FC = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const { user, getPatientById, getAppointmentById, getConsultationForAppointment, getStocks, saveConsultation, getDoctorById, updateAppointment, getTreatments, addInvoice } = useAuth();
    const { addToast } = useToast();
    const { formatDate, formatDateTime } = useFormatting();

    const [isCallActive, setIsCallActive] = useState(false); // Define isCallActive state

    const [loading, setLoading] = useState(true);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [patient, setPatient] = useState<PatientDocument | null>(null);
    const [doctor, setDoctor] = useState<DoctorDocument | null>(null);
    const [consultation, setConsultation] = useState<Consultation | null>(null);
    const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
    const [allTreatments, setAllTreatments] = useState<Treatment[]>([]);
    
    // Form State
    const [formData, setFormData] = useState<ConsultationUpdateData>({
        investigation: '', diagnosis: '', prescribedMedicines: [], labTests: [], allergies: '', advice: '', nextVisitDate: undefined
    });
    // Prescription Sub-form State
    const [selectedStockItemId, setSelectedStockItemId] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('');
    const [duration, setDuration] = useState('');
    const [rxNotes, setRxNotes] = useState('');

    const isReadOnly = useMemo(() => {
        if (!user || !consultation) return false; // Default to editable if no consultation exists yet
        return consultation.doctorId !== user.doctorId;
    }, [user, consultation]);

    const fetchAllData = useCallback(async () => {
        if (!appointmentId || !user) return;
        setLoading(true);
        try {
            const appt = await getAppointmentById(appointmentId);
            if (!appt) {
                addToast("Appointment not found.", "error");
                navigate(-1);
                return;
            }
            setAppointment(appt);
            
            const [patientData, consultationData, stockItemsData, doctorData, treatmentsData] = await Promise.all([
                getPatientById(appt.patientId),
                getConsultationForAppointment(appointmentId),
                getStocks(),
                getDoctorById(appt.doctorId),
                getTreatments()
            ]);

            setPatient(patientData);
            setAllStockItems(stockItemsData);
            setDoctor(doctorData);
            setAllTreatments(treatmentsData);
            
            if (consultationData) {
                setConsultation(consultationData);
                setFormData({
                    investigation: consultationData.investigation || '',
                    diagnosis: consultationData.diagnosis || '',
                    prescribedMedicines: consultationData.prescribedMedicines || [],
                    labTests: consultationData.labTests || [],
                    allergies: consultationData.allergies || '',
                    advice: consultationData.advice || '',
                    nextVisitDate: consultationData.nextVisitDate?.toDate(),
                });
            }

        } catch (err) {
            addToast("Failed to load consultation data.", "error");
        } finally {
            setLoading(false);
        }
    }, [appointmentId, user, getAppointmentById, getPatientById, getDoctorById, getConsultationForAppointment, getStocks, getTreatments, addToast, navigate]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData, isCallActive]);
    
    const stockItemOptions: SearchableOption[] = useMemo(() => allStockItems.map(s => ({
        value: s.id!,
        label: s.name,
        secondaryLabel: `SKU: ${s.sku} (${s.category})`,
    })), [allStockItems]);
    
    const handleAddPrescription = () => {
        if (!selectedStockItemId || !dosage || !frequency || !duration) {
            addToast("Please fill all medicine fields.", "warning");
            return;
        }
        const stockItem = allStockItems.find(s => s.id === selectedStockItemId);
        if (!stockItem) return;

        const newPrescription: PrescribedMedicine = {
            stockItemId: stockItem.id!,
            name: stockItem.name,
            sku: stockItem.sku,
            unitType: stockItem.unitType,
            dosage, frequency, duration, notes: rxNotes,
        };

        setFormData(prev => ({ ...prev, prescribedMedicines: [...prev.prescribedMedicines, newPrescription] }));
        
        // Reset form
        setSelectedStockItemId(''); setDosage(''); setFrequency(''); setDuration(''); setRxNotes('');
    };

    const handleRemovePrescription = (index: number) => {
        setFormData(prev => ({...prev, prescribedMedicines: prev.prescribedMedicines.filter((_, i) => i !== index) }));
    };

    const handleSave = async () => {
        if (!appointment) {
            addToast("Appointment data is missing.", "error");
            return;
        }
        setLoading(true);
        try {
            await saveConsultation(appointment, formData);

            const treatmentForInvoice = allTreatments.find(t => t.name === appointment.treatmentName);
            if (treatmentForInvoice) {
                await addInvoice(appointment, treatmentForInvoice);
            } else {
                console.warn("Could not find treatment to create an invoice for:", appointment.treatmentName);
            }

            let statusUpdated = false;
            if (appointment.status !== 'Finished' && appointment.status !== 'Cancelled') {
                await updateAppointment(appointment.id, { status: 'Waiting Payment' });
                statusUpdated = true;
            }
            
            if (statusUpdated) {
                addToast("Consultation saved. Invoice created and status updated to 'Waiting Payment'.", "success");
            } else {
                addToast("Consultation saved successfully!", "success");
            }
            await fetchAllData();
        } catch (error) {
            addToast("Failed to save consultation.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">Loading Consultation...</div>;
    if (!appointment || !patient) return <div className="p-8 text-center">Could not load appointment details.</div>;

    const calculateAge = (dob: string): number | string => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };
    
    return (
        <div className="consultation-page">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 printable-content">
                <header className="print-header hidden print:block mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold">{user?.hospitalName}</h1>
                            <p>{user?.hospitalAddress.street}, {user?.hospitalAddress.city}</p>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-right">Dr. {appointment.doctorName}</h2>
                            <p className="text-right">{doctor?.specialty}</p>
                        </div>
                    </div>
                    <hr className="my-4"/>
                    <div className="flex justify-between">
                        <p><strong>Patient:</strong> {patient.name} ({calculateAge(patient.dateOfBirth)}Y/{patient.gender.charAt(0)})</p>
                        <p><strong>Date:</strong> {formatDate(new Date())}</p>
                    </div>
                    <hr className="my-4"/>
                </header>

                <div className="flex justify-between items-center no-print">
                    <Button variant="light" onClick={() => navigate(-1)}><FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back</Button>
                    <div className="flex items-center gap-2">

                        <Button variant="light" onClick={handlePrint}><FontAwesomeIcon icon={faPrint} className="mr-2" /> Print</Button>
                        {!isReadOnly && <Button variant="primary" onClick={handleSave} disabled={loading}><FontAwesomeIcon icon={faSave} className="mr-2" /> {loading ? 'Saving...' : 'Save Consultation'}</Button>}
                    </div>
                </div>
                
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-4">
                    <Avatar avatar={patient.profilePhotoUrl ? { type: 'image', value: patient.profilePhotoUrl } : { type: 'initials', value: patient.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-blue-600' }} size="lg"/>
                    <div>
                        <h2 className="text-xl font-bold">{patient.name}</h2>
                        <p className="text-slate-500">{patient.patientId} &middot; {calculateAge(patient.dateOfBirth)} years &middot; {patient.gender}</p>
                        <p className="text-slate-500">Appointment on {formatDateTime(appointment.start.toDate())}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DetailCard title="Clinical Findings">
                        <div className="space-y-4">
                            <Textarea label="Investigation" value={formData.investigation} onChange={e => setFormData({...formData, investigation: e.target.value})} rows={4} disabled={isReadOnly} />
                            <Textarea label="Diagnosis" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} rows={4} disabled={isReadOnly} />
                        </div>
                    </DetailCard>
                    <DetailCard title="Plan">
                         <div className="space-y-4">
                            <TagInput label="Recommended Lab Tests" tags={formData.labTests} setTags={tags => setFormData({...formData, labTests: tags})} placeholder="Type and press Enter" />
                            <Textarea label="Patient Allergies" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} rows={2} disabled={isReadOnly} />
                            <Textarea label="Advice / General Notes" value={formData.advice} onChange={e => setFormData({...formData, advice: e.target.value})} rows={3} disabled={isReadOnly} />
                            <Input label="Next Visit Date" type="date" value={formData.nextVisitDate ? formData.nextVisitDate.toISOString().split('T')[0] : ''} onChange={e => setFormData({...formData, nextVisitDate: e.target.value ? new Date(e.target.value) : undefined })} disabled={isReadOnly}/>
                        </div>
                    </DetailCard>
                </div>

                <DetailCard title="Prescription">
                    {!isReadOnly && (
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-4 border border-dashed rounded-lg mb-6">
                            <div className="md:col-span-2"><SearchableSelect label="Medicine/Product" options={stockItemOptions} value={selectedStockItemId} onChange={setSelectedStockItemId} placeholder="Search products..." /></div>
                            <Input label="Dosage" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g., 1 tablet" />
                            <Input label="Frequency" value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g., Twice a day" />
                            <Input label="Duration" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g., 5 days" />
                            <Button onClick={handleAddPrescription}><FontAwesomeIcon icon={faPlus} /></Button>
                            <div className="md:col-span-6"><Input label="Notes" value={rxNotes} onChange={e => setRxNotes(e.target.value)} placeholder="e.g., After food" /></div>
                        </div>
                    )}
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="p-2 w-8">#</th>
                                <th className="p-2">Product</th>
                                <th className="p-2">Dosage</th>
                                <th className="p-2">Frequency</th>
                                <th className="p-2">Duration</th>
                                <th className="p-2">Notes</th>
                                {!isReadOnly && <th className="p-2 w-16"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {formData.prescribedMedicines.length > 0 ? (
                                formData.prescribedMedicines.map((item, index) => <PrescriptionRow key={index} index={index} item={item} onRemove={handleRemovePrescription} readOnly={isReadOnly} />)
                            ) : <tr><td colSpan={isReadOnly ? 6 : 7} className="text-center p-4 text-slate-500">No medicines prescribed.</td></tr>}
                        </tbody>
                    </table>
                </DetailCard>
            </div>
            
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .consultation-page, .consultation-page * {
                        visibility: visible;
                    }
                    .consultation-page {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none;
                    }
                    .printable-content {
                        padding: 0 !important;
                    }
                    .print-header {
                        display: block !important;
                    }
                    .dark .bg-slate-900, .dark .bg-slate-800 {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }
                    .dark * {
                        color: #000000 !important;
                        border-color: #ccc !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ConsultationScreen;