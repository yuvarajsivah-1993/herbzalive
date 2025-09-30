
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { PatientDocument, StockItem, POSSaleItem, NewPOSSaleData, Tax, POSPaymentMethod, StockBatch } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faShoppingCart, faTimes, faPlus, faMinus, faTag, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { SearchableOption, SearchableSelect } from './ReservationsScreen';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Avatar from '../components/ui/Avatar';
import { useLocation, useNavigate } from 'react-router-dom';



const PaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentMethod: POSPaymentMethod, amountPaid: number) => void;
    totalAmount: number;
    currency: string;
    loading: boolean;
    isWalkInCustomer: boolean;
    formatCurrency: (amount: number) => string;
}> = ({ isOpen, onClose, onConfirm, totalAmount, currency, loading, isWalkInCustomer, formatCurrency }) => {
    const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('Cash');
    const [amountPaid, setAmountPaid] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if(isOpen) {
            setAmountPaid(totalAmount.toFixed(2));
        }
    }, [isOpen, totalAmount]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    
    const paid = parseFloat(amountPaid) || 0;
    const changeDue = paid > totalAmount ? paid - totalAmount : 0;
    const isAmountInsufficient = isWalkInCustomer && paid < totalAmount;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md m-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-bold">Process Payment</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                        <p className="text-sm uppercase text-blue-600 dark:text-blue-300">Total Amount Due</p>
                        <p className="text-5xl font-extrabold text-blue-800 dark:text-blue-200">{formatCurrency(totalAmount)}</p>
                    </div>
                    <Select label="Payment Method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                        <option>Cash</option>
                        <option>Card</option>
                        <option>Gpay</option>
                        <option>Phonepe</option>
                        <option>Paytm</option>
                        <option>Other</option>
                    </Select>
                    <Input label="Amount Paid" type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} required />
                    {isAmountInsufficient && (
                        <p className="text-sm text-red-500 text-center -mt-2">Walk-in customers must pay the full amount.</p>
                    )}
                    {changeDue > 0 && (
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/50 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-300">Change Due</p>
                            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{formatCurrency(changeDue)}</p>
                        </div>
                    )}
                </div>
                <div className="flex justify-end items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t gap-2">
                    <Button type="button" variant="light" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button type="button" variant="success" onClick={() => onConfirm(paymentMethod, paid)} disabled={loading || isAmountInsufficient}>
                        {loading ? 'Processing...' : 'Confirm Sale'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

const DiscountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (discountType: 'amount' | 'percentage', discountValue: number) => void;
    title: string;
    currency: string;
    lineTotal: number;
    formatCurrency: (amount: number) => string;
}> = ({ isOpen, onClose, onSave, title, currency, lineTotal, formatCurrency }) => {
    const [type, setType] = useState<'amount' | 'percentage'>('amount');
    const [value, setValue] = useState('0');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setValue('0');
        setType('amount');
    }, [isOpen]);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    const handleSave = () => {
        onSave(type, parseFloat(value) || 0);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[51] flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm m-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="text-sm text-slate-500">Total: {formatCurrency(lineTotal)}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button onClick={() => setType('amount')} className={`w-full p-2 rounded-md text-sm font-semibold transition-colors ${type === 'amount' ? 'bg-white dark:bg-slate-700 shadow' : ''}`}>Amount ({currency})</button>
                        <button onClick={() => setType('percentage')} className={`w-full p-2 rounded-md text-sm font-semibold transition-colors ${type === 'percentage' ? 'bg-white dark:bg-slate-700 shadow' : ''}`}>Percentage (%)</button>
                    </div>
                    <Input 
                        label={type === 'amount' ? `Discount Amount (${currency})` : `Discount Percentage (%)`}
                        type="number" 
                        step={type === 'amount' ? "0.01" : "1"} 
                        value={value} 
                        onChange={e => setValue(e.target.value)} 
                        autoFocus 
                    />
                </div>
                <div className="flex justify-end p-6 bg-slate-50 dark:bg-slate-950/50 border-t gap-2">
                    <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                    <Button type="button" variant="primary" onClick={handleSave}>Apply Discount</Button>
                </div>
            </div>
        </div>
    );
};

interface BatchSelectionModalProps {
    item: StockItem;
    onClose: () => void;
    onSelect: (item: StockItem, batch: StockBatch) => void;
    currency: string;
    formatDate: (date: Date) => string;
    formatCurrency: (amount: number) => string;
}

const BatchSelectionModal: React.FC<BatchSelectionModalProps> = ({ item, onClose, onSelect, currency, formatDate, formatCurrency }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const availableBatches = item.batches.filter(b => b.quantity > 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Select Batch for {item.name}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {availableBatches.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="p-2">Batch Number</th>
                                    <th className="p-2">Expiry Date</th>
                                    <th className="p-2 text-right">Available Qty</th>
                                    <th className="p-2 text-right">Sale Price</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {availableBatches.map(batch => (
                                    <tr key={batch.id}>
                                        <td className="p-2 font-mono text-slate-800 dark:text-slate-200">{batch.batchNumber}</td>
                                        <td className="p-2 text-slate-700 dark:text-slate-300">{batch.expiryDate ? formatDate(batch.expiryDate.toDate()) : 'N/A'}</td>
                                        <td className="p-2 text-right text-slate-700 dark:text-slate-300">{batch.quantity}</td>
                                        <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(batch.salePrice)}</td>
                                        <td className="p-2 text-right">
                                            <Button size="sm" onClick={() => onSelect(item, batch)}>Select</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-slate-500">No batches with stock available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

import { useFormatting } from '@/utils/formatting';

const POSScreen: React.FC = () => {
    const { user, stockItems, patients, taxes, addPOSSale, setInvoiceToPrint, getPOSSales, currentLocation } = useAuth();
    const { addToast } = useToast();
    const { formatDate, formatTime, formatCurrency } = useFormatting();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<POSSaleItem[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('walk-in');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    
    // Filters & Sorting
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('a-z'); // 'a-z', 'z-a', 'top-selling'
    const [salesCount, setSalesCount] = useState<Map<string, number>>(new Map());

    // Discount States
    const [editingDiscountItem, setEditingDiscountItem] = useState<POSSaleItem | null>(null);
    const [isOverallDiscountModalOpen, setIsOverallDiscountModalOpen] = useState(false);
    const [overallDiscount, setOverallDiscount] = useState(0);
    
    // Batch Modal State
    const [selectedItemForBatch, setSelectedItemForBatch] = useState<StockItem | null>(null);
    
    const currency = user?.hospitalCurrency || 'USD';

    // Fetch sales count for "Top Selling" sort option
    useEffect(() => {
        getPOSSales().then(salesData => {
            const counts = new Map<string, number>();
            salesData.forEach(sale => {
                if (sale.status === 'Completed') {
                    sale.items.forEach(item => {
                        counts.set(item.stockItemId, (counts.get(item.stockItemId) || 0) + item.quantity);
                    });
                }
            });
            setSalesCount(counts);
        });
    }, [getPOSSales]);

    // Handle re-opening a cancelled sale
    useEffect(() => {
        if (location.state?.items) {
            addToast("Cancelled sale loaded for editing. Discounts have been reset.", "info");
            const itemsWithResetDiscount = location.state.items.map((item: POSSaleItem) => ({
                ...item,
                discountAmount: 0, 
            }));
            setCart(itemsWithResetDiscount);
            setSelectedPatientId(location.state.patientId || 'walk-in');
            setOverallDiscount(location.state.overallDiscount || 0);
            navigate('.', { replace: true, state: {} });
        }
    }, [location.state, addToast, navigate]);

    const taxMap = useMemo(() => new Map(taxes.map(t => [t.id, { name: t.name, rate: t.rate }])), [taxes]);
    
    const availableStockItems = useMemo(() => stockItems.filter(item => item.totalStock > 0), [stockItems]);
    const categories = useMemo(() => ['all', ...Array.from(new Set(availableStockItems.map(item => item.category)))], [availableStockItems]);

    const filteredAndSortedStockItems = useMemo(() => {
        return availableStockItems
            .filter(item => {
                if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
                if (!searchTerm) return true;
                const lowercasedTerm = searchTerm.toLowerCase();
                return item.name.toLowerCase().includes(lowercasedTerm) ||
                       item.sku.toLowerCase().includes(lowercasedTerm) ||
                       item.category.toLowerCase().includes(lowercasedTerm);
            })
            .sort((a, b) => {
                switch (sortOrder) {
                    case 'z-a': return b.name.localeCompare(a.name);
                    case 'top-selling': return (salesCount.get(b.id!) || 0) - (salesCount.get(a.id!) || 0);
                    case 'a-z': default: return a.name.localeCompare(b.name);
                }
            });
    }, [searchTerm, availableStockItems, categoryFilter, sortOrder, salesCount]);

    const activePatients = useMemo(() => {
        if (!currentLocation) return patients.filter(p => p.status === 'active');
        return patients.filter(p => p.status === 'active' && p.locationId === currentLocation.id);
    }, [patients, currentLocation]);
    
    const patientOptions = useMemo((): SearchableOption[] => [
        { value: 'walk-in', label: 'Walk-in Customer' },
        ...activePatients.map(p => ({ value: p.id, label: p.name, secondaryLabel: `ID: ${p.patientId}` }))
    ], [activePatients]);

    const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

    const cartSummary = useMemo(() => {
        const grossTotal = cart.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
        const totalTax = cart.reduce((sum, item) => sum + item.taxAmount * item.quantity, 0);
        const totalItemDiscount = cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
        
        const taxInclusiveTotal = grossTotal + totalTax;
        const totalAmount = Math.round(taxInclusiveTotal - totalItemDiscount - overallDiscount);

        return { grossTotal, totalTax, totalItemDiscount, overallDiscount, taxInclusiveTotal, totalAmount };
    }, [cart, overallDiscount]);
    
    const handleSaveItemDiscount = (stockItemId: string, discountType: 'amount' | 'percentage', discountValue: number) => {
        setCart(cart.map(item => {
            if (item.stockItemId === stockItemId) {
                const taxInclusiveLineTotal = (item.salePrice + item.taxAmount) * item.quantity;
                let totalDiscount = discountType === 'percentage'
                    ? taxInclusiveLineTotal * (discountValue / 100)
                    : discountValue;
                totalDiscount = Math.min(totalDiscount, taxInclusiveLineTotal);
                return { ...item, discountAmount: parseFloat(totalDiscount.toFixed(2)) };
            }
            return item;
        }));
        setEditingDiscountItem(null);
    };

    const handleSaveOverallDiscount = (discountType: 'amount' | 'percentage', discountValue: number) => {
        const { taxInclusiveTotal, totalItemDiscount } = cartSummary;
        const baseForDiscount = taxInclusiveTotal - totalItemDiscount;
        let finalDiscount = discountType === 'percentage'
            ? baseForDiscount * (discountValue / 100)
            : discountValue;
        setOverallDiscount(Math.min(finalDiscount, baseForDiscount));
        setIsOverallDiscountModalOpen(false);
    };

    const handleUpdateQuantity = (stockItemId: string, batchId: string, newQuantity: number) => {
        const stockItem = stockItems.find(item => item.id === stockItemId);
        if (!stockItem) return;
        const batch = stockItem.batches.find(b => b.id === batchId);
        
        if (!batch) {
             addToast(`Batch info not found for ${stockItem.name}.`, 'error');
            return;
        }

        if (newQuantity > batch.quantity) {
            addToast(`Only ${batch.quantity} units available in this batch for ${stockItem.name}.`, "warning");
            newQuantity = batch.quantity;
        }

        if (newQuantity <= 0) {
            setCart(cart.filter(item => !(item.stockItemId === stockItemId && item.batchId === batchId)));
        } else {
            setCart(cart.map(item => (item.stockItemId === stockItemId && item.batchId === batchId) ? { ...item, quantity: newQuantity } : item));
        }
    };
    
    const handleBatchSelected = (item: StockItem, batch: StockBatch) => {
        const existingCartItem = cart.find(cartItem => cartItem.stockItemId === item.id && cartItem.batchId === batch.id);
        if (existingCartItem) {
            handleUpdateQuantity(item.id!, batch.id, existingCartItem.quantity + 1);
        } else {
            const taxInfo = item.taxId ? taxMap.get(item.taxId) : undefined;
            const taxRate = taxInfo?.rate || 0;
            const taxName = taxInfo ? `${taxInfo.name} (${taxRate}%)` : 'No Tax';
            const salePrice = batch.salePrice || 0;
            const salePriceBeforeTax = salePrice / (1 + taxRate / 100);
            const taxAmountPerUnit = salePrice - salePriceBeforeTax;

            setCart(prevCart => [...prevCart, {
                stockItemId: item.id!, batchId: batch.id, batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate?.toDate() ? formatDate(batch.expiryDate.toDate()) : '',
                hsnCode: item.hsnCode || '', name: item.name, sku: item.sku, quantity: 1,
                unitType: item.unitType, salePrice: parseFloat(salePriceBeforeTax.toFixed(2)),
                taxRate, taxAmount: parseFloat(taxAmountPerUnit.toFixed(2)), taxName, discountAmount: 0,
            }]);
        }
        setSelectedItemForBatch(null);
    };

    const handleAddToCart = (item: StockItem) => {
        const availableBatches = (item.batches || []).filter(b => b.quantity > 0);
        if (availableBatches.length === 0) { addToast(`No stock available for ${item.name}.`, "warning"); return; }
        if (availableBatches.length === 1) handleBatchSelected(item, availableBatches[0]);
        else setSelectedItemForBatch(item);
    };

    const resetSale = () => {
        setCart([]); setSelectedPatientId('walk-in'); setSearchTerm(''); setOverallDiscount(0);
    };

    const handleConfirmSale = async (paymentMethod: POSPaymentMethod, amountPaid: number) => {
        if (cart.length === 0) { addToast("Cart is empty.", "error"); return; }
        if (selectedPatientId === 'walk-in' && amountPaid < cartSummary.totalAmount) {
            addToast("Walk-in customers must pay the full amount.", "error"); return;
        }
        setIsProcessingSale(true);
        try {
            const { grossTotal, totalTax, totalItemDiscount, totalAmount } = cartSummary;
            const saleData: NewPOSSaleData = {
                patientId: selectedPatientId === 'walk-in' ? 'walk-in' : selectedPatientId,
                patientName: selectedPatient ? selectedPatient.name : 'Walk-in Customer',
                items: cart, grossTotal, totalItemDiscount, subtotal: grossTotal, taxAmount: totalTax,
                overallDiscount, totalAmount, amountPaid, paymentMethod, status: 'Completed',
            };
            const newSale = await addPOSSale(saleData);
            addToast("Sale completed successfully!", "success");
            resetSale();
            setIsPaymentModalOpen(false);
            setInvoiceToPrint({ invoice: newSale, type: 'POS' });
        } catch (error: any) { addToast(error.message || "Failed to process sale.", "error");
        } finally { setIsProcessingSale(false); }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
            {selectedItemForBatch && <BatchSelectionModal item={selectedItemForBatch} onClose={() => setSelectedItemForBatch(null)} onSelect={handleBatchSelected} currency={currency} formatDate={formatDate} formatCurrency={formatCurrency} />}
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onConfirm={handleConfirmSale} totalAmount={cartSummary.totalAmount} currency={currency} loading={isProcessingSale} isWalkInCustomer={selectedPatientId === 'walk-in'} formatCurrency={formatCurrency} />
            {editingDiscountItem && <DiscountModal isOpen={true} onClose={() => setEditingDiscountItem(null)} onSave={(type, val) => handleSaveItemDiscount(editingDiscountItem.stockItemId, type, val)} title={`Discount for ${editingDiscountItem.name}`} currency={currency} lineTotal={(editingDiscountItem.salePrice + editingDiscountItem.taxAmount) * editingDiscountItem.quantity} formatCurrency={formatCurrency} />}
            <DiscountModal isOpen={isOverallDiscountModalOpen} onClose={() => setIsOverallDiscountModalOpen(false)} onSave={handleSaveOverallDiscount} title="Overall Bill Discount" currency={currency} lineTotal={cartSummary.taxInclusiveTotal - cartSummary.totalItemDiscount} formatCurrency={formatCurrency} />
            
            <div className="w-full md:w-3/5 lg:w-2/3 p-4 flex flex-col">
                <div className="mb-4 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow w-full"><Input label="Search Products" placeholder="Search by name, SKU, or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<FontAwesomeIcon icon={faSearch} className="text-slate-400" />} /></div>
                    <div className="flex-shrink-0 w-full sm:w-auto"><Select label="Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>{categories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>)}</Select></div>
                    <div className="flex-shrink-0 w-full sm:w-auto"><Select label="Sort By" value={sortOrder} onChange={e => setSortOrder(e.target.value)}><option value="a-z">Name: A-Z</option><option value="z-a">Name: Z-A</option><option value="top-selling">Top Selling</option></Select></div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredAndSortedStockItems.map(item => (
                            <button key={item.id} onClick={() => handleAddToCart(item)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center hover:shadow-lg hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-150">
                                <div className="w-full h-20 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mb-2">{item.photoUrl ? <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover rounded-md" /> : <FontAwesomeIcon icon={faBoxOpen} className="h-8 w-8 text-slate-400" />}</div>
                                <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{item.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">In Stock: {item.totalStock}</p>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(item.batches?.sort((a,b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0]?.salePrice || 0)}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full md:w-2/5 lg:w-1/3 p-4 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="mb-4"><SearchableSelect label="Patient" options={patientOptions} value={selectedPatientId} onChange={setSelectedPatientId} /></div>
                    {selectedPatient && <div className="flex items-center gap-3 p-3 mb-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg"><Avatar avatar={selectedPatient.profilePhotoUrl ? {type: 'image', value: selectedPatient.profilePhotoUrl} : {type: 'initials', value: selectedPatient.name.split(' ').map(n=>n[0]).join(''), color: 'bg-blue-500'}} /><p className="font-semibold text-blue-900 dark:text-blue-200">{selectedPatient.name}</p></div>}
                    <h3 className="text-lg font-bold mb-2 flex items-center"><FontAwesomeIcon icon={faShoppingCart} className="mr-2" /> Cart</h3>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center"><div className="flex-1">ITEM</div><div className="w-32 text-center">QTY</div><div className="w-24 text-right">TOTAL</div><div className="w-8"></div></div>
                    <div className="flex-1 overflow-y-auto -mr-4 pr-4">{cart.length === 0 ? <div className="flex items-center justify-center h-full text-slate-500">Your cart is empty</div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{cart.map(item => (<div key={`${item.stockItemId}-${item.batchId}`} className="flex items-start gap-3 py-3">
                        <div className="flex-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                            <p className="text-sm text-slate-500">{item.quantity} &times; {formatCurrency(item.salePrice)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Tax: {formatCurrency(item.taxAmount * item.quantity)}</p>
                            {item.discountAmount > 0 && <p className="text-xs text-green-600">Discount: -{formatCurrency(item.discountAmount)}</p>}
                            <Button variant="ghost" size="sm" className="!p-1 h-auto text-xs text-blue-600 hover:bg-blue-50" onClick={() => setEditingDiscountItem(item)}><FontAwesomeIcon icon={faTag} className="mr-1" /> Discount</Button>
                        </div>
                        <div className="flex items-center gap-1 w-32 justify-center"><Button size="sm" variant="light" onClick={() => handleUpdateQuantity(item.stockItemId, item.batchId, item.quantity - 1)} className="!p-2 h-8 w-8"><FontAwesomeIcon icon={faMinus} /></Button><Input type="number" value={item.quantity} onChange={e => handleUpdateQuantity(item.stockItemId, item.batchId, parseInt(e.target.value))} className="w-14 text-center !py-1"/><Button size="sm" variant="light" onClick={() => handleUpdateQuantity(item.stockItemId, item.batchId, item.quantity + 1)} className="!p-2 h-8 w-8"><FontAwesomeIcon icon={faPlus} /></Button></div>
                        <p className="font-bold w-24 text-right">{formatCurrency(((item.salePrice + item.taxAmount) * item.quantity) - (item.discountAmount || 0))}</p>
                        <div className="w-8 text-center pt-1"><button onClick={() => handleUpdateQuantity(item.stockItemId, item.batchId, 0)} className="text-slate-400 hover:text-red-500 p-2 -m-2"><FontAwesomeIcon icon={faTimes} /></button></div>
                    </div>))}</div>}</div>
                    {cart.length > 0 && <div className="py-4 space-y-1 text-sm border-t border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400"><p>Gross Total</p><p>{formatCurrency(cartSummary.grossTotal)}</p></div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400"><p>Total Tax</p><p>{formatCurrency(cartSummary.totalTax)}</p></div>
                        <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300"><p>Subtotal</p><p>{formatCurrency(cartSummary.taxInclusiveTotal)}</p></div>
                        <div className="flex justify-between text-green-600"><p>Item Discounts</p><p>- {formatCurrency(cartSummary.totalItemDiscount)}</p></div>
                        <div className="flex justify-between items-center text-green-600"><Button variant="ghost" size="sm" className="!p-0 h-auto text-xs" onClick={() => setIsOverallDiscountModalOpen(true)}><FontAwesomeIcon icon={faTag} className="mr-1"/> Overall Discount</Button><span>- {formatCurrency(cartSummary.overallDiscount)}</span></div>
                        <div className="flex justify-between font-bold text-2xl text-slate-800 dark:text-100 mt-2 pt-2 border-t"><p>Grand Total</p><p>{formatCurrency(cartSummary.totalAmount)}</p></div>
                    </div>}
                </div>
                <div className="mt-auto pt-4 flex gap-2">
                    <Button variant="light" className="w-1/3" onClick={resetSale}>Clear Sale</Button>
                    <Button variant="success" className="flex-1" onClick={() => setIsPaymentModalOpen(true)} disabled={cart.length === 0}>Process Payment</Button>
                </div>
            </div>
        </div>
    );
};

export default POSScreen;
