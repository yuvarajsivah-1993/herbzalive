
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StockItem, NewStockItemData, StockMovement, Tax, StockOrder, StockOrderStatus, TaxGroup, StockItemUpdateData, StockBatch } from '../../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faSave, faTimes, faPencilAlt, faTrashAlt, faExchangeAlt, faUndo, faBoxOpen, faHistory, faDolly, faChevronLeft, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Timestamp } from 'firebase/firestore';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import FileInput from '../components/ui/FileInput';
import CreatableSearchableSelect from '../components/ui/CreatableSearchableSelect';
import { db } from '../services/firebase';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3></div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">{footer}</div>}
    </div>
);

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


const AdjustStockModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (batchId: string, quantityChange: number, reason: string) => Promise<void>;
  stockItem: StockItem;
}> = ({ isOpen, onClose, onSave, stockItem }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();
    
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    
    const availableBatches = useMemo(() => stockItem.batches.filter(b => b.quantity >= 0), [stockItem.batches]);

    useEffect(() => {
        if (isOpen) {
            // Pre-select the first batch if available
            if(availableBatches.length > 0) {
                setSelectedBatchId(availableBatches[0].id);
            } else {
                setSelectedBatchId('');
            }
            setAdjustmentType('add');
            setQuantity('');
            setReason('');
            setLoading(false);
        }
    }, [isOpen, availableBatches]);

    const selectedBatch = useMemo(() => {
        return availableBatches.find(b => b.id === selectedBatchId);
    }, [selectedBatchId, availableBatches]);

    const newQuantity = useMemo(() => {
        if (!selectedBatch) return 0;
        const currentQty = selectedBatch.quantity;
        const changeQty = parseInt(quantity, 10) || 0;
        if (adjustmentType === 'add') {
            return currentQty + changeQty;
        } else {
            return currentQty - changeQty;
        }
    }, [selectedBatch, quantity, adjustmentType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseInt(quantity, 10);
        if (!selectedBatchId || !reason.trim() || !qty || qty <= 0) {
            addToast("Please select a batch, enter a positive quantity, and provide a reason.", "error");
            return;
        }
        if (adjustmentType === 'remove' && newQuantity < 0) {
            addToast("Cannot remove more stock than available in the batch.", "error");
            return;
        }
        
        setLoading(true);
        const quantityChange = adjustmentType === 'add' ? qty : -qty;
        try {
            await onSave(selectedBatchId, quantityChange, reason);
            onClose();
        } catch (error: any) {
            addToast(error.message || "Failed to adjust stock.", "error");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold">Adjust Stock for {stockItem.name}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <Select label="Select Batch*" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} disabled={availableBatches.length === 0}>
                            {availableBatches.length > 0 ? (
                                availableBatches.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.batchNumber} - (Available: {b.quantity})
                                        {b.expiryDate ? ` - Exp: ${b.expiryDate.toDate().toLocaleDateString()}` : ''}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No batches available for adjustment</option>
                            )}
                        </Select>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <Button type="button" onClick={() => setAdjustmentType('add')} className={`w-full ${adjustmentType === 'add' ? '' : '!bg-transparent'}`} variant={adjustmentType === 'add' ? 'light' : 'ghost'}>Add Stock</Button>
                            <Button type="button" onClick={() => setAdjustmentType('remove')} className={`w-full ${adjustmentType === 'remove' ? '' : '!bg-transparent'}`} variant={adjustmentType === 'remove' ? 'light' : 'ghost'}>Remove Stock</Button>
                        </div>

                        <Input label="Quantity to Adjust*" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                        <Input label="Reason for Adjustment*" value={reason} onChange={e => setReason(e.target.value)} required />

                        {selectedBatch && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="text-center p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                    <p className="text-sm text-slate-500">Current Quantity</p>
                                    <p className="text-2xl font-bold">{selectedBatch.quantity}</p>
                                </div>
                                <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/50 rounded-md">
                                    <p className="text-sm text-blue-600 dark:text-blue-300">New Quantity</p>
                                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{newQuantity}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t gap-2">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading || !selectedBatchId}>{loading ? 'Saving...' : 'Confirm Adjustment'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const StockItemDetailsScreen: React.FC = () => {
    const { stockItemId } = useParams<{ stockItemId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, getStockItemById, updateStock, deleteStock, getStockMovements, adjustStockQuantity, getTaxes, getTaxGroups, getStockOrders, getStocks, addStockCategory, deleteStockCategory, addStockUnitType, deleteStockUnitType, addStockBrand, deleteStockBrand, currentLocation } = useAuth();
    const { addToast } = useToast();

    const [stockItem, setStockItem] = useState<StockItem | null>(null);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);
    const [orderHistory, setOrderHistory] = useState<StockOrder[]>([]);
    const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmCatUnitDelete, setConfirmCatUnitDelete] = useState<{ type: 'category' | 'unit' | 'brand', value: string } | null>(null);
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    
    const [formData, setFormData] = useState<Partial<StockItemUpdateData>>({});
    
    // Pricing states
    const [purchasePriceExcTax, setPurchasePriceExcTax] = useState('');
    const [purchasePriceIncTax, setPurchasePriceIncTax] = useState('');
    const [marginPercent, setMarginPercent] = useState('');
    const [sellingPriceExcTax, setSellingPriceExcTax] = useState('');
    const [sellingPriceIncTax, setSellingPriceIncTax] = useState('');

    const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
    const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);

    const taxMap = useMemo(() => {
        const map = new Map<string, { name: string, rate: number, isGroup: boolean }>();
        taxes.forEach(t => t.id && map.set(t.id, { name: `${t.name} (${t.rate}%)`, rate: t.rate, isGroup: false }));
        taxGroups.forEach(g => g.id && map.set(g.id, { name: `${g.name} (${g.totalRate.toFixed(2)}%)`, rate: g.totalRate, isGroup: true }));
        return map;
    }, [taxes, taxGroups]);
    
    const taxOptions = useMemo(() => Array.from(taxMap.entries()).map(([id, {name}]) => ({ value: id, label: name })), [taxMap]);

    const populateForm = useCallback((itemData: StockItem, currentTaxMap: Map<string, any>) => {
        setFormData({
            name: itemData.name, category: itemData.category, sku: itemData.sku, vendor: itemData.vendor,
            lowStockThreshold: itemData.lowStockThreshold, unitType: itemData.unitType,
            description: itemData.description, taxId: itemData.taxId
        });

        const latestBatch = itemData.batches?.length > 0 ? [...itemData.batches].sort((a,b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0] : null;
        const taxRate = currentTaxMap.get(itemData.taxId || '')?.rate || 0;
        
        if (latestBatch) {
            const taxMultiplier = 1 + taxRate / 100;
            const purchaseExc = taxMultiplier > 0 ? latestBatch.costPrice / taxMultiplier : 0;
            const sellingExc = taxMultiplier > 0 ? latestBatch.salePrice / taxMultiplier : 0;
            const margin = purchaseExc > 0 ? ((sellingExc / purchaseExc) - 1) * 100 : 0;

            setPurchasePriceIncTax(latestBatch.costPrice.toFixed(2));
            setPurchasePriceExcTax(purchaseExc.toFixed(2));
            setSellingPriceIncTax(latestBatch.salePrice.toFixed(2));
            setSellingPriceExcTax(sellingExc.toFixed(2));
            setMarginPercent(margin.toFixed(2));
        } else {
            setPurchasePriceExcTax(''); setPurchasePriceIncTax('');
            setSellingPriceExcTax(''); setSellingPriceIncTax('');
            setMarginPercent('');
        }
        
        setNewPhotoFile(null);
        setIsPhotoRemoved(false);
    }, []);
    
    useEffect(() => {
        if (!stockItemId || !user?.hospitalId || !currentLocation) return;
    
        setLoading(true);
    
        const unsubscribe = db.collection('stocks').doc(stockItemId)
            .onSnapshot(async (doc) => {
                if (doc.exists && doc.data()?.hospitalId === user.hospitalId) {
                    const itemData = { id: doc.id, ...doc.data() } as StockItem;

                    // FLATTEN FOR CURRENT LOCATION
                    const locId = currentLocation.id;
                    const locationSpecificData = itemData.locationStock?.[locId] || { totalStock: 0, lowStockThreshold: 10, batches: [] };
                    const flattenedItem = { ...itemData, ...locationSpecificData };
                    setStockItem(flattenedItem);
    
                    // Fetch related data that isn't real-time
                    const [movementsData, taxesData, taxGroupsData, ordersData, allStocksData] = await Promise.all([
                        getStockMovements(stockItemId), getTaxes(), getTaxGroups(),
                        getStockOrders(), getStocks()
                    ]);
    
                    setMovements(movementsData.filter(m => m.locationId === locId));
                    setTaxes(taxesData);
                    setTaxGroups(taxGroupsData);
                    setAllStockItems(allStocksData);
    
                    const itemOrderHistory = ordersData.filter(order => order.locationId === locId && order.items.some(item => item.stockItemId === stockItemId));
                    setOrderHistory(itemOrderHistory);

                    const tempTaxMap = new Map<string, { name: string, rate: number, isGroup: boolean }>();
                    taxesData.forEach(t => t.id && tempTaxMap.set(t.id, { name: `${t.name} (${t.rate}%)`, rate: t.rate, isGroup: false }));
                    taxGroupsData.forEach(g => g.id && tempTaxMap.set(g.id, { name: `${g.name} (${g.totalRate.toFixed(2)}%)`, rate: g.totalRate, isGroup: true }));
                    
                    if (!isEditing) {
                        populateForm(flattenedItem, tempTaxMap);
                    }
    
                    setLoading(false);
                } else {
                    addToast("Stock item not found.", "error");
                    navigate(-1);
                    setLoading(false);
                }
            }, (error) => {
                console.error("Error fetching stock item:", error);
                addToast("Failed to load item data.", "error");
                setLoading(false);
            });
    
        return () => unsubscribe();
    }, [stockItemId, user?.hospitalId, currentLocation, getStockMovements, getTaxes, getTaxGroups, getStockOrders, getStocks, addToast, navigate, isEditing, populateForm]);
    
    const decimalRegex = /^\d*\.?\d{0,2}$/;
    const numberRegex = /^\d*\.?\d*$/;

    // --- Price Calculation Handlers ---
    const handleTaxChange = (newTaxId: string) => {
        handleInputChange('taxId', newTaxId);
        const newTaxRate = taxMap.get(newTaxId)?.rate || 0;
        const newTaxMultiplier = 1 + newTaxRate / 100;
        
        const purchaseExc = parseFloat(purchasePriceExcTax) || 0;
        setPurchasePriceIncTax(purchaseExc > 0 ? (purchaseExc * newTaxMultiplier).toFixed(2) : '');
        
        const sellingExc = parseFloat(sellingPriceExcTax) || 0;
        setSellingPriceIncTax(sellingExc > 0 ? (sellingExc * newTaxMultiplier).toFixed(2) : '');
    };

    const handlePurchaseExcChange = (value: string) => {
        if (!decimalRegex.test(value)) return;
        setPurchasePriceExcTax(value);
        const taxRate = taxMap.get(formData.taxId || '')?.rate || 0;
        const taxMultiplier = 1 + taxRate / 100;
        const exc = parseFloat(value) || 0;
        setPurchasePriceIncTax(exc > 0 ? (exc * taxMultiplier).toFixed(2) : '');

        const margin = parseFloat(marginPercent) || 0;
        const sellingExc = exc * (1 + margin / 100);
        setSellingPriceExcTax(sellingExc > 0 ? sellingExc.toFixed(2) : '');
        setSellingPriceIncTax(sellingExc > 0 ? (sellingExc * taxMultiplier).toFixed(2) : '');
    };

    const handlePurchaseIncChange = (value: string) => {
        if (!decimalRegex.test(value)) return;
        setPurchasePriceIncTax(value);
        const taxRate = taxMap.get(formData.taxId || '')?.rate || 0;
        const taxMultiplier = 1 + taxRate / 100;
        const inc = parseFloat(value) || 0;
        const exc = taxMultiplier > 0 ? inc / taxMultiplier : 0;
        setPurchasePriceExcTax(exc > 0 ? exc.toFixed(2) : '');
        
        const margin = parseFloat(marginPercent) || 0;
        const sellingExc = exc * (1 + margin / 100);
        setSellingPriceExcTax(sellingExc > 0 ? sellingExc.toFixed(2) : '');
        setSellingPriceIncTax(sellingExc > 0 ? (sellingExc * taxMultiplier).toFixed(2) : '');
    };

    const handleMarginChange = (value: string) => {
        if (!numberRegex.test(value)) return;
        setMarginPercent(value);
        const margin = parseFloat(value) || 0;
        const purchaseExc = parseFloat(purchasePriceExcTax) || 0;
        const sellingExc = purchaseExc * (1 + margin / 100);
        setSellingPriceExcTax(sellingExc > 0 ? sellingExc.toFixed(2) : '');
        
        const taxRate = taxMap.get(formData.taxId || '')?.rate || 0;
        const taxMultiplier = 1 + taxRate / 100;
        setSellingPriceIncTax(sellingExc > 0 ? (sellingExc * taxMultiplier).toFixed(2) : '');
    };

    const handleSellingExcChange = (value: string) => {
        if (!decimalRegex.test(value)) return;
        setSellingPriceExcTax(value);
        const sellingExc = parseFloat(value) || 0;
        
        const taxRate = taxMap.get(formData.taxId || '')?.rate || 0;
        const taxMultiplier = 1 + taxRate / 100;
        setSellingPriceIncTax(sellingExc > 0 ? (sellingExc * taxMultiplier).toFixed(2) : '');
        
        const purchaseExc = parseFloat(purchasePriceExcTax) || 0;
        if (purchaseExc > 0) {
            const margin = ((sellingExc / purchaseExc) - 1) * 100;
            setMarginPercent(margin > 0 ? margin.toFixed(2) : '0');
        } else {
            setMarginPercent('0');
        }
    };

    const handleSellingIncChange = (value: string) => {
        if (!decimalRegex.test(value)) return;
        setSellingPriceIncTax(value);
        const sellingInc = parseFloat(value) || 0;
        
        const taxRate = taxMap.get(formData.taxId || '')?.rate || 0;
        const taxMultiplier = 1 + taxRate / 100;
        const sellingExc = taxMultiplier > 0 ? sellingInc / taxMultiplier : 0;
        setSellingPriceExcTax(sellingExc > 0 ? sellingExc.toFixed(2) : '');

        const purchaseExc = parseFloat(purchasePriceExcTax) || 0;
        if (purchaseExc > 0) {
            const margin = ((sellingExc / purchaseExc) - 1) * 100;
            setMarginPercent(margin > 0 ? margin.toFixed(2) : '0');
        } else {
            setMarginPercent('0');
        }
    };
    // --- End Price Calculation Handlers ---


    const handleUpdate = async () => {
        if (!stockItemId || !stockItem) return;
        setActionLoading(true);
        try {
            const dataToSave: Partial<StockItemUpdateData> = { ...formData };
            if (newPhotoFile) {
                dataToSave.photo = newPhotoFile;
            } else if (isPhotoRemoved) {
                dataToSave.photo = null;
            }

            if (stockItem.batches && stockItem.batches.length > 0) {
                const newSalePrice = parseFloat(sellingPriceIncTax) || 0;
                const newPurchasePrice = parseFloat(purchasePriceIncTax) || 0;
                 
                const updatedBatches = stockItem.batches.map(batch => ({
                     ...batch,
                     salePrice: newSalePrice
                }));

                // Find the latest batch to update its cost price for future reference.
                const latestBatchIndex = updatedBatches.reduce((latestIndex, currentBatch, currentIndex, array) => {
                    const latestDate = array[latestIndex]?.expiryDate?.seconds || 0;
                    const currentDate = currentBatch.expiryDate?.seconds || 0;
                    return currentDate > latestDate ? currentIndex : latestIndex;
                }, 0);
                
                if (latestBatchIndex !== -1 && updatedBatches[latestBatchIndex]) {
                    updatedBatches[latestBatchIndex].costPrice = newPurchasePrice;
                }
        
                dataToSave.batches = updatedBatches;
           }
            
            await updateStock(stockItemId, dataToSave);
            addToast("Item details updated!", "success");
            setIsEditing(false);
        } catch (error) { 
            addToast("Failed to update item.", "error");
            if (stockItem) {
                populateForm(stockItem, taxMap);
            }
        }
        finally { setActionLoading(false); }
    };

    const handleDelete = async () => {
        if (!stockItemId) return;
        setActionLoading(true);
        try {
            await deleteStock(stockItemId);
            addToast("Stock item deleted.", "success");
            navigate(`/hospitals/${user?.hospitalSlug}/stocks`);
        } catch (error) { addToast("Failed to delete item.", "error"); }
        finally { setActionLoading(false); setConfirmDelete(false); }
    };
    
    const handleAdjustStock = async (batchId: string, quantityChange: number, reason: string) => {
        if (!stockItemId || !currentLocation) {
            addToast("Cannot adjust stock without a selected location.", "error");
            return;
        }
        setActionLoading(true);
        try {
            await adjustStockQuantity(stockItemId, currentLocation.id, batchId, quantityChange, reason);
            addToast("Stock quantity adjusted successfully!", "success");
            setAdjustModalOpen(false);
            // Data will refetch due to listener
        } catch (error: any) {
            addToast(error.message || "Failed to adjust stock.", "error");
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleInputChange = (field: keyof typeof formData, value: string | number) => setFormData(prev => ({ ...prev, [field]: value }));
    
    const categoryOptions = useMemo(() => {
        const fromManagedList = user?.hospitalStockCategories || [];
        const fromItems = allStockItems.map(item => item.category);
        return [...new Set([...fromManagedList, ...fromItems])].filter(Boolean).sort();
    }, [user?.hospitalStockCategories, allStockItems]);

    const unitTypeOptions = useMemo(() => {
        const fromManagedList = user?.hospitalStockUnitTypes || [];
        const fromItems = allStockItems.map(item => item.unitType);
        return [...new Set([...fromManagedList, ...fromItems])].filter(Boolean).sort();
    }, [user?.hospitalStockUnitTypes, allStockItems]);

    const brandOptions = useMemo(() => {
        const fromManagedList = user?.hospitalStockBrands || [];
        const fromItems = allStockItems.map(item => item.vendor);
        return [...new Set([...fromManagedList, ...fromItems])].filter(Boolean).sort();
    }, [user?.hospitalStockBrands, allStockItems]);
    
    const handleCreateCategory = async (value: string) => { try { await addStockCategory(value); addToast(`Category "${value}" created.`, 'success'); } catch (error: any) { addToast(error.message, 'error'); throw error; } };
    const handleDeleteCategoryRequest = async (value: string) => { setConfirmCatUnitDelete({ type: 'category', value }); };
    const handleCreateUnitType = async (value: string) => { try { await addStockUnitType(value); addToast(`Unit Type "${value}" created.`, 'success'); } catch (error: any) { addToast(error.message, 'error'); throw error; } };
    const handleDeleteUnitTypeRequest = async (value: string) => { setConfirmCatUnitDelete({ type: 'unit', value }); };
    const handleCreateBrand = async (value: string) => { try { await addStockBrand(value); addToast(`Brand "${value}" created.`, 'success'); } catch (error: any) { addToast(error.message, 'error'); throw error; } };
    const handleDeleteBrandRequest = async (value: string) => { setConfirmCatUnitDelete({ type: 'brand', value }); };

    const confirmCatUnitDeletion = async () => {
        if (!confirmCatUnitDelete) return; setActionLoading(true);
        try {
            if (confirmCatUnitDelete.type === 'category') {
                await deleteStockCategory(confirmCatUnitDelete.value);
                if(formData.category === confirmCatUnitDelete.value) handleInputChange('category', '');
                addToast(`Category "${confirmCatUnitDelete.value}" deleted.`, 'success');
            } else if (confirmCatUnitDelete.type === 'unit') {
                await deleteStockUnitType(confirmCatUnitDelete.value);
                if(formData.unitType === confirmCatUnitDelete.value) handleInputChange('unitType', '');
                addToast(`Unit Type "${confirmCatUnitDelete.value}" deleted.`, 'success');
            } else {
                await deleteStockBrand(confirmCatUnitDelete.value);
                if(formData.vendor === confirmCatUnitDelete.value) handleInputChange('vendor', '');
                addToast(`Brand "${confirmCatUnitDelete.value}" deleted.`, 'success');
            }
        } catch (error: any) { addToast(error.message, 'error'); } 
        finally { setConfirmCatUnitDelete(null); setActionLoading(false); }
    }

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (stockItem) {
            populateForm(stockItem, taxMap);
        }
    };

    if (!currentLocation) {
        return (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                <FontAwesomeIcon icon={faBoxOpen} className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-xl font-semibold">No Location Selected</h3>
                <p className="text-slate-500 mt-2">Please select a hospital location from the header to view stock details.</p>
            </div>
        );
    }
    
    if (loading) return <div className="p-8 text-center">Loading Item Details...</div>;
    if (!stockItem) return <div className="p-8 text-center">Item not found.</div>;

    const canWrite = user?.permissions.stocks === 'write';

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

    const getExpiryStatus = (expiryDate?: Timestamp) => {
        if (!expiryDate) return null;
        const now = new Date();
        const expiry = expiryDate.toDate();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        if (expiry < now) return { text: 'Expired', color: 'bg-red-100 text-red-800' };
        if (expiry <= thirtyDaysFromNow) return { text: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800' };
        return null;
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Button variant="light" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`, { state: location.state })}>
                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back to Stock List
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <ConfirmationModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={handleDelete} title="Delete Stock Item" message={`Are you sure you want to delete ${stockItem.name}? This action cannot be undone.`} confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading} />
             {confirmCatUnitDelete && (
                <ConfirmationModal 
                    isOpen={true}
                    onClose={() => setConfirmCatUnitDelete(null)}
                    onConfirm={confirmCatUnitDeletion}
                    title={`Delete ${confirmCatUnitDelete.type}`}
                    message={`Are you sure you want to delete "${confirmCatUnitDelete.value}"?`}
                    confirmButtonText="Delete"
                    confirmButtonVariant="danger"
                    loading={actionLoading}
                />
            )}
            <AdjustStockModal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} onSave={handleAdjustStock} stockItem={stockItem} />

            <div className="lg:col-span-2 space-y-8">
                <nav className="flex space-x-2 border-b border-slate-200 dark:border-slate-800" aria-label="Tabs">
                    <TabButton tabId="details" title="Product Details" icon={faBoxOpen} />
                    <TabButton tabId="batches" title={`Batches at ${currentLocation.name}`} icon={faBox} />
                    <TabButton tabId="movement" title="Stock Movement" icon={faHistory} />
                    <TabButton tabId="orders" title="Order History" icon={faDolly} />
                </nav>

                <div className="space-y-8">
                    {activeTab === 'details' && (
                        <>
                            <DetailCard
                                title={`Item Details at ${currentLocation.name}`}
                                footer={canWrite ? (isEditing ? (
                                    <div className="flex justify-end gap-2">
                                        <Button variant="light" onClick={handleCancelEdit} disabled={actionLoading}><FontAwesomeIcon icon={faTimes} className="mr-2" />Cancel</Button>
                                        <Button variant="primary" onClick={handleUpdate} disabled={actionLoading}><FontAwesomeIcon icon={faSave} className="mr-2" />{actionLoading ? 'Saving...' : 'Save Changes'}</Button>
                                    </div>
                                ) : (
                                    <Button variant="primary" onClick={() => setIsEditing(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2" />Edit Details</Button>
                                )) : undefined}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="Name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} disabled={!isEditing} />
                                    <CreatableSearchableSelect 
                                        label="Category" options={categoryOptions} value={formData.category || ''} onChange={val => handleInputChange('category', val)} 
                                        onCreate={handleCreateCategory} onDelete={handleDeleteCategoryRequest} placeholder="Search or create category..." disabled={!isEditing}
                                    />
                                    <Input label="SKU" value={formData.sku || ''} onChange={e => handleInputChange('sku', e.target.value)} disabled={!isEditing} />
                                    <CreatableSearchableSelect 
                                        label="Unit Type" options={unitTypeOptions} value={formData.unitType || ''} onChange={val => handleInputChange('unitType', val)}
                                        onCreate={handleCreateUnitType} onDelete={handleDeleteUnitTypeRequest} placeholder="Search or create unit..." disabled={!isEditing}
                                    />
                                    <CreatableSearchableSelect 
                                        label="Brand" options={brandOptions} value={formData.vendor || ''} onChange={val => handleInputChange('vendor', val)}
                                        onCreate={handleCreateBrand} onDelete={handleDeleteBrandRequest} placeholder="Search or create brand..." disabled={!isEditing}
                                    />
                                    <Input label="Low Stock Threshold" type="number" value={formData.lowStockThreshold || ''} onChange={e => handleInputChange('lowStockThreshold', parseInt(e.target.value))} disabled={!isEditing} />
                                    
                                    <div className="md:col-span-2">
                                        <Textarea label="Description" value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value)} disabled={!isEditing} />
                                    </div>
                                     {isEditing && (
                                        <>
                                            <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <h4 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">Pricing Details</h4>
                                                <div className="space-y-4">
                                                    <Select label="Applicable Tax" value={formData.taxId || ''} onChange={e => handleTaxChange(e.target.value)} disabled={!isEditing}>
                                                        <option value="">No Tax</option>
                                                        {taxOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                    </Select>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input label="Purchase Price (Exc. Tax)" type="text" inputMode="decimal" value={purchasePriceExcTax} onChange={e => handlePurchaseExcChange(e.target.value)} disabled={!isEditing}/>
                                                        <Input label="Purchase Price (Inc. Tax)" type="text" inputMode="decimal" value={purchasePriceIncTax} onChange={e => handlePurchaseIncChange(e.target.value)} disabled={!isEditing}/>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                        <Input label="Margin (%)" type="text" inputMode="decimal" value={marginPercent} onChange={e => handleMarginChange(e.target.value)} disabled={!isEditing}/>
                                                        <Input label="Selling Price (Exc. Tax)" type="text" inputMode="decimal" value={sellingPriceExcTax} onChange={e => handleSellingExcChange(e.target.value)} disabled={!isEditing}/>
                                                        <Input label="Selling Price (Inc. Tax)" type="text" inputMode="decimal" value={sellingPriceIncTax} onChange={e => handleSellingIncChange(e.target.value)} disabled={!isEditing} helperText="Updates the price for all available batches."/>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <FileInput id="photo" label="Change Image" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if(file) {
                                                        setNewPhotoFile(file);
                                                        setIsPhotoRemoved(false);
                                                    }
                                                }} />
                                                {((!isPhotoRemoved && stockItem.photoUrl) || newPhotoFile) && <Button variant="ghost" size="sm" className="mt-2 text-red-500" onClick={() => { setNewPhotoFile(null); setIsPhotoRemoved(true); }}>Remove image</Button>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </DetailCard>
                            {canWrite && <DetailCard title="Danger Zone">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Permanently remove this item and its history.</p>
                                <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={actionLoading}><FontAwesomeIcon icon={faTrashAlt} className="mr-2" />{actionLoading ? 'Deleting...' : 'Delete Item'}</Button>
                            </DetailCard>}
                        </>
                    )}

                    {activeTab === 'batches' && (
                        <DetailCard title={`Batches at ${currentLocation.name}`}>
                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                                        <tr>
                                            <th className="p-3 text-left">Batch No.</th>
                                            <th className="p-3 text-left">Expiry Date</th>
                                            <th className="p-3 text-right">Quantity</th>
                                            <th className="p-3 text-right">Cost Price</th>
                                            <th className="p-3 text-right">Sale Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {stockItem.batches.length > 0 ? [...stockItem.batches].sort((a,b) => (a.expiryDate?.seconds || 0) - (b.expiryDate?.seconds || 0)).map(batch => {
                                            const expiryStatus = getExpiryStatus(batch.expiryDate);
                                            return (
                                                <tr key={batch.id} className={expiryStatus?.color.replace('text-', 'bg-opacity-20 ')}>
                                                    <td className="p-3 font-medium text-slate-900 dark:text-slate-200">{batch.batchNumber}</td>
                                                    <td className="p-3 text-slate-700 dark:text-slate-300">
                                                        {batch.expiryDate ? batch.expiryDate.toDate().toLocaleDateString() : 'N/A'}
                                                        {expiryStatus && <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${expiryStatus.color}`}>{expiryStatus.text}</span>}
                                                    </td>
                                                    <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-200">{batch.quantity}</td>
                                                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(batch.costPrice, user?.hospitalCurrency)}</td>
                                                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(batch.salePrice, user?.hospitalCurrency)}</td>
                                                </tr>
                                            )
                                        }) : (
                                            <tr><td colSpan={5} className="text-center p-6 text-slate-500">No batches found for this item at this location.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </DetailCard>
                    )}

                    {activeTab === 'movement' && (
                         <DetailCard title={`Stock Movement History at ${currentLocation.name}`}>
                            <table className="min-w-full text-sm">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3 text-left">Date</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Change</th><th className="p-3 text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {movements.map(m => (
                                        <tr key={m.id}>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{m.date.toDate().toLocaleString()}</td>
                                            <td className="p-3 capitalize text-slate-800 dark:text-slate-200">{m.type}</td>
                                            <td className={`p-3 font-bold ${m.quantityChange > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}</td>
                                            <td className="p-3 text-slate-800 dark:text-slate-200">{m.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </DetailCard>
                    )}
                    
                    {activeTab === 'orders' && (
                        <DetailCard title={`Order History for ${currentLocation.name}`}>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-3 text-left">Order ID</th><th className="p-3 text-left">Vendor</th><th className="p-3 text-left">Date</th><th className="p-3 text-center">Qty Ordered</th><th className="p-3 text-center">Qty Received</th><th className="p-3 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {orderHistory.length > 0 ? orderHistory.map(order => {
                                            const itemInOrder = order.items.find(i => i.stockItemId === stockItemId);
                                            if (!itemInOrder) return null;
                                            return (
                                                <tr key={order.id} onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks/orders/${order.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-3 font-medium text-blue-600 dark:text-blue-400">{order.orderId}</td>
                                                    <td className="p-3 text-slate-800 dark:text-slate-200">{order.vendor}</td>
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{order.createdAt.toDate().toLocaleDateString()}</td>
                                                    <td className="p-3 text-center text-slate-800 dark:text-slate-200">{itemInOrder.orderedQty}</td>
                                                    <td className="p-3 text-center text-slate-800 dark:text-slate-200">{itemInOrder.receivedQty}</td>
                                                    <td className="p-3"><OrderStatusBadge status={order.status} /></td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan={6} className="text-center p-6 text-slate-500">This item has not been included in any orders for this location yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </DetailCard>
                    )}

                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                    {stockItem.photoUrl && !isEditing ? (
                        <img src={stockItem.photoUrl} alt={stockItem.name} className="w-full h-48 object-cover" />
                    ) : (
                        <div className="h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBox} className="h-16 w-16 text-slate-400" />
                        </div>
                    )}
                    <div className="p-6 text-center">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stockItem.name}</h2>
                        <p className="text-slate-500">{stockItem.sku}</p>
                        <div className="mt-4 text-6xl font-extrabold text-slate-800 dark:text-slate-200">{stockItem.totalStock}</div>
                        <p className="text-slate-500">units in stock at {currentLocation.name}</p>
                        {canWrite && <Button onClick={() => setAdjustModalOpen(true)} className="mt-4" variant="light" disabled={stockItem.batches.length === 0}><FontAwesomeIcon icon={faExchangeAlt} className="mr-2" />Adjust Stock</Button>}
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

export default StockItemDetailsScreen;
