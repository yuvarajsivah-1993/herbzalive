// screens/payroll/LoansTab.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Loan, NewLoanData, Employee, LoanStatus } from '../../types';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import Pagination from '../../components/ui/Pagination';
import { useNavigate } from 'react-router-dom';
import { SearchableOption, SearchableSelect } from '../ReservationsScreen';
import Textarea from '../../components/ui/Textarea';

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

const AddLoanModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewLoanData) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
    const { user, getEmployees } = useAuth();
    const { addToast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<Partial<NewLoanData>>({
        loanType: 'Personal Loan',
        loanAmount: 0,
        installmentPeriod: 12,
        installmentAmount: 0,
    });
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    useEffect(() => {
        if (isOpen) {
            getEmployees().then(data => setEmployees(data.filter(e => e.status === 'active')));
        }
    }, [isOpen, getEmployees]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (formData.loanAmount && formData.installmentPeriod && formData.installmentPeriod > 0) {
            const installment = formData.loanAmount / formData.installmentPeriod;
            setFormData(prev => ({ ...prev, installmentAmount: parseFloat(installment.toFixed(2)) }));
        }
    }, [formData.loanAmount, formData.installmentPeriod]);
    
    const employeeOptions = useMemo((): SearchableOption[] => employees.map(e => ({ value: e.id!, label: e.name, secondaryLabel: e.employeeId })), [employees]);

    const handleEmployeeSelect = (id: string) => {
        handleChange('employeeId', id);
        setSelectedEmployee(employees.find(e => e.id === id) || null);
    };
    
    const handleChange = (field: keyof NewLoanData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const eligibility = useMemo(() => {
        if (!selectedEmployee || !formData.installmentAmount) return null;
        const monthlyCTC = selectedEmployee.annualCTC / 12;
        const isEligible = formData.installmentAmount <= monthlyCTC * 0.5; // 50% of monthly salary rule
        return {
            isEligible,
            monthlyCTC,
            maxInstallment: monthlyCTC * 0.5,
        };
    }, [selectedEmployee, formData.installmentAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId || !formData.loanAmount || !formData.installmentPeriod || !formData.disbursementDate || !formData.repaymentStartDate) {
            addToast("Please fill all required fields.", "error");
            return;
        }
        if (eligibility && !eligibility.isEligible) {
            addToast("Installment amount exceeds 50% of the employee's monthly salary.", "error");
            return;
        }
        setLoading(true);
        try {
            await onSave(formData as NewLoanData);
            addToast("Loan added successfully!", "success");
            onClose();
        } catch (err: any) {
            addToast(err.message || 'Failed to save loan', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl m-4 flex flex-col h-[95vh]">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-4 border-b"><h2 className="text-xl font-bold">New Loan</h2></div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-4">
                        <SearchableSelect label="Employee*" options={employeeOptions} value={formData.employeeId || ''} onChange={handleEmployeeSelect} placeholder="Select an employee" required/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select label="Loan Type*" value={formData.loanType} onChange={e => handleChange('loanType', e.target.value)} required>
                                <option>Personal Loan</option>
                                <option>Salary Advance</option>
                                <option>Emergency Loan</option>
                                <option>Other</option>
                            </Select>
                            <Input label="Loan Amount*" type="number" value={formData.loanAmount} onChange={e => handleChange('loanAmount', parseFloat(e.target.value))} required/>
                            <Input label="Disbursement Date*" type="date" value={formData.disbursementDate} onChange={e => handleChange('disbursementDate', e.target.value)} required/>
                            <Input label="Repayments Start Date*" type="date" value={formData.repaymentStartDate} onChange={e => handleChange('repaymentStartDate', e.target.value)} required/>
                            <Input label="Installment Period (months)*" type="number" value={formData.installmentPeriod} onChange={e => handleChange('installmentPeriod', parseInt(e.target.value))} required/>
                            <Input label="Installment Amount*" type="number" value={formData.installmentAmount} onChange={e => handleChange('installmentAmount', parseFloat(e.target.value))} required/>
                        </div>
                        <Textarea label="Reason" value={formData.reason} onChange={e => handleChange('reason', e.target.value)} />

                        {eligibility && (
                            <div className={`p-4 rounded-lg border ${eligibility.isEligible ? 'bg-green-50 border-green-200 dark:bg-green-900/50 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/50 dark:border-red-800'}`}>
                                <h4 className={`font-semibold ${eligibility.isEligible ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{eligibility.isEligible ? 'Eligibility Check: Passed' : 'Eligibility Check: Failed'}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Employee Monthly Salary: {formatCurrency(eligibility.monthlyCTC, user?.hospitalCurrency)}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Max Recommended Installment (50%): {formatCurrency(eligibility.maxInstallment, user?.hospitalCurrency)}</p>
                                <p className={`text-sm font-bold ${eligibility.isEligible ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                    Current Installment: {formatCurrency(formData.installmentAmount || 0, user?.hospitalCurrency)}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end p-4 bg-slate-50 dark:bg-slate-950/50 border-t gap-2 flex-shrink-0">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Loan'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LoansTab: React.FC = () => {
    const { user, getLoans, addLoan } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            setLoans(await getLoans());
        } catch (e) {
            addToast("Failed to load loans.", "error");
        } finally {
            setLoading(false);
        }
    }, [getLoans, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveLoan = async (data: NewLoanData) => {
        await addLoan(data);
        fetchData();
    };

    const filteredLoans = useMemo(() => {
        return loans
            .filter(l => statusFilter === 'all' || l.status === statusFilter)
            .filter(l => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return l.employeeName.toLowerCase().includes(term) || l.loanId.toLowerCase().includes(term);
            });
    }, [loans, searchTerm, statusFilter]);

    const totalPages = useMemo(() => Math.ceil(filteredLoans.length / itemsPerPage), [filteredLoans.length, itemsPerPage]);
    const paginatedLoans = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLoans.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLoans, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    return (
        <div>
            <AddLoanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveLoan} />
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Loans ({filteredLoans.length})</h3>
                <Button onClick={() => setIsModalOpen(true)}>
                    <FontAwesomeIcon icon={faPlus} className="mr-2"/> Add Loan
                </Button>
            </div>
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-b">
                    <Input label="" placeholder="Search by Employee or Loan ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<FontAwesomeIcon icon={faSearch} />} />
                    <Select label="" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="closed">Closed</option>
                        <option value="pending">Pending</option>
                    </Select>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Loan Details</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Installment</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Balance</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? <tr><td colSpan={6} className="text-center p-6">Loading...</td></tr> : paginatedLoans.map(loan => (
                                <tr key={loan.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/payroll/loans/${loan.id}`)}>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{loan.employeeName}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{loan.loanId} <br/> {loan.loanType}</td>
                                    <td className="px-6 py-4 text-right text-slate-800 dark:text-slate-200">{formatCurrency(loan.loanAmount, user?.hospitalCurrency)}</td>
                                    <td className="px-6 py-4 text-right text-slate-800 dark:text-slate-200">{formatCurrency(loan.installmentAmount, user?.hospitalCurrency)}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(loan.loanAmount - loan.amountPaid, user?.hospitalCurrency)}</td>
                                    <td className="px-6 py-4 text-center"><LoanStatusBadge status={loan.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredLoans.length === 0 && !loading && <p className="p-4 text-center text-slate-500 dark:text-slate-400">No loans found.</p>}
                 </div>
                 <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                    totalItems={filteredLoans.length}
                    itemsOnPage={paginatedLoans.length}
                />
            </div>
        </div>
    );
};

export default LoansTab;
