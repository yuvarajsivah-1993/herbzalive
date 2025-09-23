


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Peripheral, NewPeripheralData, PeripheralStatus, PeripheralAttachment, PeripheralUpdateData } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import TagInput from '../components/ui/TagInput';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faChevronLeft, faTrashAlt, faDesktop, faPaperclip, faFilePdf, faFileImage, faPlus, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { Timestamp } from 'firebase/firestore';

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">{footer}</div>}
    </div>
);

interface AttachmentManagerProps {
    existingAttachments: PeripheralAttachment[];
    newAttachments: File[];
    onAddFiles: (files: FileList) => void;
    onRemoveNew: (index: number) => void;
    onRemoveExisting: (id: string) => void;
    disabled?: boolean;
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({ existingAttachments, newAttachments, onAddFiles, onRemoveNew, onRemoveExisting, disabled }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return faFileImage;
        if (ext === 'pdf') return faFilePdf;
        return faPaperclip;
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Attachments</label>
            <p className="text-xs text-slate-500 mb-3">Upload product photos, invoices, documents, etc. Image format .jpg .jpeg .png and minimum size 300 x 300px</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {existingAttachments.map(att => (
                    <div key={att.id} className="relative group border rounded-lg p-2 flex flex-col items-center justify-center h-28 text-center bg-white dark:bg-slate-900">
                        <FontAwesomeIcon icon={getFileIcon(att.name)} className="h-8 w-8 text-slate-500" />
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs font-medium text-blue-600 hover:underline truncate w-full">{att.name}</a>
                        {!disabled && <button type="button" onClick={() => onRemoveExisting(att.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><FontAwesomeIcon icon={faTimes} className="h-3 w-3"/></button>}
                    </div>
                ))}
                {newAttachments.map((file, index) => (
                    <div key={index} className="relative group border rounded-lg p-2 flex flex-col items-center justify-center h-28 text-center bg-blue-50 dark:bg-blue-900/50">
                        <FontAwesomeIcon icon={getFileIcon(file.name)} className="h-8 w-8 text-blue-500" />
                        <p className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-300 truncate w-full">{file.name}</p>
                        {!disabled && <button type="button" onClick={() => onRemoveNew(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center"><FontAwesomeIcon icon={faTimes} className="h-3 w-3"/></button>}
                    </div>
                ))}
                 {!disabled && (
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center h-28 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <FontAwesomeIcon icon={faPlus} className="h-6 w-6 text-slate-400"/>
                        <p className="mt-1 text-sm text-slate-500">Add Attachment</p>
                    </div>
                )}
            </div>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={e => e.target.files && onAddFiles(e.target.files)} disabled={disabled} />
        </div>
    );
};

const PeripheralDetailsScreen: React.FC = () => {
    const { peripheralId } = useParams<{ peripheralId: string }>();
    const navigate = useNavigate();
    const { user, getPeripheralById, addPeripheral, updatePeripheral, deletePeripheral, hospitalLocations } = useAuth();
    const { addToast } = useToast();

    const isNew = !peripheralId || peripheralId === 'new';
    
    const [originalPeripheral, setOriginalPeripheral] = useState<Peripheral | null>(null);
    const [isEditing, setIsEditing] = useState(isNew);
    const [loading, setLoading] = useState(!isNew);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Form state
    const [locationId, setLocationId] = useState('');
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState<File | string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [assignedTo, setAssignedTo] = useState('');
    const [status, setStatus] = useState<PeripheralStatus>('In Use');
    const [tags, setTags] = useState<string[]>([]);
    const [series, setSeries] = useState('');
    const [category, setCategory] = useState('');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
    const [sku, setSku] = useState('');
    const [barcode, setBarcode] = useState('');
    const [description, setDescription] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [purchasePrice, setPurchasePrice] = useState('');
    const [vendor, setVendor] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    
    const [existingAttachments, setExistingAttachments] = useState<PeripheralAttachment[]>([]);
    const [newAttachments, setNewAttachments] = useState<File[]>([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

    const populateForm = useCallback((data: Peripheral) => {
        setName(data.name);
        setPhoto(null); // Reset file input
        setPhotoPreview(data.photoUrl || null);
        setAssignedTo(data.assignedTo);
        setStatus(data.status);
        setTags(data.tags);
        setSeries(data.series || '');
        setCategory(data.category);
        setWeight(data.weight?.toString() || '');
        setWeightUnit(data.weightUnit || 'lb');
        setSku(data.sku);
        setBarcode(data.barcode || '');
        setDescription(data.description || '');
        setPurchaseDate(data.purchaseDate.toDate().toISOString().split('T')[0]);
        setPurchasePrice(data.purchasePrice.toString());
        setVendor(data.vendor);
        setInvoiceNumber(data.invoiceNumber || '');
        setExistingAttachments(data.attachments || []);
        setNewAttachments([]);
        setRemovedAttachmentIds([]);
        setLocationId(data.locationId);
    }, []);

    const fetchData = useCallback(async () => {
        if (isNew || !peripheralId) return;
        setLoading(true);
        try {
            const data = await getPeripheralById(peripheralId);
            if (data) {
                setOriginalPeripheral(data);
                populateForm(data);
            } else {
                addToast("Peripheral not found.", "error");
                navigate(-1);
            }
        } catch (error) { addToast("Failed to load peripheral data.", "error"); }
        finally { setLoading(false); }
    }, [isNew, peripheralId, getPeripheralById, addToast, navigate, populateForm]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (isNew && user?.currentLocation) {
            setLocationId(user.currentLocation.id);
        }
    }, [isNew, user]);
    
    const handleSubmit = async () => {
        if (!name || !category || !sku || !purchaseDate || !purchasePrice || !vendor || !assignedTo || (isNew && !locationId)) {
            addToast("Please fill all required fields (*).", "error");
            return;
        }
        setActionLoading(true);
        try {
            if (isNew) {
                const data: NewPeripheralData = {
                    name, photo, assignedTo, status, tags, series, category,
                    weight: parseFloat(weight) || undefined, weightUnit, sku, barcode, description,
                    purchaseDate: new Date(purchaseDate), purchasePrice: parseFloat(purchasePrice), vendor, invoiceNumber,
                    newAttachments, locationId
                };
                const newId = await addPeripheral(data);
                addToast("Peripheral added successfully!", "success");
                navigate(`/hospitals/${user?.hospitalSlug}/peripherals/${newId}`);
            } else {
                const data: PeripheralUpdateData = {
                    name, photo, assignedTo, status, tags, series, category,
                    weight: parseFloat(weight) || undefined, weightUnit, sku, barcode, description,
                    purchaseDate: new Date(purchaseDate), purchasePrice: parseFloat(purchasePrice), vendor, invoiceNumber,
                    newAttachments, removedAttachmentIds
                };
                await updatePeripheral(peripheralId!, data);
                addToast("Peripheral updated successfully!", "success");
                setIsEditing(false);
                fetchData();
            }
        } catch (error) {
            addToast(`Failed to ${isNew ? 'add' : 'update'} peripheral.`, "error");
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleCancelEdit = () => {
        if (isNew) { // If it's a new peripheral, navigate back
            navigate(-1);
        } else if (originalPeripheral) { // If editing an existing peripheral, revert to original data
            populateForm(originalPeripheral);
            setIsEditing(false);
        } else { // Fallback for unexpected state, just exit editing mode
            setIsEditing(false);
        }
    };

    const handleDelete = async () => {
        if (isNew || !peripheralId) return;
        setActionLoading(true);
        try {
            await deletePeripheral(peripheralId);
            addToast("Peripheral deleted successfully.", "success");
            navigate(`/hospitals/${user?.hospitalSlug}/peripherals`);
        } catch (error) {
            addToast("Failed to delete peripheral.", "error");
        } finally {
            setActionLoading(false);
            setConfirmDelete(false);
        }
    };

    if (loading) return <p className="p-8 text-center">Loading...</p>;
    
    const canWrite = user?.permissions.peripherals === 'write';

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <ConfirmationModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={handleDelete} title="Delete Peripheral" message="Are you sure you want to delete this peripheral? This is irreversible." confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading} />
            
            <div className="flex justify-between items-center mb-6">
                 <Button variant="light" onClick={() => navigate(-1)}><FontAwesomeIcon icon={faChevronLeft} className="mr-2"/> Back</Button>
                {canWrite && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="light" onClick={handleCancelEdit}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={actionLoading}><FontAwesomeIcon icon={faSave} className="mr-2"/>{actionLoading ? 'Saving...' : 'Save'}</Button>
                            </>
                        ) : (
                            <Button variant="primary" onClick={() => setIsEditing(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2" /> Edit</Button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                     <DetailCard title="Product Details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><Input label="Product Name*" value={name} onChange={e => setName(e.target.value)} disabled={!isEditing} /></div>
                            <Input label="Series (optional)" value={series} onChange={e => setSeries(e.target.value)} disabled={!isEditing}/>
                            <Input label="Category*" value={category} onChange={e => setCategory(e.target.value)} disabled={!isEditing}/>
                            <div className="relative">
                                <Input label="Weight" type="number" value={weight} onChange={e => setWeight(e.target.value)} disabled={!isEditing}/>
                                <div className="absolute inset-y-0 right-0 top-6 flex items-center">
                                    <Select label="" value={weightUnit} onChange={e => setWeightUnit(e.target.value as any)} disabled={!isEditing} className="!border-0 !bg-transparent !py-0 !pl-2 !pr-7 focus:!ring-0">
                                        <option>lb</option>
                                        <option>kg</option>
                                    </Select>
                                </div>
                            </div>
                             <Input label="SKU*" value={sku} onChange={e => setSku(e.target.value)} disabled={!isEditing}/>
                            <Input label="Barcode" value={barcode} onChange={e => setBarcode(e.target.value)} disabled={!isEditing}/>
                            <div className="md:col-span-2"><Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={4} disabled={!isEditing}/></div>
                        </div>
                    </DetailCard>
                     <DetailCard title="Purchase Details">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Purchase Date*" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} disabled={!isEditing}/>
                            <Input label="Purchase Price*" type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} disabled={!isEditing}/>
                            <Input label="Vendor*" value={vendor} onChange={e => setVendor(e.target.value)} disabled={!isEditing}/>
                            <Input label="Invoice Number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} disabled={!isEditing}/>
                        </div>
                    </DetailCard>
                     <DetailCard title="Attachments">
                        <AttachmentManager
                            existingAttachments={existingAttachments}
                            newAttachments={newAttachments}
                            onAddFiles={(files) => setNewAttachments(prev => [...prev, ...Array.from(files)])}
                            onRemoveNew={(index) => setNewAttachments(prev => prev.filter((_, i) => i !== index))}
                            onRemoveExisting={(id) => {
                                setExistingAttachments(prev => prev.filter(a => a.id !== id));
                                setRemovedAttachmentIds(prev => [...prev, id]);
                            }}
                            disabled={!isEditing}
                        />
                    </DetailCard>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mb-4">
                           {photoPreview ? <img src={photoPreview} alt={name} className="h-full w-full object-cover rounded-md" /> : <FontAwesomeIcon icon={faDesktop} className="h-20 w-20 text-slate-400" />}
                        </div>
                        {isEditing && <Input type="file" accept="image/*" label="Change Image" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if(file) {
                                setPhoto(file);
                                setPhotoPreview(URL.createObjectURL(file));
                            }
                        }}/>}
                    </div>
                     <DetailCard title="Status & Assignment">
                        <div className="space-y-4">
                            <div>
                                {/* FIX: Pass the required 'label' prop to the Select component and adjust surrounding JSX */}
                                {isNew ? (
                                    <Select label="Location*" value={locationId} onChange={e => setLocationId(e.target.value)} disabled={!isEditing}>
                                        {(hospitalLocations || []).map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </Select>
                                ) : (
                                    <>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location*</label>
                                        <p className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">{hospitalLocations.find(l => l.id === locationId)?.name || 'N/A'}</p>
                                    </>
                                )}
                            </div>
                            <Input label="Assign To*" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} disabled={!isEditing}/>
                            <Select label="Status*" value={status} onChange={e => setStatus(e.target.value as PeripheralStatus)} disabled={!isEditing}>
                                <option value="In Use">In Use</option>
                                <option value="In Storage">In Storage</option>
                                <option value="In Repair">In Repair</option>
                                <option value="Decommissioned">Decommissioned</option>
                            </Select>
                            <TagInput label="Tags" tags={tags} setTags={setTags} placeholder="Add tags..." />
                        </div>
                     </DetailCard>
                     {!isNew && canWrite && (
                        <DetailCard title="Danger Zone">
                            <p className="text-sm text-slate-500 mb-4">Deleting this peripheral is permanent and cannot be undone.</p>
                            <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={actionLoading}>
                                <FontAwesomeIcon icon={faTrashAlt} className="mr-2" /> Delete Peripheral
                            </Button>
                        </DetailCard>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PeripheralDetailsScreen;