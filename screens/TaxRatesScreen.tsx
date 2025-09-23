import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Tax, NewTaxData, TaxGroup, NewTaxGroupData } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPencilAlt, faTrashAlt, faEllipsisV, faPercent } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import MultiSelect, { MultiSelectOption } from '../components/ui/MultiSelect';

// Tax Rate Modal Component
const TaxRateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewTaxData, id?: string) => Promise<void>;
  taxToEdit: Tax | null;
}> = ({ isOpen, onClose, onSave, taxToEdit }) => {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (taxToEdit) {
        setName(taxToEdit.name);
        setRate(String(taxToEdit.rate));
      } else {
        setName('');
        setRate('');
      }
      setError('');
    }
  }, [isOpen, taxToEdit]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rate) {
      setError("All fields are required.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, rate: parseFloat(rate) }, taxToEdit?.id);
      addToast(`Tax Rate ${taxToEdit ? 'updated' : 'added'} successfully!`, 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save tax rate.');
      addToast(err.message || 'Failed to save tax rate.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{taxToEdit ? 'Edit' : 'Add'} Tax Rate</h3>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <Input id="name" label="Tax Name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g., VAT" />
            <Input id="rate" label="Rate (%)" type="number" step="0.01" required value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g., 5" />
          </div>
          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
          <div className="flex justify-end space-x-2 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
            <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Tax Group Modal Component
const TaxGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewTaxGroupData, id?: string) => Promise<void>;
  groupToEdit: TaxGroup | null;
  allTaxes: Tax[];
}> = ({ isOpen, onClose, onSave, groupToEdit, allTaxes }) => {
    const [name, setName] = useState('');
    const [taxIds, setTaxIds] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    const taxOptions = useMemo<MultiSelectOption[]>(() => allTaxes.map(t => ({ value: t.id!, label: `${t.name} (${t.rate}%)` })), [allTaxes]);

    useEffect(() => {
        if (isOpen) {
            if (groupToEdit) {
                setName(groupToEdit.name);
                setTaxIds(groupToEdit.taxIds);
            } else {
                setName('');
                setTaxIds([]);
            }
            setError('');
        }
    }, [isOpen, groupToEdit]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || taxIds.length === 0) {
            setError("Group name and at least one tax rate are required.");
            return;
        }
        setError('');
        setLoading(true);
        try {
            await onSave({ name, taxIds }, groupToEdit?.id);
            addToast(`Tax Group ${groupToEdit ? 'updated' : 'added'} successfully!`, 'success');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save tax group.');
            addToast(err.message || 'Failed to save tax group.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{groupToEdit ? 'Edit' : 'Add'} Tax Group</h3>
                    <div className="mt-4 space-y-4">
                        <Input id="groupName" label="Group Name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Standard GST" />
                        <MultiSelect label="Select Tax Rates" options={taxOptions} selectedValues={taxIds} onChange={setTaxIds} placeholder="Choose taxes..." />
                    </div>
                    {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                    <div className="flex justify-end space-x-2 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const TaxRatesScreen: React.FC = () => {
    const { user, getTaxes, addTax, updateTax, deleteTax, getTaxGroups, addTaxGroup, updateTaxGroup, deleteTaxGroup } = useAuth();
    const [activeTab, setActiveTab] = useState('rates');
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    // Modals state
    const [taxRateModal, setTaxRateModal] = useState<{ isOpen: boolean; tax: Tax | null }>({ isOpen: false, tax: null });
    const [taxGroupModal, setTaxGroupModal] = useState<{ isOpen: boolean; group: TaxGroup | null }>({ isOpen: false, group: null });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'rate' | 'group'; id: string; name: string } | null>(null);

    const canWrite = user?.permissions['tax-rates'] === 'write';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [taxesData, taxGroupsData] = await Promise.all([getTaxes(), getTaxGroups()]);
            setTaxes(taxesData);
            setTaxGroups(taxGroupsData);
        } catch (error) {
            addToast("Failed to load tax data.", "error");
        } finally {
            setLoading(false);
        }
    }, [getTaxes, getTaxGroups, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveTaxRate = (data: NewTaxData, id?: string) => id ? updateTax(id, data).finally(fetchData) : addTax(data).finally(fetchData);
    const handleSaveTaxGroup = (data: NewTaxGroupData, id?: string) => id ? updateTaxGroup(id, data).finally(fetchData) : addTaxGroup(data).finally(fetchData);

    const handleDelete = async () => {
        if (!confirmModal) return;
        try {
            if (confirmModal.type === 'rate') {
                await deleteTax(confirmModal.id);
            } else {
                await deleteTaxGroup(confirmModal.id);
            }
            addToast(`${confirmModal.type === 'rate' ? 'Tax Rate' : 'Tax Group'} deleted successfully.`, 'success');
            fetchData();
        } catch (error) {
            addToast("Failed to delete item.", "error");
        } finally {
            setConfirmModal(null);
        }
    };

    const taxMap = useMemo(() => new Map(taxes.map(t => [t.id, t])), [taxes]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {taxRateModal.isOpen && <TaxRateModal isOpen={true} onClose={() => setTaxRateModal({ isOpen: false, tax: null })} onSave={handleSaveTaxRate} taxToEdit={taxRateModal.tax} />}
            {taxGroupModal.isOpen && <TaxGroupModal isOpen={true} onClose={() => setTaxGroupModal({ isOpen: false, group: null })} onSave={handleSaveTaxGroup} groupToEdit={taxGroupModal.group} allTaxes={taxes} />}
            {confirmModal?.isOpen && <ConfirmationModal isOpen={true} onClose={() => setConfirmModal(null)} onConfirm={handleDelete} title={`Delete ${confirmModal.type === 'rate' ? 'Tax Rate' : 'Tax Group'}`} message={`Are you sure you want to delete "${confirmModal.name}"? This cannot be undone.`} confirmButtonText="Delete" confirmButtonVariant="danger" />}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                <div className="border-b border-slate-200 dark:border-slate-800">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <button onClick={() => setActiveTab('rates')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'rates' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>Individual Tax Rates</button>
                        <button onClick={() => setActiveTab('groups')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'groups' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>Tax Groups</button>
                    </nav>
                </div>
                {activeTab === 'rates' && (
                    <div>
                        <div className="p-6 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Manage individual tax components</h3>
                            {canWrite && <Button onClick={() => setTaxRateModal({ isOpen: true, tax: null })}><FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Tax Rate</Button>}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                <thead className="bg-slate-50 dark:bg-slate-800/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rate (%)</th><th className="relative px-6 py-3"></th></tr></thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                    {loading ? <tr><td colSpan={3} className="text-center p-6 text-slate-500 dark:text-slate-400">Loading...</td></tr> : taxes.map(tax => (
                                        <tr key={tax.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{tax.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{tax.rate}%</td>
                                            <td className="px-6 py-4 text-right">
                                                {canWrite && (
                                                    <>
                                                        <Button variant="ghost" size="sm" onClick={() => setTaxRateModal({ isOpen: true, tax })}><FontAwesomeIcon icon={faPencilAlt} /></Button>
                                                        <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ isOpen: true, type: 'rate', id: tax.id!, name: tax.name })}><FontAwesomeIcon icon={faTrashAlt} className="text-red-500" /></Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'groups' && (
                     <div>
                        <div className="p-6 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Combine multiple taxes into groups</h3>
                            {canWrite && <Button onClick={() => setTaxGroupModal({ isOpen: true, group: null })}><FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Tax Group</Button>}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                <thead className="bg-slate-50 dark:bg-slate-800/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Group Name</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Included Taxes</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Rate (%)</th><th className="relative px-6 py-3"></th></tr></thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                    {loading ? <tr><td colSpan={4} className="text-center p-6 text-slate-500 dark:text-slate-400">Loading...</td></tr> : taxGroups.map(group => (
                                        <tr key={group.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{group.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                <div className="flex flex-wrap gap-1">{group.taxIds.map(id => taxMap.get(id) ? <span key={id} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">{taxMap.get(id)!.name}</span> : null)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-200">{group.totalRate.toFixed(2)}%</td>
                                            <td className="px-6 py-4 text-right">
                                                {canWrite && (
                                                    <>
                                                        <Button variant="ghost" size="sm" onClick={() => setTaxGroupModal({ isOpen: true, group })}><FontAwesomeIcon icon={faPencilAlt} /></Button>
                                                        <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ isOpen: true, type: 'group', id: group.id!, name: group.name })}><FontAwesomeIcon icon={faTrashAlt} className="text-red-500" /></Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaxRatesScreen;
