// screens/payroll/LoanDetailsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loan, LoanStatus, LoanRepayment } from '../../types';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faPause, faPlay, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const LoanStatusBadge: React.FC<{ status: LoanStatus }> = ({ status }) => {
    const config = {
        'active': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'paused': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'closed': 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
        'pending': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    }[status];
    return <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full uppercase ${config}`}>{status}</span>;
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, actions, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            {actions && <div>{actions}</div>}
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end gap-2">{footer}</div>}
    </div>
);

const LoanDetailsScreen: React.FC = () => {
    const { loanId } = useParams<{ loanId: string }>();
    const navigate = useNavigate();
    const { user, getLoanById, updateLoanStatus } = useAuth();
    const { addToast } = useToast();

    const [loan, setLoan] = useState<Loan | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ action: LoanStatus, message: string } | null>(null);

    const fetchData = useCallback(async () => {
        if (!loanId) return;
        setLoading(true);
        try {
            const data = await getLoanById(loanId);
            if (data) {
                setLoan(data);
            } else {
                addToast("Loan not found.", "error");
                navigate(-1);
            }
        } catch (e) {
            addToast("Failed to load loan data.", "error");
        } finally {
            setLoading(false);
        }
    }, [loanId, getLoanById, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateStatus = async () => {
        if (!loanId || !confirmAction) return;
        setActionLoading(true);
        try {
            await updateLoanStatus(loanId, confirmAction.action);
            addToast(`Loan status updated to ${confirmAction.action}.`, "success");
            fetchData();
        } catch (err: any) {
            addToast(err.message || 'Failed to update status', 'error');
        } finally {
            setActionLoading(false);
            setConfirmAction(null);
        }
    };

    const schedule = useMemo(() => {
        if (!loan) return [];
        const repaymentSchedule = [];
        const startDate = loan.repaymentStartDate.toDate();
        let balance = loan.loanAmount;

        for (let i = 0; i < loan.installmentPeriod; i++) {
            const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
            const installmentAmount = Math.min(loan.installmentAmount, balance);
            
            repaymentSchedule.push({
                installment: i + 1,
                dueDate,
                amount: installmentAmount,
                status: balance > (loan.loanAmount - loan.amountPaid) ? 'Paid' : 'Unpaid'
            });
            balance -= installmentAmount;
            if (balance <= 0) break;
        }
        return repaymentSchedule;
    }, [loan]);


    if (loading) return <div className="p-8 text-center">Loading loan details...</div>;
    if (!loan) return <div className="p-8 text-center">Could not load loan details.</div>;
    
    const balance = loan.loanAmount - loan.amountPaid;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            {confirmAction && (
                <ConfirmationModal 
                    isOpen={true} 
                    onClose={() => setConfirmAction(null)} 
                    onConfirm={handleUpdateStatus} 
                    title={`Confirm Action: ${confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)} Loan`} 
                    message={confirmAction.message}
                    confirmButtonText="Confirm"
                    loading={actionLoading}
                />
            )}
            <div className="flex justify-between items-center">
                <Button variant="light" onClick={() => navigate(-1)}><FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back</Button>
                <div>
                    {loan.status === 'active' && <Button onClick={() => setConfirmAction({ action: 'paused', message: "Pausing will stop deductions in upcoming payrolls. Are you sure?"})}><FontAwesomeIcon icon={faPause} className="mr-2"/>Pause</Button>}
                    {loan.status === 'paused' && <Button onClick={() => setConfirmAction({ action: 'active', message: "Resuming will restart deductions in the next payroll. Are you sure?"})}><FontAwesomeIcon icon={faPlay} className="mr-2"/>Resume</Button>}
                    {loan.status !== 'closed' && <Button onClick={() => setConfirmAction({ action: 'closed', message: "Closing the loan will mark it as complete and stop all future deductions. This cannot be undone."})} className="ml-2"><FontAwesomeIcon icon={faCheck} className="mr-2"/>Close Loan</Button>}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 text-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{loan.employeeName}</h2>
                <p className="text-slate-500 dark:text-slate-400">{loan.loanType} - {loan.loanId}</p>
                <div className="mt-4"><LoanStatusBadge status={loan.status} /></div>
            </div>

            <DetailCard title="Loan Summary">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loan Amount</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(loan.loanAmount, user?.hospitalCurrency)}</p>
                    </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Paid</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(loan.amountPaid, user?.hospitalCurrency)}</p>
                    </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Balance</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(balance, user?.hospitalCurrency)}</p>
                    </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Installment</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(loan.installmentAmount, user?.hospitalCurrency)}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-700 dark:text-slate-300">
                    <p><strong>Disbursed on:</strong> {loan.disbursementDate.toDate().toLocaleDateString()}</p>
                    <p><strong>Repayment starts:</strong> {loan.repaymentStartDate.toDate().toLocaleDateString()}</p>
                    <p><strong>Period:</strong> {loan.installmentPeriod} months</p>
                </div>
                {loan.reason && <p className="mt-4 text-sm text-slate-700 dark:text-slate-300"><strong>Reason:</strong> {loan.reason}</p>}
            </DetailCard>
            
            <DetailCard title="Repayment Schedule">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">#</th>
                                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Due Date</th>
                                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Installment Amount</th>
                                <th className="p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {schedule.map(item => (
                                <tr key={item.installment}>
                                    <td className="p-3 text-slate-700 dark:text-slate-300">{item.installment}</td>
                                    <td className="p-3 text-slate-700 dark:text-slate-300">{item.dueDate.toLocaleDateString()}</td>
                                    <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.amount, user?.hospitalCurrency)}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DetailCard>

        </div>
    );
};

export default LoanDetailsScreen;
