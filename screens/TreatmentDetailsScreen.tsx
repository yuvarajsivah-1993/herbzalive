import React, { useState, useEffect, useCallback } from 'react';
// FIX: Update react-router-dom imports for v6 compatibility
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Treatment, TreatmentUpdateData, TaxGroup } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStethoscope, faCreditCard, faClock, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import FileInput from '../components/ui/FileInput';
import Select from '../components/ui/Select';

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

const TreatmentDetailsScreen: React.FC = () => {
    const { treatmentId } = useParams<{ treatmentId: string }>();
    // FIX: Use navigate for v6 compatibility
    const navigate = useNavigate();
    const { getTreatmentById, updateTreatment, deleteTreatment, user: currentUser, getTaxGroups } = useAuth();

    const [treatment, setTreatment] = useState<Treatment | null>(null);
    const [allTaxGroups, setAllTaxGroups] = useState<TaxGroup[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const { addToast } = useToast();

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);


    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [cost, setCost] = useState('');
    const [taxGroupId, setTaxGroupId] = useState('');
    const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
    const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
    
    const currencySymbols: { [key: string]: string } = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        INR: '₹',
    };
    const currencySymbol = currencySymbols[currentUser?.hospitalCurrency || 'USD'] || '$';


    const populateForm = useCallback((treatmentData: Treatment) => {
        setName(treatmentData.name);
        setDescription(treatmentData.description);
        setDuration(String(treatmentData.duration));
        setCost(String(treatmentData.cost));
        setTaxGroupId(treatmentData.taxGroupId || '');
        setNewPhotoFile(null);
        setIsPhotoRemoved(false);
    }, []);

    const fetchTreatment = useCallback(async () => {
        if (!treatmentId) return;
        setPageLoading(true);
        try {
            const [data, taxGroupsData] = await Promise.all([
                getTreatmentById(treatmentId),
                getTaxGroups()
            ]);

            if (data) {
                setTreatment(data);
                populateForm(data);
                setAllTaxGroups(taxGroupsData);
            } else {
                setError('Treatment not found.');
            }
        } catch (e) {
            setError('Failed to fetch treatment data.');
        } finally {
            setPageLoading(false);
        }
    }, [treatmentId, getTreatmentById, populateForm, getTaxGroups]);

    useEffect(() => {
        fetchTreatment();
    }, [fetchTreatment]);

    const handleUpdate = async () => {
        if (!treatmentId) return;
        setActionLoading('update');
        try {
            const updateData: TreatmentUpdateData = {
                name,
                description,
                duration: parseInt(duration, 10),
                cost: parseFloat(cost),
                taxGroupId: taxGroupId || undefined,
            };
            if (newPhotoFile) {
                updateData.photo = newPhotoFile;
            } else if (isPhotoRemoved) {
                updateData.photo = null;
            }

            await updateTreatment(treatmentId, updateData);
            await fetchTreatment(); // Refetch data to show changes
            setIsEditing(false);
            addToast('Treatment updated successfully!', 'success');
        } catch (err) {
            addToast('Failed to update treatment.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        setConfirmModalOpen(false);
        if (!treatmentId) return;
        setActionLoading('delete');
        try {
            await deleteTreatment(treatmentId);
            addToast('Treatment deleted successfully.', 'success');
            // FIX: Use navigate for v6 navigation
            navigate(`/hospitals/${currentUser?.hospitalSlug}/treatments`);
        } catch (err) {
            addToast('An error occurred while deleting the treatment.', 'error');
            console.error("Failed to delete treatment:", err);
        } finally {
            setActionLoading(null);
        }
    };

    if (pageLoading) return <div className="p-8">Loading treatment details...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;
    if (!treatment) return <div className="p-8">Treatment could not be loaded.</div>;
    
    const canWrite = currentUser?.permissions?.treatments === 'write';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
             <ConfirmationModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Treatment"
                message="Are you sure you want to permanently delete this treatment? This action cannot be undone."
                confirmButtonText="Delete"
                confirmButtonVariant="danger"
                loading={actionLoading === 'delete'}
            />
            <div className="mb-6">
                <Button variant="light" onClick={() => navigate(-1)}>
                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back
                </Button>
            </div>
            <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col items-center text-center">
                    {(newPhotoFile && URL.createObjectURL(newPhotoFile)) || (!isPhotoRemoved && treatment.photoUrl) ? (
                        <img src={newPhotoFile ? URL.createObjectURL(newPhotoFile) : treatment.photoUrl} alt={treatment.name} className="h-24 w-24 rounded-lg object-cover mb-4" />
                    ) : (
                        <div className="h-24 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <FontAwesomeIcon icon={faStethoscope} className="h-10 w-10 text-slate-400" />
                        </div>
                    )}
                    <h2 className="text-2xl font-bold">{treatment.name}</h2>
                    <p className="text-slate-500">{treatment.description}</p>
                </div>

                <DetailCard
                    title="Treatment Details"
                    footer={ canWrite ? (
                        isEditing ? (
                            <div className="flex justify-end gap-2">
                                <Button variant="light" onClick={() => { setIsEditing(false); populateForm(treatment); }} disabled={actionLoading === 'update'}>Cancel</Button>
                                <Button variant="primary" onClick={handleUpdate} disabled={!!actionLoading}>
                                    {actionLoading === 'update' ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        ) : (
                            <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Treatment</Button>
                        )
                    ) : undefined}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input id="name" label="Treatment Name" type="text" required value={name} onChange={e => setName(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faStethoscope} className="h-5 w-5 text-gray-400" />} />
                        <div className="md:col-span-2">
                            <Input id="description" label="Description" type="text" required value={description} onChange={e => setDescription(e.target.value)} disabled={!isEditing} />
                        </div>
                        <Input id="duration" label="Duration (minutes)" type="number" required value={duration} onChange={e => setDuration(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faClock} className="h-5 w-5 text-gray-400" />} />
                        <Input id="cost" label={`Cost (${currencySymbol})`} type="number" step="0.01" required value={cost} onChange={e => setCost(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faCreditCard} className="h-5 w-5 text-gray-400" />} />
                        <div className="md:col-span-2">
                            <Select id="taxGroup" label="Tax Group" value={taxGroupId} onChange={e => setTaxGroupId(e.target.value)} disabled={!isEditing}>
                                <option value="">No Tax</option>
                                {allTaxGroups.map(group => (
                                    <option key={group.id} value={group.id!}>{group.name} ({group.totalRate.toFixed(2)}%)</option>
                                ))}
                            </Select>
                        </div>
                        {isEditing && (
                            <div className="md:col-span-2">
                                <FileInput id="photo" label="Change Photo (Optional)" onChange={(e) => {
                                    setNewPhotoFile(e.target.files ? e.target.files[0] : null);
                                    setIsPhotoRemoved(false);
                                }} />
                                {((!isPhotoRemoved && treatment.photoUrl) || newPhotoFile) && (
                                    <Button variant="ghost" size="sm" className="mt-2 text-red-500" onClick={() => {
                                        setNewPhotoFile(null);
                                        setIsPhotoRemoved(true);
                                    }}>Remove photo</Button>
                                )}
                            </div>
                        )}
                    </div>
                </DetailCard>

                {canWrite && (
                    <DetailCard title="Danger Zone">
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                This action is permanent and cannot be undone. Deleting a treatment will remove it from all records.
                            </p>
                            <Button variant="danger" onClick={() => setConfirmModalOpen(true)} disabled={!!actionLoading}>
                                {actionLoading === 'delete' ? 'Deleting...' : 'Delete Treatment'}
                            </Button>
                        </div>
                    </DetailCard>
                )}
            </div>
        </div>
    );
};

export default TreatmentDetailsScreen;