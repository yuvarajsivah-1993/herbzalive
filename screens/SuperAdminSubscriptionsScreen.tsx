import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SubscriptionPackage, NewSubscriptionPackageData } from '../types';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPencilAlt, faTrashAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbol = currencySymbols[currencyCode] || '$';
    if(isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const PackageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewSubscriptionPackageData, id?: string) => Promise<void>;
  packageToEdit: SubscriptionPackage | null;
}> = ({ isOpen, onClose, onSave, packageToEdit }) => {
  const isEditMode = !!packageToEdit;
  const initialState: NewSubscriptionPackageData = { name: '', description: '', prices: { monthly: 0, quarterly: 0, yearly: 0 }, maxUsers: 0, maxDoctors: 0, maxPatients: 0, maxProducts: 0, maxTreatments: 0, maxReservationsPerMonth: 0, maxSalesPerMonth: 0, maxExpensesPerMonth: 0 };
  const [formData, setFormData] = useState<NewSubscriptionPackageData>(initialState);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData(packageToEdit ? {
        name: packageToEdit.name,
        description: packageToEdit.description,
        prices: packageToEdit.prices || { monthly: 0, quarterly: 0, yearly: 0 },
        maxUsers: packageToEdit.maxUsers,
        maxDoctors: packageToEdit.maxDoctors,
        maxPatients: packageToEdit.maxPatients,
        maxProducts: packageToEdit.maxProducts,
        maxTreatments: packageToEdit.maxTreatments,
        maxReservationsPerMonth: packageToEdit.maxReservationsPerMonth,
        maxSalesPerMonth: packageToEdit.maxSalesPerMonth,
        maxExpensesPerMonth: packageToEdit.maxExpensesPerMonth,
      } : initialState);
    }
  }, [isOpen, packageToEdit]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);
  
  const handleChange = (field: keyof Omit<NewSubscriptionPackageData, 'prices'>, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePriceChange = (interval: 'monthly' | 'quarterly' | 'yearly', value: number) => {
      setFormData(prev => ({ ...prev, prices: { ...prev.prices, [interval]: value }}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, packageToEdit?.id);
      addToast(`Package ${isEditMode ? 'updated' : 'created'} successfully!`, 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to save package.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl m-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{isEditMode ? 'Edit' : 'Create'} Subscription Package</h2></div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
            <div className="md:col-span-3"><Input label="Package Name" value={formData.name} onChange={e => handleChange('name', e.target.value)} required /></div>
            <div className="md:col-span-3"><Textarea label="Description" value={formData.description} onChange={e => handleChange('description', e.target.value)} required /></div>
            
            <Input label="Monthly Price (INR)" type="number" step="0.01" value={formData.prices?.monthly ?? 0} onChange={e => handlePriceChange('monthly', parseFloat(e.target.value) || 0)} required />
            <Input label="Quarterly Price (INR)" type="number" step="0.01" value={formData.prices?.quarterly ?? 0} onChange={e => handlePriceChange('quarterly', parseFloat(e.target.value) || 0)} required />
            <Input label="Yearly Price (INR)" type="number" step="0.01" value={formData.prices?.yearly ?? 0} onChange={e => handlePriceChange('yearly', parseFloat(e.target.value) || 0)} required />

            <Input label="Max Users" type="number" value={formData.maxUsers} onChange={e => handleChange('maxUsers', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
            <Input label="Max Doctors" type="number" value={formData.maxDoctors} onChange={e => handleChange('maxDoctors', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
            <Input label="Max Patients" type="number" value={formData.maxPatients} onChange={e => handleChange('maxPatients', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
            <Input label="Max Products" type="number" value={formData.maxProducts} onChange={e => handleChange('maxProducts', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
            <Input label="Max Treatments" type="number" value={formData.maxTreatments} onChange={e => handleChange('maxTreatments', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
            <Input label="Reservations/month" type="number" value={formData.maxReservationsPerMonth} onChange={e => handleChange('maxReservationsPerMonth', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
            <Input label="Sales/month" type="number" value={formData.maxSalesPerMonth} onChange={e => handleChange('maxSalesPerMonth', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
            <Input label="Expenses/month" type="number" value={formData.maxExpensesPerMonth} onChange={e => handleChange('maxExpensesPerMonth', parseInt(e.target.value) || 0)} helperText="0 for unlimited" />
          </div>
          <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t"><Button type="button" variant="light" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Package'}</Button></div>
        </form>
      </div>
    </div>
  );
};


const SuperAdminSubscriptionsScreen: React.FC = () => {
    const { allSubscriptionPackages, addSubscriptionPackage, updateSubscriptionPackage, deleteSubscriptionPackage } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<{ isOpen: boolean; pkg: SubscriptionPackage | null }>({ isOpen: false, pkg: null });
    const [confirmDelete, setConfirmDelete] = useState<SubscriptionPackage | null>(null);

    const handleSave = async (data: NewSubscriptionPackageData, id?: string) => {
        setLoading(true);
        try {
            if (id) {
                await updateSubscriptionPackage(id, data);
            } else {
                await addSubscriptionPackage(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete?.id) return;
        setLoading(true);
        try {
            await deleteSubscriptionPackage(confirmDelete.id);
            addToast("Package deleted successfully.", "success");
        } catch (error: any) { 
            addToast(error.message || "Failed to delete package.", "error"); 
        } finally { 
            setConfirmDelete(null); 
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <PackageModal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, pkg: null })} onSave={handleSave} packageToEdit={modal.pkg} />
            {confirmDelete && <ConfirmationModal isOpen={true} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Delete Package" message={`Are you sure you want to delete the "${confirmDelete.name}" package?`} confirmButtonText="Delete" confirmButtonVariant="danger" />}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                <div className="p-6 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Subscription Packages</h2>
                    <Button onClick={() => setModal({ isOpen: true, pkg: null })}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Create Package</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                         <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Price (Monthly)</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Users</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Doctors</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Products</th>
                                <th className="relative px-6 py-3"></th>
                            </tr>
                         </thead>
                         <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {allSubscriptionPackages.length === 0 && !loading ? (
                                <tr><td colSpan={6} className="text-center p-6 text-slate-500">No packages found.</td></tr>
                            ) : allSubscriptionPackages.map(pkg => {
                                const isFreePlan = pkg.name === 'Free Plan';
                                return (
                                    <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{pkg.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{formatCurrency(pkg.prices?.monthly ?? 0, 'INR')}/m</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{pkg.maxUsers || 'Unlimited'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{pkg.maxDoctors || 'Unlimited'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{pkg.maxProducts || 'Unlimited'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <Button variant="ghost" size="sm" onClick={() => setModal({ isOpen: true, pkg })}><FontAwesomeIcon icon={faPencilAlt}/></Button>
                                            <div className="inline-block" title={isFreePlan ? "The Free Plan cannot be deleted" : ""}>
                                                <Button variant="ghost" size="sm" onClick={() => !isFreePlan && setConfirmDelete(pkg)} disabled={isFreePlan}>
                                                    <FontAwesomeIcon icon={faTrashAlt} className={isFreePlan ? 'text-slate-400' : 'text-red-500'}/>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                         </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminSubscriptionsScreen;