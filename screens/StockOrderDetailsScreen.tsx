




import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StockOrder, StockOrderStatus, Vendor, StockOrderComment, NewStockReturnData, InvoiceStatus, Payment, StockReturn, StockItem, StockMovement } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDolly, faCalendar, faHashtag, faTruck, faCheck, faTimes, faChevronLeft, faTrashAlt, faPaperclip, faExternalLinkAlt, faPaperPlane, faPencilAlt, faUndo, faMoneyBillWave, faEllipsisV, faPlus, faMinus, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { sendEmail } from '../services/emailService';
import Avatar from '../components/ui/Avatar';
import Textarea from '../components/ui/Textarea';
// FIX: Import the 'Select' component to resolve the 'Cannot find name' error.
import Select from '../components/ui/Select';
import { Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode, actions?: React.ReactNode }> = ({ title, children, footer, actions }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            {actions && <div>{actions}</div>}
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg">{footer}</div>}
    </div>
);

const ReceiveStockModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (orderId: string, items: { stockItemId: string; batches: { receivedNowQty: number; costPrice: number; batchNumber?: string; expiryDate?: string; }[] }[]) => Promise<void>;
    order: StockOrder;
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

    if (!isOpen) return null;

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

const ReturnStockModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewStockReturnData) => Promise<void>;
    order: StockOrder;
    stockItemsMap: Map<string, StockItem>;
    allReceivedBatches: Map<string, any[]>;
    relatedReturns: StockReturn[];
}> = ({ isOpen, onClose, onSave, order, stockItemsMap, allReceivedBatches, relatedReturns }) => {
    const [returnItems, setReturnItems] = useState<Record<string, Record<string, string>>>({}); // { [stockItemId]: { [batchId]: qtyString } }
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);

    const itemsToReturn = order.items.filter(item => item.receivedQty > (item.returnedQty || 0));

    useEffect(() => {
        if (isOpen) {
            setReturnItems({});
            setReturnDate(new Date().toISOString().split('T')[0]);
            setNotes('');
        }
    }, [isOpen]);
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleQtyChange = (stockItemId: string, batchId: string, value: string, maxQty: number) => {
        const qty = parseInt(value, 10);
        const newQty = Math.min(Math.max(0, isNaN(qty) ? 0 : qty), maxQty);
        setReturnItems(prev => ({
            ...prev,
            [stockItemId]: {
                ...prev[stockItemId],
                [batchId]: newQty > 0 ? String(newQty) : ''
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const itemsToSave: { stockItemId: string; batchId: string; returnedQty: number }[] = [];
        Object.entries(returnItems).forEach(([stockItemId, batches]) => {
            Object.entries(batches).forEach(([batchId, qty]) => {
                const returnedQty = parseInt(qty, 10);
                if (returnedQty > 0) {
                    itemsToSave.push({ stockItemId, batchId, returnedQty });
                }
            });
        });

        if (itemsToSave.length === 0) {
            addToast("Please enter quantities for at least one item batch to return.", "warning");
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
            onClose();
        } catch (error: any) {
            addToast(error.message || "Failed to process return.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Return Stock to Vendor</h2><p className="text-sm text-slate-500">From Order #{order.orderId}</p></div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Return Date" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
                            <Input label="Notes / Reason for Return" value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>
                                <th className="p-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Item / Batch</th>
                                <th className="p-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Qty in Stock</th>
                                <th className="p-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Qty to Return</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {itemsToReturn.length > 0 ? itemsToReturn.map(item => {
                                    const stockItem = stockItemsMap.get(item.stockItemId);
                                    if (!stockItem) return null;
                                    const batchesForThisOrder = allReceivedBatches.get(item.stockItemId) || [];
                                    const alreadyReturnedQuantities: Record<string, number> = {};
                                    relatedReturns.forEach(ret => {
                                        ret.items.forEach(retItem => {
                                            if (retItem.stockItemId === item.stockItemId) {
                                                alreadyReturnedQuantities[retItem.batchId] = (alreadyReturnedQuantities[retItem.batchId] || 0) + retItem.returnedQty;
                                            }
                                        });
                                    });

                                    return (
                                        <React.Fragment key={item.stockItemId}>
                                            <tr className="bg-slate-100 dark:bg-slate-800/50 font-semibold"><td colSpan={3} className="p-2 text-slate-800 dark:text-slate-200">{item.name}</td></tr>
                                            {batchesForThisOrder.map(batch => {
                                                const currentBatchInStock = stockItem.batches.find(b => b.id === batch.id);
                                                if (!currentBatchInStock) return null;

                                                const qtyAlreadyReturnedFromThisBatch = alreadyReturnedQuantities[batch.id] || 0;
                                                const maxReturnableBasedOnReceipts = batch.quantityReceived - qtyAlreadyReturnedFromThisBatch;
                                                const maxAvailableToReturn = Math.min(currentBatchInStock.quantity, maxReturnableBasedOnReceipts);
                                                
                                                if (maxAvailableToReturn <= 0) return null;

                                                return (
                                                    <tr key={batch.id}>
                                                        <td className="p-3 pl-8 text-slate-600 dark:text-slate-400">Batch: {batch.batchNumber}</td>
                                                        <td className="p-3 text-center text-slate-800 dark:text-slate-200">{currentBatchInStock.quantity}</td>
                                                        <td className="p-3">
                                                            <Input 
                                                                type="number" min="0" max={maxAvailableToReturn} 
                                                                value={returnItems[item.stockItemId]?.[batch.id] || ''} 
                                                                onChange={e => handleQtyChange(item.stockItemId, batch.id, e.target.value, maxAvailableToReturn)} 
                                                                className="w-24" placeholder={`Max: ${maxAvailableToReturn}`}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className="text-center p-6 text-slate-500">No items available to return for this order.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t"><Button type="button" variant="light" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={loading || itemsToReturn.length === 0}>{loading ? 'Processing...' : 'Process Return'}</Button></div>
                </form>
            </div>
        </div>
    );
};

const ManageOrderPaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    order: StockOrder;
    paymentToEdit: Payment | null;
    onSuccess: () => void;
}> = ({ isOpen, onClose, order, paymentToEdit, onSuccess }) => {
    const { user, updateStockOrderPayment, updateStockOrderPaymentDetails } = useAuth();
    const { addToast } = useToast();
    const isEditMode = paymentToEdit !== null;

    const [amount, setAmount] = useState('0.00');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    
    const currency = user?.hospitalCurrency || 'USD';

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);
    
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && paymentToEdit) {
                setAmount(paymentToEdit.amount.toFixed(2));
                setPaymentMethod(paymentToEdit.method);
                setNote(paymentToEdit.note || '');
            } else {
                const amountDue = order.totalValue - (order.amountPaid || 0);
                setAmount(amountDue > 0 ? amountDue.toFixed(2) : '0.00');
                setPaymentMethod('Cash');
                setNote('');
            }
        }
    }, [isOpen, isEditMode, paymentToEdit, order]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode && paymentToEdit) {
                await updateStockOrderPaymentDetails(order.id!, {
                    ...paymentToEdit,
                    amount: parseFloat(amount),
                    method: paymentMethod,
                    note,
                });
                addToast('Payment updated successfully!', 'success');
            } else {
                 await updateStockOrderPayment(order.id!, {
                    amount: parseFloat(amount),
                    method: paymentMethod,
                    note,
                });
                addToast('Payment recorded successfully!', 'success');
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            addToast(`Failed to ${isEditMode ? 'update' : 'record'} payment.`, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const amountDue = order.totalValue - (order.amountPaid || 0) + (isEditMode && paymentToEdit ? paymentToEdit.amount : 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[52] flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold">{isEditMode ? 'Edit Payment' : 'Add Payment'}</h3>
                        <p className="text-sm text-slate-500">For Order: {order.orderId}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="p-3 text-center bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-300">Amount Due</p>
                            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(amountDue, currency)}</p>
                        </div>
                        <Input label={`Amount to ${isEditMode ? 'Update' : 'Pay'}`} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option>Cash</option> <option>Credit Card</option> <option>Bank Transfer</option> <option>Other</option>
                        </Select>
                        <Input label="Note (Optional)" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    <div className="flex justify-end items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 gap-2">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="success" disabled={loading}>{loading ? 'Processing...' : (isEditMode ? 'Update Payment' : 'Confirm Payment')}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PaymentActionsDropdown: React.FC<{ onEdit: () => void; onDelete: () => void; }> = ({ onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // FIX: Fix "Cannot find name 'handleClickOutside'" by reformatting the useEffect hook to correctly scope the handleClickOutside function.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" /></button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <button onClick={onEdit} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> Edit</button>
            <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete</button>
          </div>
        </div>
      )}
    </div>
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
        <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-bold rounded-full ${statusConfig[status]}`}>
            {status}
        </div>
    );
};

const StockOrderDetailsScreen: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, getStockOrderById, receiveStockOrderItems, cancelStockOrder, deleteStockOrder, getVendors, addStockOrderComment, updateStockOrderComment, deleteStockOrderComment, addStockReturn, updateStockOrderPayment, updateStockOrderPaymentDetails, deleteStockOrderPayment, getStockReturns, getStockItemById, getStockMovements } = useAuth();
    const { addToast } = useToast();

    const [order, setOrder] = useState<StockOrder | null>(null);
    const [relatedReturns, setRelatedReturns] = useState<StockReturn[]>([]);
    const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
    
    // Comment state
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<StockOrderComment | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<StockOrderComment | null>(null);

    // Batch details state
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [detailedStockItems, setDetailedStockItems] = useState<Map<string, StockItem>>(new Map());
    const [itemMovements, setItemMovements] = useState<Map<string, StockMovement[]>>(new Map());
    const [expandedReturns, setExpandedReturns] = useState<Set<string>>(new Set());


    const canWrite = user?.permissions.stocks === 'write';

    const fetchData = useCallback(async () => {
        if (!orderId || !user?.currentLocation) return;
        const [data, allVendors, allReturns] = await Promise.all([
            getStockOrderById(orderId),
            getVendors(),
            getStockReturns(),
        ]);

        if (data) {
            setOrder(data);
            const foundVendor = allVendors.find(v => v.name === data.vendor);
            setVendorDetails(foundVendor || null);
            const filteredReturns = allReturns.filter(r => r.relatedOrderId === data.orderId);
            setRelatedReturns(filteredReturns);

            // Fetch related stock items and their movements for batch details
            const itemIds = data.items.map(i => i.stockItemId);
            const stockItemPromises = itemIds.map(id => getStockItemById(id));
            const stockMovementPromises = itemIds.map(id => getStockMovements(id));
            
            const stockItemsResults = await Promise.all(stockItemPromises);
            const stockMovementsResults = await Promise.all(stockMovementPromises);

            const locId = user.currentLocation.id;
            const stockItemsMap = new Map<string, StockItem>();
            stockItemsResults.forEach(item => {
                if(item) {
                    const locationSpecificData = item.locationStock?.[locId] || { totalStock: 0, lowStockThreshold: 10, batches: [] };
                    const flattenedItem = { ...item, ...locationSpecificData };
                    stockItemsMap.set(item.id!, flattenedItem);
                }
            });
            setDetailedStockItems(stockItemsMap);

            const movementsMap = new Map<string, StockMovement[]>();
            itemIds.forEach((id, index) => { movementsMap.set(id, stockMovementsResults[index]); });
            setItemMovements(movementsMap);

        } else {
            addToast("Stock order not found.", "error");
            navigate(-1);
        }
    }, [orderId, getStockOrderById, getVendors, getStockReturns, getStockItemById, getStockMovements, addToast, navigate, user]);

    useEffect(() => {
        if (!orderId || !user?.hospitalId) return;
        setLoading(true);

        const unsubOrder = db.collection('stockOrders').doc(orderId)
            .onSnapshot(async (doc) => {
                if (doc.exists && doc.data()?.hospitalId === user.hospitalId) {
                    const orderData = { id: doc.id, ...doc.data() } as StockOrder;
                    setOrder(orderData);
                    
                    // Re-fetch related data when the order updates
                    await fetchData();
                    
                } else {
                    addToast("Stock order not found.", "error");
                    navigate(-1);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching order:", error);
                addToast("Failed to load order data.", "error");
                setLoading(false);
            });
        
        return () => unsubOrder();
    }, [orderId, user?.hospitalId, addToast, navigate, fetchData]);

    const handleReceiveStock = async (orderId: string, items: { stockItemId: string; batches: { receivedNowQty: number; costPrice: number; batchNumber?: string; expiryDate?: string; }[] }[]) => {
        if (!orderId) return;
        setActionLoading('receive');
        try {
            await receiveStockOrderItems(orderId, items);
            addToast("Stock received successfully!", "success");
        } catch (error: any) { addToast(error.message || "Failed to receive stock.", "error"); }
        finally { setActionLoading(null); }
    };

    const handleReturnStock = async (data: NewStockReturnData) => {
        setActionLoading('return');
        try {
            await addStockReturn(data);
            addToast("Stock returned successfully!", "success");
        } catch(error: any) {
            addToast(error.message || "Failed to return stock.", "error");
            throw error; // re-throw to keep modal open
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelOrder = async () => {
        if (!orderId) return;
        setActionLoading('cancel');
        try {
            await cancelStockOrder(orderId);
            addToast("Order cancelled successfully!", "success");
        } catch (error: any) { addToast(error.message || "Failed to cancel order.", "error"); }
        finally { setActionLoading(null); setCancelModalOpen(false); }
    };

    const handleDeleteOrder = async () => {
        if (!orderId) return;
        setActionLoading('delete');
        try {
            await deleteStockOrder(orderId);
            addToast("Order deleted successfully!", "success");
            navigate(`/hospitals/${user?.hospitalSlug}/stocks`);
        } catch (error: any) { addToast(error.message || "Failed to delete order.", "error"); }
        finally { setActionLoading(null); setDeleteModalOpen(false); }
    };
    
    const handleAddComment = async () => {
        if (!orderId || !newComment.trim()) return;
        setActionLoading('addComment');
        try {
            await addStockOrderComment(orderId, newComment.trim());
            setNewComment('');
        } catch (e: any) {
            addToast(e.message || "Failed to post comment.", "error");
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleUpdateComment = async () => {
        if (!orderId || !editingComment || !editingComment.text.trim()) return;
        setActionLoading('updateComment');
        try {
            await updateStockOrderComment(orderId, editingComment);
            setEditingComment(null);
        } catch (e: any) {
            addToast(e.message || "Failed to update comment.", "error");
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleDeleteComment = async () => {
        if (!orderId || !commentToDelete) return;
        setActionLoading('deleteComment');
        try {
            await deleteStockOrderComment(orderId, commentToDelete.id);
        } catch (e: any) {
            addToast(e.message || "Failed to delete comment.", "error");
        } finally {
            setCommentToDelete(null);
            setActionLoading(null);
        }
    };

    const handleDeletePayment = async () => {
        if (!orderId || !paymentToDelete) return;
        setActionLoading('deletePayment');
        try {
            await deleteStockOrderPayment(orderId, paymentToDelete.id);
            addToast("Payment deleted.", "success");
        } catch(err: any) {
            addToast(err.message || "Failed to delete payment.", "error");
        } finally {
            setPaymentToDelete(null);
            setActionLoading(null);
        }
    };

    const handleSendEmail = async () => {
        if (!order || !vendorDetails) {
            addToast("Vendor details not found. Cannot send email.", "error");
            return;
        }
        setActionLoading('email');
        try {
            const toEmails = [vendorDetails.email, ...vendorDetails.contactPersons.map(p => p.email).filter((e): e is string => !!e)];
            const subject = `Purchase Order #${order.orderId} from ${user?.hospitalName}`;
            const body = `
                <p>Dear ${vendorDetails.name},</p>
                <p>Please find attached our purchase order #${order.orderId}.</p>
                <h3>Order Summary</h3>
                <p><strong>Order Date:</strong> {{orderDate}}</p>
                <p><strong>Payment Terms:</strong> {{paymentTerms}}</p>
                <p><strong>Total Value:</strong> {{orderTotal}}</p>
                <h3>Items Requested:</h3>
                {{itemsTable}}
                <p>Please confirm receipt of this order.</p>
                <p>Thank you,</p>
                <p>${user?.hospitalName}</p>
            `;
            
            await sendEmail(toEmails.join(','), subject, body, { user: user!, stockOrder: order });
            addToast(`Email sent to ${toEmails.join(', ')}`, 'success');
        } catch (error) {
            addToast("Failed to send email.", "error");
        } finally {
            setActionLoading(null);
        }
    };
    
    const toggleExpandItem = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };
    
    const allReceivedBatches = useMemo(() => {
        const map = new Map<string, any[]>();
        if (!order || !order.id) return map;

        for (const item of order.items) {
            const stockItem = detailedStockItems.get(item.stockItemId);
            if (!stockItem) {
                map.set(item.stockItemId, []);
                continue;
            }

            const movementsForThisOrder = (itemMovements.get(item.stockItemId) || [])
                .filter(m => m.relatedOrderId === order.id && m.type === 'received' && m.batchNumber);
            
            const receivedQtyPerBatch = movementsForThisOrder.reduce((acc, m) => {
                acc[m.batchNumber!] = (acc[m.batchNumber!] || 0) + m.quantityChange;
                return acc;
            }, {} as Record<string, number>);

            const batches = Object.entries(receivedQtyPerBatch).map(([batchNumber, quantityReceived]) => {
                const batchDetail = (stockItem.batches || []).find(b => b.batchNumber === batchNumber);
                return {
                    ...batchDetail,
                    quantityReceived: quantityReceived
                };
            }).filter(b => b.id);
            
            map.set(item.stockItemId, batches);
        }
        return map;
    }, [order, detailedStockItems, itemMovements]);
    
    const toggleReturnExpansion = (returnId: string) => {
        setExpandedReturns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(returnId)) {
                newSet.delete(returnId);
            } else {
                newSet.add(returnId);
            }
            return newSet;
        });
    };


    const OrderStatusPill: React.FC<{ status: StockOrderStatus }> = ({ status }) => {
        const config = {
            'Pending': { icon: faHashtag, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
            'Partially Received': { icon: faTruck, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
            'Complete': { icon: faCheck, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
            'Cancelled': { icon: faTimes, color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' },
        }[status];
        return <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-bold rounded-full ${config.color}`}><FontAwesomeIcon icon={config.icon} />{status}</div>;
    };

    if (loading) return <div className="p-8 text-center">Loading Order Details...</div>;
    if (!order) return <div className="p-8 text-center">Order not found.</div>;

    const isReceivable = order.status === 'Pending' || order.status === 'Partially Received';
    const isReturnable = order.totalReceivedItems > 0 && order.status !== 'Cancelled';
    const isCancellable = order.status === 'Pending' && order.totalReceivedItems === 0;
    const isDeletable = order.status === 'Pending' || order.status === 'Cancelled';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            <ConfirmationModal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} onConfirm={handleCancelOrder} title="Cancel Order" message={`Are you sure you want to cancel order ${order.orderId}? This cannot be undone.`} confirmButtonText="Yes, Cancel Order" confirmButtonVariant="danger" loading={actionLoading === 'cancel'} />
            <ConfirmationModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteOrder} title="Delete Order" message={`Are you sure you want to permanently delete order ${order.orderId}? This action is irreversible.`} confirmButtonText="Yes, Delete Order" confirmButtonVariant="danger" loading={actionLoading === 'delete'} />
            {commentToDelete && <ConfirmationModal isOpen={true} onClose={() => setCommentToDelete(null)} onConfirm={handleDeleteComment} title="Delete Comment" message="Are you sure you want to delete this comment?" confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading === 'deleteComment'} />}
            {paymentToDelete && <ConfirmationModal zIndex="z-[53]" isOpen={true} onClose={() => setPaymentToDelete(null)} onConfirm={handleDeletePayment} title="Delete Payment" message="Are you sure you want to delete this payment?" confirmButtonText="Delete" confirmButtonVariant="danger" />}
            {canWrite && <ReceiveStockModal isOpen={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} onSave={receiveStockOrderItems} order={order} />}
            {canWrite && <ReturnStockModal isOpen={returnModalOpen} onClose={() => setReturnModalOpen(false)} onSave={handleReturnStock} order={order} stockItemsMap={detailedStockItems} allReceivedBatches={allReceivedBatches} relatedReturns={relatedReturns} />}
            {canWrite && <ManageOrderPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} order={order} paymentToEdit={paymentToEdit} onSuccess={() => { setIsPaymentModalOpen(false); }} />}
            
            <div className="flex justify-between items-center">
                 <Button variant="light" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`, { state: location.state })}><FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back to Orders</Button>
            </div>

            <DetailCard
                title={`Order Details: #${order.orderId}`}
                footer={canWrite ? (<div className="flex justify-between items-center">
                    <div>
                        {isDeletable && <Button variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50" onClick={() => setDeleteModalOpen(true)} disabled={!!actionLoading}><FontAwesomeIcon icon={faTrashAlt} className="mr-2"/>Delete</Button>}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        {isReturnable && <Button variant="light" onClick={() => setReturnModalOpen(true)} disabled={!!actionLoading}><FontAwesomeIcon icon={faUndo} className="mr-2"/>Return Stock</Button>}
                        {isCancellable && <Button variant="light" onClick={() => setCancelModalOpen(true)} disabled={!!actionLoading}>Cancel Order</Button>}
                        {order.paymentStatus !== 'Paid' && <Button variant="success" onClick={() => { setPaymentToEdit(null); setIsPaymentModalOpen(true); }} disabled={!!actionLoading}><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2"/>Add Payment</Button>}
                        {isReceivable && <Button variant="primary" onClick={() => setReceiveModalOpen(true)} disabled={!!actionLoading}>Receive Stock</Button>}
                        <Button variant="light" onClick={handleSendEmail} disabled={!!actionLoading}><FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> {actionLoading === 'email' ? 'Sending...' : 'Send Email'}</Button>
                    </div>
                </div>) : undefined}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div><p className="text-sm text-slate-500">Vendor</p><p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{order.vendor}</p></div>
                    <div><p className="text-sm text-slate-500">Order Date</p><p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{order.orderDate.toDate().toLocaleDateString()}</p></div>
                    <div><p className="text-sm text-slate-500">Payment Terms</p><p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{order.paymentTerms} days</p></div>
                    
                    <div><p className="text-sm text-slate-500">Total Value</p><p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{formatCurrency(order.totalValue, user?.hospitalCurrency)}</p></div>
                    <div><p className="text-sm text-slate-500">Amount Paid</p><p className="font-semibold text-lg text-green-600 dark:text-green-400">{formatCurrency(order.amountPaid || 0, user?.hospitalCurrency)}</p></div>
                    <div><p className="text-sm text-slate-500">Amount Due</p><p className="font-semibold text-lg text-red-600 dark:text-red-400">{formatCurrency(order.totalValue - (order.amountPaid || 0), user?.hospitalCurrency)}</p></div>
                    
                    <div><p className="text-sm text-slate-500">Order Status</p><OrderStatusPill status={order.status} /></div>
                    <div><p className="text-sm text-slate-500">Payment Status</p><PaymentStatusBadge status={order.paymentStatus} /></div>
                </div>
                 {order.attachments.length > 0 && <div className="mb-6"><h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Attachments</h4><div className="flex flex-wrap gap-2">{order.attachments.map(att => (<a key={att.url} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm hover:bg-slate-200"><FontAwesomeIcon icon={faPaperclip}/>{att.name}<FontAwesomeIcon icon={faExternalLinkAlt} className="h-3 w-3"/></a>))}</div></div>}
                
                <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Items in this Order</h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3 text-left">Product</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 text-center">Ordered</th>
                                <th className="p-3 text-center">Received</th>
                                <th className="p-3 text-center">Returned</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {order.items.map(item => {
                                const isExpanded = expandedItems.has(item.stockItemId);
                                const receivedBatches = allReceivedBatches.get(item.stockItemId) || [];

                                return (
                                    <React.Fragment key={item.stockItemId}>
                                        <tr>
                                            <td className="p-3 font-medium text-slate-900 dark:text-slate-200">
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => toggleExpandItem(item.stockItemId)}
                                                        className="p-1 mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        aria-label={isExpanded ? 'Collapse batches' : 'Expand batches'}
                                                        aria-expanded={isExpanded}
                                                    >
                                                        <FontAwesomeIcon icon={faChevronDown} className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''} text-slate-600 dark:text-slate-400`} />
                                                    </button>
                                                    <span>{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.costPrice, user?.hospitalCurrency)}</td>
                                            <td className="p-3 text-center text-slate-900 dark:text-slate-200">{item.orderedQty}</td>
                                            <td className="p-3 text-center text-slate-900 dark:text-slate-200">{item.receivedQty}</td>
                                            <td className="p-3 text-center text-red-500">{item.returnedQty || 0}</td>
                                            <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(item.costPrice * item.orderedQty, user?.hospitalCurrency)}</td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={6} className="p-4">
                                                    <h5 className="font-semibold mb-2 ml-4 text-slate-800 dark:text-slate-100">Received Batches</h5>
                                                    {receivedBatches.length > 0 ? (
                                                        <table className="min-w-full bg-white dark:bg-slate-900 rounded-lg">
                                                            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                                                                <tr>
                                                                    <th className="p-2 text-left">Batch No.</th>
                                                                    <th className="p-2 text-left">Expiry Date</th>
                                                                    <th className="p-2 text-right">Qty Received</th>
                                                                    <th className="p-2 text-right">Cost Price</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                                                                {receivedBatches.map((batch, index) => (
                                                                    <tr key={index}>
                                                                        <td className="p-2 font-mono">{batch.batchNumber}</td>
                                                                        <td className="p-2">{batch.expiryDate ? batch.expiryDate.toDate().toLocaleDateString() : 'N/A'}</td>
                                                                        <td className="p-2 text-right">{batch.quantityReceived}</td>
                                                                        <td className="p-2 text-right">{formatCurrency(batch.costPrice || 0, user?.hospitalCurrency)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="p-4 text-center text-sm text-slate-500">
                                                            No batches have been received for this item on this order.
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </DetailCard>

            {relatedReturns.length > 0 && (
                <DetailCard title={`Return History (${relatedReturns.length})`}>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-3 text-left">Return ID</th>
                                    <th className="p-3 text-left">Date</th>
                                    <th className="p-3 text-right">Items</th>
                                    <th className="p-3 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {relatedReturns.map(ret => {
                                    const isExpanded = expandedReturns.has(ret.id!);
                                    return (
                                        <React.Fragment key={ret.id}>
                                            <tr>
                                                <td className="p-3">
                                                    <div className="flex items-center">
                                                        <button onClick={(e) => { e.stopPropagation(); toggleReturnExpansion(ret.id!); }} className="p-1 mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faChevronDown} className={`w-3 h-3 transition-transform text-slate-600 dark:text-slate-400 ${isExpanded ? 'rotate-180' : ''}`} /></button>
                                                        <span onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks/returns/${ret.id}`)} className="font-mono text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{ret.returnId}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-slate-600 dark:text-slate-400">{ret.returnDate.toDate().toLocaleDateString()}</td>
                                                <td className="p-3 text-right text-slate-800 dark:text-slate-200">{ret.items.reduce((sum, item) => sum + item.returnedQty, 0)}</td>
                                                <td className="p-3 text-right font-semibold text-red-600 dark:text-red-400">-{formatCurrency(ret.totalReturnValue, user?.hospitalCurrency)}</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/20">
                                                    <td colSpan={4} className="p-4">
                                                        <h5 className="font-semibold text-xs mb-2 ml-4">Items in this Return</h5>
                                                        <table className="min-w-full bg-white dark:bg-slate-900 rounded-lg text-xs">
                                                            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400"><tr className="border-b border-slate-200 dark:border-slate-700"><th className="p-2 text-left">Product</th><th className="p-2 text-left">Batch No.</th><th className="p-2 text-right">Qty Returned</th><th className="p-2 text-right">Value</th></tr></thead>
                                                            <tbody className="text-sm text-slate-700 dark:text-slate-300">
                                                                {ret.items.map((item, idx) => (<tr key={idx}><td className="p-2 font-medium text-slate-800 dark:text-slate-200">{item.name}</td><td className="p-2 font-mono text-slate-600 dark:text-slate-400">{item.batchNumber}</td><td className="p-2 text-right">{item.returnedQty}</td><td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.costPriceAtReturn * item.returnedQty, user?.hospitalCurrency)}</td></tr>))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                    </div>
                </DetailCard>
            )}

            <DetailCard title={`Payment History (${order.paymentHistory?.length || 0})`}>
                <div className="space-y-3">
                    {(order.paymentHistory && order.paymentHistory.length > 0) ? [...order.paymentHistory].sort((a,b) => b.date.seconds - a.date.seconds).map(payment => (
                        <div key={payment.id} className="group flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div>
                                <p className="font-semibold">{formatCurrency(payment.amount, user?.hospitalCurrency)} via {payment.method}</p>
                                <p className="text-sm text-slate-500">{payment.date.toDate().toLocaleString()}</p>
                                {payment.note && <p className="text-xs italic text-slate-500 mt-1">Note: {payment.note}</p>}
                            </div>
                            {canWrite && <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <PaymentActionsDropdown 
                                    onEdit={() => { setPaymentToEdit(payment); setIsPaymentModalOpen(true); }}
                                    onDelete={() => setPaymentToDelete(payment)}
                                />
                            </div>}
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 py-4">No payments have been recorded for this order.</p>
                    )}
                </div>
            </DetailCard>

            <DetailCard title={`Comments (${order.comments?.length || 0})`}>
                <div className="space-y-4">
                    {canWrite && <div className="flex items-start gap-4">
                        <Avatar avatar={user?.profilePhotoUrl ? { type: 'image', value: user.profilePhotoUrl } : { type: 'initials', value: user?.name.split(' ').map(n => n[0]).join('') || '?', color: 'bg-blue-600' }} />
                        <div className="flex-1">
                            <Textarea label="Add a comment" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type your comment here..." rows={2} />
                            <div className="text-right mt-2">
                                <Button onClick={handleAddComment} disabled={!newComment.trim() || !!actionLoading}>
                                    <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                                    {actionLoading === 'addComment' ? 'Posting...' : 'Post'}
                                </Button>
                            </div>
                        </div>
                    </div>}

                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        {order.comments && [...order.comments].sort((a,b) => b.createdAt.seconds - a.createdAt.seconds).map(comment => {
                            const canEditComment = user?.uid === comment.userId;
                            const canDeleteComment = canEditComment || user?.roleName === 'owner' || user?.roleName === 'admin';
                            return (
                                <div key={comment.id} className="flex items-start gap-4">
                                    <Avatar avatar={comment.userProfilePhotoUrl ? { type: 'image', value: comment.userProfilePhotoUrl } : { type: 'initials', value: comment.userName.split(' ').map(n => n[0]).join(''), color: 'bg-indigo-500' }} />
                                    <div className="flex-1">
                                        <div className="group flex justify-between items-start bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{comment.userName}</p>
                                                <p className="text-xs text-slate-500">{comment.createdAt.toDate().toLocaleString()} {comment.updatedAt && '(edited)'}</p>
                                                {editingComment?.id === comment.id ? (<div className="mt-2 w-full">
                                                    <Textarea label="" value={editingComment.text} onChange={e => setEditingComment({...editingComment, text: e.target.value})} rows={3} />
                                                    <div className="flex gap-2 mt-2"><Button size="sm" onClick={handleUpdateComment} disabled={actionLoading === 'updateComment'}>{actionLoading === 'updateComment' ? 'Saving...' : 'Save'}</Button><Button size="sm" variant="light" onClick={() => setEditingComment(null)}>Cancel</Button></div>
                                                </div>) : (<p className="mt-1 text-slate-700 whitespace-pre-wrap">{comment.text}</p>)}
                                            </div>
                                            {(canEditComment || canDeleteComment) && canWrite && (
                                                 <div className="relative flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {canEditComment && <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" disabled={!!actionLoading} onClick={() => setEditingComment(comment)}><FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 text-slate-500"/></button>}
                                                    {canDeleteComment && <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" disabled={!!actionLoading} onClick={() => setCommentToDelete(comment)}><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 text-red-500"/></button>}
                                                 </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DetailCard>
        </div>
    );
};

export default StockOrderDetailsScreen;