

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Address, HospitalUpdateData, SubscriptionPackage, SubscriptionTransaction, NewSubscriptionTransactionData } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import FileInput from '../components/ui/FileInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faFileInvoice, faCogs, faCreditCard, faStar, faCheckCircle, faUsersCog } from '@fortawesome/free-solid-svg-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import RolesPermissionsScreen from './RolesPermissionsScreen';

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
        {footer && (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">
                {footer}
            </div>
        )}
    </div>
);

const timezones = [
    "(UTC-12:00) International Date Line West",
    "(UTC-05:00) Eastern Time (US & Canada)",
    "(UTC+00:00) Coordinated Universal Time",
    "(UTC+01:00) West Central Africa",
    "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
    "(UTC+08:00) Beijing, Perth, Singapore, Hong Kong",
    "(UTC+10:00) Eastern Australia, Guam, Vladivostok",
];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


const GeneralSettingsTab: React.FC = () => {
    const { user, updateHospitalSettings } = useAuth();
    const { addToast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '',
        address: { street: '', city: '', state: '', country: '', pincode: '' },
        logo: null as File | null, currency: 'USD', timezone: '', dateFormat: 'DD/MM/YYYY',
        timeFormat: '12-hour', financialYearStartMonth: 'April',
        gstin: '',
        dlNo: '',
        cinNo: '',
        fssaiNo: '',
        website: '',
        telephone: '',
    });

    const populateForm = useCallback(() => {
        if (user) {
            // FIX: Explicitly construct the address object to ensure the 'state' property is always a string, resolving the type conflict.
            setFormData({
                name: user.hospitalName || '', phone: user.hospitalPhone || '', email: user.hospitalEmail || '',
                address: {
                    street: user.hospitalAddress?.street || '',
                    city: user.hospitalAddress?.city || '',
                    state: user.hospitalAddress?.state || '',
                    country: user.hospitalAddress?.country || '',
                    pincode: user.hospitalAddress?.pincode || '',
                },
                logo: null, currency: user.hospitalCurrency || 'USD', timezone: user.hospitalTimezone || '',
                dateFormat: user.hospitalDateFormat || 'DD/MM/YYYY', timeFormat: user.hospitalTimeFormat || '12-hour',
                financialYearStartMonth: user.hospitalFinancialYearStartMonth || 'April',
                gstin: user.hospitalGstin || '',
                dlNo: user.hospitalDlNo || '',
                cinNo: user.hospitalCinNo || '',
                fssaiNo: user.hospitalFssaiNo || '',
                website: user.hospitalWebsite || '',
                telephone: user.hospitalTelephone || '',
            });
        }
    }, [user]);

    useEffect(() => { populateForm(); }, [populateForm]);
    
    const handleInputChange = (field: keyof typeof formData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
    const handleAddressChange = (field: keyof Address, value: string) => setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));

    const handleSave = async () => {
        setLoading(true);
        try {
            const updateData: HospitalUpdateData = {
                name: formData.name, phone: formData.phone, email: formData.email, address: formData.address,
                currency: formData.currency, timezone: formData.timezone, dateFormat: formData.dateFormat,
                timeFormat: formData.timeFormat, financialYearStartMonth: formData.financialYearStartMonth,
                gstin: formData.gstin,
                dlNo: formData.dlNo,
                cinNo: formData.cinNo,
                fssaiNo: formData.fssaiNo,
                website: formData.website,
                telephone: formData.telephone,
            };
            if (formData.logo) updateData.logo = formData.logo;
            await updateHospitalSettings(updateData);
            addToast("Hospital settings updated successfully!", "success");
            setIsEditing(false);
        } catch (error) {
            addToast("Failed to update settings.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        populateForm();
        setIsEditing(false);
    };

    const canEdit = user?.permissions['hospital-settings'] === 'write';

    return (
         <DetailCard
            title="General Hospital Settings"
            footer={canEdit ? (
                isEditing ? (
                    <div className="flex justify-end gap-2">
                        <Button variant="light" onClick={handleCancel} disabled={loading}><FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={loading}><FontAwesomeIcon icon={faSave} className="mr-2" /> {loading ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                ) : <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Settings</Button>
            ) : undefined}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Hospital Name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} disabled={!isEditing} />
                    <Input label="Phone Number" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} disabled={!isEditing} />
                    <Input label="Hospital Email" type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} disabled={!isEditing} />
                    <Input label="Website" type="url" value={formData.website} onChange={e => handleInputChange('website', e.target.value)} disabled={!isEditing} />
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">Address</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Street Address" value={formData.address.street} onChange={e => handleAddressChange('street', e.target.value)} disabled={!isEditing} />
                        <Input label="City" value={formData.address.city} onChange={e => handleAddressChange('city', e.target.value)} disabled={!isEditing} />
                        <Input label="State" value={formData.address.state || ''} onChange={e => handleAddressChange('state', e.target.value)} disabled={!isEditing} />
                        <Input label="Pincode" value={formData.address.pincode} onChange={e => handleAddressChange('pincode', e.target.value)} disabled={!isEditing} />
                        <Input label="Country" value={formData.address.country} onChange={e => handleAddressChange('country', e.target.value)} disabled={!isEditing} />
                     </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">Business & Tax Information</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Telephone No." type="tel" value={formData.telephone} onChange={e => handleInputChange('telephone', e.target.value)} disabled={!isEditing} />
                        <Input label="GSTIN No" value={formData.gstin} onChange={e => handleInputChange('gstin', e.target.value)} disabled={!isEditing} />
                        <Input label="DL No" value={formData.dlNo} onChange={e => handleInputChange('dlNo', e.target.value)} disabled={!isEditing} />
                        <Input label="CIN No" value={formData.cinNo} onChange={e => handleInputChange('cinNo', e.target.value)} disabled={!isEditing} />
                        <Input label="FSSAI No" value={formData.fssaiNo} onChange={e => handleInputChange('fssaiNo', e.target.value)} disabled={!isEditing} />
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">Localization & Financials</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select label="Currency" value={formData.currency} onChange={e => handleInputChange('currency', e.target.value)} disabled={!isEditing}>
                            <option value="USD">USD ($)</option><option value="INR">INR (₹)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
                        </Select>
                        <Select label="Timezone" value={formData.timezone} onChange={e => handleInputChange('timezone', e.target.value)} disabled={!isEditing}>{timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}</Select>
                        <Select label="Date Format" value={formData.dateFormat} onChange={e => handleInputChange('dateFormat', e.target.value)} disabled={!isEditing}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select>
                        <Select label="Time Format" value={formData.timeFormat} onChange={e => handleInputChange('timeFormat', e.target.value)} disabled={!isEditing}><option>12-hour</option><option>24-hour</option></Select>
                         <Select label="Financial Year Start" value={formData.financialYearStartMonth} onChange={e => handleInputChange('financialYearStartMonth', e.target.value)} disabled={!isEditing}>{months.map(month => <option key={month} value={month}>{month}</option>)}</Select>
                    </div>
                </div>
                {isEditing && <div className="md:col-span-2"><FileInput id="logo" label="Change Hospital Logo" onChange={(e) => handleInputChange('logo', e.target.files ? e.target.files[0] : null)} /></div>}
            </div>
        </DetailCard>
    );
};

const SubscriptionTab: React.FC = () => {
    const { user, getSubscriptionPackages, changeSubscriptionPackage, initiatePaymentForPackage } = useAuth();
    const { addToast } = useToast();
    const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{pkg: SubscriptionPackage, interval: 'monthly' | 'quarterly' | 'yearly'} | null>(null);
    const [confirmFreeModal, setConfirmFreeModal] = useState<SubscriptionPackage | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

    useEffect(() => {
        getSubscriptionPackages().then(setPackages).catch(() => addToast("Could not load subscription packages.", "error")).finally(() => setLoading(false));
    }, [getSubscriptionPackages, addToast]);
    
    const memberSince = useMemo(() => {
        if (!user?.hospitalCreatedAt) return null;
        return user.hospitalCreatedAt.toDate().toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }, [user?.hospitalCreatedAt]);
    
    const handleFreePackageSwitch = async () => {
        if (!confirmFreeModal) return;
        setActionLoading(true);
        try {
            await changeSubscriptionPackage(confirmFreeModal.id!, 'monthly');
            addToast("Successfully switched to the free plan!", "success");
        } catch (error) {
            addToast("Failed to switch plan.", "error");
        } finally {
            setActionLoading(false);
            setConfirmFreeModal(null);
        }
    };

    const handlePurchase = () => {
        if (!confirmModal) return;
        const { pkg, interval } = confirmModal;
        setConfirmModal(null);
        setActionLoading(true);
        initiatePaymentForPackage(pkg, interval);
        setTimeout(() => setActionLoading(false), 3000);
    };

    const getPrice = (pkg: SubscriptionPackage, interval: 'monthly' | 'quarterly' | 'yearly') => {
        return pkg.prices?.[interval] ?? 0;
    };
    
    const calculateSavePercent = (pkg: SubscriptionPackage, interval: 'quarterly' | 'yearly') => {
        const monthlyPrice = pkg.prices?.monthly ?? 0;
        if (monthlyPrice <= 0) return 0;

        const intervalPrice = pkg.prices?.[interval] ?? 0;
        const monthlyEquivalent = interval === 'quarterly' ? intervalPrice / 3 : intervalPrice / 12;
        
        if (monthlyEquivalent >= monthlyPrice) return 0;
        
        const saving = 1 - (monthlyEquivalent / monthlyPrice);
        return Math.round(saving * 100);
    };

    return (
        <div className="space-y-6">
            {confirmModal && <ConfirmationModal isOpen={true} onClose={() => setConfirmModal(null)} onConfirm={handlePurchase} title="Change Subscription Plan" message={`You are about to be charged ${formatCurrency(confirmModal.pkg.prices[confirmModal.interval], 'INR')} for the ${confirmModal.pkg.name} (${confirmModal.interval}) plan. Do you want to proceed?`} confirmButtonText="Proceed to Payment" confirmButtonVariant="primary" loading={actionLoading} />}
            {confirmFreeModal && <ConfirmationModal isOpen={true} onClose={() => setConfirmFreeModal(null)} onConfirm={handleFreePackageSwitch} title="Switch Plan" message={`Are you sure you want to switch to the ${confirmFreeModal.name} plan? This is a free plan.`} confirmButtonText="Confirm Switch" confirmButtonVariant="primary" loading={actionLoading} />}
            <DetailCard title="Current Subscription">
                 {loading ? <p>Loading...</p> : user?.subscriptionPackage ? (
                    <div>
                        <h4 className="text-2xl font-bold text-blue-600">{user.subscriptionPackage.name} Plan</h4>
                        <p className="mt-1 text-slate-500">{user.subscriptionPackage.description}</p>
                        {memberSince && <p className="mt-1 text-sm text-slate-500">Member since {memberSince}</p>}
                        {user.subscriptionPackage.prices?.monthly > 0 && user.hospitalSubscriptionExpiryDate && (
                            <p className="mt-4">Your plan renews on: <strong className="text-slate-800 dark:text-slate-200">{user.hospitalSubscriptionExpiryDate.toDate().toLocaleDateString()}</strong></p>
                        )}
                    </div>
                ) : <p>You are currently on a trial or have no active subscription. {memberSince && <span className="text-sm text-slate-500">Member since {memberSince}</span>}</p>}
            </DetailCard>
            <DetailCard title="Available Plans">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 border dark:border-slate-700 max-w-sm mx-auto mb-8">
                    <Button size="sm" variant={selectedInterval === 'monthly' ? 'light' : 'ghost'} onClick={() => setSelectedInterval('monthly')} className="!rounded-md shadow-sm w-full">Monthly</Button>
                    <Button size="sm" variant={selectedInterval === 'quarterly' ? 'light' : 'ghost'} onClick={() => setSelectedInterval('quarterly')} className="!rounded-md w-full">Quarterly</Button>
                    <Button size="sm" variant={selectedInterval === 'yearly' ? 'light' : 'ghost'} onClick={() => setSelectedInterval('yearly')} className="!rounded-md w-full">Yearly</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {packages.map(pkg => {
                        const quarterlySave = calculateSavePercent(pkg, 'quarterly');
                        const yearlySave = calculateSavePercent(pkg, 'yearly');
                        let savings = 0;
                        if (selectedInterval === 'quarterly') savings = quarterlySave;
                        if (selectedInterval === 'yearly') savings = yearlySave;
                        
                        return (
                        <div key={pkg.id} className={`relative border rounded-lg p-6 flex flex-col ${user?.subscriptionPackageId === pkg.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700'}`}>
                            {savings > 0 && <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">Save {savings}%</div>}
                            <h3 className="text-xl font-bold">{pkg.name}</h3>
                            <p className="mt-2 text-3xl font-extrabold">{formatCurrency(getPrice(pkg, selectedInterval), 'INR')}<span className="text-base font-medium text-slate-500">/{selectedInterval === 'monthly' ? 'mo' : selectedInterval === 'quarterly' ? 'qtr' : 'yr'}</span></p>
                            <p className="mt-2 text-sm text-slate-500 flex-grow min-h-[40px]">{pkg.description}</p>
                             <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                {pkg.maxUsers > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> Up to {pkg.maxUsers} staff users</li>}
                                {pkg.maxDoctors > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> Up to {pkg.maxDoctors} doctors</li>}
                                {pkg.maxPatients > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> Up to {pkg.maxPatients} patients</li>}
                                {pkg.maxTreatments > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> Up to {pkg.maxTreatments} treatments</li>}
                                {pkg.maxProducts > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> Up to {pkg.maxProducts} stock products</li>}
                                {pkg.maxReservationsPerMonth > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> {pkg.maxReservationsPerMonth} reservations/month</li>}
                                {pkg.maxSalesPerMonth > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> {pkg.maxSalesPerMonth} sales/month</li>}
                                {pkg.maxExpensesPerMonth > 0 && <li className="flex items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" /> {pkg.maxExpensesPerMonth} expenses/month</li>}
                            </ul>
                            <Button variant={user?.subscriptionPackageId === pkg.id ? 'success' : 'light'} className="mt-6 w-full" disabled={user?.subscriptionPackageId === pkg.id || actionLoading} onClick={() => getPrice(pkg, selectedInterval) === 0 ? setConfirmFreeModal(pkg) : setConfirmModal({pkg, interval: selectedInterval})}>
                                {user?.subscriptionPackageId === pkg.id ? 'Current Plan' : 'Switch to this Plan'}
                            </Button>
                        </div>
                    )})}
                </div>
            </DetailCard>
        </div>
    );
};

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbols: { [key: string]: string } = { USD: '$', INR: '₹' };
    const symbol = symbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const TransactionsTab: React.FC = () => {
    const { getSubscriptionTransactions } = useAuth();
    const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSubscriptionTransactions()
            .then(setTransactions)
            .finally(() => setLoading(false));
    }, [getSubscriptionTransactions]);

    return (
        <DetailCard title="Transaction History">
            {loading ? <p>Loading...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Package</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {transactions.length > 0 ? transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{tx.createdAt.toDate().toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{tx.packageName} ({tx.interval})</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{formatCurrency(tx.amount, 'INR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{tx.paymentId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-slate-500 dark:text-slate-400">No transactions found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </DetailCard>
    );
};


const HospitalSettingsScreen: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('general');

     useEffect(() => {
        if (location.state?.openSubscriptionTab) {
            setActiveTab('subscription');
        }
    }, [location.state]);

    const TabButton: React.FC<{ tabId: string, title: string, icon: any }> = ({ tabId, title, icon }) => (
        <button onClick={() => setActiveTab(tabId)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 font-medium text-sm rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <FontAwesomeIcon icon={icon} /> {title}
        </button>
    );

    const canSeeRoles = user?.roleName === 'owner';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            <div className="mb-6">
                <nav className="flex space-x-2 border-b border-slate-200 dark:border-slate-800" aria-label="Tabs">
                    <TabButton tabId="general" title="General Settings" icon={faCogs} />
                    {canSeeRoles && <TabButton tabId="roles" title="Roles & Permissions" icon={faUsersCog} />}
                    <TabButton tabId="subscription" title="Subscription" icon={faCreditCard} />
                    <TabButton tabId="transactions" title="Transactions" icon={faFileInvoice} />
                </nav>
            </div>
            {activeTab === 'general' && <GeneralSettingsTab />}
            {activeTab === 'roles' && canSeeRoles && <RolesPermissionsScreen />}
            {activeTab === 'subscription' && <SubscriptionTab />}
            {activeTab === 'transactions' && <TransactionsTab />}
        </div>
    );
};

export default HospitalSettingsScreen;