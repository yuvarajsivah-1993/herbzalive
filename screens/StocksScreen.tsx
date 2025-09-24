

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { StockItem, NewStockItemData, StockItemUpdateData, StockOrder, NewStockOrderData, StockOrderStatus, Vendor, StockReturn, InvoiceStatus, NewStockReturnData, NewStockTransferData, StockTransfer, StockMovement } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen, faDolly, faUndo, faFilter, faPlus, faSearch, faEllipsisV, faPencilAlt, faTrashAlt, faTimes, faBoxesPacking, faPaperclip, faChevronDown, faCalendar, faMinus, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { SearchableOption, SearchableSelect } from './ReservationsScreen';
import { useNavigate, useLocation } from 'react-router-dom';
import Textarea from '../components/ui/Textarea';
import FileInput from '../components/ui/FileInput';
import CreatableSearchableSelect from '../components/ui/CreatableSearchableSelect';
import Pagination from '../components/ui/Pagination';
import { usePaginationPersistence } from '../hooks/usePaginationPersistence';
import { Tax, TaxGroup, StockBatch, InitialBatchDetails } from '../types';
import { usePaginationSettings } from '../hooks/usePaginationSettings';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbol = currencySymbols[currencyCode] || '$';
    if (isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatCard: React.FC<{ title: string; value: string | number; subtext: string; color: string }> = ({ title, value, subtext, color }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtext}</p>
    </div>
);

const StockStatusBadge: React.FC<{ stock: number; threshold: number }> = ({ stock, threshold }) => {
    let status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    let colorClasses = '';

    if (stock <= 0) {
        status = 'Out of Stock';
        colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    } else if (stock <= threshold) {
        status = 'Low Stock';
        colorClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    } else {
        status = 'In Stock';
        colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    }

    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
            {status}
        </span>
    );
};

const OrderStatusBadge: React.FC<{ status: StockOrderStatus }> = ({ status }) => {
    const statusConfig = {
        'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Partially Received': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Complete': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Cancelled': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig[status]}`}>
            {status}
        </span>
    );
};

const PaymentStatusBadge: React.FC<{ status: InvoiceStatus | undefined }> = ({ status }) => {
    if (!status) return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">Unpaid</span>;
    const statusConfig = {
        'Unpaid': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Partially Paid': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Paid': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig[status]}`}>
            {status}
        </span>
    );
};


// Add/Edit Product Modal
export const AddProductModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: NewStockItemData | StockItemUpdateData, id?: string) => Promise<void>; 
    productToEdit: StockItem | null;
}> = ({ isOpen, onClose, onSave, productToEdit }) => {
    const { user, hospitalLocations, getTaxes, getTaxGroups, addStockCategory, deleteStockCategory, addStockUnitType, deleteStockUnitType, addStockBrand, deleteStockBrand } = useAuth();
    const isEditMode = !!productToEdit;

    // Form states
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [sku, setSku] = useState('');
    const [vendor, setVendor] = useState('');
    const [unitType, setUnitType] = useState('');
    const [description, setDescription] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [hsnCode, setHsnCode] = useState('');
    const [taxId, setTaxId] = useState('');

    // New state for location-specific data
    type LocationStockState = Record<string, {
        lowStockThreshold: string;
        quantity: string;
        batchNumber: string;
        expiryDate: string;
        purchasePriceExcTax: string;
        purchasePriceIncTax: string;
        marginPercent: string;
        sellingPriceExcTax: string;
        sellingPriceIncTax: string;
    }>;
    const [locationStockData, setLocationStockData] = useState<LocationStockState>({});
    const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
    
    // Other states
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'category' | 'unit' | 'brand', value: string } | null>(null);
    
    const categoryOptions = useMemo(() => user?.hospitalStockCategories || [], [user?.hospitalStockCategories]);
    const unitTypeOptions = useMemo(() => user?.hospitalStockUnitTypes || [], [user?.hospitalStockUnitTypes]);
    const brandOptions = useMemo(() => user?.hospitalStockBrands || [], [user?.hospitalStockBrands]);
    
    const taxMap = useMemo(() => {
        const map = new Map<string, { name: string, rate: number, isGroup: boolean }>();
        taxes.forEach(t => t.id && map.set(t.id, { name: `${t.name} (${t.rate}%)`, rate: t.rate, isGroup: false }));
        taxGroups.forEach(g => g.id && map.set(g.id, { name: `${g.name} (${g.totalRate.toFixed(2)}%)`, rate: g.totalRate, isGroup: true }));
        return map;
    }, [taxes, taxGroups]);

    const taxOptions = useMemo(() => Array.from(taxMap.entries()).map(([id, {name}]) => ({ value: id, label: name })), [taxMap]);

    const resetForm = () => {
        setName(''); setCategory(''); setSku(''); setVendor('');
        setUnitType(''); setDescription(''); setPhotoFile(null);
        setHsnCode(''); setTaxId('');
        
        const initialData: LocationStockState = {};
        (hospitalLocations || []).forEach(loc => {
            initialData[loc.id] = {
                lowStockThreshold: '10',
                quantity: '',
                batchNumber: '',
                expiryDate: '',
                purchasePriceExcTax: '',
                purchasePriceIncTax: '',
                marginPercent: '',
                sellingPriceExcTax: '',
                sellingPriceIncTax: '',
            };
        });
        setLocationStockData(initialData);

        if (hospitalLocations && hospitalLocations.length > 0) {
            setExpandedLocation(hospitalLocations[0].id);
        } else {
            setExpandedLocation(null);
        }
    };

    useEffect(() => {
        if (isOpen) {
            Promise.all([getTaxes(), getTaxGroups()])
              .then(([taxesData, taxGroupsData]) => {
                setTaxes(taxesData);
                setTaxGroups(taxGroupsData);
              })
              .catch(() => addToast("Could not load necessary data.", "error"));
            
            setPhotoFile(null);

            if (productToEdit) {
                 // Edit mode logic is simplified for now as per prompt focus
                setName(productToEdit.name);
                setCategory(productToEdit.category);
                setSku(productToEdit.sku);
                setVendor(productToEdit.vendor);
                setUnitType(productToEdit.unitType);
                setDescription(productToEdit.description);
                setTaxId(productToEdit.taxId || '');
                setHsnCode(productToEdit.hsnCode || '');
            } else {
                resetForm();
            }
        }
    }, [isOpen, productToEdit, hospitalLocations]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (confirmDelete) return;
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, confirmDelete]);

    const handlePricingCalculation = (locationId: string, changedField: keyof LocationStockState[string], value: string) => {
        if (!/^\d*\.?\d*$/.test(value)) return;
    
        const taxRate = taxMap.get(taxId || '')?.rate || 0;
        const taxMultiplier = 1 + taxRate / 100;
        let currentData = { ...locationStockData[locationId] };
    
        let purchaseExc = parseFloat(currentData.purchasePriceExcTax) || 0;
        let purchaseInc = parseFloat(currentData.purchasePriceIncTax) || 0;
        let margin = parseFloat(currentData.marginPercent) || 0;
        let sellingExc = parseFloat(currentData.sellingPriceExcTax) || 0;
        let sellingInc = parseFloat(currentData.sellingPriceIncTax) || 0;
    
        switch (changedField) {
            case 'purchasePriceExcTax':
                purchaseExc = parseFloat(value) || 0;
                purchaseInc = purchaseExc * taxMultiplier;
                sellingExc = purchaseExc * (1 + margin / 100);
                sellingInc = sellingExc * taxMultiplier;
                break;
            case 'purchasePriceIncTax':
                purchaseInc = parseFloat(value) || 0;
                purchaseExc = taxMultiplier > 0 ? purchaseInc / taxMultiplier : 0;
                sellingExc = purchaseExc * (1 + margin / 100);
                sellingInc = sellingExc * taxMultiplier;
                break;
            case 'marginPercent':
                margin = parseFloat(value) || 0;
                sellingExc = purchaseExc * (1 + margin / 100);
                sellingInc = sellingExc * taxMultiplier;
                break;
            case 'sellingPriceExcTax':
                sellingExc = parseFloat(value) || 0;
                sellingInc = sellingExc * taxMultiplier;
                margin = purchaseExc > 0 ? ((sellingExc / purchaseExc) - 1) * 100 : 0;
                break;
            case 'sellingPriceIncTax':
                sellingInc = parseFloat(value) || 0;
                sellingExc = taxMultiplier > 0 ? sellingInc / taxMultiplier : 0;
                margin = purchaseExc > 0 ? ((sellingExc / purchaseExc) - 1) * 100 : 0;
                break;
        }
    
        setLocationStockData(prev => ({
            ...prev,
            [locationId]: {
                ...prev[locationId],
                purchasePriceExcTax: purchaseExc > 0 ? purchaseExc.toFixed(2) : '',
                purchasePriceIncTax: purchaseInc > 0 ? purchaseInc.toFixed(2) : '',
                marginPercent: margin > 0 ? margin.toFixed(2) : '0',
                sellingPriceExcTax: sellingExc > 0 ? sellingExc.toFixed(2) : '',
                sellingPriceIncTax: sellingInc > 0 ? sellingInc.toFixed(2) : '',
                [changedField]: value
            }
        }));
    };
    
    const handleLocationDataChange = (locationId: string, field: keyof LocationStockState[string], value: string) => {
        setLocationStockData(prev => ({
            ...prev,
            [locationId]: {
                ...prev[locationId],
                [field]: value
            }
        }));
    };
    
    const handleCreateCategory = async (value: string) => { try { await addStockCategory(value); addToast(`Category "${value}" created.`, 'success'); } catch (error: any) { addToast(error.message, 'error'); throw error; }};
    const handleDeleteCategoryRequest = async (value: string) => { setConfirmDelete({ type: 'category', value }); };
    const handleCreateUnitType = async (value: string) => { try { await addStockUnitType(value); addToast(`Unit Type "${value}" created.`, 'success'); } catch (error: any) { addToast(error.message, 'error'); throw error; }};
    const handleDeleteUnitTypeRequest = async (value: string) => { setConfirmDelete({ type: 'unit', value }); };
    const handleCreateBrand = async (value: string) => { try { await addStockBrand(value); addToast(`Brand "${value}" created.`, 'success'); } catch (error: any) { addToast(error.message, 'error'); throw error; }};
    const handleDeleteBrandRequest = async (value: string) => { setConfirmDelete({ type: 'brand', value }); };

    const confirmDeletion = async () => {
        if (!confirmDelete) return;
        setLoading(true);
        try {
            if (confirmDelete.type === 'category') {
                await deleteStockCategory(confirmDelete.value);
                if(category === confirmDelete.value) setCategory('');
                addToast(`Category "${confirmDelete.value}" deleted.`, 'success');
            } else if (confirmDelete.type === 'unit') {
                await deleteStockUnitType(confirmDelete.value);
                if(unitType === confirmDelete.value) setUnitType('');
                addToast(`Unit Type "${confirmDelete.value}" deleted.`, 'success');
            } else {
                await deleteStockBrand(confirmDelete.value);
                if(vendor === confirmDelete.value) setVendor('');
                addToast(`Brand "${confirmDelete.value}" deleted.`, 'success');
            }
        } catch (error: any) { addToast(error.message, 'error'); } 
        finally { setConfirmDelete(null); setLoading(false); }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode && productToEdit) {
                 await onSave({
                    name, category, sku, vendor, unitType, description, photo: photoFile, taxId, hsnCode
                }, productToEdit.id);
            } else {
                const initialLocationStock: NewStockItemData['initialLocationStock'] = {};
                for (const locId in locationStockData) {
                    if (Object.prototype.hasOwnProperty.call(locationStockData, locId)) {
                        const locSpecificData = locationStockData[locId];
                        const quantity = Number(locSpecificData.quantity);
                        const costPrice = Number(locSpecificData.purchasePriceIncTax);
                        const salePrice = Number(locSpecificData.sellingPriceIncTax);
                        
                        const hasPricing = costPrice > 0 && salePrice > 0;
                        
                        if (quantity > 0 && !hasPricing) {
                            const locName = hospitalLocations.find(l => l.id === locId)?.name || 'a location';
                            throw new Error(`Please provide purchase and selling prices for ${locName} since quantity is entered.`);
                        }

                        let batchDetails: InitialBatchDetails | undefined = undefined;
                        if (quantity > 0 && hasPricing) {
                            batchDetails = {
                                quantity,
                                costPrice,
                                salePrice,
                                batchNumber: locSpecificData.batchNumber.trim(),
                                expiryDate: locSpecificData.expiryDate || undefined,
                            };
                        }
                        
                        initialLocationStock[locId] = {
                            lowStockThreshold: Number(locSpecificData.lowStockThreshold) || 10,
                            initialBatch: batchDetails,
                        };
                    }
                }
                const dataToSave: NewStockItemData = { name, category, sku, vendor, unitType, description, photo: photoFile, taxId, hsnCode, initialLocationStock };
                await onSave(dataToSave);
            }
            onClose();
        } catch (error: any) { 
            addToast(error.message || 'Failed to save product.', 'error'); 
        } finally { 
            setLoading(false); 
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={confirmDeletion} title={`Delete ${confirmDelete.type}`} message={`Are you sure you want to delete "${confirmDelete.value}"?`} confirmButtonText="Delete" confirmButtonVariant="danger" loading={loading} zIndex="z-[52]"/>}
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl m-4 h-[95vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0"><h2 className="text-xl font-bold">{isEditMode ? 'Edit Product' : 'Add New Product'}</h2></div>
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 flex-grow overflow-y-auto">
                        {/* Basic Details */}
                        <Input label="Name*" value={name} onChange={e => setName(e.target.value)} required />
                        <CreatableSearchableSelect label="Category*" options={categoryOptions} value={category} onChange={setCategory} onCreate={handleCreateCategory} onDelete={handleDeleteCategoryRequest} placeholder="Search or create category..." required />
                        <Input label="SKU*" value={sku} onChange={e => setSku(e.target.value)} required />
                        <Input label="HSN Code" value={hsnCode} onChange={e => setHsnCode(e.target.value)} />
                        <CreatableSearchableSelect label="Unit Type*" options={unitTypeOptions} value={unitType} onChange={setUnitType} onCreate={handleCreateUnitType} onDelete={handleDeleteUnitTypeRequest} placeholder="Search or create unit..." required />
                        <CreatableSearchableSelect label="Brand*" options={brandOptions} value={vendor} onChange={setVendor} onCreate={handleCreateBrand} onDelete={handleDeleteBrandRequest} placeholder="Search or create brand..." required />
                        <div className="lg:col-span-2"><Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} /></div>
                        <div className="lg:col-span-2"><FileInput label="Product Image" onChange={(e) => setPhotoFile(e.target.files ? e.target.files[0] : null)} /></div>
                        <div className="lg:col-span-2"><Select label="Applicable Tax" value={taxId} onChange={e => setTaxId(e.target.value)}>
                            <option value="">No Tax</option>
                            {taxOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </Select></div>

                        {!isEditMode && (
                             <div className="lg:col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">
                                    Initial Batch Details (per location)
                                </h4>
                                <div className="space-y-2">
                                    {(hospitalLocations || []).map(location => (
                                        <div key={location.id} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <button type="button" onClick={() => setExpandedLocation(expandedLocation === location.id ? null : location.id)} className="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
                                                <span className="font-semibold">{location.name}</span>
                                                <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${expandedLocation === location.id ? 'rotate-180' : ''}`} />
                                            </button>
                                            {expandedLocation === location.id && (
                                                <div className="p-4 space-y-4">
                                                    <Input label="Low Stock Threshold" type="number" value={locationStockData[location.id]?.lowStockThreshold || '10'} onChange={e => handleLocationDataChange(location.id, 'lowStockThreshold', e.target.value)} />
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <Input label="Initial Quantity" type="number" value={locationStockData[location.id]?.quantity || ''} onChange={e => handleLocationDataChange(location.id, 'quantity', e.target.value)} placeholder="e.g., 100" />
                                                        <Input label="Batch Number" value={locationStockData[location.id]?.batchNumber || ''} onChange={e => handleLocationDataChange(location.id, 'batchNumber', e.target.value)} placeholder="Optional" />
                                                        <Input label="Expiry Date" type="date" value={locationStockData[location.id]?.expiryDate || ''} onChange={e => handleLocationDataChange(location.id, 'expiryDate', e.target.value)} />
                                                    </div>
                                                    <h5 className="font-semibold text-sm mt-4 pt-4 border-t">Pricing</h5>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input label="Purchase Price (Exc. Tax)" type="text" inputMode="decimal" value={locationStockData[location.id]?.purchasePriceExcTax || ''} onChange={e => handlePricingCalculation(location.id, 'purchasePriceExcTax', e.target.value)} />
                                                        <Input label="Purchase Price (Inc. Tax)" type="text" inputMode="decimal" value={locationStockData[location.id]?.purchasePriceIncTax || ''} onChange={e => handlePricingCalculation(location.id, 'purchasePriceIncTax', e.target.value)} />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                        <Input label="Margin (%)" type="text" inputMode="decimal" value={locationStockData[location.id]?.marginPercent || ''} onChange={e => handlePricingCalculation(location.id, 'marginPercent', e.target.value)} />
                                                        <Input label="Selling Price (Exc. Tax)" type="text" inputMode="decimal" value={locationStockData[location.id]?.sellingPriceExcTax || ''} onChange={e => handlePricingCalculation(location.id, 'sellingPriceExcTax', e.target.value)} />
                                                        <Input label="Selling Price (Inc. Tax)" type="text" inputMode="decimal" value={locationStockData[location.id]?.sellingPriceIncTax || ''} onChange={e => handlePricingCalculation(location.id, 'sellingPriceIncTax', e.target.value)} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                    </div>
                    <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t flex-shrink-0"><Button type="button" variant="light" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</Button></div>
                </form>
            </div>
        </div>
    );
};

// OrderStockModal
const OrderStockModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewStockOrderData) => void;
    allStockItems: StockItem[];
    allVendors: Vendor[];
}> = ({ isOpen, onClose, onSave, allStockItems, allVendors }) => {
    // State for form fields
    const { user } = useAuth();
    const [vendor, setVendor] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentTerms, setPaymentTerms] = useState(30);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [items, setItems] = useState<{ stockItemId: string; name: string; sku: string; orderedQty: number; costPrice: number }[]>([]);
    
    // State for adding a new item
    const [selectedStockItemId, setSelectedStockItemId] = useState('');
    
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    
    const stockItemOptions = useMemo((): SearchableOption[] => allStockItems.map(item => ({
        value: item.id!,
        label: item.name,
        secondaryLabel: `SKU: ${item.sku} (In Stock: ${item.totalStock})`,
    })), [allStockItems]);

    const vendorOptions = useMemo((): SearchableOption[] => allVendors.filter(v => v.status === 'active').map(v => ({
        value: v.name,
        label: v.name,
        secondaryLabel: v.vendorId,
    })), [allVendors]);
    
    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setVendor('');
            setOrderDate(new Date().toISOString().split('T')[0]);
            setPaymentTerms(30);
            setAttachments([]);
            setItems([]);
            setSelectedStockItemId('');
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleAddItem = useCallback((stockItemIdToAdd: string) => {
        if (!stockItemIdToAdd) return;
        const stockItem = allStockItems.find(item => item.id === stockItemIdToAdd);
        if (!stockItem) return;

        // Prevent duplicates
        if (items.some(item => item.stockItemId === stockItemIdToAdd)) {
            addToast(`${stockItem.name} is already in the order.`, 'info');
            setSelectedStockItemId(''); // Clear the search bar even if duplicate
            return;
        }
        
        const latestBatch = stockItem.batches?.sort((a, b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0];
        const lastCostPrice = latestBatch?.costPrice || 0;

        setItems([...items, { stockItemId: stockItem.id!, name: stockItem.name, sku: stockItem.sku, orderedQty: 1, costPrice: lastCostPrice }]);
        setSelectedStockItemId('');
    }, [allStockItems, items, addToast]);
    
    const handleItemChange = (index: number, field: 'orderedQty' | 'costPrice', value: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };
    
    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };
    
    const totalValue = useMemo(() => items.reduce((sum, item) => sum + (item.orderedQty * item.costPrice), 0), [items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendor || items.length === 0) {
            addToast('Please select a vendor and add at least one item.', 'error');
            return;
        }
        setLoading(true);
        try {
            await onSave({
                vendor,
                items: items.map(i => ({ stockItemId: i.stockItemId, orderedQty: i.orderedQty, costPrice: i.costPrice })),
                orderDate: new Date(orderDate),
                paymentTerms,
                attachments
            });
            onClose();
        } catch (error: any) {
            addToast(error.message || 'Failed to create order.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-5xl m-4 h-[95vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b flex-shrink-0"><h2 className="text-xl font-bold">New Stock Order</h2></div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SearchableSelect label="Vendor*" options={vendorOptions} value={vendor} onChange={setVendor} required />
                            <Input label="Order Date*" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} required />
                            <Input label="Payment Terms (days)*" type="number" value={paymentTerms} onChange={e => setPaymentTerms(parseInt(e.target.value) || 0)} required />
                        </div>
                         <div className="pt-4">
                            <Input
                                label="Attachments (Optional)"
                                type="file"
                                multiple
                                onChange={(e) => setAttachments(e.target.files ? Array.from(e.target.files) : [])}
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <h3 className="text-lg font-semibold mb-2">Order Items</h3>
                            <div className="p-4 border border-dashed rounded-lg flex items-end gap-4">
                                <div className="flex-grow"><SearchableSelect label="Add Product" options={stockItemOptions} value={selectedStockItemId} onChange={(val) => { handleAddItem(val); }} placeholder="Search for a product..." /></div>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                                    <th className="p-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Product</th>
                                    <th className="p-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Qty</th>
                                    <th className="p-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Cost Price</th>
                                    <th className="p-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total</th>
                                    <th className="p-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase"></th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {items.map((item, index) => (
                                        <tr key={item.stockItemId}>
                                            <td className="p-2 text-slate-800 dark:text-slate-200">{item.name} <span className="text-xs text-slate-500">({item.sku})</span></td>
                                            <td className="p-2 text-right"><Input label="" type="number" value={item.orderedQty} onChange={e => handleItemChange(index, 'orderedQty', Math.max(0, parseInt(e.target.value) || 0))} className="w-full text-right" /></td>
                                            <td className="p-2 text-right"><Input label="" type="number" step="0.01" value={item.costPrice} onChange={e => handleItemChange(index, 'costPrice', parseFloat(e.target.value) || 0)} className="w-full text-right" /></td>
                                            <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.orderedQty * item.costPrice, user?.hospitalCurrency)}</td>
                                            <td className="p-2 text-center"><Button type="button" size="sm" variant="danger" onClick={() => handleRemoveItem(index)}><FontAwesomeIcon icon={faTimes}/></Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-right font-bold text-xl mt-4">Total Value: {formatCurrency(totalValue, user?.hospitalCurrency)}</div>
                    </div>
                    <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t flex-shrink-0">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Creating...' : 'Create Order'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
// FIX: Define the ReceiveStockModal component to resolve the "Cannot find name" error.
const ReceiveStockModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (orderId: string, items: { stockItemId: string; batches: { receivedNowQty: number; costPrice: number; batchNumber?: string; expiryDate?: string; }[] }[]) => Promise<void>;
    order: StockOrder | null;
}> = ({ isOpen, onClose, onSave, order }) => {
    type BatchInput = { id: number; qty: string; price: string; batchNumber: string; expiryDate: string; };
    type ReceivedItemsState = Record<string, { batches: BatchInput[] }>;

    const [receivedItems, setReceivedItems] = useState<ReceivedItemsState>({});
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && order) {
            const initialItems: ReceivedItemsState = {};
            order.items.forEach(item => {
                if (item.orderedQty - item.receivedQty > 0) {
                    initialItems[item.stockItemId] = {
                        batches: [{ id: Date.now(), qty: '', price: item.costPrice.toString(), batchNumber: '', expiryDate: '' }]
                    };
                }
            });
            setReceivedItems(initialItems);
        }
    }, [isOpen, order]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleAddBatch = (stockItemId: string, costPrice: number) => {
        setReceivedItems(prev => ({
            ...prev,
            [stockItemId]: {
                ...prev[stockItemId],
                batches: [...prev[stockItemId].batches, { id: Date.now(), qty: '', price: costPrice.toString(), batchNumber: '', expiryDate: '' }]
            }
        }));
    };

    const handleRemoveBatch = (stockItemId: string, batchId: number) => {
        setReceivedItems(prev => ({ ...prev, [stockItemId]: { ...prev[stockItemId], batches: prev[stockItemId].batches.filter(b => b.id !== batchId) } }));
    };

    const handleBatchChange = (stockItemId: string, batchId: number, field: keyof Omit<BatchInput, 'id'>, value: string) => {
        setReceivedItems(prev => ({
            ...prev,
            [stockItemId]: {
                ...prev[stockItemId],
                batches: prev[stockItemId].batches.map(b => b.id === batchId ? { ...b, [field]: value } : b)
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;

        const itemsToReceive = Object.entries(receivedItems)
            .map(([stockItemId, data]) => ({
                stockItemId,
                batches: data.batches
                    .filter(batch => (parseFloat(batch.qty) || 0) > 0)
                    .map(batch => ({
                        receivedNowQty: parseFloat(batch.qty) || 0,
                        costPrice: parseFloat(batch.price) || 0,
                        batchNumber: batch.batchNumber.trim() || undefined,
                        expiryDate: batch.expiryDate || undefined,
                    }))
            }))
            .filter(item => item.batches.length > 0);

        if (itemsToReceive.length === 0) { addToast('Please enter quantities to receive.', 'warning'); return; }
        setLoading(true);
        try {
            await onSave(order.id!, itemsToReceive);
            onClose();
        } catch (error: any) {
            addToast(error.message || 'Failed to receive stock.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-5xl m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Receive Stock for Order #{order.orderId}</h2></div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="p-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Item</th>
                                    <th className="p-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Pending</th>
                                    <th className="p-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 w-24">Qty</th>
                                    <th className="p-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 w-32">Cost Price</th>
                                    <th className="p-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 w-40">Batch No.</th>
                                    <th className="p-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 w-40">Expiry Date</th>
                                    <th className="p-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {order.items.map(item => {
                                    const remaining = item.orderedQty - item.receivedQty;
                                    if (remaining <= 0) return null;
                                    const itemBatches = receivedItems[item.stockItemId]?.batches || [];
                                    const firstBatch = itemBatches[0];
                                    const additionalBatches = itemBatches.slice(1);
                                    return (
                                        <React.Fragment key={item.stockItemId}>
                                            <tr className="align-top">
                                                <td className="p-2 font-semibold text-slate-800 dark:text-slate-200"><p>{item.name}</p><p className="text-xs font-normal text-slate-500">{item.sku}</p></td>
                                                <td className="p-2 text-center align-middle text-slate-800 dark:text-slate-200">{remaining}</td>
                                                {firstBatch ? (
                                                    <>
                                                        <td className="p-2"><Input label="" type="number" min="0" value={firstBatch.qty} onChange={e => handleBatchChange(item.stockItemId, firstBatch.id, 'qty', e.target.value)} placeholder="Qty" /></td>
                                                        <td className="p-2"><Input label="" type="number" step="0.01" min="0" value={firstBatch.price} onChange={e => handleBatchChange(item.stockItemId, firstBatch.id, 'price', e.target.value)} placeholder="Cost Price" /></td>
                                                        <td className="p-2"><Input label="" type="text" value={firstBatch.batchNumber} onChange={e => handleBatchChange(item.stockItemId, firstBatch.id, 'batchNumber', e.target.value)} placeholder="Batch No." /></td>
                                                        <td className="p-2"><Input label="" type="date" value={firstBatch.expiryDate} onChange={e => handleBatchChange(item.stockItemId, firstBatch.id, 'expiryDate', e.target.value)} /></td>
                                                        <td className="p-2 text-right align-middle">
                                                            <Button type="button" size="sm" variant="ghost" onClick={() => handleAddBatch(item.stockItemId, item.costPrice)} className="text-blue-600"><FontAwesomeIcon icon={faPlus} /></Button>
                                                        </td>
                                                    </>
                                                ) : <td colSpan={5} className="p-2 text-slate-500">This item is not being received.</td>}
                                            </tr>
                                            {additionalBatches.map((batch, batchIndex) => (
                                                <tr key={batch.id} className="align-top">
                                                    <td colSpan={2} className="p-2 pl-8 text-slate-600 dark:text-slate-400">Batch #{batchIndex + 2}</td>
                                                    <td className="p-2"><Input label="" type="number" min="0" value={batch.qty} onChange={e => handleBatchChange(item.stockItemId, batch.id, 'qty', e.target.value)} placeholder="Qty" /></td>
                                                    <td className="p-2"><Input label="" type="number" step="0.01" min="0" value={batch.price} onChange={e => handleBatchChange(item.stockItemId, batch.id, 'price', e.target.value)} placeholder="Cost Price" /></td>
                                                    <td className="p-2"><Input label="" type="text" value={batch.batchNumber} onChange={e => handleBatchChange(item.stockItemId, batch.id, 'batchNumber', e.target.value)} placeholder="Batch No." /></td>
                                                    <td className="p-2"><Input label="" type="date" value={batch.expiryDate} onChange={e => handleBatchChange(item.stockItemId, batch.id, 'expiryDate', e.target.value)} /></td>
                                                    <td className="p-2 text-right align-middle"><Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveBatch(item.stockItemId, batch.id)} className="text-red-600"><FontAwesomeIcon icon={faMinus} /></Button></td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t"><Button type="button" variant="light" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={loading}>{loading ? 'Receiving...' : 'Receive Stock'}</Button></div>
                </form>
            </div>
        </div>
    );
};


// CreateReturnModal
const CreateReturnModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewStockReturnData) => void;
    allVendors: Vendor[];
    allOrders: StockOrder[];
}> = ({ isOpen, onClose, onSave, allVendors, allOrders }) => {
    const { user, getStockMovements, getStockItemById, getStockReturns, stockItems, currentLocation } = useAuth();
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);

    const [selectedVendor, setSelectedVendor] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [returnItems, setReturnItems] = useState<Record<string, Record<string, string>>>({});
    const [displayItems, setDisplayItems] = useState<any[]>([]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(event.target as Node)) handleClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const resetForm = () => {
        setSelectedVendor('');
        setSelectedOrderId('');
        setReturnDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setReturnItems({});
        setDisplayItems([]);
        setLoading(false);
        setLoadingItems(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const vendorOptions = useMemo((): SearchableOption[] => allVendors.map(v => ({ value: v.name, label: v.name, secondaryLabel: v.vendorId })), [allVendors]);
    const filteredOrders = useMemo(() => allOrders.filter(o => o.vendor === selectedVendor && o.status !== 'Cancelled'), [allOrders, selectedVendor]);
    const orderOptions = useMemo((): SearchableOption[] => filteredOrders.map(o => ({ value: o.id!, label: o.orderId, secondaryLabel: o.orderDate.toDate().toLocaleDateString() })), [filteredOrders]);

    useEffect(() => {
        const fetchReturnableItems = async () => {
            if (!selectedOrderId || !currentLocation) {
                setDisplayItems([]);
                return;
            }
            setLoadingItems(true);
            setReturnItems({});
            try {
                const order = allOrders.find(o => o.id === selectedOrderId);
                if (!order) throw new Error("Order not found");

                const allReturns = await getStockReturns();
                const relatedReturns = allReturns.filter(r => r.relatedOrderId === order.orderId);

                const itemsWithBatchesPromises = order.items
                    .filter(item => item.receivedQty > (item.returnedQty || 0))
                    .map(async orderItem => {
                        const stockItem = stockItems.find(si => si.id === orderItem.stockItemId);
                        if (!stockItem) return null;

                        const movements = await getStockMovements(orderItem.stockItemId);
                        const receivedMovementsForOrder = movements.filter(m => m.relatedOrderId === order.id && m.type === 'received' && m.locationId === currentLocation.id);

                        const returnableBatches = receivedMovementsForOrder.map(move => {
                            const batchInStock = stockItem.batches.find(b => b.batchNumber === move.batchNumber);
                            if (!batchInStock || batchInStock.quantity <= 0) return null;

                            const alreadyReturnedFromBatch = relatedReturns.flatMap(r => r.items)
                                .filter(ri => ri.stockItemId === orderItem.stockItemId && ri.batchId === batchInStock.id)
                                .reduce((sum, ri) => sum + ri.returnedQty, 0);
                            
                            const maxQty = Math.min(batchInStock.quantity, move.quantityChange - alreadyReturnedFromBatch);
                            
                            if (maxQty <= 0) return null;
                            
                            return { ...batchInStock, maxQty };
                        }).filter((b): b is StockBatch & { maxQty: number } => b !== null);

                        if (returnableBatches.length > 0) {
                            return { ...orderItem, returnableBatches };
                        }
                        return null;
                    });
                
                const resolvedItems = (await Promise.all(itemsWithBatchesPromises)).filter(Boolean);
                setDisplayItems(resolvedItems as any[]);
            } catch (err: any) {
                addToast(err.message || "Failed to load returnable items.", "error");
                setDisplayItems([]);
            } finally {
                setLoadingItems(false);
            }
        };
        fetchReturnableItems();
    }, [selectedOrderId, allOrders, stockItems, getStockMovements, getStockReturns, addToast, currentLocation]);

    const handleQtyChange = (stockItemId: string, batchId: string, value: string, maxQty: number) => {
        const qty = parseInt(value, 10);
        const newQty = Math.min(Math.max(0, isNaN(qty) ? 0 : qty), maxQty);
        setReturnItems(prev => ({ ...prev, [stockItemId]: { ...prev[stockItemId], [batchId]: newQty > 0 ? String(newQty) : '' } }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const order = allOrders.find(o => o.id === selectedOrderId);
        if (!order) {
            addToast("Please select a valid order.", "error");
            return;
        }

        const itemsToSave: { stockItemId: string; batchId: string; returnedQty: number }[] = [];
        Object.entries(returnItems).forEach(([stockItemId, batches]) => {
            Object.entries(batches).forEach(([batchId, qty]) => {
                const returnedQty = parseInt(qty, 10);
                if (returnedQty > 0) itemsToSave.push({ stockItemId, batchId, returnedQty });
            });
        });

        if (itemsToSave.length === 0) {
            addToast("Please enter a quantity for at least one item to return.", "warning");
            return;
        }
        setLoading(true);
        try {
            await onSave({
                vendor: order.vendor,
                relatedOrderId: order.orderId,
                returnDate: new Date(returnDate),
                items: itemsToSave,
                notes,
            });
            handleClose();
        } catch (error: any) {
            addToast(error.message || "Failed to process return.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl m-4 h-[95vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b"><h2 className="text-xl font-bold">Create Stock Return</h2></div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect label="Vendor*" options={vendorOptions} value={selectedVendor} onChange={(val) => { setSelectedVendor(val); setSelectedOrderId(''); }} />
                            <SearchableSelect label="Purchase Order*" options={orderOptions} value={selectedOrderId} onChange={setSelectedOrderId} disabled={!selectedVendor} />
                        </div>
                        <Input label="Return Date" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                        <Textarea label="Notes / Reason for Return" value={notes} onChange={e => setNotes(e.target.value)} />
                        
                        {selectedOrderId && (loadingItems ? <p>Loading items...</p> : (
                            <div className="pt-4 border-t">
                                <h3 className="text-lg font-semibold mb-2">Returnable Items</h3>
                                <div className="space-y-4">
                                    {displayItems.length > 0 ? displayItems.map(item => (
                                        <div key={item.stockItemId} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Received: {item.receivedQty} | Returned: {item.returnedQty || 0}</p>
                                            <div className="mt-2 space-y-2">
                                                {item.returnableBatches.map((batch: any) => (
                                                    <div key={batch.id} className="grid grid-cols-3 gap-4 items-center">
                                                        <p className="text-sm text-slate-700 dark:text-slate-300">Batch: {batch.batchNumber} (Avail: {batch.maxQty})</p>
                                                        <Input label="" type="number" min="0" max={batch.maxQty} placeholder={`Max: ${batch.maxQty}`} value={returnItems[item.stockItemId]?.[batch.id] || ''} onChange={e => handleQtyChange(item.stockItemId, batch.id, e.target.value, batch.maxQty)} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )) : <p className="text-slate-500 dark:text-slate-400 text-center">No returnable items for this order.</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t flex-shrink-0">
                        <Button type="button" variant="light" onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Processing...' : 'Create Return'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// CreateReturnModal
const NewTransferModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewStockTransferData) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const { user, stockItems, hospitalLocations, currentLocation } = useAuth();
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    // Form state
    const [toLocationId, setToLocationId] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<any[]>([]); // To hold items for transfer

    // Item selection state
    const [selectedStockItemId, setSelectedStockItemId] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [quantity, setQuantity] = useState('');

    const resetForm = () => {
        setToLocationId('');
        setTransferDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setItems([]);
        setSelectedStockItemId('');
        setSelectedBatchId('');
        setQuantity('');
    };

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if(isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const locationOptions = useMemo((): SearchableOption[] =>
        (hospitalLocations || [])
            .filter(loc => loc.id !== currentLocation?.id)
            .map(loc => ({ value: loc.id, label: loc.name })),
        [hospitalLocations, currentLocation]
    );

    const stockItemOptions = useMemo((): SearchableOption[] =>
        stockItems
            .filter(item => item.totalStock > 0)
            .map(item => ({
                value: item.id!,
                label: item.name,
                secondaryLabel: `SKU: ${item.sku} (In Stock: ${item.totalStock})`,
            })),
        [stockItems]
    );

    const selectedStockItem = useMemo(() =>
        stockItems.find(item => item.id === selectedStockItemId),
        [stockItems, selectedStockItemId]
    );

    const batchOptions = useMemo(() => {
        if (!selectedStockItem) return [];
        return selectedStockItem.batches
            .filter(batch => batch.quantity > 0)
            .map(batch => ({
                value: batch.id,
                label: `${batch.batchNumber || 'N/A'} (Available: ${batch.quantity})`,
            }));
    }, [selectedStockItem]);

    const handleAddItem = () => {
        const qty = parseInt(quantity, 10);
        if (!selectedStockItemId || !selectedBatchId || !qty || qty <= 0) {
            addToast("Please select an item, batch, and enter a valid quantity.", "warning");
            return;
        }

        const itemDetails = stockItems.find(i => i.id === selectedStockItemId);
        if (!itemDetails) return;

        const batchDetails = itemDetails.batches.find(b => b.id === selectedBatchId);
        if (!batchDetails) return;

        if (qty > batchDetails.quantity) {
            addToast(`Cannot transfer more than available quantity (${batchDetails.quantity}).`, "error");
            return;
        }
        
        const existingItemIndex = items.findIndex(i => i.stockItemId === selectedStockItemId && i.batchId === selectedBatchId);

        if (existingItemIndex > -1) {
            const newItems = [...items];
            const newQty = newItems[existingItemIndex].quantity + qty;
            if (newQty > batchDetails.quantity) {
                 addToast(`Total quantity exceeds available stock for this batch.`, "error");
                 return;
            }
            newItems[existingItemIndex].quantity = newQty;
            setItems(newItems);
        } else {
            setItems([...items, {
                stockItemId: itemDetails.id!,
                batchId: batchDetails.id,
                quantity: qty,
                name: itemDetails.name,
                sku: itemDetails.sku,
                unitType: itemDetails.unitType,
                batchNumber: batchDetails.batchNumber,
                costPriceAtTransfer: batchDetails.costPrice,
                maxQty: batchDetails.quantity
            }]);
        }
        
        setSelectedStockItemId('');
        setSelectedBatchId('');
        setQuantity('');
    };
    
    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };
    
    const totalValue = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.costPriceAtTransfer, 0), [items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!toLocationId || items.length === 0) {
            addToast("Please select a destination and add at least one item.", "error");
            return;
        }
        setLoading(true);
        try {
            await onSave({
                toLocationId,
                transferDate: new Date(transferDate),
                items: items.map(({ stockItemId, batchId, quantity }) => ({ stockItemId, batchId, quantity })),
                notes
            });
            onClose();
        } catch (error: any) {
            addToast(error.message || "Failed to create transfer.", "error");
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-5xl m-4 h-[95vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b flex-shrink-0">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">New Stock Transfer</h2>
                    </div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect label="Transfer To*" options={locationOptions} value={toLocationId} onChange={setToLocationId} required />
                            <Input label="Transfer Date*" type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} required />
                        </div>
                        <Textarea label="Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} />
                        
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">Items to Transfer</h3>
                            <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col md:flex-row items-end gap-4">
                                <div className="flex-grow w-full"><SearchableSelect label="Product" options={stockItemOptions} value={selectedStockItemId} onChange={(val) => { setSelectedStockItemId(val); setSelectedBatchId(''); }} /></div>
                                <div className="flex-grow w-full"><Select label="Batch" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} disabled={!selectedStockItemId}><option value="">Select batch...</option>{batchOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</Select></div>
                                <div className="w-full md:w-32"><Input label="Quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} disabled={!selectedBatchId} /></div>
                                <Button type="button" onClick={handleAddItem} disabled={!selectedBatchId || !quantity}>Add</Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="p-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Product</th>
                                        <th className="p-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Batch</th>
                                        <th className="p-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Qty</th>
                                        <th className="p-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Cost</th>
                                        <th className="p-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total</th>
                                        <th className="p-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {items.map((item, index) => (
                                        <tr key={`${item.stockItemId}-${item.batchId}`}>
                                            <td className="p-2 text-slate-800 dark:text-slate-200">{item.name} <span className="text-xs text-slate-500">({item.sku})</span></td>
                                            <td className="p-2 font-mono text-slate-800 dark:text-slate-200">{item.batchNumber}</td>
                                            <td className="p-2 text-right text-slate-800 dark:text-slate-200">{item.quantity}</td>
                                            <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.costPriceAtTransfer, user?.hospitalCurrency)}</td>
                                            <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.quantity * item.costPriceAtTransfer, user?.hospitalCurrency)}</td>
                                            <td className="p-2 text-center"><Button type="button" size="sm" variant="danger" onClick={() => handleRemoveItem(index)}><FontAwesomeIcon icon={faTimes}/></Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-right font-bold text-xl mt-4 text-slate-800 dark:text-slate-200">Total Value: {formatCurrency(totalValue, user?.hospitalCurrency)}</div>
                    </div>
                    <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t flex-shrink-0">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Transferring...' : 'Create Transfer'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StocksScreen: React.FC = () => {
    const { user, stockItems, stockOrders, stockReturns, vendors, addStock, updateStock, deleteStock, addStockOrder, receiveStockOrderItems, addStockReturn, currentLocation, addStockTransfer, stockTransfers, hospitalLocations, getStockMovements, getStockItemById, getStockReturns: getAllReturns } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [activeTab, setActiveTab] = useState('Inventory');
    
    // Modal states
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<StockItem | null>(null);
    const [isOrderStockModalOpen, setIsOrderStockModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [orderToReceive, setOrderToReceive] = useState<StockOrder | null>(null);
    const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

    // Filter & Pagination States
    const [inventorySearch, setInventorySearch] = useState('');
    const [invCategoryFilter, setInvCategoryFilter] = useState('all');
    const [invStatusFilter, setInvStatusFilter] = useState('all');
    const [invCurrentPage, setInvCurrentPage] = useState(1);
    const [invItemsPerPage, setInvItemsPerPage] = usePaginationSettings();
    
    const [orderSearch, setOrderSearch] = useState('');
    const [orderVendorFilter, setOrderVendorFilter] = useState('all');
    const [orderStatusFilter, setOrderStatusFilter] = useState('all');
    const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState('all');
    const [orderCurrentPage, setOrderCurrentPage] = useState(1);
    const [orderItemsPerPage, setOrderItemsPerPage] = usePaginationSettings();
    
    const [returnSearch, setReturnSearch] = useState('');
    const [returnVendorFilter, setReturnVendorFilter] = useState('all');
    const [returnCurrentPage, setReturnCurrentPage] = useState(1);
    const [returnItemsPerPage, setReturnItemsPerPage] = usePaginationSettings();
    
    const [transferSearch, setTransferSearch] = useState('');
    const [transferFromFilter, setTransferFromFilter] = useState('all');
    const [transferToFilter, setTransferToFilter] = useState('all');
    const [transferStatusFilter, setTransferStatusFilter] = useState('all');
    const [transferCurrentPage, setTransferCurrentPage] = useState(1);
    const [transferItemsPerPage, setTransferItemsPerPage] = usePaginationSettings();

    useEffect(() => {
        const savedState = sessionStorage.getItem('stocksListState');
        if (savedState) {
            sessionStorage.removeItem('stocksListState'); // Clear after consuming
            const { fromTab, fromPage } = JSON.parse(savedState);
            if (fromTab) {
                setActiveTab(fromTab);
                if (fromPage) {
                    if (fromTab === 'Inventory') {
                        setInvCurrentPage(fromPage);
                    } else if (fromTab === 'Order Stock') {
                        setOrderCurrentPage(fromPage);
                    } else if (fromTab === 'Return Stock') {
                        setReturnCurrentPage(fromPage);
                    } else if (fromTab === 'Transfers') {
                        setTransferCurrentPage(fromPage);
                    }
                }
            }
        }
    }, []); // Empty dependency array to run only once on mount

    const handleSaveProduct = async (data: NewStockItemData | StockItemUpdateData, id?: string) => {
        if (id) {
            await updateStock(id, data as StockItemUpdateData);
            addToast('Product updated successfully!', 'success');
        } else {
            await addStock(data as NewStockItemData);
            addToast('Product added successfully!', 'success');
        }
    };

    const handleDeleteProduct = async () => {
        if (!itemToDelete) return;
        try {
            await deleteStock(itemToDelete.id!);
            addToast('Product deleted successfully!', 'success');
        } catch (error) { addToast('Failed to delete product.', 'error'); } finally { setItemToDelete(null); }
    };
    
    const handleSaveOrder = async (data: NewStockOrderData) => {
        await addStockOrder(data);
        addToast('Stock order created successfully!', 'success');
    };
    
    const handleReceiveStock = async (orderId: string, items: { stockItemId: string; batches: { receivedNowQty: number; costPrice: number; batchNumber?: string; expiryDate?: string; }[] }[]) => {
        await receiveStockOrderItems(orderId, items);
        addToast('Stock received successfully!', 'success');
    };

    const handleSaveReturn = async (data: NewStockReturnData) => {
        await addStockReturn(data);
        addToast('Stock return created!', 'success');
    };
    
    const handleSaveTransfer = async (data: NewStockTransferData) => {
        if (!currentLocation) {
            addToast("Please select a location first.", "error");
            return;
        }
        await addStockTransfer(data);
        setIsTransferModalOpen(false);
    };
    
    // Inventory Filtering & Pagination
    const invCategories = useMemo(() => ['all', ...Array.from(new Set(stockItems.map(s => s.category)))], [stockItems]);
    const filteredStocks = useMemo(() => {
        return stockItems
            .filter(s => invStatusFilter === 'all' || 
                (invStatusFilter === 'in-stock' && s.totalStock > s.lowStockThreshold) ||
                (invStatusFilter === 'low-stock' && s.totalStock > 0 && s.totalStock <= s.lowStockThreshold) ||
                (invStatusFilter === 'out-of-stock' && s.totalStock <= 0))
            .filter(s => invCategoryFilter === 'all' || s.category === invCategoryFilter)
            .filter(s => {
                if (!inventorySearch) return true;
                const term = inventorySearch.toLowerCase();
                return s.name.toLowerCase().includes(term) || s.sku.toLowerCase().includes(term) || s.vendor.toLowerCase().includes(term);
            });
    }, [stockItems, inventorySearch, invCategoryFilter, invStatusFilter]);
    const paginatedStocks = useMemo(() => filteredStocks.slice((invCurrentPage - 1) * invItemsPerPage, invCurrentPage * invItemsPerPage), [filteredStocks, invCurrentPage, invItemsPerPage]);

    // Order Filtering & Pagination
    const vendorNames = useMemo(() => ['all', ...vendors.map(v => v.name)], [vendors]);
    const filteredOrders = useMemo(() => {
        if (!currentLocation) return [];
        return stockOrders
            .filter(o => o.locationId === currentLocation.id)
            .filter(o => orderVendorFilter === 'all' || o.vendor === orderVendorFilter)
            .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
            .filter(o => orderPaymentStatusFilter === 'all' || o.paymentStatus === orderPaymentStatusFilter)
            .filter(o => {
                if (!orderSearch) return true;
                const term = orderSearch.toLowerCase();
                return o.orderId.toLowerCase().includes(term) || o.vendor.toLowerCase().includes(term);
            });
    }, [stockOrders, orderSearch, orderVendorFilter, orderStatusFilter, orderPaymentStatusFilter, currentLocation]);
    const paginatedOrders = useMemo(() => filteredOrders.slice((orderCurrentPage - 1) * orderItemsPerPage, orderCurrentPage * orderItemsPerPage), [filteredOrders, orderCurrentPage, orderItemsPerPage]);

    // Return Filtering & Pagination
    const filteredReturns = useMemo(() => {
        if (!currentLocation) return [];
        return stockReturns
            .filter(r => r.locationId === currentLocation.id)
            .filter(r => returnVendorFilter === 'all' || r.vendor === returnVendorFilter)
            .filter(r => {
                if (!returnSearch) return true;
                const term = returnSearch.toLowerCase();
                return r.returnId.toLowerCase().includes(term) || r.vendor.toLowerCase().includes(term) || r.relatedOrderId.toLowerCase().includes(term);
            });
    }, [stockReturns, returnSearch, returnVendorFilter, currentLocation]);
    const paginatedReturns = useMemo(() => filteredReturns.slice((returnCurrentPage - 1) * returnItemsPerPage, returnCurrentPage * returnItemsPerPage), [filteredReturns, returnCurrentPage, returnItemsPerPage]);

    // Transfers Filtering & Pagination
    const filteredTransfers = useMemo(() => {
        return stockTransfers
            .filter(t => transferFromFilter === 'all' || t.fromLocationId === transferFromFilter)
            .filter(t => transferToFilter === 'all' || t.toLocationId === transferToFilter)
            .filter(t => transferStatusFilter === 'all' || t.status === transferStatusFilter)
            .filter(t => {
                if (!transferSearch) return true;
                const term = transferSearch.toLowerCase();
                return t.transferId.toLowerCase().includes(term) ||
                       t.fromLocationName.toLowerCase().includes(term) ||
                       t.toLocationName.toLowerCase().includes(term);
            });
    }, [stockTransfers, transferSearch, transferFromFilter, transferToFilter, transferStatusFilter]);

    const paginatedTransfers = useMemo(() => {
        const startIndex = (transferCurrentPage - 1) * transferItemsPerPage;
        return filteredTransfers.slice(startIndex, startIndex + transferItemsPerPage);
    }, [filteredTransfers, transferCurrentPage, transferItemsPerPage]);

    useEffect(() => {
        setInvCurrentPage(1);
    }, [inventorySearch, invCategoryFilter, invStatusFilter]);

    useEffect(() => {
        setOrderCurrentPage(1);
    }, [orderSearch, orderVendorFilter, orderStatusFilter, orderPaymentStatusFilter]);

    useEffect(() => {
        setReturnCurrentPage(1);
    }, [returnSearch, returnVendorFilter]);

    useEffect(() => {
        setTransferCurrentPage(1);
    }, [transferSearch, transferStatusFilter, transferFromFilter, transferToFilter]);

    const inventoryStats = useMemo(() => {
        const totalValue = stockItems.reduce((sum, item) => sum + (item.batches || []).reduce((batchSum, batch) => batchSum + (batch.costPrice * batch.quantity), 0), 0);
        const lowStock = stockItems.filter(item => item.totalStock > 0 && item.totalStock <= item.lowStockThreshold).length;
        const outOfStock = stockItems.filter(item => item.totalStock <= 0).length;
        return { totalValue, lowStock, outOfStock, totalProducts: stockItems.length };
    }, [stockItems]);
    
    const TabButton: React.FC<{ tabId: string, title: string, icon: any }> = ({ tabId, title, icon }) => (
        <button onClick={() => setActiveTab(tabId)} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tabId ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:border-slate-300'}`}>
            <FontAwesomeIcon icon={icon} /> {title}
        </button>
    );

    if (!currentLocation) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <FontAwesomeIcon icon={faBoxOpen} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Location Selected</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Please select a hospital location from the header to manage stock.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <AddProductModal isOpen={isAddProductModalOpen} onClose={() => {setIsAddProductModalOpen(false); setProductToEdit(null);}} onSave={handleSaveProduct} productToEdit={productToEdit} />
            <OrderStockModal isOpen={isOrderStockModalOpen} onClose={() => setIsOrderStockModalOpen(false)} onSave={handleSaveOrder} allStockItems={stockItems} allVendors={vendors} />
            <ReceiveStockModal isOpen={!!orderToReceive} onClose={() => setOrderToReceive(null)} onSave={handleReceiveStock} order={orderToReceive} />
            <CreateReturnModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} onSave={handleSaveReturn} allVendors={vendors} allOrders={stockOrders} />
            {itemToDelete && <ConfirmationModal isOpen={true} onClose={() => setItemToDelete(null)} onConfirm={handleDeleteProduct} title="Delete Product" message={`Are you sure you want to delete ${itemToDelete.name}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}
            <NewTransferModal 
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onSave={handleSaveTransfer}
            />

            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="TOTAL ASSET VALUE" value={formatCurrency(inventoryStats.totalValue, user?.hospitalCurrency)} subtext="Across all products" color="bg-blue-500" />
                 <StatCard title="TOTAL PRODUCTS" value={inventoryStats.totalProducts} subtext="Unique products" color="bg-green-500" />
                 <StatCard title="LOW STOCK" value={inventoryStats.lowStock} subtext="Products running low" color="bg-yellow-500" />
                 <StatCard title="OUT OF STOCK" value={inventoryStats.outOfStock} subtext="Products to reorder" color="bg-red-500" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-800">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <TabButton tabId="Inventory" title="Inventory" icon={faBoxOpen} />
                        <TabButton tabId="Order Stock" title="Order Stock" icon={faDolly} />
                        <TabButton tabId="Return Stock" title="Return Stock" icon={faUndo} />
                        <TabButton tabId="Transfers" title="Transfers" icon={faExchangeAlt} />
                    </nav>
                </div>
                
                <div>
                    {activeTab === 'Inventory' && (
                        <div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                <div className="lg:col-span-2"><Input label="Search" type="search" placeholder="Search name, SKU, or brand..." value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} icon={<FontAwesomeIcon icon={faSearch} />} /></div>
                                <Select label="Category" value={invCategoryFilter} onChange={e => setInvCategoryFilter(e.target.value)}><option value="all">All Categories</option>{invCategories.map(c => <option key={c} value={c}>{c}</option>)}</Select>
                                <Select label="Status" value={invStatusFilter} onChange={e => setInvStatusFilter(e.target.value)}><option value="all">All Statuses</option><option value="in-stock">In Stock</option><option value="low-stock">Low Stock</option><option value="out-of-stock">Out of Stock</option></Select>
                                <Button variant="primary" onClick={() => { setProductToEdit(null); setIsAddProductModalOpen(true); }} className="h-[46px]"><FontAwesomeIcon icon={faPlus} className="mr-2" /> New Product</Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Photo</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Purchase Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Selling Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asset Value</th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">{paginatedStocks.map(item => {
                                    const latestBatch = item.batches?.length > 0 ? [...item.batches].sort((a,b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0] : null;
                                    const purchasePrice = latestBatch ? latestBatch.costPrice : 0;
                                    const sellingPrice = latestBatch ? latestBatch.salePrice : 0;
                                    return (
                                    <tr key={item.id} onClick={() => {
                                        sessionStorage.setItem('stocksListState', JSON.stringify({ fromTab: 'Inventory', fromPage: invCurrentPage }));
                                        navigate(`/hospitals/${user?.hospitalSlug}/stocks/${item.id}`);
                                    }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.photoUrl ? (
                                                <img src={item.photoUrl} alt={item.name} className="h-10 w-10 rounded-md object-cover" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <FontAwesomeIcon icon={faBoxOpen} className="h-5 w-5 text-slate-400" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">
                                            <div className="font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                                            <div className="text-slate-500 dark:text-slate-400">{item.sku}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.vendor}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">{item.totalStock} <span className="font-normal text-slate-500">{item.unitType}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StockStatusBadge stock={item.totalStock} threshold={item.lowStockThreshold} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatCurrency(purchasePrice, user?.hospitalCurrency)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatCurrency(sellingPrice, user?.hospitalCurrency)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatCurrency((item.batches || []).reduce((sum, batch) => sum + (batch.costPrice * batch.quantity), 0), user?.hospitalCurrency)}</td>
                                    </tr>
                                )})}</tbody></table>
                            </div>
                            <Pagination currentPage={invCurrentPage} totalPages={Math.ceil(filteredStocks.length / invItemsPerPage)} onPageChange={setInvCurrentPage} itemsPerPage={invItemsPerPage} onItemsPerPageChange={setInvItemsPerPage} totalItems={filteredStocks.length} itemsOnPage={paginatedStocks.length} />
                        </div>
                    )}

                    {activeTab === 'Order Stock' && (
                         <div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                                <div className="lg:col-span-2"><Input label="Search" type="search" placeholder="Search order ID or vendor..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} icon={<FontAwesomeIcon icon={faSearch} />} /></div>
                                <Select label="Vendor" value={orderVendorFilter} onChange={e => setOrderVendorFilter(e.target.value)}><option value="all">All Vendors</option>{vendorNames.map(v => <option key={v} value={v}>{v}</option>)}</Select>
                                <Select label="Order Status" value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}><option value="all">All Statuses</option>{['Pending', 'Partially Received', 'Complete', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</Select>
                                <Select label="Payment Status" value={orderPaymentStatusFilter} onChange={e => setOrderPaymentStatusFilter(e.target.value)}><option value="all">All Payment Statuses</option><option value="Paid">Paid</option><option value="Partially Paid">Partially Paid</option><option value="Unpaid">Unpaid</option></Select>
                                <Button variant="primary" onClick={() => setIsOrderStockModalOpen(true)} className="h-[46px]"><FontAwesomeIcon icon={faBoxesPacking} className="mr-2" /> Order Stock</Button>
                            </div>
                            <div className="overflow-x-auto"><table className="min-w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Due</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added By</th>
                                    <th className="relative px-6 py-3"></th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">{paginatedOrders.map(order => (<tr key={order.id} onClick={() => {
                                    sessionStorage.setItem('stocksListState', JSON.stringify({ fromTab: 'Order Stock', fromPage: orderCurrentPage }));
                                    navigate(`/hospitals/${user?.hospitalSlug}/stocks/orders/${order.id}`);
                                }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">{order.orderId}</p>
                                        <p className="text-slate-500 dark:text-slate-400">{order.totalItems} items</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{order.createdAt.toDate().toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{order.vendor}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><OrderStatusBadge status={order.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(order.totalValue, user?.hospitalCurrency)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><PaymentStatusBadge status={order.paymentStatus} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-500">{formatCurrency(order.totalValue - (order.amountPaid || 0), user?.hospitalCurrency)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{order.createdBy || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{order.status !== 'Complete' && order.status !== 'Cancelled' && <Button size="sm" variant="light" onClick={(e) => { e.stopPropagation(); setOrderToReceive(order); }}>Receive</Button>}</td>
                                </tr>))}</tbody></table></div>
                             <Pagination currentPage={orderCurrentPage} totalPages={Math.ceil(filteredOrders.length / orderItemsPerPage)} onPageChange={setOrderCurrentPage} itemsPerPage={orderItemsPerPage} onItemsPerPageChange={setOrderItemsPerPage} totalItems={filteredOrders.length} itemsOnPage={paginatedOrders.length} />
                        </div>
                    )}
                    
                    {activeTab === 'Return Stock' && (
                         <div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div className="lg:col-span-2"><Input label="Search" type="search" placeholder="Search return or order ID..." value={returnSearch} onChange={e => setReturnSearch(e.target.value)} icon={<FontAwesomeIcon icon={faSearch} />} /></div>
                                <Select label="Vendor" value={returnVendorFilter} onChange={e => setReturnVendorFilter(e.target.value)}><option value="all">All Vendors</option>{vendorNames.map(v => <option key={v} value={v}>{v}</option>)}</Select>
                                <Button variant="primary" onClick={() => setIsReturnModalOpen(true)} className="h-[46px]"><FontAwesomeIcon icon={faUndo} className="mr-2" /> Create Return</Button>
                            </div>
                            <div className="overflow-x-auto"><table className="min-w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Return</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Related Order</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items Returned</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added By</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">{paginatedReturns.map(ret => (<tr key={ret.id} onClick={() => {
                                    sessionStorage.setItem('stocksListState', JSON.stringify({ fromTab: 'Return Stock', fromPage: returnCurrentPage }));
                                    navigate(`/hospitals/${user?.hospitalSlug}/stocks/returns/${ret.id}`);
                                }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">
                                        <div className="font-medium text-blue-600 dark:text-blue-400">{ret.returnId}</div>
                                        <div className="text-slate-500 dark:text-slate-400">{ret.createdAt.toDate().toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{ret.vendor}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{ret.relatedOrderId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-800 dark:text-slate-200">{ret.items.reduce((sum, item) => sum + item.returnedQty, 0)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{ret.createdBy || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600 dark:text-red-500">-{formatCurrency(ret.totalReturnValue, user?.hospitalCurrency)}</td>
                                </tr>))}</tbody></table></div>
                            <Pagination currentPage={returnCurrentPage} totalPages={Math.ceil(filteredReturns.length / returnItemsPerPage)} onPageChange={setReturnCurrentPage} itemsPerPage={returnItemsPerPage} onItemsPerPageChange={setReturnItemsPerPage} totalItems={filteredReturns.length} itemsOnPage={paginatedReturns.length} />
                        </div>
                    )}
                    {activeTab === 'Transfers' && (
                        <div>
                             <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                                <div className="lg:col-span-2"><Input label="Search" type="search" placeholder="Search ID or location..." value={transferSearch} onChange={e => setTransferSearch(e.target.value)} icon={<FontAwesomeIcon icon={faSearch} />} /></div>
                                <Select label="From Location" value={transferFromFilter} onChange={e => setTransferFromFilter(e.target.value)}>
                                    <option value="all">All Locations</option>
                                    {hospitalLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </Select>
                                <Select label="To Location" value={transferToFilter} onChange={e => setTransferToFilter(e.target.value)}>
                                    <option value="all">All Locations</option>
                                    {hospitalLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </Select>
                                <Select label="Status" value={transferStatusFilter} onChange={e => setTransferStatusFilter(e.target.value)}>
                                    <option value="all">All Statuses</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Reversed">Reversed</option>
                                </Select>
                                <Button variant="primary" onClick={() => setIsTransferModalOpen(true)} className="h-[46px]"><FontAwesomeIcon icon={faExchangeAlt} className="mr-2"/>New Transfer</Button>
                            </div>
                            <div className="overflow-x-auto"><table className="min-w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transfer ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">From</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">To</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                    {paginatedTransfers.map(transfer => (
                                        <tr key={transfer.id} onClick={() => {
                                            sessionStorage.setItem('stocksListState', JSON.stringify({ fromTab: 'Transfers', fromPage: transferCurrentPage }));
                                            navigate(`/hospitals/${user?.hospitalSlug}/stocks/transfers/${transfer.id}`);
                                        }} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 dark:text-blue-400">{transfer.transferId}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{transfer.transferDate.toDate().toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{transfer.fromLocationName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{transfer.toLocationName}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(transfer.totalValue, user?.hospitalCurrency)}</td>
                                            <td className="px-6 py-4"><span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${transfer.status === 'Reversed' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>{transfer.status}</span></td>
                                        </tr>
                                    ))}
                                    {paginatedTransfers.length === 0 && (
                                        <tr><td colSpan={6} className="text-center p-8 text-slate-500">No stock transfers found for the selected filters.</td></tr>
                                    )}
                                </tbody>
                            </table></div>
                             <Pagination currentPage={transferCurrentPage} totalPages={Math.ceil(filteredTransfers.length / transferItemsPerPage)} onPageChange={setTransferCurrentPage} itemsPerPage={transferItemsPerPage} onItemsPerPageChange={setTransferItemsPerPage} totalItems={filteredTransfers.length} itemsOnPage={paginatedTransfers.length} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default StocksScreen;
