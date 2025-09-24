import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppUser, POSSale, POSSaleStatus, Payment, POSPaymentMethod, POSSalePaymentStatus, PatientDocument, UserDocument } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReceipt, faPrint, faTrashAlt, faTimes, faEllipsisV, faPencilAlt, faMoneyBillWave, faShieldAlt, faFileInvoiceDollar, faSearch, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '../hooks/useToast';
import Button from '../components/ui/Button';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useNavigate, useLocation } from 'react-router-dom';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Pagination from '../components/ui/Pagination';
import { SearchableOption, SearchableSelect } from './ReservationsScreen';
import DateRangePicker from '../components/ui/DateRangePicker';
import { db } from '../services/firebase';
import { usePaginationSettings } from '../hooks/usePaginationSettings';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatTimestamp = (ts: Timestamp | undefined) => ts ? ts.toDate().toLocaleString('en-GB') : 'N/A';

const StatCard: React.FC<{ title: string; value: string; icon: any }> = ({ title, value, icon }) => {
    const fontSizeClass = value.length > 12 ? 'text-xl' : 'text-2xl';
    return (
        <Card className="p-6">
            <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center h-12 w-12">
                    <FontAwesomeIcon icon={icon} className="h-6 w-6" />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
                    <p className={`font-semibold text-slate-900 dark:text-slate-100 ${fontSizeClass}`}>{value}</p>
                </div>
            </div>
        </Card>
    );
};


const ManagePOSPaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sale: POSSale;
    paymentToEdit: Payment | null;
    onSuccess: () => void;
}> = ({ isOpen, onClose, sale, paymentToEdit, onSuccess }) => {
    const { user, updatePOSSalePayment, updatePOSSalePaymentDetails } = useAuth();
    const { addToast } = useToast();
    const isEditMode = paymentToEdit !== null;

    const [amount, setAmount] = useState('0.00');
    const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('Cash');
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
                setPaymentMethod(paymentToEdit.method as POSPaymentMethod);
                setNote(paymentToEdit.note || '');
            } else {
                const amountDue = sale.totalAmount - sale.amountPaid;
                setAmount(amountDue > 0 ? amountDue.toFixed(2) : '0.00');
                setPaymentMethod('Cash');
                setNote('');
            }
        }
    }, [isOpen, isEditMode, paymentToEdit, sale]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode && paymentToEdit) {
                await updatePOSSalePaymentDetails(sale.id, {
                    ...paymentToEdit,
                    amount: parseFloat(amount),
                    method: paymentMethod,
                    note,
                });
                addToast('Payment updated successfully!', 'success');
            } else {
                 await updatePOSSalePayment(sale.id, {
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
    
    const amountDue = sale.totalAmount - sale.amountPaid + (isEditMode && paymentToEdit ? paymentToEdit.amount : 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[52] flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800"><h3 className="text-xl font-bold">{isEditMode ? 'Edit Payment' : 'Add Payment'}</h3><p className="text-sm text-slate-500">For Sale: {sale.saleId}</p></div>
                    <div className="p-6 space-y-4">
                        <div className="p-3 text-center bg-blue-50 dark:bg-blue-900/50 rounded-lg"><p className="text-sm text-blue-600 dark:text-blue-300">Amount Due</p><p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(amountDue, currency)}</p></div>
                        <Input label={`Amount to ${isEditMode ? 'Update' : 'Pay'}`} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                            <option>Cash</option><option>Card</option><option>Gpay</option><option>Phonepe</option><option>Paytm</option><option>Other</option>
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
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" /></button>
            {isOpen && <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10"><div className="py-1">
                <button onClick={onEdit} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> Edit</button>
                <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete</button>
            </div></div>}
        </div>
    );
};


const POSInvoiceModal: React.FC<{ sale: POSSale | null; user: AppUser | null; onClose: () => void; onActionSuccess: () => void; }> = ({ sale, user, onClose, onActionSuccess }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { getPatientById, deletePOSSalePayment, setInvoiceToPrint } = useAuth();
    const { addToast } = useToast();
    const [patientDetails, setPatientDetails] = useState<PatientDocument | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

    const canWrite = user?.permissions['pos-sales'] === 'write';
    const currency = user?.hospitalCurrency || 'USD';

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isPaymentModalOpen || paymentToDelete) return;
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (sale) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [sale, onClose, isPaymentModalOpen, paymentToDelete]);
    
    useEffect(() => {
        if (sale && sale.patientId && sale.patientId !== 'walk-in') {
            setPatientDetails(null); // Reset while fetching
            getPatientById(sale.patientId)
                .then(p => setPatientDetails(p))
                .catch(() => setPatientDetails(null)); // Handle case where patient might not be found
        } else {
            setPatientDetails(null);
        }
    }, [sale, getPatientById]);
    
    const handleDeletePayment = async () => {
        if (!sale || !paymentToDelete) return;
        try {
            await deletePOSSalePayment(sale.id, paymentToDelete.id);
            addToast("Payment deleted successfully.", "success");
            onActionSuccess();
        } catch (err) { addToast("Failed to delete payment.", "error"); }
        finally { setPaymentToDelete(null); }
    };

    if (!sale || !user) return null;
    
    const amountDue = sale.totalAmount - sale.amountPaid;
    const subtotalIncTax = sale.grossTotal + sale.taxAmount;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-10 overflow-y-auto">
            <ManagePOSPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} sale={sale} paymentToEdit={paymentToEdit} onSuccess={() => { setIsPaymentModalOpen(false); onActionSuccess(); }} />
            {paymentToDelete && <ConfirmationModal zIndex="z-[53]" isOpen={true} onClose={() => setPaymentToDelete(null)} onConfirm={handleDeletePayment} title="Delete Payment" message={`Are you sure you want to delete this payment of ${formatCurrency(paymentToDelete.amount, currency)}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}
            <div ref={modalRef} className="bg-slate-50 dark:bg-slate-950 rounded-lg shadow-xl w-full max-w-4xl m-4">
                <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Invoice #{sale.saleId}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="light" onClick={() => setInvoiceToPrint({ invoice: sale, type: 'POS' })}><FontAwesomeIcon icon={faPrint} className="mr-2"/>Print</Button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faTimes} className="text-slate-500" /></button>
                    </div>
                </div>
                <div className="max-h-[80vh] overflow-y-auto p-6 bg-white dark:bg-slate-900">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.hospitalName}</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user.hospitalAddress.street}, {user.hospitalAddress.city}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user.hospitalPhone}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">Billed To:</p>
                            <p className="text-slate-700 dark:text-slate-300">{sale.patientName}</p>
                            {patientDetails?.address && <p className="text-slate-600 dark:text-slate-400">{patientDetails.address}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-slate-700 dark:text-slate-300"><strong className="font-bold text-slate-800 dark:text-slate-200">Invoice No:</strong> {sale.saleId}</p>
                            <p className="text-slate-700 dark:text-slate-300"><strong className="font-bold text-slate-800 dark:text-slate-200">Date:</strong> {formatTimestamp(sale.createdAt)}</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto my-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-2 text-left font-semibold">#</th>
                                    <th className="p-2 text-left font-semibold">Item</th>
                                    <th className="p-2 text-left font-semibold">HSN</th>
                                    <th className="p-2 text-left font-semibold">Batch</th>
                                    <th className="p-2 text-left font-semibold">Expiry</th>
                                    <th className="p-2 text-right font-semibold">MRP</th>
                                    <th className="p-2 text-center font-semibold">Qty</th>
                                    <th className="p-2 text-right font-semibold">Tax</th>
                                    <th className="p-2 text-right font-semibold">Disc.</th>
                                    <th className="p-2 text-right font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {sale.items.map((item, index) => {
                                    const lineGross = item.salePrice * item.quantity;
                                    const lineTax = item.taxAmount * item.quantity;
                                    const lineDiscount = item.discountAmount || 0;
                                    const lineTotal = lineGross + lineTax - lineDiscount;
                                    
                                    return (
                                        <tr key={index}>
                                            <td className="p-2 align-top text-slate-700 dark:text-slate-300">{index + 1}</td>
                                            <td className="p-2 align-top font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                                            <td className="p-2 align-top text-slate-700 dark:text-slate-300">{item.hsnCode || 'N/A'}</td>
                                            <td className="p-2 align-top text-slate-700 dark:text-slate-300">{item.batchNumber || 'N/A'}</td>
                                            <td className="p-2 align-top text-slate-700 dark:text-slate-300">{item.expiryDate || 'N/A'}</td>
                                            <td className="p-2 text-right align-top text-slate-800 dark:text-slate-200">{formatCurrency(item.salePrice, currency)}</td>
                                            <td className="p-2 text-center align-top text-slate-800 dark:text-slate-200">{item.quantity} {item.unitType}</td>
                                            <td className="p-2 text-right align-top text-slate-800 dark:text-slate-200">
                                                {formatCurrency(lineTax, currency)}
                                                {item.taxName && <p className="text-xs text-slate-500">{item.taxName}</p>}
                                            </td>
                                            <td className="p-2 text-right align-top text-slate-800 dark:text-slate-200">{formatCurrency(lineDiscount, currency)}</td>
                                            <td className="p-2 text-right align-top font-bold text-slate-900 dark:text-slate-100">{formatCurrency(lineTotal, currency)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>


                    <div className="space-y-1 text-sm font-medium border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400"><p>Gross Total</p><p>{formatCurrency(sale.grossTotal, currency)}</p></div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400"><p>Total Tax</p><p>{formatCurrency(sale.taxAmount, currency)}</p></div>
                         <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300"><p>Subtotal</p><p>{formatCurrency(subtotalIncTax, currency)}</p></div>
                        {sale.totalItemDiscount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><p>Item Discounts</p><p>- {formatCurrency(sale.totalItemDiscount, currency)}</p></div>}
                        {sale.overallDiscount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><p>Overall Discount</p><p>- {formatCurrency(sale.overallDiscount, currency)}</p></div>}
                        <div className="flex justify-between font-bold text-base text-slate-800 dark:text-slate-200 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700"><p>Grand Total</p><p>{formatCurrency(sale.totalAmount, currency)}</p></div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400"><p>Amount Paid</p><p>{formatCurrency(sale.amountPaid, currency)}</p></div>
                        <div className="flex justify-between font-bold text-base text-red-600 dark:text-red-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700"><p>Amount Due</p><p>{formatCurrency(amountDue, currency)}</p></div>
                    </div>

                    {(sale.paymentHistory || []).length > 0 && <div className="mt-6"><h4 className="text-sm font-semibold mb-2">Payment History</h4><div className="space-y-2">{sale.paymentHistory.map((p, i) => (<div key={p.id || i} className="group text-xs p-3 bg-slate-100 dark:bg-slate-800 rounded-md flex justify-between items-start"><div className="flex-1"><div><span className="font-medium">{p.method} on {formatTimestamp(p.date)}</span><span className="ml-4 font-bold text-base">{formatCurrency(p.amount, currency)}</span></div>{p.note && <p className="mt-1 text-slate-500 dark:text-slate-400 italic">Note: {p.note}</p>}{p.recordedBy && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recorded by {p.recordedBy}</p>}</div>{p.id && canWrite && <div className="opacity-0 group-hover:opacity-100 transition-opacity"><PaymentActionsDropdown onEdit={() => { setPaymentToEdit(p); setIsPaymentModalOpen(true); }} onDelete={() => setPaymentToDelete(p)} /></div>}</div>))}</div></div>}
                    <div className="text-center text-xs text-slate-600 dark:text-slate-400 mt-8"><p>Thank you for your business!</p></div>
                </div>
                {amountDue > 0 && canWrite && <div className="p-4 bg-slate-100 dark:bg-slate-800/50"><Button className="w-full" variant="success" onClick={() => { setPaymentToEdit(null); setIsPaymentModalOpen(true); }}><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" /> Record a Payment</Button></div>}
            </div>
        </div>
    );
};


const ActionsDropdown: React.FC<{ onView: () => void; onPrint: () => void; onDelete: () => void; onEdit: () => void; isCancelled: boolean; }> = ({ onView, onPrint, onDelete, onEdit, isCancelled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" /></button>
            {isOpen && <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10"><div className="py-1">
                <button onClick={onView} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">View Details</button>
                <button onClick={onPrint} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Print/Download</button>
                {isCancelled ? (
                     <button onClick={onEdit} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> Re-open Sale
                    </button>
                ) : (
                    <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" />Cancel Sale</button>
                )}
            </div></div>}
        </div>
    );
};

const POSSalesScreen: React.FC = () => {
    const { user, deletePOSSale, getPatients, setInvoiceToPrint, getUsersForHospital, currentLocation } = useAuth();
    const canWrite = user?.permissions['pos-sales'] === 'write';
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [sales, setSales] = useState<POSSale[]>([]);
    const [patients, setPatients] = useState<PatientDocument[]>([]);
    const [staffList, setStaffList] = useState<UserDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState<POSSale | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<POSSale | null>(null);
    const [stats, setStats] = useState({ today: 0, week: 0, month: 0, due: 0 });
    
    const [searchTerm, setSearchTerm] = useState('');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [dateRange, setDateRange] = useState({ start: startOfMonth, end: today });
    const [patientFilter, setPatientFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | POSSalePaymentStatus>('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | POSPaymentMethod>('all');
    const [createdByFilter, setCreatedByFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePaginationSettings();

    const currency = user?.hospitalCurrency || 'USD';

    useEffect(() => {
        if(!user) return;
        getPatients().then(data => setPatients(data.filter(p => p.status === 'active')));
        getUsersForHospital().then(data => setStaffList(data.filter(u => ['owner', 'admin', 'staff'].includes(u.roleName))));
    }, [user, getPatients, getUsersForHospital]);
    
    useEffect(() => {
        if (!user || !currentLocation) {
            setSales([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        const start = new Date(dateRange.start); start.setHours(0,0,0,0);
        const end = new Date(dateRange.end); end.setHours(23,59,59,999);

        const unsubscribe = db.collection('posSales')
            .where('hospitalId', '==', user.hospitalId)
            .where('locationId', '==', currentLocation.id)
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .onSnapshot(snapshot => {
                const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as POSSale));
                salesData.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
                setSales(salesData);
                setLoading(false);
            }, err => {
                console.error(err);
                addToast("Failed to load POS sales in real-time.", "error");
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user, dateRange.start, dateRange.end, addToast, currentLocation]);

    useEffect(() => {
        if (!user || !currentLocation) {
            setStats({ today: 0, week: 0, month: 0, due: 0 });
            return;
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const statsUnsubscribe = db.collection('posSales')
            .where('hospitalId', '==', user.hospitalId)
            .where('locationId', '==', currentLocation.id)
            .where('createdAt', '>=', monthStart)
            .where('status', '==', 'Completed')
            .onSnapshot(snapshot => {
                const monthSales = snapshot.docs.map(doc => doc.data() as POSSale);
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekStart = new Date(now);
                const dayOfWeek = weekStart.getDay();
                const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                weekStart.setDate(diff); weekStart.setHours(0,0,0,0);
                
                let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
                monthSales.forEach(sale => {
                    const saleDate = sale.createdAt.toDate();
                    monthRevenue += sale.totalAmount;
                    if (saleDate >= weekStart) weekRevenue += sale.totalAmount;
                    if (saleDate >= todayStart) todayRevenue += sale.totalAmount;
                });
                setStats(prev => ({...prev, today: todayRevenue, week: weekRevenue, month: monthRevenue}));
            });
        
        const dueUnsubscribe = db.collection('posSales')
            .where('hospitalId', '==', user.hospitalId)
            .where('locationId', '==', currentLocation.id)
            .where('status', '==', 'Completed')
            .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
            .onSnapshot(snapshot => {
                 const totalDue = snapshot.docs
                    .map(doc => doc.data() as POSSale)
                    .reduce((sum, s) => sum + (s.totalAmount - s.amountPaid), 0);
                 setStats(prev => ({...prev, due: totalDue}));
            });
        
        return () => {
            statsUnsubscribe();
            dueUnsubscribe();
        }
    }, [user, currentLocation]);

    const handleActionSuccess = async () => {
        if(selectedSale) {
            const doc = await db.collection('posSales').doc(selectedSale.id).get();
            if(doc.exists) {
                setSelectedSale({ id: doc.id, ...doc.data() } as POSSale);
            } else {
                setSelectedSale(null);
            }
        }
    }


    const filteredSales = useMemo(() => {
        return sales
            .filter(s => paymentStatusFilter === 'all' || s.paymentStatus === paymentStatusFilter)
            .filter(s => patientFilter === 'all' || s.patientId === patientFilter || (patientFilter === 'walk-in' && (!s.patientId || s.patientId === 'walk-in')))
            .filter(s => paymentMethodFilter === 'all' || s.paymentMethod === paymentMethodFilter)
            .filter(s => createdByFilter === 'all' || s.createdBy === createdByFilter)
            .filter(s => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return s.saleId.toLowerCase().includes(term) || s.patientName.toLowerCase().includes(term);
            });
    }, [sales, searchTerm, paymentStatusFilter, patientFilter, paymentMethodFilter, createdByFilter]);

    const patientOptions = useMemo((): SearchableOption[] => [
        { value: 'all', label: 'All Patients' },
        { value: 'walk-in', label: 'Walk-in Customer' },
        ...patients.map(p => ({ value: p.id, label: p.name, secondaryLabel: `ID: ${p.patientId}` }))
    ], [patients]);
    
    const staffOptions = useMemo((): SearchableOption[] => {
        // FIX: Explicitly type `uniqueNames` to resolve type error.
        const uniqueNames: string[] = [...new Set(staffList.map(s => s.name))];
        return [
            { value: 'all', label: 'All Staff' },
            ...uniqueNames.map(name => ({ value: name, label: name }))
        ];
    }, [staffList]);
    
    const paymentMethodOptions: SearchableOption[] = [
        { value: 'all', label: 'All Modes' },
        { value: 'Cash', label: 'Cash' },
        { value: 'Card', label: 'Card' },
        { value: 'Gpay', label: 'Gpay' },
        { value: 'Phonepe', label: 'Phonepe' },
        { value: 'Paytm', label: 'Paytm' },
        { value: 'Other', label: 'Other' },
    ];


    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deletePOSSale(confirmDelete.id);
            addToast(`Sale ${confirmDelete.saleId} has been cancelled.`, "success");
        } catch (error: any) { addToast(error.message || "Failed to cancel sale.", "error"); }
        finally { setConfirmDelete(null); }
    };
    
    const handleReopenSale = (sale: POSSale) => {
        navigate(`/hospitals/${user?.hospitalSlug}/pos`, { state: { items: sale.items, patientId: sale.patientId, overallDiscount: sale.overallDiscount } });
    };

    const totalPages = useMemo(() => Math.ceil(filteredSales.length / itemsPerPage), [filteredSales.length, itemsPerPage]);
    const paginatedSales = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredSales.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredSales, currentPage, itemsPerPage]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, paymentStatusFilter, patientFilter, dateRange, paymentMethodFilter, createdByFilter]);
    
    if (!currentLocation) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <FontAwesomeIcon icon={faReceipt} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Location Selected</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Please select a hospital location from the header to view and manage POS sales.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <POSInvoiceModal sale={selectedSale} user={user} onClose={() => setSelectedSale(null)} onActionSuccess={handleActionSuccess}/>
            {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Cancel Sale" message={`Are you sure you want to cancel sale ${confirmDelete.saleId}? This will return stock to inventory.`} confirmButtonText="Yes, Cancel" confirmButtonVariant="danger" />}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Sales Today" value={formatCurrency(stats.today, currency)} icon={faReceipt} />
                <StatCard title="Sales This Week" value={formatCurrency(stats.week, currency)} icon={faReceipt} />
                <StatCard title="Sales This Month" value={formatCurrency(stats.month, currency)} icon={faReceipt} />
                <StatCard title="Total Dues" value={formatCurrency(stats.due, currency)} icon={faFileInvoiceDollar} />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                    <Input label="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Sale ID or Patient..." icon={<FontAwesomeIcon icon={faSearch}/>}/>
                    <div className="md:col-span-3 lg:col-span-1"><SearchableSelect label="Patient" options={patientOptions} value={patientFilter} onChange={setPatientFilter} placeholder="Search patients..."/></div>
                     <Select label="Payment Status" value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value as any)}>
                        <option value="all">All Payment Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Unpaid">Unpaid</option>
                    </Select>
                    <SearchableSelect label="Payment Mode" options={paymentMethodOptions} value={paymentMethodFilter} onChange={(value) => setPaymentMethodFilter(value as any)} placeholder="Search modes..."/>
                    <SearchableSelect label="Added By" options={staffOptions} value={createdByFilter} onChange={setCreatedByFilter} placeholder="Search staff..."/>
                    <div className="md:col-span-3 lg:col-span-5">
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sale ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Added By</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Mode</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="relative px-6 py-3"></th>
                            </tr>
                        </thead>
                         <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={11} className="text-center p-6 text-slate-500">Loading sales...</td></tr>
                            ) : paginatedSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => setSelectedSale(sale)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{sale.saleId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatTimestamp(sale.createdAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{sale.patientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sale.createdBy}</td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold">{formatCurrency(sale.totalAmount, currency)}</td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">{formatCurrency(sale.amountPaid, currency)}</td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">{formatCurrency(sale.totalAmount - sale.amountPaid, currency)}</td>
                                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-0.5 text-xs rounded-full ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : sale.paymentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{sale.paymentStatus}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sale.paymentMethod}</td>
                                    <td className="px-6 py-4 text-sm"><span className={`px-2 py-0.5 text-xs rounded-full ${sale.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{sale.status}</span></td>
                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>{canWrite && <ActionsDropdown onView={() => setSelectedSale(sale)} onPrint={() => setInvoiceToPrint({ invoice: sale, type: 'POS' })} onDelete={() => setConfirmDelete(sale)} onEdit={() => handleReopenSale(sale)} isCancelled={sale.status === 'Cancelled'} />}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} totalItems={filteredSales.length} itemsOnPage={paginatedSales.length} />
            </div>
        </div>
    );
};

export default POSSalesScreen;