// screens/PurchasesScreen.tsx
// FIX: Renamed from ExpensesScreen to PurchasesScreen to match file name.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Expense, NewExpenseData, InvoiceStatus, Payment, TaxGroup } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar, faSearch, faCalendar, faDownload, faEllipsisV, faTimes, faChevronRight, faMoneyBillWave, faShieldAlt, faInfoCircle, faPencilAlt, faTrashAlt, faPlus, faPaperclip, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { Timestamp } from 'firebase/firestore';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Textarea from '../components/ui/Textarea';
import FileInput from '../components/ui/FileInput';
import CreatableSearchableSelect from '../components/ui/CreatableSearchableSelect';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbol = currencySymbols[currencyCode] || '$';
    if(isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatCard: React.FC<{ title: string; value: string; icon: any; color?: 'red' | 'blue' | 'green' | 'yellow' }> = ({ title, value, icon, color = 'red' }) => {
    const colorClasses = {
        red: 'bg-red-100 dark:bg-slate-800 text-red-600 dark:text-red-400',
        blue: 'bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400',
        green: 'bg-green-100 dark:bg-slate-800 text-green-600 dark:text-green-400',
        yellow: 'bg-yellow-100 dark:bg-slate-800 text-yellow-600 dark:text-yellow-400',
    };

    return (
        <Card className="p-6">
            <div className="flex items-center">
                <div className={`p-3 rounded-full flex items-center justify-center h-12 w-12 ${colorClasses[color]}`}>
                    <FontAwesomeIcon icon={icon} className="h-6 w-6" />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
                </div>
            </div>
        </Card>
    );
};

const getStatusBadge = (status: InvoiceStatus) => {
    const baseClasses = "px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase";
    switch (status) {
        case 'Paid': return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
        case 'Unpaid': return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
        case 'Partially Paid': return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
        default: return baseClasses;
    }
};

const formatTimestamp = (ts: Timestamp | undefined) => ts ? ts.toDate().toLocaleDateString('en-GB') : 'N/A';

const ManagePaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    expense: Expense;
    paymentToEdit: Payment | null;
    onSuccess: () => void;
}> = ({ isOpen, onClose, expense, paymentToEdit, onSuccess }) => {
    const { user, updateExpensePayment, updateExpensePaymentDetails } = useAuth();
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
                const amountDue = expense.totalAmount - expense.amountPaid;
                setAmount(amountDue > 0 ? amountDue.toFixed(2) : '0.00');
                setPaymentMethod('Cash');
                setNote('');
            }
        }
    }, [isOpen, isEditMode, paymentToEdit, expense]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode && paymentToEdit) {
                await updateExpensePaymentDetails(expense.id, {
                    ...paymentToEdit,
                    amount: parseFloat(amount),
                    method: paymentMethod,
                    note,
                });
                addToast('Payment updated successfully!', 'success');
            } else {
                 await updateExpensePayment(expense.id, {
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
    
    const amountDue = expense.totalAmount - expense.amountPaid + (isEditMode && paymentToEdit ? paymentToEdit.amount : 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[52] flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold">{isEditMode ? 'Edit Payment' : 'Add Payment'}</h3>
                        <p className="text-sm text-slate-500">For Expense: {expense.expenseId}</p>
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
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
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

const ExpenseDetailsModal: React.FC<{ expense: Expense | null; onClose: () => void; onActionSuccess: () => void; }> = ({ expense, onClose, onActionSuccess }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { user, deleteExpensePayment, deleteExpense } = useAuth();
    const { addToast } = useToast();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

    const canWrite = user?.permissions.expenses === 'write';
    const currency = user?.hospitalCurrency || 'USD';

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (isPaymentModalOpen || paymentToDelete || expenseToDelete) return;
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if (expense) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [expense, onClose, isPaymentModalOpen, paymentToDelete, expenseToDelete]);

    const handleDeletePayment = async () => {
        if (!expense || !paymentToDelete) return;
        try {
            await deleteExpensePayment(expense.id, paymentToDelete.id);
            addToast("Payment deleted successfully.", "success");
            onActionSuccess();
        } catch (err) { addToast("Failed to delete payment.", "error"); }
        finally { setPaymentToDelete(null); }
    };

    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteExpense(expenseToDelete.id);
            addToast("Expense deleted successfully.", "success");
            onClose(); onActionSuccess();
        } catch (err) { addToast("Failed to delete expense.", "error"); }
        finally { setExpenseToDelete(null); }
    };

    if (!expense) return null;
    const amountDue = expense.totalAmount - expense.amountPaid;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[51] flex justify-center items-start pt-10 overflow-y-auto">
            <ManagePaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} expense={expense} paymentToEdit={paymentToEdit} onSuccess={() => { setIsPaymentModalOpen(false); onActionSuccess(); }} />
            {paymentToDelete && <ConfirmationModal zIndex="z-[53]" isOpen={true} onClose={() => setPaymentToDelete(null)} onConfirm={handleDeletePayment} title="Delete Payment" message={`Are you sure you want to delete this payment of ${formatCurrency(paymentToDelete.amount, currency)}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}
            {expenseToDelete && <ConfirmationModal zIndex="z-[53]" isOpen={true} onClose={() => setExpenseToDelete(null)} onConfirm={handleDeleteExpense} title="Delete Expense" message={`Are you sure you want to delete expense ${expenseToDelete.expenseId}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}
            <div ref={modalRef} className="bg-slate-50 dark:bg-slate-950 rounded-lg shadow-xl w-full max-w-2xl m-4 transform transition-all">
                <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-t-lg">
                    <h2 className="text-lg font-bold">Expense Details #{expense.expenseId}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faTimes} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                        <div><p className="text-xs uppercase text-slate-500 font-semibold">CATEGORY</p><p className="font-bold text-slate-800 dark:text-slate-200">{expense.category}</p></div>
                        <div className="text-right"><p className="text-xs uppercase text-slate-500 font-semibold">EXPENSE DATE</p><p className="text-slate-700 dark:text-slate-300">{formatTimestamp(expense.date)}</p><div className="mt-2"><span className={getStatusBadge(expense.paymentStatus)}>{expense.paymentStatus}</span></div></div>
                    </div>
                    {(expense.note || expense.documentUrl) && <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                        {expense.note && <p className="text-sm text-slate-600 dark:text-slate-300"><strong>Note:</strong> {expense.note}</p>}
                        {expense.documentUrl && <div className="flex justify-between items-center"><p className="text-sm text-slate-600 dark:text-slate-300"><strong>Attachment:</strong> {expense.documentName || 'View Document'}</p><a href={expense.documentUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="light"><FontAwesomeIcon icon={faExternalLinkAlt} className="mr-2" />View</Button></a></div>}
                    </div>}
                    <div className="space-y-2">
                         <div className="flex justify-between text-slate-600 dark:text-slate-400"><p>Subtotal</p><p>{formatCurrency(expense.subtotal, currency)}</p></div>
                         {(expense.taxes || []).map((tax, i) => <div key={i} className="flex justify-between text-slate-600 dark:text-slate-400"><p>{tax.name} ({tax.rate}%)</p><p>+ {formatCurrency(tax.amount, currency)}</p></div>)}
                        {expense.discountAmount > 0 && <div className="flex justify-between text-green-600"><p>Discount</p><p>- {formatCurrency(expense.discountAmount, currency)}</p></div>}
                        <div className="flex justify-between font-bold text-lg text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2"><p>Total</p><p>{formatCurrency(expense.totalAmount, currency)}</p></div>
                         <div className="flex justify-between text-green-600 dark:text-green-400"><p>Paid</p><p>- {formatCurrency(expense.amountPaid, currency)}</p></div>
                         <div className="flex justify-between font-bold text-lg text-red-600 dark:text-red-400 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2"><p>Amount Due</p><p>{formatCurrency(amountDue, currency)}</p></div>
                    </div>
                    {(expense.paymentHistory || []).length > 0 && <div>
                        <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                        <div className="space-y-2">{expense.paymentHistory.map((p, i) => (<div key={p.id || i} className="group text-xs p-3 bg-slate-100 dark:bg-slate-800 rounded-md flex justify-between items-start">
                            <div>
                                <div className="flex items-center font-medium"><span>{p.method} on {formatTimestamp(p.date)}</span><span className="ml-4 font-bold text-base">{formatCurrency(p.amount, currency)}</span></div>
                                {p.note && <p className="mt-1 text-slate-500 dark:text-slate-400 italic">Note: {p.note}</p>}
                                {p.recordedBy && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recorded by {p.recordedBy}</p>}
                            </div>
                            {p.id && canWrite && <div className="opacity-0 group-hover:opacity-100 transition-opacity"><PaymentActionsDropdown onEdit={() => { setPaymentToEdit(p); setIsPaymentModalOpen(true); }} onDelete={() => setPaymentToDelete(p)} /></div>}
                        </div>))}</div>
                    </div>}
                    {expense.paymentStatus !== 'Paid' && canWrite && <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg"><h4 className="font-semibold text-sm mb-3">ADD PAYMENT</h4><div className="space-y-2"><button onClick={() => { setPaymentToEdit(null); setIsPaymentModalOpen(true); }} className="w-full flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:ring-1 hover:ring-blue-500"><div className="flex items-center"><FontAwesomeIcon icon={faMoneyBillWave} className="mr-3 text-green-500" /><span>Record a Payment</span></div><FontAwesomeIcon icon={faChevronRight} /></button></div></div>}
                </div>
                 {canWrite && <div className="p-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 rounded-b-lg"><Button variant="danger" onClick={() => setExpenseToDelete(expense)}>Delete Expense</Button></div>}
            </div>
        </div>
    );
};

const ExpenseActionsDropdown: React.FC<{ onView: () => void; onDelete: () => void; }> = ({ onView, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" /></button>
            {isOpen && <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10"><div className="py-1">
                <button onClick={onView} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 mr-3" /> View Details</button>
                <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete</button>
            </div></div>}
        </div>
    );
};


const PurchasesScreen: React.FC = () => {
    const { user, addExpense, deleteExpense, getExpenses } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [lastVisible, setLastVisible] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);
    const [activeTab, setActiveTab] = useState('Pending');
    const [stats, setStats] = useState({ today: 0, week: 0, month: 0, totalDue: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    
    const currency = user?.hospitalCurrency || 'USD';
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState<Date>(startOfMonth);
    const [endDate, setEndDate] = useState<Date>(endOfMonth);

    const fetchExpenses = useCallback(async (reset: boolean = false) => {
        if (!user || !user.currentLocation) return;
        setLoading(true);

        try {
            const { expenses: newExpenses, lastVisible: newLastVisible } = await getExpenses(
                user.currentLocation.id,
                startDate,
                endDate,
                20,
                reset ? null : lastVisible
            );

            setExpenses(prev => reset ? newExpenses : [...prev, ...newExpenses]);
            setLastVisible(newLastVisible);
            setHasMore(newExpenses.length === 20);
        } catch (err) {
            console.error(err);
            addToast("Failed to load expenses.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate, lastVisible, getExpenses, addToast]);

    useEffect(() => {
        if (user?.currentLocation) {
            fetchExpenses(true);
        }
    }, [user?.currentLocation, startDate, endDate]);

    useEffect(() => {
        if (!user || !user.currentLocation) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let monthQuery: firebase.firestore.Query = db.collection('expenses')
            .where('hospitalId', '==', user.hospitalId)
            .where('date', '>=', monthStart)
            .where('locationId', '==', user.currentLocation.id);

        const monthUnsubscribe = monthQuery.onSnapshot(snapshot => {
            const monthExpenses = snapshot.docs.map(doc => doc.data() as Expense);
            
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(now);
            const dayOfWeek = weekStart.getDay();
            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            weekStart.setDate(diff);
            weekStart.setHours(0, 0, 0, 0);

            let todayTotal = 0, weekTotal = 0, monthTotal = 0;
            monthExpenses.forEach(exp => {
                const expDate = exp.date.toDate();
                monthTotal += exp.totalAmount;
                if (expDate >= weekStart) weekTotal += exp.totalAmount;
                if (expDate >= todayStart) todayTotal += exp.totalAmount;
            });
            setStats(prev => ({ ...prev, today: todayTotal, week: weekTotal, month: monthTotal }));
        }, error => {
            console.error("Error fetching month expenses stats: ", error);
            addToast("Failed to load monthly expense stats.", "error");
        });

        let dueQuery: firebase.firestore.Query = db.collection('expenses')
            .where('hospitalId', '==', user.hospitalId)
            .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
            .where('locationId', '==', user.currentLocation.id);

        const dueUnsubscribe = dueQuery.onSnapshot(snapshot => {
            let totalDue = 0;
            snapshot.forEach(doc => {
                const expense = doc.data() as Expense;
                totalDue += (expense.totalAmount - expense.amountPaid);
            });
            setStats(prev => ({ ...prev, totalDue }));
        }, error => {
            console.error("Error fetching due expenses stats: ", error);
            addToast("Failed to load due expense stats.", "error");
        });

        return () => {
            monthUnsubscribe();
            dueUnsubscribe();
        };
    }, [user, addToast]);


    const handleAddExpense = async (data: NewExpenseData) => {
        await addExpense(data);
        fetchExpenses(true); // Refetch expenses after adding a new one
    };
    
    const handleDeleteRequest = (expense: Expense) => {
        setExpenseToDelete(expense);
    };

    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteExpense(expenseToDelete.id);
            addToast('Expense deleted successfully!', 'success');
            fetchExpenses(true); // Refetch expenses after deleting
        } catch (e) {
            addToast('Failed to delete expense.', 'error');
        } finally {
            setExpenseToDelete(null);
        }
    };

    const pendingExpenses = useMemo(() => expenses.filter(e => e.paymentStatus === 'Unpaid' || e.paymentStatus === 'Partially Paid'), [expenses]);
    const paidExpenses = useMemo(() => expenses.filter(e => e.paymentStatus === 'Paid'), [expenses]);
    const expensesForTab = activeTab === 'Pending' ? pendingExpenses : paidExpenses;

    const displayedExpenses = useMemo(() => {
        if (!searchTerm) return expensesForTab;
        const lowercasedTerm = searchTerm.toLowerCase();
        return expensesForTab.filter(e => 
            e.expenseId.toLowerCase().includes(lowercasedTerm) || 
            e.category.toLowerCase().includes(lowercasedTerm)
        );
    }, [expensesForTab, searchTerm]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <AddExpenseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleAddExpense} />
            {expenseToDelete && <ConfirmationModal isOpen={true} onClose={() => setExpenseToDelete(null)} onConfirm={handleDeleteExpense} title="Delete Expense" message={`Are you sure you want to delete expense ${expenseToDelete.expenseId}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Expenses Today" value={formatCurrency(stats.today, currency)} icon={faFileInvoiceDollar} color="blue" />
                <StatCard title="Expenses this Week" value={formatCurrency(stats.week, currency)} icon={faFileInvoiceDollar} color="yellow" />
                <StatCard title="Expenses this Month" value={formatCurrency(stats.month, currency)} icon={faFileInvoiceDollar} color="green" />
                <StatCard title="Total Due" value={formatCurrency(stats.totalDue, currency)} icon={faMoneyBillWave} color="red" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-800">
                    <nav className="-mb-px flex space-x-8 px-6">
                        {['Pending', 'Paid'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                            {tab} Expenses
                        </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                            <input type="text" placeholder="Search ref or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full sm:w-64 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {user?.permissions.expenses === 'write' && <Button variant="primary" onClick={() => setIsAddModalOpen(true)}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add Expense</Button>}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference No</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Due</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {loading && expenses.length === 0 ? (
                                <tr><td colSpan={7} className="text-center p-6 text-slate-500">Loading expenses...</td></tr>
                            ) : displayedExpenses.length === 0 ? (
                                <tr><td colSpan={7} className="text-center p-6 text-slate-500">No expenses found.</td></tr>
                            ) : (
                                displayedExpenses.map(expense => (
                                    <tr key={expense.id} onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/expenses/${expense.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatTimestamp(expense.date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{expense.expenseId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{expense.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={getStatusBadge(expense.paymentStatus)}>{expense.paymentStatus}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-semibold">{formatCurrency(expense.totalAmount, currency)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-semibold">{formatCurrency(expense.totalAmount - expense.amountPaid, currency)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={e => e.stopPropagation()}>
                                            {user?.permissions.expenses === 'write' && <ExpenseActionsDropdown onView={() => navigate(`/hospitals/${user?.hospitalSlug}/expenses/${expense.id}`)} onDelete={() => handleDeleteRequest(expense)} />}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {hasMore && (
                    <div className="p-4 text-center">
                        <Button onClick={() => fetchExpenses()} disabled={loading}>
                            {loading ? 'Loading...' : 'Load More'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AddExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewExpenseData) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
    const { user, taxGroups, addExpenseCategory, deleteExpenseCategory } = useAuth();
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [subtotal, setSubtotal] = useState('');
    const [taxGroupId, setTaxGroupId] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState('');
    const [note, setNote] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [paymentTerms, setPaymentTerms] = useState('');
    
    // Data for selects
    const [loading, setLoading] = useState(false);
    
    const expenseCategoryOptions = useMemo(() => user?.hospitalExpenseCategories || [], [user?.hospitalExpenseCategories]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);
    
    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setCategory('');
        setSubtotal('');
        setTaxGroupId('');
        setDiscountPercentage('');
        setNote('');
        setDocumentFile(null);
        setIsRecurring(false);
        setRecurringFrequency('monthly');
        setPaymentTerms('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const totalAmount = useMemo(() => {
        const sub = parseFloat(subtotal) || 0;
        const discountPercent = parseFloat(discountPercentage) || 0;
        const selectedTaxGroup = taxGroups.find(g => g.id === taxGroupId);
        const taxRate = selectedTaxGroup ? selectedTaxGroup.totalRate : 0;
        const tax = sub * (taxRate / 100);
        const discount = sub * (discountPercent / 100);
        return sub + tax - discount;
    }, [subtotal, discountPercentage, taxGroupId, taxGroups]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !category || !subtotal) {
            addToast("Please fill all required fields.", "error");
            return;
        }
        setLoading(true);
        try {
            const dataToSave: NewExpenseData = {
                date: new Date(date),
                category,
                subtotal: parseFloat(subtotal),
                note,
                document: documentFile,
                isRecurring,
            };

            if (taxGroupId) {
                dataToSave.taxGroupId = taxGroupId;
            }
            if (discountPercentage) {
                dataToSave.discountPercentage = parseFloat(discountPercentage);
            }
            if (isRecurring) {
                dataToSave.recurringFrequency = recurringFrequency;
            }
            if (paymentTerms) {
                dataToSave.paymentTerms = parseInt(paymentTerms, 10);
            }

            await onSave(dataToSave);
            addToast("Expense added successfully!", "success");
            onClose();
        } catch (error: any) {
            if (error?.message?.startsWith('LIMIT_REACHED')) {
                const resource = error.message.split(':')[1] || 'items';
                addToast(`You've reached the maximum number of ${resource} for your plan. Please upgrade.`, 'error');
            } else {
                addToast(error?.message || "Failed to add expense.", "error");
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleCreateCategory = async (value: string) => { try { await addExpenseCategory(value); addToast(`Category "${value}" created.`, 'success'); } catch (error: any) { addToast(error.message, 'error'); throw error; }};
    const handleDeleteCategory = async (value: string) => {
        try { await deleteExpenseCategory(value); addToast(`Category "${value}" deleted.`, 'success'); if (category === value) setCategory(''); } catch (error: any) { addToast(error.message, 'error'); }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[51] flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h3 className="text-xl font-bold">Add New Expense</h3></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Date*" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                            <CreatableSearchableSelect label="Category*" options={expenseCategoryOptions} value={category} onChange={setCategory} onCreate={handleCreateCategory} onDelete={handleDeleteCategory} placeholder="Search or create..." required />
                        </div>
                        
                        <div className="pt-4 border-t">
                            <h4 className="text-md font-semibold mb-2">Pricing Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <Input label="Subtotal*" type="number" step="0.01" value={subtotal} onChange={e => setSubtotal(e.target.value)} required />
                                <Select label="Tax Group" value={taxGroupId} onChange={e => setTaxGroupId(e.target.value)}>
                                    <option value="">No Tax</option>
                                    {taxGroups.map(group => (
                                        <option key={group.id} value={group.id!}>{group.name} ({group.totalRate.toFixed(2)}%)</option>
                                    ))}
                                </Select>
                                <Input label="Discount (%)" type="number" step="0.01" value={discountPercentage} onChange={e => setDiscountPercentage(e.target.value)} placeholder="e.g., 5" />
                            </div>
                            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg flex justify-between items-center">
                                <span className="font-bold text-lg">Total Amount</span>
                                <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">{formatCurrency(totalAmount, user?.hospitalCurrency)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                             <h4 className="text-md font-semibold mb-2">Optional Details</h4>
                             <div className="space-y-4">
                                <Textarea label="Note" value={note} onChange={e => setNote(e.target.value)} />
                                <FileInput label="Attach Document" onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)} />
                                <Input label="Payment Terms (in days)" type="number" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g., 30" />
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="isRecurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="isRecurring" className="text-sm font-medium">This is a recurring expense</label>
                                </div>
                                {isRecurring && (
                                    <Select label="Frequency" value={recurringFrequency} onChange={e => setRecurringFrequency(e.target.value as any)}>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </Select>
                                )}
                             </div>
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t gap-2">
                        <Button type="button" variant="light" onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchasesScreen;