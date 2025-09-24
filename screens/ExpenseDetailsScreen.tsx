import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Expense, Payment, ExpenseComment, InvoiceTaxComponent, ExpenseUpdateData, TaxGroup } from '../types';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faTrashAlt, faPencilAlt, faPaperPlane, faEllipsisV, faMoneyBillWave, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Avatar from '../components/ui/Avatar';
import Textarea from '../components/ui/Textarea';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import FileInput from '../components/ui/FileInput';
import CreatableSearchableSelect from '../components/ui/CreatableSearchableSelect';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbol = currencySymbols[currencyCode] || '$';
    if(isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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
                await updateExpensePaymentDetails(expense.id, { ...paymentToEdit, amount: parseFloat(amount), method: paymentMethod, note });
                addToast('Payment updated!', 'success');
            } else {
                 await updateExpensePayment(expense.id, { amount: parseFloat(amount), method: paymentMethod, note });
                addToast('Payment recorded!', 'success');
            }
            onSuccess();
        } catch (error) {
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
                    <div className="p-6 border-b"><h3 className="text-xl font-bold">{isEditMode ? 'Edit Payment' : 'Add Payment'}</h3><p className="text-sm text-slate-500">For Expense: {expense.expenseId}</p></div>
                    <div className="p-6 space-y-4">
                        <div className="p-3 text-center bg-blue-50 dark:bg-blue-900/50 rounded-lg"><p className="text-sm text-blue-600">Amount Due</p><p className="text-3xl font-bold text-blue-800">{formatCurrency(amountDue, currency)}</p></div>
                        <Input label={`Amount`} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Other</option></Select>
                        <Input label="Note (Optional)" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    <div className="flex justify-end items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t gap-2"><Button type="button" variant="light" onClick={onClose}>Cancel</Button><Button type="submit" variant="success" disabled={loading}>{loading ? 'Processing...' : (isEditMode ? 'Update' : 'Confirm')}</Button></div>
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
    <div className="relative" ref={ref}><button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" /></button>
      {isOpen && <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10"><div className="py-1">
        <button onClick={onEdit} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> Edit</button>
        <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete</button>
      </div></div>}
    </div>
  );
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, actions, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">{title}</h3>
            {actions}
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end gap-2">{footer}</div>}
    </div>
);


const ExpenseDetailsScreen: React.FC = () => {
    const { expenseId } = useParams<{ expenseId: string }>();
    const navigate = useNavigate();
    const { user, getExpenseById, deleteExpense, addExpenseComment, updateExpenseComment, deleteExpenseComment, deleteExpensePayment, updateExpense, getTaxGroups, addExpenseCategory, deleteExpenseCategory } = useAuth();
    const { addToast } = useToast();
    const [expense, setExpense] = useState<Expense | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
    
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<ExpenseComment | null>(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<ExpenseUpdateData | null>(null);
    const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<string[]>([]);

    const canWrite = user?.permissions.expenses === 'write';
    const currency = user?.hospitalCurrency || 'USD';

    const populateForm = useCallback((exp: Expense) => {
        setFormData({
            date: exp.date.toDate(),
            category: exp.category,
            subtotal: exp.subtotal,
            taxGroupId: exp.taxGroupId || '',
            discountPercentage: exp.discountPercentage || 0,
            note: exp.note || '',
            document: undefined,
            isRecurring: exp.isRecurring || false,
            recurringFrequency: exp.recurringFrequency || 'monthly',
            paymentTerms: exp.paymentTerms || 0
        });
    }, []);

    const fetchData = useCallback(async () => {
        if (!expenseId) return;
        setLoading(true);
        try {
            const [data, taxGroupsData] = await Promise.all([ getExpenseById(expenseId), getTaxGroups() ]);
            if(data) {
                setExpense(data);
                populateForm(data);
            } else {
                addToast("Expense not found.", "error"); navigate(-1);
            }
            setTaxGroups(taxGroupsData);
            setExpenseCategories(user?.hospitalExpenseCategories || []);
        } catch (err) { addToast("Failed to load expense data.", "error");
        } finally { setLoading(false); }
    }, [expenseId, getExpenseById, addToast, navigate, populateForm, getTaxGroups, user]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const handleUpdate = async () => {
        if (!expenseId || !formData) return;
        setActionLoading('update-expense');
        try {
            await updateExpense(expenseId, formData);
            addToast("Expense updated successfully!", "success");
            setIsEditing(false);
            fetchData();
        } catch (error: any) { addToast(error.message || "Failed to update expense.", "error");
        } finally { setActionLoading(null); }
    };
    
    const handleCancelEdit = () => { if (expense) populateForm(expense); setIsEditing(false); };
    const handleCreateCategory = async (value: string) => { try { await addExpenseCategory(value); addToast(`Category "${value}" created.`, 'success'); setExpenseCategories(prev => [...prev, value]); } catch (error: any) { addToast(error.message, 'error'); throw error; } };
    const handleDeleteCategory = async (value: string) => { try { await deleteExpenseCategory(value); addToast(`Category "${value}" deleted.`, 'success'); setExpenseCategories(prev => prev.filter(c => c !== value)); if (formData?.category === value) setFormData({...formData, category: ''}); } catch (error: any) { addToast(error.message, 'error'); } };
    
    const handleDeleteExpense = async () => {
        if (!expenseId || (expense && expense.amountPaid > 0)) {
            addToast("Cannot delete an expense with recorded payments.", "error");
            setConfirmDelete(false);
            return;
        };
        setActionLoading('delete-expense');
        try {
            await deleteExpense(expenseId);
            addToast("Expense deleted.", "success");
            navigate(`/hospitals/${user?.hospitalSlug}/expenses`);
        } catch (error: any) { addToast(error.message || "Failed to delete expense.", "error");
        } finally { setActionLoading(null); setConfirmDelete(false); }
    };

    const handleActionSuccess = () => { fetchData(); setIsPaymentModalOpen(false); };
    
    const handleDeletePayment = async () => {
        if (!expense || !paymentToDelete) return;
        setActionLoading('delete-payment');
        try {
            await deleteExpensePayment(expense.id, paymentToDelete.id);
            addToast("Payment deleted.", "success");
            fetchData();
        } catch(err) { addToast("Failed to delete payment.", "error"); }
        finally { setPaymentToDelete(null); setActionLoading(null); }
    };
    
    const handleAddComment = async () => {
        if (!expense || !newComment.trim()) return;
        setActionLoading('add-comment');
        try {
            await addExpenseComment(expense.id, newComment.trim());
            setNewComment('');
            fetchData();
        } catch (e) { addToast("Failed to post comment.", "error"); }
        finally { setActionLoading(null); }
    };
    
    const handleUpdateComment = async () => {
        if (!expense || !editingComment || !editingComment.text.trim()) return;
        setActionLoading('update-comment');
        try {
            await updateExpenseComment(expense.id, editingComment);
            setEditingComment(null);
            fetchData();
        } catch (e) { addToast("Failed to update comment.", "error"); }
        finally { setActionLoading(null); }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!expense) return;
        setActionLoading(`delete-comment-${commentId}`);
        try {
            await deleteExpenseComment(expense.id, commentId);
            fetchData();
        } catch (e) { addToast("Failed to delete comment.", "error"); }
        finally { setActionLoading(null); }
    };

    const newTotalAmount = useMemo(() => {
        if (!isEditing || !formData) return expense?.totalAmount ?? 0;
        const sub = formData.subtotal || 0;
        const discountPercent = formData.discountPercentage || 0;
        const selectedTaxGroup = taxGroups.find(g => g.id === formData.taxGroupId);
        const taxRate = selectedTaxGroup ? selectedTaxGroup.totalRate : 0;
        const tax = sub * (taxRate / 100);
        const discount = sub * (discountPercent / 100);
        return sub + tax - discount;
    }, [isEditing, formData, taxGroups, expense?.totalAmount]);

    if (loading) return <div className="p-8 text-center">Loading Expense...</div>;
    if (!expense || !formData) return <div className="p-8 text-center">Expense not found.</div>;

    const amountDue = expense.totalAmount - expense.amountPaid;

    return (
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <ManagePaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} expense={expense} paymentToEdit={paymentToEdit} onSuccess={handleActionSuccess} />
            <ConfirmationModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={handleDeleteExpense} title="Delete Expense" message="Are you sure you want to delete this expense record?" confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading === 'delete-expense'} />
            {paymentToDelete && <ConfirmationModal isOpen={true} onClose={() => setPaymentToDelete(null)} onConfirm={handleDeletePayment} title="Delete Payment" message="Are you sure?" confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading === 'delete-payment'} zIndex="z-[53]"/>}

            <div className="lg:col-span-2 space-y-6">
                 <DetailCard 
                    title="Expense Details"
                    actions={canWrite && !isEditing && (
                        <div className="flex items-center gap-2">
                            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={expense.amountPaid > 0} title={expense.amountPaid > 0 ? "Cannot delete an expense with payments" : ""}>Delete</Button>
                            <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2"/>Edit</Button>
                        </div>
                    )}
                    footer={isEditing && canWrite ? (
                        <>
                            <Button variant="light" onClick={handleCancelEdit}>Cancel</Button>
                            <Button onClick={handleUpdate} disabled={!!actionLoading}><FontAwesomeIcon icon={faSave} className="mr-2"/>{actionLoading === 'update-expense' ? 'Saving...' : 'Save Changes'}</Button>
                        </>
                    ) : undefined}
                >
                     <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {isEditing ? (<>
                                <CreatableSearchableSelect label="Category*" options={expenseCategories} value={formData.category} onChange={val => setFormData({...formData, category: val})} onCreate={handleCreateCategory} onDelete={handleDeleteCategory} placeholder="Search or create..." required />
                                <Input label="Expense Date*" type="date" value={formData.date.toISOString().split('T')[0]} onChange={e => setFormData({...formData, date: new Date(e.target.value)})} />
                                <Input label="Payment Terms (days)" type="number" value={formData.paymentTerms || ''} onChange={e => setFormData({...formData, paymentTerms: parseInt(e.target.value) || 0})} />
                            </>) : (<>
                                <div><p className="text-sm text-slate-500">Category</p><p className="font-bold text-xl text-slate-800 dark:text-slate-200">{expense.category}</p></div>
                                <div><p className="text-sm text-slate-500">Expense Date</p><p className="font-semibold text-slate-700 dark:text-slate-300">{expense.date.toDate().toLocaleDateString()}</p></div>
                                <div><p className="text-sm text-slate-500">Payment Terms</p><p className="font-semibold text-slate-700 dark:text-slate-300">{expense.paymentTerms ? `${expense.paymentTerms} days` : 'N/A'}</p></div>
                            </>)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isEditing ? (<>
                                <Textarea label="Note" value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} rows={3}/>
                                <div className="space-y-2">
                                     <div className="flex items-center gap-2 pt-1"><input type="checkbox" id="isRecurring" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} className="h-4 w-4" /><label htmlFor="isRecurring">Recurring Expense</label></div>
                                    {formData.isRecurring && <Select label="Frequency" value={formData.recurringFrequency} onChange={e => setFormData({...formData, recurringFrequency: e.target.value as any})}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select>}
                                </div>
                            </>) : (<>
                                <div><p className="text-sm text-slate-500">Note</p><p className="text-slate-700 dark:text-slate-300">{expense.note || 'No note.'}</p></div>
                                <div><p className="text-sm text-slate-500">Recurring</p><p className="font-semibold text-slate-700 dark:text-slate-300">{expense.isRecurring ? `Yes, ${expense.recurringFrequency}` : 'No'}</p></div>
                            </>)}
                        </div>
                        <div className="pt-4 border-t">
                            {isEditing ? (
                                <div>
                                    <FileInput label="Change Document" onChange={(e) => setFormData({...formData, document: e.target.files ? e.target.files[0] : undefined})} />
                                    {(expense.documentUrl || formData.document) && <Button variant="ghost" size="sm" className="text-red-500 mt-1" onClick={() => setFormData({...formData, document: null})}>Remove Document</Button>}
                                </div>
                            ) : ( expense.documentUrl && <div className="flex justify-between items-center"><p><strong>Attachment:</strong> {expense.documentName}</p><a href={expense.documentUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="light">View</Button></a></div> )}
                        </div>
                    </div>
                 </DetailCard>
                 <DetailCard title={`Comments (${expense.comments?.length || 0})`}>
                    <div className="space-y-4">
                        {canWrite && <div className="flex items-start gap-4"><Avatar avatar={user?.profilePhotoUrl ? { type: 'image', value: user.profilePhotoUrl } : { type: 'initials', value: user?.name.split(' ').map(n => n[0]).join('') || '?', color: 'bg-blue-600' }} /><div className="flex-1">
                            <Textarea label="" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." rows={2} />
                            <div className="text-right mt-2"><Button onClick={handleAddComment} disabled={!newComment.trim() || !!actionLoading}><FontAwesomeIcon icon={faPaperPlane} className="mr-2" />{actionLoading === 'add-comment' ? 'Posting...' : 'Post'}</Button></div>
                        </div></div>}
                        <div className="space-y-4 pt-4 border-t">{(expense.comments || []).sort((a,b) => b.createdAt.seconds - a.createdAt.seconds).map(comment => {
                            const canEditComment = user?.uid === comment.userId;
                            return (<div key={comment.id} className="flex items-start gap-4"><Avatar avatar={comment.userProfilePhotoUrl ? { type: 'image', value: comment.userProfilePhotoUrl } : { type: 'initials', value: comment.userName.split(' ').map(n=>n[0]).join(''), color: 'bg-indigo-500' }} /><div className="flex-1">
                                <div className="group bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-start"><p className="font-semibold text-slate-800">{comment.userName}</p>{canWrite && canEditComment && !editingComment && <div className="opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="sm" onClick={() => setEditingComment(comment)}><FontAwesomeIcon icon={faPencilAlt} /></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteComment(comment.id)}><FontAwesomeIcon icon={faTrashAlt} className="text-red-500" /></Button></div>}</div>
                                    <p className="text-xs text-slate-500">{comment.createdAt.toDate().toLocaleString()} {comment.updatedAt && '(edited)'}</p>
                                    {editingComment?.id === comment.id ? (<div className="mt-2 w-full">
                                        <Textarea label="" value={editingComment.text} onChange={e => setEditingComment({...editingComment, text: e.target.value})} rows={3} />
                                        <div className="flex gap-2 mt-2"><Button size="sm" onClick={handleUpdateComment} disabled={actionLoading === 'update-comment'}>{actionLoading === 'update-comment' ? 'Saving...' : 'Save'}</Button><Button size="sm" variant="light" onClick={() => setEditingComment(null)}>Cancel</Button></div>
                                    </div>) : (<p className="mt-1 text-slate-700 whitespace-pre-wrap">{comment.text}</p>)}
                                </div>
                            </div></div>);
                        })}</div>
                    </div>
                </DetailCard>
            </div>
            
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-2">
                    {isEditing ? ( <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Subtotal*" type="number" step="0.01" value={formData.subtotal} onChange={e => setFormData({...formData, subtotal: parseFloat(e.target.value) || 0})} required />
                            <Select label="Tax Group" value={formData.taxGroupId || ''} onChange={e => setFormData({...formData, taxGroupId: e.target.value || null})}> <option value="">No Tax</option> {taxGroups.map(group => <option key={group.id} value={group.id!}>{group.name} ({group.totalRate.toFixed(2)}%)</option>)} </Select>
                            <Input label="Discount (%)" type="number" step="0.01" value={formData.discountPercentage || ''} onChange={e => setFormData({...formData, discountPercentage: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div className="mt-4 p-4 bg-slate-100 rounded-lg flex justify-between items-center"><span className="font-bold text-lg">New Total</span><span className="font-bold text-2xl text-blue-600">{formatCurrency(newTotalAmount, currency)}</span></div>
                    </>) : (<>
                        <div className="flex justify-between text-slate-600"><p>Subtotal</p><p>{formatCurrency(expense.subtotal, currency)}</p></div>
                        {(expense.taxes || []).map((tax, i) => <div key={i} className="flex justify-between text-slate-600"><p>{tax.name} ({tax.rate}%)</p><p>+ {formatCurrency(tax.amount, currency)}</p></div>)}
                        {expense.discountPercentage > 0 && <div className="flex justify-between text-green-600"><p>Discount ({expense.discountPercentage}%)</p><p>- {formatCurrency(expense.discountAmount, currency)}</p></div>}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t"><p>Total</p><p>{formatCurrency(expense.totalAmount, currency)}</p></div>
                    </>)}

                    <div className="flex justify-between text-green-600"><p>Paid</p><p>- {formatCurrency(expense.amountPaid, currency)}</p></div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t text-red-600"><p>Amount Due</p><p>{formatCurrency(amountDue, currency)}</p></div>
                </div>

                 {canWrite && amountDue > 0 && !isEditing && <Button className="w-full" variant="success" onClick={() => { setPaymentToEdit(null); setIsPaymentModalOpen(true); }}><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2"/> Add Payment</Button>}
                
                <DetailCard title="Payment History">
                     <div className="space-y-2">
                        {(expense.paymentHistory || []).map(p => (<div key={p.id} className="group text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md flex justify-between items-start"><div className="flex-1">
                            <div className="flex items-center font-medium"><span>{p.method} on {p.date.toDate().toLocaleDateString()}</span><span className="ml-4 font-bold text-base">{formatCurrency(p.amount, currency)}</span></div>
                            {p.note && <p className="mt-1 text-slate-500 italic">Note: {p.note}</p>}
                             {p.recordedBy && <p className="mt-1 text-xs text-slate-500">Recorded by {p.recordedBy}</p>}
                        </div>{canWrite && <div className="opacity-0 group-hover:opacity-100 transition-opacity"><PaymentActionsDropdown onEdit={() => { setPaymentToEdit(p); setIsPaymentModalOpen(true); }} onDelete={() => setPaymentToDelete(p)} /></div>}</div>))}
                        {(expense.paymentHistory || []).length === 0 && <p className="text-sm text-center p-4 text-slate-500">No payments recorded.</p>}
                    </div>
                </DetailCard>
            </div>
        </div>
    );
};

export default ExpenseDetailsScreen;
