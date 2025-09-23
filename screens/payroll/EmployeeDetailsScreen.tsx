// screens/payroll/EmployeeDetailsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Employee, NewEmployeeData, SalaryGroup, SalaryComponent, ProofType, EmployeeDocument, BankDetails, Proofs, Address, SalaryHistoryEntry } from '../../types';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faPencilAlt, faUser, faBriefcase, faFileInvoiceDollar, faFileAlt, faSave, faTimes, faTrashAlt, faUpload, faPaperclip, faExternalLinkAlt, faFileLines } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../../components/ui/Avatar';
import { Timestamp } from 'firebase/firestore';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { EmployeeModal } from './EmployeesTab'; // Import modal from EmployeesTab

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

const PhotoPreviewModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
                <img src={imageUrl} alt="Employee full size" className="w-auto h-auto max-w-full max-h-full rounded-lg" />
            </div>
        </div>
    );
};

const ReviseSalaryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    employee: Employee;
    onSave: (newCTC: number, newGroupId: string) => Promise<void>;
    salaryGroups: SalaryGroup[];
    loading: boolean;
}> = ({ isOpen, onClose, employee, onSave, salaryGroups, loading }) => {
    const [newCTC, setNewCTC] = useState(employee.annualCTC.toString());
    const [newGroupId, setNewGroupId] = useState(employee.salaryGroupId || '');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(parseFloat(newCTC), newGroupId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h3 className="text-xl font-bold">Revise Salary for {employee.name}</h3></div>
                    <div className="p-6 space-y-4">
                        <Input label="New Annual CTC (INR)" type="number" step="0.01" value={newCTC} onChange={e => setNewCTC(e.target.value)} required />
                        <Select label="New Salary Group" value={newGroupId} onChange={e => setNewGroupId(e.target.value)} required>
                            <option value="" disabled>Select a group...</option>
                            {salaryGroups.map(sg => <option key={sg.id} value={sg.id!}>{sg.name}</option>)}
                        </Select>
                    </div>
                    <div className="flex justify-end p-6 bg-slate-50 dark:bg-slate-950/50 border-t gap-2">
                        <Button type="button" variant="light" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Revision'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EmployeeDetailsScreen: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const { user, getEmployeeById, updateEmployee, getSalaryGroups, getSalaryComponents, deleteEmployee, updateEmployeeStatus, reviseEmployeeSalary } = useAuth();
    const { addToast } = useToast();

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmStatus, setConfirmStatus] = useState(false);
    const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
    
    const [salaryGroups, setSalaryGroups] = useState<SalaryGroup[]>([]);
    const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);

    const fetchData = useCallback(async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const [data, groups, components] = await Promise.all([
                getEmployeeById(employeeId),
                getSalaryGroups(),
                getSalaryComponents()
            ]);
            if (data) {
                setEmployee(data);
                setSalaryGroups(groups);
                setSalaryComponents(components);
            } else {
                addToast("Employee not found.", "error");
                navigate(-1);
            }
        } catch (e) {
            addToast("Failed to load employee data.", "error");
        } finally {
            setLoading(false);
        }
    }, [employeeId, getEmployeeById, getSalaryGroups, getSalaryComponents, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const salaryBreakdown = useMemo(() => {
        if (!employee) return null;
        const ctc = employee.annualCTC || 0;
        const groupId = employee.salaryGroupId;
        if (ctc <= 0 || !groupId || salaryGroups.length === 0 || salaryComponents.length === 0) return null;

        const group = salaryGroups.find(g => g.id === groupId);
        if (!group) return null;

        const componentMap = new Map(salaryComponents.map(c => [c.id, c]));
        const groupComponents = group.components.map(id => componentMap.get(id)).filter(Boolean) as SalaryComponent[];
        
        const monthlyCTC = ctc / 12;
        const earnings: {name: string, value: number, calculation: string}[] = [];
        const deductions: {name: string, value: number, calculation: string}[] = [];
        let basicPay = 0;
        let totalEarnings = 0;

        const basicComponent = groupComponents.find(c => c.name.toLowerCase() === 'basic pay');
        if (basicComponent) {
            let basicCalculationString = '';
            if (basicComponent.calculationType === 'percentage-ctc') {
                basicPay = monthlyCTC * (basicComponent.value / 100);
                basicCalculationString = `${basicComponent.value}% of CTC`;
            } else if (basicComponent.calculationType === 'flat') {
                basicPay = basicComponent.value;
                basicCalculationString = 'Fixed Amount';
            }
            earnings.push({ name: basicComponent.name, value: basicPay, calculation: basicCalculationString });
            totalEarnings += basicPay;
        }

        groupComponents.forEach(comp => {
            if (comp.id === basicComponent?.id) return;
            let amount = 0;
            let calculationString = '';
            if (comp.calculationType === 'flat') { amount = comp.value; calculationString = 'Fixed Amount'; }
            else if (comp.calculationType === 'percentage-ctc') { amount = monthlyCTC * (comp.value / 100); calculationString = `${comp.value}% of CTC`; }
            else if (comp.calculationType === 'percentage-basic' && basicPay > 0) { amount = basicPay * (comp.value / 100); calculationString = `${comp.value}% of Basic`; }

            if (comp.type === 'earning') { earnings.push({ name: comp.name, value: amount, calculation: calculationString }); totalEarnings += amount; }
            else { deductions.push({ name: comp.name, value: amount, calculation: calculationString }); }
        });
        
        const specialAllowance = monthlyCTC - totalEarnings;
        if (specialAllowance > 0) earnings.push({ name: 'Special Allowance', value: specialAllowance, calculation: 'Balancing Figure' });
        
        const finalTotalEarnings = earnings.reduce((sum, item) => sum + item.value, 0);
        const totalDeductions = deductions.reduce((sum, item) => sum + item.value, 0);
        const netPay = finalTotalEarnings - totalDeductions;

        return { earnings, deductions, monthlyCTC: finalTotalEarnings, annualCTC: finalTotalEarnings * 12, totalDeductions, netPay };
    }, [employee, salaryGroups, salaryComponents]);

    const handleSave = async (data: NewEmployeeData, id?: string) => {
        if (!id) return;
        setActionLoading(true);
        try {
            await updateEmployee(id, data);
            addToast("Employee updated successfully", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch(err: any) {
            addToast(err.message || 'Failed to save', 'error');
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleDeleteEmployee = async () => {
        if (!employeeId) return;
        setActionLoading(true);
        try {
            await deleteEmployee(employeeId);
            addToast("Employee deleted successfully.", "success");
            navigate(`/hospitals/${user?.hospitalSlug}/payroll`);
        } catch (error: any) {
            addToast(error.message || 'Failed to delete employee.', 'error');
        } finally {
            setActionLoading(false);
            setConfirmDelete(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!employee) return;
        const newStatus = employee.status === 'active' ? 'inactive' : 'active';
        setActionLoading(true);
        try {
            await updateEmployeeStatus(employee.id!, newStatus);
            addToast(`Employee status updated to ${newStatus}`, 'success');
            fetchData();
        } catch (error: any) {
            addToast(error.message || 'Failed to update status', 'error');
        } finally {
            setActionLoading(false);
            setConfirmStatus(false);
        }
    }

    const handleReviseSalary = async (newCTC: number, newGroupId: string) => {
        if (!employeeId) return;
        setActionLoading(true);
        try {
            await reviseEmployeeSalary(employeeId, newCTC, newGroupId);
            addToast("Salary revised successfully!", "success");
            setIsReviseModalOpen(false);
            fetchData();
        } catch (err: any) {
            addToast(err.message || 'Failed to revise salary.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading employee details...</div>;
    if (!employee) return <div className="p-8 text-center">Could not load employee details.</div>;

    const getTabTitle = () => {
        switch (activeTab) {
            case 'basic': return 'Basic Information';
            case 'work': return 'Work Information';
            case 'salary': return 'Salary Information';
            case 'documents': return 'Documents';
            default: return 'Information';
        }
    };
    
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

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <EmployeeModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSave} employeeToEdit={employee} />
            {isPhotoPreviewOpen && employee.profilePhotoUrl && <PhotoPreviewModal imageUrl={employee.profilePhotoUrl} onClose={() => setIsPhotoPreviewOpen(false)} />}
            <ConfirmationModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={handleDeleteEmployee} title="Delete Employee" message={`Are you sure you want to delete ${employee.name}? This will also delete their user login and doctor profile if applicable. This action cannot be undone.`} confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading} />
            <ConfirmationModal isOpen={confirmStatus} onClose={() => setConfirmStatus(false)} onConfirm={handleToggleStatus} title="Confirm Status Change" message={`Are you sure you want to mark ${employee.name} as ${employee.status === 'active' ? 'inactive' : 'active'}?`} confirmButtonText="Confirm" loading={actionLoading} />
            <ReviseSalaryModal isOpen={isReviseModalOpen} onClose={() => setIsReviseModalOpen(false)} employee={employee} onSave={handleReviseSalary} salaryGroups={salaryGroups} loading={!!actionLoading} />
            
            <div className="flex justify-between items-center mb-6">
                <Button variant="light" onClick={() => navigate(-1)}><FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="border-b border-slate-200 dark:border-slate-800">
                        <nav className="-mb-px flex space-x-2 sm:space-x-8" aria-label="Tabs">
                            <TabButton tabId="basic" title="Basic Info" icon={faUser} />
                            <TabButton tabId="work" title="Work Info" icon={faBriefcase} />
                            <TabButton tabId="salary" title="Salary" icon={faFileInvoiceDollar} />
                            <TabButton tabId="documents" title="Documents" icon={faFileAlt} />
                        </nav>
                    </div>
                     <div className="space-y-6">
                        {activeTab === 'basic' && <>
                             <DetailCard title="Basic Information" actions={<Button onClick={() => setIsEditModalOpen(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2" />Edit</Button>}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Name" value={employee.name} disabled/>
                                    <Input label="Email" value={employee.email} disabled/>
                                    <Input label="Phone" value={employee.phone} disabled/>
                                    <Input label="Date of Birth" value={employee.dateOfBirth} disabled/>
                                    <Input label="Gender" value={employee.gender} disabled/>
                                    <Input label="Address" value={`${employee.address.street}, ${employee.address.city}`} disabled/>
                                </div>
                                <div className="pt-4 border-t mt-4"><h3 className="font-semibold mb-2">Proof of Identity</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="PAN Number" value={employee.proofs?.panNumber || 'N/A'} disabled/>
                                    <Input label="Aadhar Number/SSN" value={employee.proofs?.aadharNumber || 'N/A'} disabled/>
                                    <Input label="Driving License Number" value={employee.proofs?.drivingLicenseNumber || 'N/A'} disabled/>
                                    <Input label="Voter ID Number" value={employee.proofs?.voterIdNumber || 'N/A'} disabled/>
                                </div></div>
                                <div className="pt-4 border-t mt-4"><h3 className="font-semibold mb-2">Bank Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Account Holder Name" value={employee.bankDetails?.accountHolderName || 'N/A'} disabled/>
                                    <Input label="Account Number" value={employee.bankDetails?.accountNumber || 'N/A'} disabled/>
                                    <Input label="Bank Name" value={employee.bankDetails?.bankName || 'N/A'} disabled/>
                                    <Input label="Branch Name" value={employee.bankDetails?.branchName || 'N/A'} disabled/>
                                    <Input label="Bank Code" value={employee.bankDetails?.bankCode || 'N/A'} disabled/>
                                    <Input label="IFSC Code" value={employee.bankDetails?.ifscCode || 'N/A'} disabled/>
                                </div></div>
                             </DetailCard>
                        </>}
                        {activeTab === 'work' && <DetailCard title="Work Information" actions={<Button onClick={() => setIsEditModalOpen(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2" />Edit</Button>}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Joining Date" value={employee.joiningDate.toDate().toLocaleDateString()} disabled />
                                <Input label="Designation" value={employee.designation || 'N/A'} disabled />
                                <Input label="Department" value={employee.department || 'N/A'} disabled />
                                <Input label="Location" value={employee.location || 'N/A'} disabled />
                                <Input label="Shift" value={employee.shift || 'N/A'} disabled />
                                <Input label="Reporting To" value={employee.reportingTo || 'N/A'} disabled />
                            </div>
                        </DetailCard>}
                         {activeTab === 'salary' && <>
                             <DetailCard 
                                title="Salary Information"
                                actions={<Button onClick={() => setIsReviseModalOpen(true)}>Revise Salary</Button>}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Annual CTC (INR)" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(employee.annualCTC)} disabled/>
                                    <Input label="Salary Group" value={salaryGroups.find(sg => sg.id === employee.salaryGroupId)?.name || 'N/A'} disabled/>
                                </div>
                                {salaryBreakdown && <div className="mt-4 border-t pt-4 text-sm"><div className="grid grid-cols-2 gap-x-8"><div className="space-y-2">
                                    <h4 className="font-bold text-green-600 mb-2">Earnings</h4>
                                    {salaryBreakdown.earnings.map(i => <div key={i.name} className="flex justify-between border-b pb-1"><span>{i.name}</span><span className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(i.value)}</span></div>)}
                                    <div className="flex justify-between font-bold pt-1"><span>Gross Earnings</span><span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(salaryBreakdown.monthlyCTC)}</span></div>
                                </div><div className="space-y-2">
                                    <h4 className="font-bold text-red-600 mb-2">Deductions</h4>
                                    {salaryBreakdown.deductions.map(i => <div key={i.name} className="flex justify-between border-b pb-1"><span>{i.name}</span><span className="font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(i.value)}</span></div>)}
                                    <div className="flex justify-between font-bold pt-1"><span>Total Deductions</span><span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(salaryBreakdown.totalDeductions)}</span></div>
                                </div></div>
                                 <div className="flex justify-between font-bold text-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 mt-4 rounded p-4 items-center">
                                    <span>Net Pay (Take Home)</span>
                                    <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(salaryBreakdown.netPay)}</span>
                                 </div>
                                </div>}
                             </DetailCard>
                             <DetailCard title="Salary History">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Effective Date</th>
                                                <th className="p-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Annual CTC</th>
                                                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Salary Group</th>
                                                <th className="p-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Revised By</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {(employee.salaryHistory || []).slice().reverse().map((entry, index) => (
                                                <tr key={index}>
                                                    <td className="p-3 text-slate-700 dark:text-slate-300">{entry.effectiveDate.toDate().toLocaleDateString()}</td>
                                                    <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(entry.annualCTC)}</td>
                                                    <td className="p-3 text-slate-700 dark:text-slate-300">{salaryGroups.find(sg => sg.id === entry.salaryGroupId)?.name || 'N/A'}</td>
                                                    <td className="p-3 text-slate-700 dark:text-slate-300">{entry.revisedBy}</td>
                                                </tr>
                                            ))}
                                            {(employee.salaryHistory || []).length === 0 && (
                                                <tr><td colSpan={4} className="p-4 text-center text-slate-500">No salary history recorded.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </DetailCard>
                        </>}
                        {activeTab === 'documents' && <DetailCard title="Documents" actions={<Button onClick={() => setIsEditModalOpen(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2"/>Edit</Button>}>
                            <div>
                                <h4 className="font-semibold mb-2">Uploaded Documents</h4>
                                {(employee.documents || []).length > 0 ? <div className="space-y-2">
                                    {(employee.documents || []).map(doc => <div key={doc.id} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <div className="flex items-center gap-2"><FontAwesomeIcon icon={faFileLines}/><span>{doc.name} ({doc.type})</span></div>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="light">View</Button></a>
                                    </div>)}
                                </div> : <p className="text-sm text-slate-500">No documents uploaded.</p>}
                            </div>
                        </DetailCard>}
                    </div>
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border text-center flex flex-col items-center">
                        <button onClick={() => employee.profilePhotoUrl && setIsPhotoPreviewOpen(true)} className="relative group">
                            <Avatar avatar={employee.profilePhotoUrl ? { type: 'image', value: employee.profilePhotoUrl } : { type: 'initials', value: employee.name.split(' ').map(n => n[0]).join(''), color: 'bg-blue-600' }} className="w-32 h-32" />
                            {employee.profilePhotoUrl && <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity"><p className="text-white opacity-0 group-hover:opacity-100 text-sm font-semibold">View Photo</p></div>}
                        </button>
                        <h2 className="text-xl font-bold mt-4">{employee.name}</h2>
                        <p className="text-slate-500">{employee.designation || 'Employee'}</p>
                        <p className="text-sm text-slate-500 font-mono">{employee.employeeId}</p>
                        <span className={`mt-4 px-2.5 py-1 inline-flex text-xs font-bold rounded-full uppercase ${employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{employee.status}</span>
                    </div>
                     <DetailCard title="Actions">
                        <div className="flex flex-col gap-2">
                           <Button variant="light" onClick={() => setConfirmStatus(true)}>{employee.status === 'active' ? 'Mark as Inactive' : 'Mark as Active'}</Button>
                           <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={actionLoading}>Delete Employee</Button>
                        </div>
                    </DetailCard>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetailsScreen;