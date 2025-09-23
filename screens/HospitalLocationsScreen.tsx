import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { HospitalLocation, NewHospitalLocationData, UpdateHospitalLocationData, Address } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkedAlt, faPlus, faPencilAlt, faTrashAlt, faTimes, faBuilding, faPhone, faEnvelope, faMapMarker } from '@fortawesome/free-solid-svg-icons';
import Input from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const AddEditLocationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewHospitalLocationData | UpdateHospitalLocationData, id?: string) => Promise<void>;
    locationToEdit: HospitalLocation | null;
}> = ({ isOpen, onClose, onSave, locationToEdit }) => {
    const isEditMode = !!locationToEdit;
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState<Address>({ street: '', city: '', country: '', pincode: '' });

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && locationToEdit) {
                setName(locationToEdit.name);
                setPhone(locationToEdit.phone);
                setEmail(locationToEdit.email || '');
                setAddress(locationToEdit.address);
            } else {
                setName('');
                setPhone('');
                setEmail('');
                setAddress({ street: '', city: '', country: '', pincode: '' });
            }
        }
    }, [isOpen, isEditMode, locationToEdit]);

    const handleAddressChange = (field: keyof Address, value: string) => {
        setAddress(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !address.street || !address.city || !address.country || !address.pincode) {
            addToast("Please fill all required fields.", "error");
            return;
        }
        setLoading(true);
        try {
            const data: NewHospitalLocationData = { name, phone, email, address };
            await onSave(data, locationToEdit?.id);
            onClose();
        } catch (err: any) {
            addToast(err.message || 'Failed to save location.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h2 className="text-xl font-bold">{isEditMode ? 'Edit Location' : 'Add New Location'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faTimes} /></button>
                    </div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                        <Input label="Branch Name*" value={name} onChange={e => setName(e.target.value)} required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Phone Number*" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                            <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-md font-semibold mb-2">Address*</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Street" value={address.street} onChange={e => handleAddressChange('street', e.target.value)} required />
                                <Input label="City" value={address.city} onChange={e => handleAddressChange('city', e.target.value)} required />
                                <Input label="Country" value={address.country} onChange={e => handleAddressChange('country', e.target.value)} required />
                                <Input label="Pincode" value={address.pincode} onChange={e => handleAddressChange('pincode', e.target.value)} required />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end p-4 bg-slate-50 dark:bg-slate-950/50 border-t gap-2">
                        <Button type="button" variant="light" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Location'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const HospitalLocationsScreen: React.FC = () => {
    const { user, hospitalLocations, addHospitalLocation, updateHospitalLocation, deleteHospitalLocation } = useAuth();
    const { addToast } = useToast();
    
    const [modalState, setModalState] = useState<{ isOpen: boolean; location: HospitalLocation | null }>({ isOpen: false, location: null });
    const [confirmDelete, setConfirmDelete] = useState<HospitalLocation | null>(null);

    const canWrite = user?.permissions['hospital-settings'] === 'write';

    const handleSave = async (data: NewHospitalLocationData | UpdateHospitalLocationData, id?: string) => {
        if (id) {
            await updateHospitalLocation(id, data);
            addToast("Location updated successfully!", "success");
        } else {
            await addHospitalLocation(data as NewHospitalLocationData);
            addToast("Location added successfully!", "success");
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteHospitalLocation(confirmDelete.id);
            addToast("Location deleted successfully!", "success");
        } catch (error: any) {
            addToast(error.message || "Failed to delete location.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <AddEditLocationModal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, location: null })} onSave={handleSave} locationToEdit={modalState.location} />
            {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Delete Location" message={`Are you sure you want to delete ${confirmDelete.name}? This action cannot be undone.`} confirmButtonText="Delete" confirmButtonVariant="danger"/>}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Locations</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all your hospital branches.</p>
                </div>
                {canWrite && <Button onClick={() => setModalState({ isOpen: true, location: null })}><FontAwesomeIcon icon={faPlus} className="mr-2"/> Add Location</Button>}
            </div>

            {hospitalLocations && hospitalLocations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hospitalLocations.map(location => (
                        <Card key={location.id} className="flex flex-col">
                            <div className="p-6 flex-grow">
                                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2"><FontAwesomeIcon icon={faBuilding} /> {location.name}</h3>
                                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <p className="flex items-start gap-2"><FontAwesomeIcon icon={faMapMarker} className="mt-1"/><span>{`${location.address.street}, ${location.address.city}, ${location.address.country} - ${location.address.pincode}`}</span></p>
                                    <p className="flex items-start gap-2"><FontAwesomeIcon icon={faPhone} className="mt-1"/><span>{location.phone}</span></p>
                                    {location.email && <p className="flex items-start gap-2"><FontAwesomeIcon icon={faEnvelope} className="mt-1"/><span>{location.email}</span></p>}
                                </div>
                            </div>
                            {canWrite && <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                                <Button size="sm" variant="light" onClick={() => setModalState({ isOpen: true, location })}><FontAwesomeIcon icon={faPencilAlt} className="mr-2"/>Edit</Button>
                                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(location)}><FontAwesomeIcon icon={faTrashAlt} className="mr-2"/>Delete</Button>
                            </div>}
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="p-8 text-center">
                        <FontAwesomeIcon icon={faMapMarkedAlt} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                        <h2 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-200">No Locations Found</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">Get started by adding your first hospital branch or location.</p>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default HospitalLocationsScreen;