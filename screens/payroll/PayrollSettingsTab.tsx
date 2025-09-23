// screens/payroll/PayrollSettingsTab.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SalaryComponent, SalaryGroup, NewSalaryComponentData, NewSalaryGroupData, MonthlyBonus, NewMonthlyBonusData } from '../../types';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPencilAlt, faTrashAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import MultiSelect, { MultiSelectOption } from '../../components/ui/MultiSelect';

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const symbol = currencySymbols[currencyCode] || '$';
    if (isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const PayrollSettingsTab: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SalaryComponents />
            <SalaryGroups />
            <div className="lg:col-span-2">
                <MonthlyBonusSettings />
            </div>
        </div>
    );
};


const SalaryComponents = () => {
    const { user, getSalaryComponents, addSalaryComponent, updateSalaryComponent, deleteSalaryComponent } = useAuth();
    const { addToast } = useToast();
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ isOpen: boolean; component: SalaryComponent | null }>({isOpen: false, component: null});
    const [confirmDelete, setConfirmDelete] = useState<SalaryComponent | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            setComponents(await getSalaryComponents());
        } catch (e) {
            addToast("Failed to load salary components.", "error");
        } finally {
            setLoading(false);
        }
    }, [getSalaryComponents, addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (data: NewSalaryComponentData, id?: string) => {
        if (id) {
            await updateSalaryComponent(id, data);
        } else {
            await addSalaryComponent(data);
        }
        fetchData();
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteSalaryComponent(confirmDelete.id!);
            addToast("Component deleted.", "success");
            fetchData();
        } catch (e) {
            addToast("Failed to delete component.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };
    
    return (
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <ComponentModal isOpen={modal.isOpen} onClose={() => setModal({isOpen: false, component: null})} onSave={handleSave} componentToEdit={modal.component} />
            {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Delete Component" message={`Are you sure you want to delete ${confirmDelete.name}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}

            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Salary Components</h3>
                <Button size="sm" onClick={() => setModal({isOpen: true, component: null})}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add Component</Button>
            </div>
            <div className="p-4">
                {loading ? <p>Loading...</p> : components.map(c => {
                    const isBasicPay = c.name.toLowerCase() === 'basic' || c.name.toLowerCase() === 'basic pay';
                    return (
                        <div key={c.id} className="p-3 mb-2 rounded-md bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                            <div>
                                <p className="font-medium">{c.name}</p>
                                <p className="text-xs text-slate-500">{c.calculationType.replace('-', ' of ')} - <span className={c.type === 'earning' ? 'text-green-600' : 'text-red-600'}>{c.type}</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="font-semibold text-sm">{c.calculationType === 'flat' ? formatCurrency(c.value, user?.hospitalCurrency) : `${c.value}%`}</span>
                               <Button size="sm" variant="ghost" onClick={() => setModal({isOpen: true, component: c})}><FontAwesomeIcon icon={faPencilAlt} /></Button>
                               <div title={isBasicPay ? "Default component cannot be deleted" : ""}>
                                   <Button size="sm" variant="ghost" onClick={() => !isBasicPay && setConfirmDelete(c)} disabled={isBasicPay}>
                                       <FontAwesomeIcon icon={faTrashAlt} className={isBasicPay ? 'text-slate-400' : 'text-red-500'}/>
                                   </Button>
                               </div>
                            </div>
                        </div>
                    );
                })}
                 {!loading && components.length === 0 && <p className="text-center text-slate-500 py-4">No components created yet.</p>}
            </div>
        </div>
    );
};

const SalaryGroups = () => {
    const { getSalaryGroups, getSalaryComponents, addSalaryGroup, updateSalaryGroup, deleteSalaryGroup } = useAuth();
    const { addToast } = useToast();
    const [groups, setGroups] = useState<SalaryGroup[]>([]);
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ isOpen: boolean; group: SalaryGroup | null }>({isOpen: false, group: null});
    const [confirmDelete, setConfirmDelete] = useState<SalaryGroup | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [groupsData, componentsData] = await Promise.all([getSalaryGroups(), getSalaryComponents()]);
            setGroups(groupsData);
            setComponents(componentsData);
        } catch (e) {
            addToast("Failed to load salary groups.", "error");
        } finally {
            setLoading(false);
        }
    }, [getSalaryGroups, getSalaryComponents, addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const componentMap = useMemo(() => new Map(components.map(c => [c.id, c])), [components]);
    
    const handleSave = async (data: NewSalaryGroupData, id?: string) => {
        if (id) {
            await updateSalaryGroup(id, data);
        } else {
            await addSalaryGroup(data);
        }
        fetchData();
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteSalaryGroup(confirmDelete.id!);
            addToast("Group deleted.", "success");
            fetchData();
        } catch (e) {
            addToast("Failed to delete group.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };
    
    return (
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
             <GroupModal isOpen={modal.isOpen} onClose={() => setModal({isOpen: false, group: null})} onSave={handleSave} groupToEdit={modal.group} allComponents={components} />
             {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Delete Group" message={`Are you sure you want to delete ${confirmDelete.name}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Salary Group Templates</h3>
                <Button size="sm" onClick={() => setModal({isOpen: true, group: null})}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add Group</Button>
            </div>
            <div className="p-4">
                 {loading ? <p>Loading...</p> : groups.map(g => (
                    <div key={g.id} className="p-3 mb-2 rounded-md bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">{g.name}</p>
                                <p className="text-xs text-slate-500">{g.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <Button size="sm" variant="ghost" onClick={() => setModal({isOpen: true, group: g})}><FontAwesomeIcon icon={faPencilAlt} /></Button>
                               <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(g)}><FontAwesomeIcon icon={faTrashAlt} className="text-red-500"/></Button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {g.components.map(id => componentMap.get(id) ? <span key={id} className={`text-xs px-2 py-0.5 rounded-full ${componentMap.get(id)!.type === 'earning' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{componentMap.get(id)!.name}</span> : null)}
                        </div>
                    </div>
                ))}
                 {!loading && groups.length === 0 && <p className="text-center text-slate-500 py-4">No groups created yet.</p>}
            </div>
        </div>
    );
};

const MonthlyBonusSettings = () => {
    // FIX: Property 'hospitalMonthlyBonuses' does not exist on type 'AuthContextType'. Access from user object instead.
    const { user, addMonthlyBonus, updateMonthlyBonus, deleteMonthlyBonus } = useAuth();
    const { addToast } = useToast();
    const [modal, setModal] = useState<{ isOpen: boolean; bonus: MonthlyBonus | null }>({ isOpen: false, bonus: null });
    const [confirmDelete, setConfirmDelete] = useState<MonthlyBonus | null>(null);

    const bonuses = useMemo(() => (user?.hospitalMonthlyBonuses || []).sort((a, b) => b.period.localeCompare(a.period)), [user?.hospitalMonthlyBonuses]);

    const handleSave = async (data: NewMonthlyBonusData, id?: string) => {
        if (id) {
            await updateMonthlyBonus(id, data);
        } else {
            await addMonthlyBonus(data);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteMonthlyBonus(confirmDelete.id);
            addToast("Bonus setting deleted.", "success");
        } catch (e) {
            addToast("Failed to delete bonus setting.", "error");
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <BonusModal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, bonus: null })} onSave={handleSave} bonusToEdit={modal.bonus} />
            {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Delete Bonus" message={`Are you sure you want to delete the bonus for ${confirmDelete.period}?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}
            
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Monthly Bonus Settings</h3>
                <Button size="sm" onClick={() => setModal({ isOpen: true, bonus: null })}><FontAwesomeIcon icon={faPlus} className="mr-2" />Add Bonus</Button>
            </div>
            <div className="p-4">
                {bonuses.map(bonus => (
                    <div key={bonus.id} className="p-3 mb-2 rounded-md bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <div>
                            <p className="font-medium">{new Date(bonus.period + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{bonus.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-semibold text-sm">{bonus.type === 'flat' ? formatCurrency(bonus.value, user?.hospitalCurrency) : `${bonus.value}% of CTC`}</span>
                            <Button size="sm" variant="ghost" onClick={() => setModal({ isOpen: true, bonus })}><FontAwesomeIcon icon={faPencilAlt} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(bonus)}><FontAwesomeIcon icon={faTrashAlt} className="text-red-500" /></Button>
                        </div>
                    </div>
                ))}
                {bonuses.length === 0 && <p className="text-center text-slate-500 py-4">No monthly bonuses configured.</p>}
            </div>
        </div>
    );
};

// Modals
const ComponentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewSalaryComponentData, id?: string) => Promise<void>;
  componentToEdit: SalaryComponent | null;
}> = ({ isOpen, onClose, onSave, componentToEdit }) => {
    const [formData, setFormData] = useState<NewSalaryComponentData>({ name: '', type: 'earning', calculationType: 'flat', value: 0 });
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            if (componentToEdit) {
                setFormData({
                    name: componentToEdit.name,
                    type: componentToEdit.type,
                    calculationType: componentToEdit.calculationType,
                    value: componentToEdit.value,
                });
            } else {
                setFormData({ name: '', type: 'earning', calculationType: 'flat', value: 0 });
            }
        }
    }, [isOpen, componentToEdit]);
    
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData, componentToEdit?.id);
            addToast(`Component ${componentToEdit ? 'updated' : 'added'} successfully!`, 'success');
            onClose();
        } catch (err: any) {
            addToast(err.message || 'Failed to save component.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    const isBasicPay = componentToEdit && (componentToEdit.name.toLowerCase() === 'basic' || componentToEdit.name.toLowerCase() === 'basic pay');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{componentToEdit ? 'Edit Component' : 'New Component'}</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <Input label="Component Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required disabled={isBasicPay}/>
                            <Select label="Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} disabled={isBasicPay}>
                                <option value="earning">Earning</option>
                                <option value="deduction">Deduction</option>
                            </Select>
                            <Select label="Calculation Type" value={formData.calculationType} onChange={e => setFormData({...formData, calculationType: e.target.value as any})}>
                                <option value="flat">Flat Amount</option>
                                <option value="percentage-ctc">Percentage of CTC</option>
                                {!isBasicPay && <option value="percentage-basic">Percentage of Basic Pay</option>}
                            </Select>
                            <Input label="Value" type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} required/>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
                        <Button type="button" variant="light" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const GroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewSalaryGroupData, id?: string) => Promise<void>;
  groupToEdit: SalaryGroup | null;
  allComponents: SalaryComponent[];
}> = ({ isOpen, onClose, onSave, groupToEdit, allComponents }) => {
    const [formData, setFormData] = useState<NewSalaryGroupData>({ name: '', description: '', components: []});
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            if (groupToEdit) {
                setFormData({ name: groupToEdit.name, description: groupToEdit.description, components: groupToEdit.components });
            } else {
                setFormData({ name: '', description: '', components: []});
            }
        }
    }, [isOpen, groupToEdit]);
    
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    const componentOptions = useMemo<MultiSelectOption[]>(() => allComponents.map(c => ({ value: c.id!, label: `${c.name} (${c.type})`})), [allComponents]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || formData.components.length === 0) {
            addToast("Group name and at least one component are required.", "error");
            return;
        }
        setLoading(true);
        try {
            await onSave(formData, groupToEdit?.id);
            addToast(`Group ${groupToEdit ? 'updated' : 'added'} successfully!`, 'success');
            onClose();
        } catch (err: any) {
            addToast(err.message || 'Failed to save group.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{groupToEdit ? 'Edit Group' : 'New Group'}</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <Input label="Group Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required/>
                            <Input label="Description" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                            <MultiSelect label="Select Components" options={componentOptions} selectedValues={formData.components} onChange={vals => setFormData({...formData, components: vals})} />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
                        <Button type="button" variant="light" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BonusModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewMonthlyBonusData, id?: string) => Promise<void>;
    bonusToEdit: MonthlyBonus | null;
}> = ({ isOpen, onClose, onSave, bonusToEdit }) => {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear().toString());
    const [month, setMonth] = useState((today.getMonth() + 1).toString().padStart(2, '0'));
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'flat' | 'percentage-ctc'>('flat');
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            if (bonusToEdit) {
                const [editYear, editMonth] = bonusToEdit.period.split('-');
                setYear(editYear);
                setMonth(editMonth);
                setDescription(bonusToEdit.description);
                setType(bonusToEdit.type);
                setValue(String(bonusToEdit.value));
            } else {
                const now = new Date();
                setYear(now.getFullYear().toString());
                setMonth((now.getMonth() + 1).toString().padStart(2, '0'));
                setDescription('');
                setType('flat');
                setValue('');
            }
        }
    }, [isOpen, bonusToEdit]);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const bonusValue = parseFloat(value);
        if (!description || !value || isNaN(bonusValue) || bonusValue <= 0) {
            addToast("Please fill all fields with valid values.", "error");
            return;
        }
        setLoading(true);
        try {
            await onSave({
                period: `${year}-${month}`,
                description,
                type,
                value: bonusValue,
            }, bonusToEdit?.id);
            addToast(`Bonus ${bonusToEdit ? 'updated' : 'added'} successfully!`, 'success');
            onClose();
        } catch (err: any) {
            addToast(err.message || 'Failed to save bonus.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i + 2);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), name: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h3 className="text-lg font-bold">{bonusToEdit ? 'Edit' : 'Add'} Monthly Bonus</h3></div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Month" value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</Select>
                            <Select label="Year" value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</Select>
                        </div>
                        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g., Diwali Bonus" />
                        <Select label="Bonus Type" value={type} onChange={e => setType(e.target.value as any)}>
                            <option value="flat">Flat Amount</option>
                            <option value="percentage-ctc">Percentage of Monthly CTC</option>
                        </Select>
                        <Input label="Value" type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} required placeholder={type === 'flat' ? 'e.g., 5000' : 'e.g., 10'} />
                    </div>
                    <div className="flex justify-end space-x-2 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
                        <Button type="button" variant="light" onClick={onClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PayrollSettingsTab;
