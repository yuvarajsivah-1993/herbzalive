// screens/payroll/EmployeesTab.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Employee, NewEmployeeData, Address, SalaryGroup, SalaryComponent, ProofType, EmployeeDocument, BankDetails, Proofs } from '../../types';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUsers, faPencilAlt, faTrashAlt, faTimes, faChevronDown, faUpload, faFileLines, faSearch } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import PhotoCaptureInput from '../../components/ui/PhotoCaptureInput';
import { Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import CreatableSearchableSelect from '../../components/ui/CreatableSearchableSelect';
import Textarea from '../../components/ui/Textarea';


export const EmployeeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewEmployeeData, id?: string) => Promise<void>;
    employeeToEdit: Employee | null;
}> = ({ isOpen, onClose, onSave, employeeToEdit }) => {
    const { 
        user, getSalaryGroups, getSalaryComponents,
        addEmployeeLocation, deleteEmployeeLocation,
        addEmployeeDepartment, deleteEmployeeDepartment,
        addEmployeeDesignation, deleteEmployeeDesignation,
        addEmployeeShift, deleteEmployeeShift
    } = useAuth();
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [salaryGroups, setSalaryGroups] = useState<SalaryGroup[]>([]);
    const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
    
    const [activeTab, setActiveTab] = useState('basic');

    const [formData, setFormData] = useState<Partial<NewEmployeeData>>({
        status: 'active', gender: 'Male', address: { street: '', city: '', country: '', pincode: '' },
        annualCTC: 0, newDocuments: []
    });

    const locationOptions = useMemo(() => user?.hospitalEmployeeLocations || [], [user?.hospitalEmployeeLocations]);
    const departmentOptions = useMemo(() => user?.hospitalEmployeeDepartments || [], [user?.hospitalEmployeeDepartments]);
    const designationOptions = useMemo(() => user?.hospitalEmployeeDesignations || [], [user?.hospitalEmployeeDesignations]);
    const shiftOptions = useMemo(() => user?.hospitalEmployeeShifts || [], [user?.hospitalEmployeeShifts]);

    useEffect(() => {
        if(isOpen) {
            Promise.all([getSalaryGroups(), getSalaryComponents()])
                .then(([groups, components]) => {
                    setSalaryGroups(groups);
                    setSalaryComponents(components);
                }).catch(() => addToast("Failed to load salary configuration", "error"));

            if(employeeToEdit) {
                setFormData({
                    ...employeeToEdit,
                    joiningDate: (employeeToEdit.joiningDate as Timestamp).toDate().toISOString().split('T')[0]
                });
            } else {
                 setFormData({
                    status: 'active', gender: 'Male', address: { street: '', city: '', country: '', pincode: '' }, 
                    joiningDate: new Date().toISOString().split('T')[0],
                    annualCTC: 0,
                    newDocuments: [],
                    removedDocumentIds: []
                });
            }
        }
    }, [isOpen, employeeToEdit, getSalaryGroups, getSalaryComponents, addToast]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
            onClose();
          }
        };
        if (isOpen) {
          document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleChange = (field: keyof NewEmployeeData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field: keyof Address, value: string) => {
        setFormData(prev => ({...prev, address: { ...prev!.address!, [field]: value } }));
    };
    
    const handleProofChange = (field: keyof Proofs, value: string) => {
        setFormData(prev => ({ ...prev, proofs: { ...prev.proofs, [field]: value } }));
    };
    
    const handleBankChange = (field: keyof BankDetails, value: string) => {
        setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, [field]: value } }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: ProofType) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).map(file => ({ file, type }));
            handleChange('newDocuments', [...(formData.newDocuments || []), ...files]);
        }
    };

    const salaryBreakdown = useMemo(() => {
        const ctc = formData.annualCTC || 0;
        const groupId = formData.salaryGroupId;
        if (ctc <= 0 || !groupId || salaryGroups.length === 0 || salaryComponents.length === 0) {
            return null;
        }

        const group = salaryGroups.find(g => g.id === groupId);
        if (!group) return null;

        const componentMap = new Map(salaryComponents.map(c => [c.id, c]));
        const groupComponents = group.components.map(id => componentMap.get(id)).filter(Boolean) as SalaryComponent[];
        
        const monthlyCTC = ctc / 12;
        const earnings: {name: string, value: number, calculation: string}[] = [];
        const deductions: {name: string, value: number, calculation: string}[] = [];
        let basicPay = 0;
        let totalEarnings = 0;

        const basicComponent = groupComponents.find(c => c.name.toLowerCase() === 'basic' || c.name.toLowerCase() === 'basic pay');
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
            if (comp.calculationType === 'flat') amount = comp.value;
            else if (comp.calculationType === 'percentage-ctc') amount = monthlyCTC * (comp.value / 100);
            else if (comp.calculationType === 'percentage-basic' && basicPay > 0) amount = basicPay * (comp.value / 100);

            if (comp.type === 'earning') {
                earnings.push({ name: comp.name, value: amount, calculation: calculationString });
                totalEarnings += amount;
            } else {
                deductions.push({ name: comp.name, value: amount, calculation: calculationString });
            }
        });
        
        const specialAllowance = monthlyCTC - totalEarnings;
        if (specialAllowance > 0) {
            earnings.push({ name: 'Special Allowance', value: specialAllowance, calculation: 'Balancing Figure' });
        }
        
        const finalTotalEarnings = earnings.reduce((sum, item) => sum + item.value, 0);
        const totalDeductions = deductions.reduce((sum, item) => sum + item.value, 0);
        const netPay = finalTotalEarnings - totalDeductions;

        return { earnings, deductions, monthlyCTC: finalTotalEarnings, annualCTC: finalTotalEarnings * 12, totalDeductions, netPay };

    }, [formData.annualCTC, formData.salaryGroupId, salaryGroups, salaryComponents]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData as NewEmployeeData, employeeToEdit?.id);
        } catch (err: any) {
            addToast(err.message || 'Failed to save employee', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
             <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-5xl m-4 flex flex-col h-[95vh]">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-4 border-b"><h2 className="text-xl font-bold">{employeeToEdit ? 'Edit' : 'Add'} Employee</h2></div>
                    <div className="p-4 border-b">
                         <div className="flex space-x-4">
                            <button type="button" onClick={() => setActiveTab('basic')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'basic' ? 'bg-blue-100 text-blue-700' : ''}`}>Basic Details</button>
                            <button type="button" onClick={() => setActiveTab('work')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'work' ? 'bg-blue-100 text-blue-700' : ''}`}>Work Information</button>
                            <button type="button" onClick={() => setActiveTab('salary')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'salary' ? 'bg-blue-100 text-blue-700' : ''}`}>Salary Details</button>
                            <button type="button" onClick={() => setActiveTab('documents')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'documents' ? 'bg-blue-100 text-blue-700' : ''}`}>Documents</button>
                        </div>
                    </div>
                    <div className="p-6 flex-grow overflow-y-auto space-y-6">
                        {activeTab === 'basic' && <>
                            <PhotoCaptureInput onPhotoTaken={(photo) => handleChange('profilePhoto', photo)} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input label="Name*" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} required />
                                <Input label="Email*" type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} required />
                                <Input label="Phone*" type="tel" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} required />
                                <Input label="Joining Date*" type="date" value={formData.joiningDate || ''} onChange={e => handleChange('joiningDate', e.target.value)} required />
                                <Select label="Status*" value={formData.status || 'active'} onChange={e => handleChange('status', e.target.value as any)} required><option value="active">Active</option><option value="inactive">Inactive</option></Select>
                                <Select label="Gender*" value={formData.gender || 'Male'} onChange={e => handleChange('gender', e.target.value as any)} required><option>Male</option><option>Female</option><option>Other</option></Select>
                                <Input label="Date of Birth*" type="date" value={formData.dateOfBirth || ''} onChange={e => handleChange('dateOfBirth', e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Address Street" value={formData.address?.street || ''} onChange={e => handleAddressChange('street', e.target.value)} />
                                <Input label="Address City" value={formData.address?.city || ''} onChange={e => handleAddressChange('city', e.target.value)} />
                                <Input label="Address Country" value={formData.address?.country || ''} onChange={e => handleAddressChange('country', e.target.value)} />
                                <Input label="Address Pincode" value={formData.address?.pincode || ''} onChange={e => handleAddressChange('pincode', e.target.value)} />
                            </div>
                        </>}
                        {activeTab === 'work' && <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CreatableSearchableSelect label="Location" options={locationOptions} value={formData.location || ''} onChange={val => handleChange('location', val)} onCreate={addEmployeeLocation} onDelete={deleteEmployeeLocation} placeholder="Search or create..."/>
                                <CreatableSearchableSelect label="Department" options={departmentOptions} value={formData.department || ''} onChange={val => handleChange('department', val)} onCreate={addEmployeeDepartment} onDelete={deleteEmployeeDepartment} placeholder="Search or create..."/>
                                <CreatableSearchableSelect label="Designation" options={designationOptions} value={formData.designation || ''} onChange={val => handleChange('designation', val)} onCreate={addEmployeeDesignation} onDelete={deleteEmployeeDesignation} placeholder="Search or create..."/>
                                <CreatableSearchableSelect label="Shift" options={shiftOptions} value={formData.shift || ''} onChange={val => handleChange('shift', val)} onCreate={addEmployeeShift} onDelete={deleteEmployeeShift} placeholder="Search or create..."/>
                                <Input label="Reporting To" value={formData.reportingTo || ''} onChange={e => handleChange('reportingTo', e.target.value)} />
                            </div>
                        </>}
                        {activeTab === 'salary' && <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select label="Salary Group*" value={formData.salaryGroupId || ''} onChange={e => handleChange('salaryGroupId', e.target.value)} required>
                                    <option value="" disabled>Select a group...</option>
                                    {salaryGroups.map(sg => <option key={sg.id} value={sg.id!}>{sg.name}</option>)}
                                </Select>
                                <Input label="Annual CTC*" type="number" step="0.01" value={formData.annualCTC || ''} onChange={e => handleChange('annualCTC', parseFloat(e.target.value) || 0)} required helperText="Cost to company value for the whole year." />
                            </div>
                            {salaryBreakdown && <div className="mt-4 border-t pt-4">
                                <div className="grid grid-cols-4 gap-x-8 text-sm font-semibold text-slate-500 mb-2">
                                    <span className="col-span-1">Salary Component</span>
                                    <span className="text-right">Calculation</span>
                                    <span className="text-right">Monthly Amount</span>
                                    <span className="text-right">Annual Amount</span>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="font-bold my-2">Earnings</p>
                                        {salaryBreakdown.earnings.map(item => (
                                            <div key={item.name} className="grid grid-cols-4 gap-x-8 py-1 border-b">
                                                <span>{item.name}</span>
                                                <span className="text-right text-xs text-slate-500">{item.calculation}</span>
                                                <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(item.value)}</span>
                                                <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(item.value*12)}</span>
                                            </div>
                                        ))}
                                        <div className="grid grid-cols-4 gap-x-8 py-2 font-bold bg-slate-100 dark:bg-slate-800">
                                            <span>Cost to Company</span><span></span>
                                            <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(salaryBreakdown.monthlyCTC)}</span>
                                            <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(salaryBreakdown.annualCTC)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold my-2">Deductions</p>
                                        {salaryBreakdown.deductions.map(item => (
                                             <div key={item.name} className="grid grid-cols-4 gap-x-8 py-1 border-b">
                                                <span>{item.name}</span>
                                                <span className="text-right text-xs text-slate-500">{item.calculation}</span>
                                                <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(item.value)}</span>
                                                <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(item.value*12)}</span>
                                            </div>
                                        ))}
                                        <div className="grid grid-cols-4 gap-x-8 py-2 font-bold bg-slate-100 dark:bg-slate-800">
                                            <span>Total Deductions</span><span></span>
                                            <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(salaryBreakdown.totalDeductions)}</span>
                                            <span className="text-right">{new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(salaryBreakdown.totalDeductions*12)}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-x-8 py-2 font-bold text-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 mt-4 rounded items-center">
                                        <span className="col-span-2 pl-2">Net Pay (Take Home)</span>
                                        <span className="text-right pr-2">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(salaryBreakdown.netPay)}</span>
                                        <span className="text-right pr-2">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(salaryBreakdown.netPay * 12)}</span>
                                    </div>
                                </div>
                            </div>}
                        </>}
                        {activeTab === 'documents' && <>
                            <h3 className="font-semibold border-b pb-2">Proof of Identity</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Driving License Number" value={formData.proofs?.drivingLicenseNumber || ''} onChange={e => handleProofChange('drivingLicenseNumber', e.target.value)} />
                                <Input label="PAN Number" value={formData.proofs?.panNumber || ''} onChange={e => handleProofChange('panNumber', e.target.value)} />
                                <Input label="Aadhar Number/SSN" value={formData.proofs?.aadharNumber || ''} onChange={e => handleProofChange('aadharNumber', e.target.value)} />
                                <Input label="Voter ID Number" value={formData.proofs?.voterIdNumber || ''} onChange={e => handleProofChange('voterIdNumber', e.target.value)} />
                            </div>
                             <h3 className="font-semibold border-b pb-2 pt-4">Bank Details</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Account Holder Name" value={formData.bankDetails?.accountHolderName || ''} onChange={e => handleBankChange('accountHolderName', e.target.value)} />
                                <Input label="Account Number" value={formData.bankDetails?.accountNumber || ''} onChange={e => handleBankChange('accountNumber', e.target.value)} />
                                <Input label="Bank Name" value={formData.bankDetails?.bankName || ''} onChange={e => handleBankChange('bankName', e.target.value)} />
                                <Input label="Branch Name" value={formData.bankDetails?.branchName || ''} onChange={e => handleBankChange('branchName', e.target.value)} />
                                <Input label="Bank Code" value={formData.bankDetails?.bankCode || ''} onChange={e => handleBankChange('bankCode', e.target.value)} />
                                <Input label="IFSC Code" value={formData.bankDetails?.ifscCode || ''} onChange={e => handleBankChange('ifscCode', e.target.value)} />
                             </div>
                              <h3 className="font-semibold border-b pb-2 pt-4">Upload Documents</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <Input label="Driving License" type="file" onChange={e => handleFileChange(e, 'drivingLicense')} multiple/>
                                  <Input label="PAN Card" type="file" onChange={e => handleFileChange(e, 'pan')} multiple/>
                                  <Input label="Aadhar/SSN" type="file" onChange={e => handleFileChange(e, 'aadhar')} multiple/>
                                  <Input label="Voter ID" type="file" onChange={e => handleFileChange(e, 'voterId')} multiple/>
                              </div>
                              <div className="mt-2 text-sm">
                                  {formData.newDocuments && formData.newDocuments.length > 0 && <p className="font-semibold">Files to upload:</p>}
                                  <ul className="list-disc pl-5">
                                      {formData.newDocuments?.map((doc, i) => <li key={i}>{doc.file.name} ({doc.type})</li>)}
                                  </ul>
                              </div>
                        </>}
                    </div>
                    <div className="flex justify-end p-4 bg-slate-50 dark:bg-slate-950/50 border-t gap-2 flex-shrink-0">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Employee'}</Button>
                    </div>
                </form>
             </div>
        </div>
    );
};

const EmployeesTab: React.FC = () => {
    const { user, getEmployees, addEmployee, updateEmployee } = useAuth();
    const { addToast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const navigate = useNavigate();

    // Filtering and Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [designationFilter, setDesignationFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            setEmployees(await getEmployees());
        } catch (e) {
            addToast("Failed to load employees.", "error");
        } finally {
            setLoading(false);
        }
    }, [getEmployees, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (data: NewEmployeeData, id?: string) => {
        if (id) {
            await updateEmployee(id, data);
            addToast("Employee updated successfully!", "success");
        } else {
            await addEmployee(data);
            addToast("Employee added successfully!", "success");
        }
        fetchData();
        setIsModalOpen(false);
        setEmployeeToEdit(null);
    };

    const handleRowClick = (employeeId: string | undefined) => {
        if (!employeeId) return;
        navigate(`/hospitals/${user?.hospitalSlug}/payroll/employees/${employeeId}`);
    };
    
    const departmentOptions = useMemo(() => ['all', ...(user?.hospitalEmployeeDepartments || [])], [user?.hospitalEmployeeDepartments]);
    const designationOptions = useMemo(() => ['all', ...(user?.hospitalEmployeeDesignations || [])], [user?.hospitalEmployeeDesignations]);

    const filteredEmployees = useMemo(() => {
        return employees
            .filter(emp => statusFilter === 'all' || emp.status === statusFilter)
            .filter(emp => departmentFilter === 'all' || emp.department === departmentFilter)
            .filter(emp => designationFilter === 'all' || emp.designation === designationFilter)
            .filter(emp => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                    emp.name.toLowerCase().includes(term) ||
                    emp.employeeId.toLowerCase().includes(term) ||
                    emp.email.toLowerCase().includes(term)
                );
            });
    }, [employees, searchTerm, statusFilter, departmentFilter, designationFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, departmentFilter, designationFilter]);

    const totalPages = useMemo(() => Math.ceil(filteredEmployees.length / itemsPerPage), [filteredEmployees.length, itemsPerPage]);
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEmployees, currentPage, itemsPerPage]);

    return (
        <div>
            {isModalOpen && <EmployeeModal isOpen={true} onClose={() => { setIsModalOpen(false); setEmployeeToEdit(null); }} onSave={handleSave} employeeToEdit={employeeToEdit} />}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Employees ({filteredEmployees.length})</h3>
                <Button onClick={() => { setEmployeeToEdit(null); setIsModalOpen(true); }}>
                    <FontAwesomeIcon icon={faPlus} className="mr-2"/> Add Employee
                </Button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end border-b border-slate-200 dark:border-slate-800">
                     <Input
                        label="Search Employees"
                        placeholder="Name, ID, or Email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<FontAwesomeIcon icon={faSearch} />}
                    />
                    <Select label="Department" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                        {departmentOptions.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
                    </Select>
                     <Select label="Designation" value={designationFilter} onChange={e => setDesignationFilter(e.target.value)}>
                        {designationOptions.map(d => <option key={d} value={d}>{d === 'all' ? 'All Designations' : d}</option>)}
                    </Select>
                    <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </Select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Designation</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-6 text-slate-500">Loading...</td></tr>
                            ) : paginatedEmployees.map(emp => (
                                <tr key={emp.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => handleRowClick(emp.id)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <Avatar avatar={emp.profilePhotoUrl ? {type:'image', value: emp.profilePhotoUrl} : {type: 'initials', value: emp.name.split(' ').map(n=>n[0]).join(''), color: 'bg-blue-500'}}/>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{emp.name}</p>
                                                <p className="text-sm text-slate-500">{emp.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{emp.department || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{emp.designation || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{emp.email}<br/>{emp.phone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                         <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full uppercase ${emp.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                           {emp.status}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                                        <Button size="sm" variant="light" onClick={() => handleRowClick(emp.id)}>View Details</Button>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                     {filteredEmployees.length === 0 && !loading && <p className="p-4 text-center text-slate-500">No employees found.</p>}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                    totalItems={filteredEmployees.length}
                    itemsOnPage={paginatedEmployees.length}
                />
            </div>
        </div>
    );
};

export default EmployeesTab;
