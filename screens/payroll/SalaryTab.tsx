// screens/payroll/SalaryTab.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PayrollRun, Payslip, PayslipItem, PayslipStatus, Employee } from '../../types';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faSave, faExclamationTriangle, faChevronDown, faTrashAlt, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { Timestamp } from 'firebase/firestore';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

type ExpandedPayslip = Payslip & {
    period: string;
    runId: string;
};

const ExpandedRunView: React.FC<{
    run: PayrollRun;
    employeesMap: Map<string, Employee>;
    onEditPayslip: (payslip: ExpandedPayslip) => void;
}> = ({ run, employeesMap, onEditPayslip }) => {
    const { user } = useAuth();
    const currency = user?.hospitalCurrency || 'USD';

    // State for filtering and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [designationFilter, setDesignationFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const departments = useMemo(() => ['all', ...Array.from(new Set(run.payslips.map(p => employeesMap.get(p.employeeId)?.department).filter(Boolean) as string[]))], [run.payslips, employeesMap]);
    const designations = useMemo(() => ['all', ...Array.from(new Set(run.payslips.map(p => employeesMap.get(p.employeeId)?.designation).filter(Boolean) as string[]))], [run.payslips, employeesMap]);

    const filteredPayslips = useMemo(() => {
        return (run.payslips || [])
            .filter(p => {
                const employee = employeesMap.get(p.employeeId);
                if (statusFilter !== 'all' && p.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
                if (departmentFilter !== 'all' && employee?.department !== departmentFilter) return false;
                if (designationFilter !== 'all' && employee?.designation !== designationFilter) return false;

                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return p.userName.toLowerCase().includes(term) ||
                       employee?.employeeId?.toLowerCase().includes(term) ||
                       employee?.email?.toLowerCase().includes(term);
            });
    }, [run.payslips, statusFilter, departmentFilter, designationFilter, searchTerm, employeesMap]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, itemsPerPage, departmentFilter, designationFilter]);

    const totalPages = useMemo(() => Math.ceil(filteredPayslips.length / itemsPerPage), [filteredPayslips.length, itemsPerPage]);
    const paginatedPayslips = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPayslips.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPayslips, currentPage, itemsPerPage]);

    return (
        <div className="border-t border-slate-200 dark:border-slate-800">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50">
                <Input
                    label=""
                    placeholder="Search by employee name, ID, or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <Select label="" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                </Select>
                 <Select label="" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                    <option value="all">All Departments</option>
                    {departments.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select label="" value={designationFilter} onChange={e => setDesignationFilter(e.target.value)}>
                    <option value="all">All Designations</option>
                    {designations.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                            <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Department</th>
                            <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Designation</th>
                            <th className="px-6 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Net Pay</th>
                            <th className="px-6 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPayslips.map(p => {
                            const employee = employeesMap.get(p.employeeId);
                            return (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <Avatar avatar={employee?.profilePhotoUrl ? { type: 'image', value: employee.profilePhotoUrl } : { type: 'initials', value: p.userName.split(' ').map(n => n[0]).join(''), color: 'bg-blue-500' }} size="sm"/>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{p.userName}</p>
                                                <p className="text-sm text-slate-500">{employee?.employeeId || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{employee?.department || 'N/A'}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{employee?.designation || 'N/A'}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(p.netPay, currency)}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${p.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>{p.status}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <Button size="sm" variant="light" onClick={() => onEditPayslip({ ...p, period: run.period, runId: run.id })}>
                                            {run.status === 'finalized' ? 'View/Update Status' : 'View / Edit'}
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {paginatedPayslips.length === 0 && <p className="p-4 text-center text-slate-500">No matching payslips found.</p>}
            </div>
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                totalItems={filteredPayslips.length}
                itemsOnPage={paginatedPayslips.length}
            />
        </div>
    );
};


const EditPayslipModal: React.FC<{
    payslip: ExpandedPayslip, run: PayrollRun, onClose: () => void, onSave: (p: Payslip) => Promise<boolean>
}> = ({ payslip, run, onClose, onSave }) => {
    const { user } = useAuth();
    const [localPayslip, setLocalPayslip] = useState<Payslip>(() => JSON.parse(JSON.stringify(payslip)));
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [newItem, setNewItem] = useState<{ type: 'earning' | 'deduction', name: string, amount: string }>({ type: 'earning', name: '', amount: '' });

    const isFinalized = run.status === 'finalized';

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const { grossSalary, totalDeductions, netPay } = useMemo(() => {
        const gross = (localPayslip.earnings || []).reduce((s, i) => s + i.amount, 0) + 
                      (localPayslip.additionalEarnings || []).reduce((s, i) => s + i.amount, 0);
        
        const totalDed = (localPayslip.deductions || []).reduce((s, i) => s + i.amount, 0) + 
                         (localPayslip.additionalDeductions || []).reduce((s, i) => s + i.amount, 0);

        return { grossSalary: gross, totalDeductions: totalDed, netPay: gross - totalDed };
    }, [localPayslip]);

    const handleAddItem = () => {
        const amount = parseFloat(newItem.amount);
        if (!newItem.name || isNaN(amount) || amount <= 0) return;
        const item: PayslipItem = { id: Date.now().toString(), name: newItem.name, amount };
        if (newItem.type === 'earning') {
            setLocalPayslip(p => ({ ...p, additionalEarnings: [...(p.additionalEarnings || []), item]}));
        } else {
            setLocalPayslip(p => ({ ...p, additionalDeductions: [...(p.additionalDeductions || []), item]}));
        }
        setNewItem({ type: newItem.type, name: '', amount: '' });
    };

    const handleRemoveItem = (type: 'earning' | 'deduction', id: string) => {
        if (type === 'earning') {
            setLocalPayslip(p => ({...p, additionalEarnings: (p.additionalEarnings || []).filter(i => i.id !== id)}));
        } else {
            setLocalPayslip(p => ({...p, additionalDeductions: (p.additionalDeductions || []).filter(i => i.id !== id)}));
        }
    };
    
    const handleMarkAsPaid = async () => {
        const payslipToSave = { ...localPayslip, status: 'Paid' as const, paymentDate: Timestamp.now(), grossSalary, totalDeductions, netPay };
        setLoading(true);
        const success = await onSave(payslipToSave);
        if (success) onClose();
        setLoading(false);
    }
    
    const handleMarkAsUnpaid = async () => {
        // Note: setting paymentDate to undefined will remove it from Firestore
        const payslipToSave: Payslip = { ...localPayslip, status: 'Unpaid', paymentDate: undefined, grossSalary, totalDeductions, netPay };
        setLoading(true);
        const success = await onSave(payslipToSave);
        if (success) onClose();
        setLoading(false);
    };

    const handleSaveAndClose = async () => {
        setLoading(true);
        const payslipToSave = { ...localPayslip, grossSalary, totalDeductions, netPay };
        const success = await onSave(payslipToSave);
        if (success) onClose();
        setLoading(false);
    };

    const renderItems = (items: PayslipItem[], type: 'standard' | 'additional', category: 'earning' | 'deduction') => (
        items.map(item => (
            <tr key={item.id}>
                <td className="py-1 px-2 text-slate-800 dark:text-slate-200">{item.name}</td>
                <td className="py-1 px-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(item.amount, user?.hospitalCurrency)}</td>
                {type === 'additional' && !isFinalized ? (
                    <td className="py-1 px-2 text-center w-10">
                        <button type="button" onClick={() => handleRemoveItem(category, item.id)} className="text-red-500 hover:text-red-700">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </td>
                ) : <td className="w-10"></td>}
            </tr>
        ))
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl m-4 flex flex-col h-[90vh]">
                <div className="p-4 border-b flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Payslip for {payslip.userName}</h2>
                    <p className="text-sm text-slate-500">{new Date(payslip.period + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 text-slate-800 dark:text-slate-200">
                    {isFinalized && <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded-md text-sm flex items-center gap-2"><FontAwesomeIcon icon={faExclamationTriangle}/> This payroll run is finalized. Earnings/deductions cannot be edited.</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-lg text-green-600 dark:text-green-400 mb-2">Earnings</h3>
                            <table className="w-full text-sm"><tbody>
                                {renderItems(localPayslip.earnings || [], 'standard', 'earning')}
                                {renderItems(localPayslip.additionalEarnings || [], 'additional', 'earning')}
                            </tbody></table>
                            {!isFinalized && <div className="mt-4 p-2 border-t space-y-2">
                                <h4 className="font-semibold text-xs uppercase">Add Earning</h4>
                                <div className="flex gap-2 items-end">
                                    <Input label="" placeholder="Earning Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value, type: 'earning'})} />
                                    <Input label="" type="number" placeholder="Amount" value={newItem.amount} onChange={e => setNewItem({...newItem, amount: e.target.value, type: 'earning'})} />
                                    <Button size="sm" onClick={handleAddItem} disabled={newItem.type !== 'earning'}>Add</Button>
                                </div>
                            </div>}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-red-600 dark:text-red-400 mb-2">Deductions</h3>
                             <table className="w-full text-sm"><tbody>
                                {renderItems(localPayslip.deductions || [], 'standard', 'deduction')}
                                {renderItems(localPayslip.additionalDeductions || [], 'additional', 'deduction')}
                            </tbody></table>
                            {!isFinalized && <div className="mt-4 p-2 border-t space-y-2">
                                <h4 className="font-semibold text-xs uppercase">Add Deduction</h4>
                                <div className="flex gap-2 items-end">
                                    <Input label="" placeholder="Deduction Name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value, type: 'deduction'})} />
                                    <Input label="" type="number" placeholder="Amount" value={newItem.amount} onChange={e => setNewItem({...newItem, amount: e.target.value, type: 'deduction'})} />
                                    <Button size="sm" onClick={handleAddItem} disabled={newItem.type !== 'deduction'}>Add</Button>
                                </div>
                            </div>}
                        </div>
                    </div>

                     <div className="mt-8 pt-4 border-t-2 border-slate-300 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between font-semibold"><span className="text-slate-800 dark:text-slate-200">Gross Salary:</span> <span>{formatCurrency(grossSalary, user?.hospitalCurrency)}</span></div>
                        <div className="flex justify-between font-semibold"><span className="text-slate-800 dark:text-slate-200">Total Deductions:</span> <span className="text-red-600">-{formatCurrency(totalDeductions, user?.hospitalCurrency)}</span></div>
                        <div className="flex justify-between font-bold text-2xl mt-2 pt-2 border-t"><span className="text-slate-800 dark:text-slate-200">Net Pay:</span> <span>{formatCurrency(netPay, user?.hospitalCurrency)}</span></div>
                    </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950/50 border-t flex-shrink-0">
                    <Button variant="light" onClick={onClose}>Close</Button>
                    <div className="flex gap-2">
                        {isFinalized && localPayslip.status === 'Unpaid' && (
                            <Button variant="success" onClick={handleMarkAsPaid} disabled={loading}>
                                {loading ? 'Saving...' : 'Mark as Paid'}
                            </Button>
                        )}
                        {isFinalized && localPayslip.status === 'Paid' && (
                            <Button variant="light" onClick={handleMarkAsUnpaid} disabled={loading}>
                                {loading ? 'Saving...' : 'Mark as Unpaid'}
                            </Button>
                        )}
                        {!isFinalized && (
                            <Button variant="primary" onClick={handleSaveAndClose} disabled={loading}>
                                <FontAwesomeIcon icon={faSave} className="mr-2"/>
                                {loading ? 'Saving...' : 'Save & Close'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const RunPayrollModal: React.FC<{onClose: () => void, onRun: (period: string) => Promise<void>, loading: boolean}> = ({ onClose, onRun, loading }) => {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear().toString());
    const [month, setMonth] = useState((today.getMonth() + 1).toString().padStart(2, '0'));
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleRun = async () => {
        await onRun(`${year}-${month}`);
    };

    const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), name: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md m-4">
                <div className="p-6 border-b"><h3 className="text-xl font-bold">Run New Payroll</h3></div>
                <div className="p-6 space-y-4">
                    <p>Select the period for the new payroll run. This will generate draft payslips for all active employees with salary information.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Month" value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</Select>
                        <Select label="Year" value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</Select>
                    </div>
                </div>
                <div className="flex justify-end p-6 bg-slate-50 dark:bg-slate-950/50 border-t gap-2">
                    <Button variant="light" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleRun} disabled={loading}>{loading ? 'Generating...' : 'Generate Payroll'}</Button>
                </div>
            </div>
        </div>
    );
};


const SalaryTab: React.FC = () => {
    const { user, getPayrollRuns, createPayrollRun, updatePayrollRun, deletePayrollRun, getEmployees } = useAuth();
    const { addToast } = useToast();
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [employeesMap, setEmployeesMap] = useState<Map<string, Employee>>(new Map());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [runModalOpen, setRunModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedPayslip, setSelectedPayslip] = useState<ExpandedPayslip | null>(null);

    const [confirmFinalize, setConfirmFinalize] = useState<PayrollRun | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<PayrollRun | null>(null);
    const [confirmMarkPaid, setConfirmMarkPaid] = useState<PayrollRun | null>(null);

    const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
    
    // New states for filtering and pagination
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [runsData, employeesData] = await Promise.all([
                getPayrollRuns(),
                getEmployees()
            ]);
            setRuns(runsData);
            setEmployeesMap(new Map(employeesData.map(e => [e.id!, e])));
        } catch (error: any) {
            addToast("Failed to load payroll data.", "error");
        } finally {
            setLoading(false);
        }
    }, [getPayrollRuns, getEmployees, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredRuns = useMemo(() => {
        return runs.filter(run => run.period.startsWith(selectedYear.toString()));
    }, [runs, selectedYear]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedYear]);

    const totalPages = useMemo(() => Math.ceil(filteredRuns.length / itemsPerPage), [filteredRuns.length, itemsPerPage]);
    const paginatedRuns = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredRuns.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredRuns, currentPage, itemsPerPage]);

    const runForModal = useMemo(() => {
        if (!selectedPayslip) return null;
        return runs.find(r => r.id === selectedPayslip.runId);
    }, [selectedPayslip, runs]);

    const handleRunPayroll = async (period: string) => {
        setActionLoading('run');
        try {
            await createPayrollRun(period);
            addToast(`Payroll for ${period} generated successfully in draft mode.`, 'success');
            fetchData();
        } catch (error: any) {
            addToast(error.message, 'error');
        } finally {
            setActionLoading(null);
            setRunModalOpen(false);
        }
    };
    
    const handleSavePayslip = async (updatedPayslip: Payslip) => {
        const run = runs.find(r => r.id === (selectedPayslip as ExpandedPayslip).runId);
        if (!run) {
            addToast("Could not find the original payroll run.", "error");
            return false;
        }

        const updatedPayslips = run.payslips.map(p => p.id === updatedPayslip.id ? updatedPayslip : p);
        const newTotalAmount = updatedPayslips.reduce((sum, p) => sum + p.netPay, 0);

        try {
            await updatePayrollRun(run.id, { payslips: updatedPayslips, totalAmount: newTotalAmount });
            addToast('Payslip updated successfully!', 'success');
            fetchData(); // Refetch all data to ensure consistency
            setEditModalOpen(false);
            setSelectedPayslip(null);
            return true;
        } catch (error: any) {
            addToast(error.message || 'Failed to update payslip.', 'error');
            return false;
        }
    };

    const handleFinalizeRun = async () => {
        if (!confirmFinalize) return;
        setActionLoading(`finalize-${confirmFinalize.id}`);
        try {
            await updatePayrollRun(confirmFinalize.id, { status: 'finalized' });
            addToast("Payroll run has been finalized.", "success");
            fetchData();
        } catch (error: any) {
            addToast(error.message, "error");
        } finally {
            setActionLoading(null);
            setConfirmFinalize(null);
        }
    };
    
    const handleDeleteRun = async () => {
        if (!confirmDelete) return;
        setActionLoading(`delete-${confirmDelete.id}`);
        try {
            await deletePayrollRun(confirmDelete.id);
            addToast("Draft payroll run deleted.", "success");
            fetchData();
        } catch (error: any) {
            addToast(error.message, "error");
        } finally {
            setActionLoading(null);
            setConfirmDelete(null);
        }
    };

    const handleMarkAllPaid = async () => {
        if (!confirmMarkPaid) return;
        setActionLoading(`mark-paid-${confirmMarkPaid.id}`);
        try {
            const updatedPayslips = confirmMarkPaid.payslips.map(p => 
                p.status === 'Unpaid' ? { ...p, status: 'Paid' as const, paymentDate: Timestamp.now() } : p
            );
            await updatePayrollRun(confirmMarkPaid.id, { payslips: updatedPayslips });
            addToast("All unpaid payslips marked as paid.", "success");
            fetchData();
        } catch (error: any) {
            addToast(error.message, "error");
        } finally {
            setActionLoading(null);
            setConfirmMarkPaid(null);
        }
    };

    const toggleExpandRun = (runId: string) => {
        setExpandedRuns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(runId)) newSet.delete(runId);
            else newSet.add(runId);
            return newSet;
        });
    };
    
    const handleEditPayslip = (payslip: ExpandedPayslip) => {
        setSelectedPayslip(payslip);
        setEditModalOpen(true);
    };

    return (
        <div>
            {runModalOpen && <RunPayrollModal onClose={() => setRunModalOpen(false)} onRun={handleRunPayroll} loading={actionLoading === 'run'} />}
            {editModalOpen && selectedPayslip && runForModal && <EditPayslipModal payslip={selectedPayslip} run={runForModal} onClose={() => setEditModalOpen(false)} onSave={handleSavePayslip} />}
            {confirmFinalize && <ConfirmationModal isOpen={true} onClose={() => setConfirmFinalize(null)} onConfirm={handleFinalizeRun} title="Finalize Payroll Run" message="Finalizing this run will lock all payslips from edits to earnings and deductions. You will only be able to mark them as paid. This cannot be undone." confirmButtonText="Yes, Finalize" loading={actionLoading === `finalize-${confirmFinalize.id}`} />}
            {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={handleDeleteRun} title="Delete Payroll Run" message="Are you sure you want to delete this draft payroll run? All data will be lost, and you can regenerate it." confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading === `delete-${confirmDelete.id}`} />}
            {confirmMarkPaid && <ConfirmationModal isOpen={true} onClose={() => setConfirmMarkPaid(null)} onConfirm={handleMarkAllPaid} title="Mark All as Paid" message="This will mark all unpaid payslips in this run as paid with today's date. Continue?" confirmButtonText="Mark as Paid" confirmButtonVariant="primary" loading={actionLoading === `mark-paid-${confirmMarkPaid.id}`} />}

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                     <h3 className="text-xl font-semibold">Salary Runs</h3>
                     <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedYear(y => y - 1)}><FontAwesomeIcon icon={faChevronLeft}/></Button>
                        <span className="font-bold text-lg w-24 text-center">{selectedYear}</span>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedYear(y => y + 1)}><FontAwesomeIcon icon={faChevronRight}/></Button>
                     </div>
                </div>
                <Button onClick={() => setRunModalOpen(true)}>
                    <FontAwesomeIcon icon={faPlus} className="mr-2"/> Run New Payroll
                </Button>
            </div>
            
            <div className="space-y-4">
                {loading ? <p>Loading payroll runs...</p> : paginatedRuns.map(run => {
                    const isExpanded = expandedRuns.has(run.id);
                    const paidCount = run.payslips.filter(p => p.status === 'Paid').length;
                    return (
                        <div key={run.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                            <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{new Date(run.period + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                        <span>Status: <span className={`font-semibold capitalize ${run.status === 'draft' ? 'text-yellow-600' : 'text-green-600'}`}>{run.status}</span></span>
                                        <span>Employees: {run.payslips.length}</span>
                                        <span>Total: <span className="font-semibold">{formatCurrency(run.totalAmount, user?.hospitalCurrency)}</span></span>
                                        <span>Paid: {paidCount}/{run.payslips.length}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {run.status === 'draft' && <>
                                        <Button size="sm" variant="success" onClick={() => setConfirmFinalize(run)} disabled={!!actionLoading}>Finalize</Button>
                                        <Button size="sm" variant="danger" onClick={() => setConfirmDelete(run)} disabled={!!actionLoading}>Delete</Button>
                                    </>}
                                    {run.status === 'finalized' && paidCount < run.payslips.length && <Button size="sm" variant="primary" onClick={() => setConfirmMarkPaid(run)} disabled={!!actionLoading}>Mark all as Paid</Button>}
                                    <Button size="sm" variant="light" onClick={() => toggleExpandRun(run.id)}>
                                        <FontAwesomeIcon icon={faChevronDown} className={`mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                        {isExpanded ? 'Hide' : 'View'} Payslips
                                    </Button>
                                </div>
                            </div>
                            {isExpanded && (
                                <ExpandedRunView
                                    run={run}
                                    employeesMap={employeesMap}
                                    onEditPayslip={handleEditPayslip}
                                />
                            )}
                        </div>
                    );
                })}
                 {!loading && paginatedRuns.length === 0 && <div className="text-center p-12 text-slate-500">No payroll runs found for {selectedYear}.</div>}
            </div>
            {filteredRuns.length > 0 && (
                <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                        totalItems={filteredRuns.length}
                        itemsOnPage={paginatedRuns.length}
                    />
                </div>
            )}
        </div>
    );
};

export default SalaryTab;
