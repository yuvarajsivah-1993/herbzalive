


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Invoice, InvoiceStatus, Payment, DoctorDocument, PatientDocument } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar, faSearch, faDownload, faEllipsisV, faTimes, faChevronRight, faMoneyBillWave, faShieldAlt, faInfoCircle, faPencilAlt, faTrashAlt, faPrint, faFileInvoice, faStethoscope } from '@fortawesome/free-solid-svg-icons';
import { Timestamp } from 'firebase/firestore';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useLocation, useNavigate } from 'react-router-dom';
import Pagination from '../components/ui/Pagination';
import DateRangePicker from '../components/ui/DateRangePicker';
import { db } from '../services/firebase';

const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
};

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        amount = 0;
    }
    const symbol = currencySymbols[currencyCode] || '$';
    const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `${symbol}${formattedAmount}`;
};


const StatCard: React.FC<{ title: string; value: string; icon: any }> = ({ title, value, icon }) => (
    <Card className="p-6">
        <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center h-12 w-12">
                <FontAwesomeIcon icon={icon} className="h-6 w-6" />
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </Card>
);

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
    invoice: Invoice;
    paymentToEdit: Payment | null;
    onSuccess: () => void;
}> = ({ isOpen, onClose, invoice, paymentToEdit, onSuccess }) => {
    const { user, updateInvoicePayment, updateInvoicePaymentDetails } = useAuth();
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
                const amountDue = invoice.totalAmount - invoice.amountPaid;
                setAmount(amountDue > 0 ? amountDue.toFixed(2) : '0.00');
                setPaymentMethod('Cash');
                setNote('');
            }
        }
    }, [isOpen, isEditMode, paymentToEdit, invoice]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode && paymentToEdit) {
                await updateInvoicePaymentDetails(invoice.id, {
                    ...paymentToEdit,
                    amount: parseFloat(amount),
                    method: paymentMethod,
                    note,
                });
                addToast('Payment updated successfully!', 'success');
            } else {
                 await updateInvoicePayment(invoice.id, {
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
    
    const amountDue = invoice.totalAmount - invoice.amountPaid + (isEditMode && paymentToEdit ? paymentToEdit.amount : 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[51] flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold">{isEditMode ? 'Edit Payment' : 'Receive Payment'}</h3>
                        <p className="text-sm text-slate-500">For Invoice: {invoice.invoiceId}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="p-3 text-center bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-300">Amount Due</p>
                            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(amountDue, currency)}</p>
                        </div>
                        <Input label={`Amount to ${isEditMode ? 'Update' : 'Pay'}`} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option>Cash</option>
                            <option>Credit Card</option>
                            <option>Google Pay</option>
                            <option>Paytm</option>
                            <option>PhonePe</option>
                            <option>Bank Transfer</option>
                            <option>Other</option>
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

const PaymentActionsDropdown: React.FC<{
  onEdit: () => void;
  onDelete: () => void;
}> = ({ onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
        <FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <button onClick={onEdit} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> Edit
            </button>
            <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700">
              <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


const InvoiceModal: React.FC<{
    invoice: Invoice | null;
    onClose: () => void;
    onPaymentSuccess: () => void;
}> = ({ invoice, onClose, onPaymentSuccess }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { user, deleteInvoicePayment, setInvoiceToPrint } = useAuth();
    const { addToast } = useToast();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

    const canWrite = user?.permissions.sales === 'write';
    const currency = user?.hospitalCurrency || 'USD';

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (isPaymentModalOpen || paymentToDelete) return;
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (invoice) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [invoice, onClose, isPaymentModalOpen, paymentToDelete]);
    
    const handleDeletePayment = async () => {
        if (!invoice || !paymentToDelete) return;
        try {
            await deleteInvoicePayment(invoice.id, paymentToDelete.id);
            addToast("Payment deleted successfully.", "success");
            onPaymentSuccess();
        } catch (err) {
            addToast("Failed to delete payment.", "error");
        } finally {
            setPaymentToDelete(null);
        }
    };


    if (!invoice) return null;

    const amountDue = invoice.totalAmount - invoice.amountPaid;

    const getItemIcon = (desc: string) => {
        const lowerDesc = desc.toLowerCase();
        if (lowerDesc.includes('consult')) return faStethoscope;
        return faInfoCircle;
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-10 overflow-y-auto">
            <ManagePaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setIsPaymentModalOpen(false)} 
                invoice={invoice} 
                paymentToEdit={paymentToEdit}
                onSuccess={() => { setIsPaymentModalOpen(false); onPaymentSuccess(); }} 
            />
            {paymentToDelete && (
                <ConfirmationModal
                    zIndex="z-[52]"
                    isOpen={true}
                    onClose={() => setPaymentToDelete(null)}
                    onConfirm={handleDeletePayment}
                    title="Delete Payment"
                    message={`Are you sure you want to delete this payment of ${formatCurrency(paymentToDelete.amount, currency)}? This action cannot be undone.`}
                    confirmButtonText="Delete"
                    confirmButtonVariant="danger"
                />
            )}
            <div ref={modalRef} className="bg-slate-50 dark:bg-slate-950 rounded-lg shadow-xl w-full max-w-2xl m-4 transform transition-all">
                <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-t-lg">
                    <h2 className="text-lg font-bold">Bill ID #{invoice.invoiceId}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="light" onClick={() => setInvoiceToPrint({ invoice, type: 'Treatment' })}>
                            <FontAwesomeIcon icon={faPrint} className="mr-2"/>Print
                        </Button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faTimes} /></button>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs uppercase text-slate-500 font-semibold">BILL TO</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{invoice.patientName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase text-slate-500 font-semibold">BILL DATE</p>
                            <p className="text-slate-700 dark:text-slate-300">{formatTimestamp(invoice.createdAt)}</p>
                            <div className="mt-2"><span className={getStatusBadge(invoice.status)}>{invoice.status}</span></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                        {invoice.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0">
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={getItemIcon(item.description)} className="text-blue-500 mr-3" />
                                    <span>{item.description}</span>
                                </div>
                                <span className="font-semibold">{formatCurrency(item.cost, currency)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                         <div className="flex justify-between text-slate-600 dark:text-slate-400"><p>Subtotal</p><p>{formatCurrency(invoice.subtotal, currency)}</p></div>
                         {(invoice.taxes || []).map((tax, index) => (
                            <div key={index} className="flex justify-between text-slate-600 dark:text-slate-400">
                                <p>{tax.name} ({tax.rate}%)</p>
                                <p>{formatCurrency(tax.amount, currency)}</p>
                            </div>
                         ))}
                         <div className="flex justify-between font-bold text-lg text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2"><p>Total</p><p>{formatCurrency(invoice.totalAmount, currency)}</p></div>
                         <div className="flex justify-between text-green-600 dark:text-green-400"><p>Paid</p><p>- {formatCurrency(invoice.amountPaid, currency)}</p></div>
                         <div className="flex justify-between font-bold text-lg text-red-600 dark:text-red-400 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2"><p>Amount Due</p><p>{formatCurrency(amountDue, currency)}</p></div>
                    </div>
                    
                    {(invoice.paymentHistory || []).length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                            <div className="space-y-2">
                                {invoice.paymentHistory.map((p, i) => (
                                    <div key={p.id || i} className="group text-xs p-3 bg-slate-100 dark:bg-slate-800 rounded-md flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center font-medium">
                                                <span>{p.method} on {formatTimestamp(p.date)}</span>
                                                <span className="ml-4 font-bold text-base">{formatCurrency(p.amount, currency)}</span>
                                            </div>
                                            {p.note && <p className="mt-1 text-slate-500 dark:text-slate-400 italic">Note: {p.note}</p>}
                                            {p.recordedBy && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recorded by {p.recordedBy}</p>}
                                        </div>
                                        {p.id && canWrite && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PaymentActionsDropdown
                                                    onEdit={() => { setPaymentToEdit(p); setIsPaymentModalOpen(true); }}
                                                    onDelete={() => setPaymentToDelete(p)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-green-500 mr-2" />
                        All your transactions are secure and fast.
                    </div>
                    
                    {invoice.status !== 'Paid' && canWrite && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                            <h4 className="font-semibold text-sm mb-3">RECEIVE PAYMENT</h4>
                            <div className="space-y-2">
                                <button onClick={() => { setPaymentToEdit(null); setIsPaymentModalOpen(true); }} className="w-full flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:ring-1 hover:ring-blue-500">
                                    <div className="flex items-center"><FontAwesomeIcon icon={faMoneyBillWave} className="mr-3 text-green-500" /><span>Record a Payment</span></div>
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SalesScreen: React.FC = () => {
    const { user, getDoctors, getPatients, setInvoiceToPrint, currentLocation } = useAuth();
    const { addToast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [doctors, setDoctors] = useState<DoctorDocument[]>([]);
    const [patients, setPatients] = useState<PatientDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ today: 0, week: 0, month: 0, due: 0 });
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    // Filters
    const [doctorFilter, setDoctorFilter] = useState('all');
    const [patientFilter, setPatientFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<InvoiceStatus | 'all' | 'pending'>('all');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const currency = user?.hospitalCurrency || 'USD';
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState<Date>(startOfMonth);
    const [endDate, setEndDate] = useState<Date>(today);
    
    useEffect(() => {
        getDoctors().then(setDoctors);
        getPatients().then(setPatients);
    }, [getDoctors, getPatients]);

    useEffect(() => {
        if (!user || !currentLocation) {
            setStats({ today: 0, week: 0, month: 0, due: 0 });
            return;
        }
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const statsUnsubscribe = db.collection('invoices')
            .where('hospitalId', '==', user.hospitalId)
            .where('locationId', '==', currentLocation.id)
            .where('createdAt', '>=', monthStart)
            .onSnapshot(snapshot => {
                const monthInvoices = snapshot.docs.map(doc => doc.data() as Invoice);
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekStart = new Date(now);
                const dayOfWeek = weekStart.getDay();
                const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                weekStart.setDate(diff); weekStart.setHours(0,0,0,0);
                
                let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
                monthInvoices.forEach(inv => {
                    const invDate = inv.createdAt.toDate();
                    monthRevenue += inv.totalAmount;
                    if (invDate >= weekStart) weekRevenue += inv.totalAmount;
                    if (invDate >= todayStart) todayRevenue += inv.totalAmount;
                });
                setStats(prev => ({...prev, today: todayRevenue, week: weekRevenue, month: monthRevenue}));
            });
            
        const dueUnsubscribe = db.collection('invoices').where('hospitalId', '==', user.hospitalId)
            .where('locationId', '==', currentLocation.id)
            .where('status', 'in', ['Unpaid', 'Partially Paid'])
            .onSnapshot(snapshot => {
                const totalDue = snapshot.docs
                    .map(doc => doc.data() as Invoice)
                    .reduce((sum, inv) => sum + (inv.totalAmount - inv.amountPaid), 0);
                setStats(prev => ({...prev, due: totalDue}));
            });

        return () => {
            statsUnsubscribe();
            dueUnsubscribe();
        }
    }, [user, currentLocation]);

    useEffect(() => {
        if (!user || !currentLocation) {
            setInvoices([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        const q = db.collection('invoices')
            .where('hospitalId', '==', user.hospitalId)
            .where('locationId', '==', currentLocation.id)
            .where('createdAt', '>=', startDate)
            .where('createdAt', '<=', endOfDay);
        
        const unsubscribe = q.onSnapshot(snapshot => {
            const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            invoicesData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
            setInvoices(invoicesData);
            setLoading(false);
        }, err => {
            console.error("Error listening to invoices:", err);
            addToast("Failed to load sales data.", "error");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, startDate, endDate, addToast, currentLocation]);

     useEffect(() => {
        const { openInvoiceForAppointmentId } = location.state || {};
        if (openInvoiceForAppointmentId && user?.hospitalId) {
            const findAndOpenInvoice = async () => {
                const q = db.collection('invoices')
                    .where('hospitalId', '==', user.hospitalId)
                    .where('appointmentId', '==', openInvoiceForAppointmentId)
                    .limit(1);
    
                try {
                    const snapshot = await q.get();
                    if (!snapshot.empty) {
                        const invoiceDoc = snapshot.docs[0];
                        setSelectedInvoice({ id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice);
                        navigate('.', { state: {}, replace: true });
                    } else {
                        // It might take a moment for the invoice to be created after consultation. Retry once.
                        setTimeout(async () => {
                            const retrySnapshot = await q.get();
                            if (!retrySnapshot.empty) {
                                 const invoiceDoc = retrySnapshot.docs[0];
                                 setSelectedInvoice({ id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice);
                                 navigate('.', { state: {}, replace: true });
                            } else {
                                addToast("Could not find the invoice for that appointment.", "warning");
                                navigate('.', { state: {}, replace: true });
                            }
                        }, 1500);
                    }
                } catch (error) {
                    console.error("Error finding invoice by appointment ID:", error);
                    addToast("An error occurred while fetching the invoice.", "error");
                    navigate('.', { state: {}, replace: true });
                }
            };
            findAndOpenInvoice();
        }
    }, [location.state, user, navigate, addToast]);

    const filteredInvoices = useMemo(() => {
        return invoices
            .filter(invoice => {
                if (paymentStatusFilter === 'all') return true;
                if (paymentStatusFilter === 'pending') return invoice.status === 'Unpaid' || invoice.status === 'Partially Paid';
                return invoice.status === paymentStatusFilter;
            })
            .filter(invoice => {
                if (doctorFilter === 'all') return true;
                const doctor = doctors.find(d => d.id === doctorFilter);
                return doctor ? invoice.doctorName === doctor.name : false;
            })
            .filter(invoice => {
                if (patientFilter === 'all') return true;
                return invoice.patientId === patientFilter;
            })
            .filter(invoice => {
                if (!searchTerm) return true;
                const lowercasedTerm = searchTerm.toLowerCase();
                return invoice.patientName.toLowerCase().includes(lowercasedTerm) || 
                       invoice.invoiceId.toLowerCase().includes(lowercasedTerm);
            });
    }, [invoices, searchTerm, paymentStatusFilter, doctorFilter, patientFilter, doctors]);

    const totalPages = useMemo(() => Math.ceil(filteredInvoices.length / itemsPerPage), [filteredInvoices.length, itemsPerPage]);
    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredInvoices, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, paymentStatusFilter, doctorFilter, patientFilter, startDate, endDate]);
    
    if (!currentLocation) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <FontAwesomeIcon icon={faFileInvoice} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Location Selected</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Please select a hospital location from the header to view and manage sales.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onPaymentSuccess={async () => { 
                if (selectedInvoice) {
                    const q = db.collection('invoices').doc(selectedInvoice.id);
                    const doc = await q.get();
                    if(doc.exists) {
                        setSelectedInvoice({ id: doc.id, ...doc.data() } as Invoice);
                    } else {
                        setSelectedInvoice(null);
                    }
                }
             }}/>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Revenue Today" value={formatCurrency(stats.today, currency)} icon={faFileInvoiceDollar} />
                <StatCard title="Revenue this Week" value={formatCurrency(stats.week, currency)} icon={faFileInvoiceDollar} />
                <StatCard title="Revenue this Month" value={formatCurrency(stats.month, currency)} icon={faFileInvoiceDollar} />
                <StatCard title="Total Dues" value={formatCurrency(stats.due, currency)} icon={faFileInvoice} />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <Input label="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Patient or Invoice ID..." icon={<FontAwesomeIcon icon={faSearch}/>}/>
                        <Select label="Doctor" value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}>
                            <option value="all">All Doctors</option>
                            {doctors.map(d => <option key={d.id} value={d.id!}>{d.name}</option>)}
                        </Select>
                        <Select label="Patient" value={patientFilter} onChange={e => setPatientFilter(e.target.value)}>
                            <option value="all">All Patients</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <div className="md:col-span-2">
                             <DateRangePicker 
                                value={{ start: startDate, end: endDate }} 
                                onChange={({start, end}) => { setStartDate(start); setEndDate(end); }}
                            />
                        </div>
                        <Select label="Payment Status" value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value as any)}>
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Partially Paid">Partially Paid</option>
                        </Select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Consultant</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Grand Total</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center p-6 text-slate-500">Loading invoices...</td></tr>
                            ) : paginatedInvoices.length === 0 ? (
                                <tr><td colSpan={7} className="text-center p-6 text-slate-500">No invoices found for the selected filters.</td></tr>
                            ) : (
                                paginatedInvoices.map(invoice => (
                                    <tr key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{invoice.invoiceId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{invoice.patientName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{invoice.doctorName || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatTimestamp(invoice.createdAt)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-semibold">{formatCurrency(invoice.totalAmount, currency)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={getStatusBadge(invoice.status)}>{invoice.status}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                                <FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                 <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                    totalItems={filteredInvoices.length}
                    itemsOnPage={paginatedInvoices.length}
                />
            </div>
        </div>
    );
};

export default SalesScreen;
