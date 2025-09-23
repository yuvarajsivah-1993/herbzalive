import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Hospital, UserDocument, SubscriptionPackage, SubscriptionTransaction, AuditLog } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faPencilAlt, faBuilding, faPhone, faMapMarkerAlt, faIdBadge, faUserTie, faCalendarAlt, faExclamationTriangle, faHistory, faUser, faCalendar, faFilter } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../components/ui/Avatar';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';
import Pagination from '../components/ui/Pagination';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    if(isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};


const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode, actions?: React.ReactNode }> = ({ title, children, footer, actions }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            {actions && <div>{actions}</div>}
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">{footer}</div>}
    </div>
);

const InfoItem: React.FC<{ icon: any, label: string, value?: string | null }> = ({ icon, label, value }) => (
    <div className="flex items-start">
        <FontAwesomeIcon icon={icon} className="h-5 w-5 text-slate-400 mt-1" />
        <div className="ml-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{value || 'Not provided'}</p>
        </div>
    </div>
);

const LogsTab: React.FC<{ hospitalId: string; users: UserDocument[] }> = ({ hospitalId, users }) => {
    const { getAuditLogsForHospital } = useAuth();
    const { addToast } = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const usersWithUid = useMemo(() => users.filter(u => u.uid), [users]);

    const [userFilter, setUserFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    useEffect(() => {
        setLoading(true);
        getAuditLogsForHospital(hospitalId)
            .then(setLogs)
            .catch(() => addToast("Failed to load audit logs.", "error"))
            .finally(() => setLoading(false));
    }, [hospitalId, getAuditLogsForHospital, addToast]);
    
    const filteredLogs = useMemo(() => {
        return logs
            .filter(log => userFilter === 'all' || log.userId === userFilter)
            .filter(log => {
                if (!dateFilter) return true;
                const logDate = log.timestamp.toDate();
                const filterDate = new Date(dateFilter);
                return logDate.getFullYear() === filterDate.getFullYear() &&
                       logDate.getMonth() === filterDate.getMonth() &&
                       logDate.getDate() === filterDate.getDate();
            });
    }, [logs, userFilter, dateFilter]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [userFilter, dateFilter]);

    const totalPages = useMemo(() => Math.ceil(filteredLogs.length / itemsPerPage), [filteredLogs.length, itemsPerPage]);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLogs, currentPage, itemsPerPage]);

    return (
        <DetailCard title="Audit Logs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <Select label="Filter by User" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                    <option value="all">All Users</option>
                    {usersWithUid.map(u => <option key={u.uid} value={u.uid!}>{u.name}</option>)}
                </Select>
                <Input label="Filter by Date" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? <tr><td colSpan={4} className="text-center p-4">Loading logs...</td></tr>
                        : paginatedLogs.length === 0 ? <tr><td colSpan={4} className="text-center p-4">No logs found for the selected filters.</td></tr>
                        : paginatedLogs.map(log => (
                            <tr key={log.id}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{log.timestamp.toDate().toLocaleString()}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{log.userName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-600 dark:text-slate-400">{log.action}</td>
                                <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                totalItems={filteredLogs.length}
                itemsOnPage={paginatedLogs.length}
            />
        </DetailCard>
    );
};

const SuperAdminHospitalDetailsScreen: React.FC = () => {
    const { hospitalId } = useParams<{ hospitalId: string }>();
    const navigate = useNavigate();
    const { allHospitals, allSubscriptionPackages, allSubscriptionTransactions, getUsersForHospitalBySuperAdmin, getAuditLogsForHospital } = useAuth();
    const { addToast } = useToast();

    const [hospital, setHospital] = useState<Hospital | null>(null);
    const [users, setUsers] = useState<UserDocument[]>([]);
    const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [expiryDate, setExpiryDate] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [subscriptionPackageId, setSubscriptionPackageId] = useState('');
    const [subscriptionInterval, setSubscriptionInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

    const [activeTab, setActiveTab] = useState('details');

    // Pagination for transactions
    const [transactionsCurrentPage, setTransactionsCurrentPage] = useState(1);
    const [transactionsItemsPerPage, setTransactionsItemsPerPage] = useState(10);

    const fetchData = useCallback(async () => {
        if (!hospitalId) return;
        setLoading(true);
        try {
            const usersData = await getUsersForHospitalBySuperAdmin(hospitalId);
            setUsers(usersData);
        } catch (error) {
            addToast("Failed to load hospital users.", "error");
        } finally {
            setLoading(false);
        }
    }, [hospitalId, getUsersForHospitalBySuperAdmin, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
      if (hospitalId && allHospitals.length > 0) {
        const hospitalData = allHospitals.find(h => h.id === hospitalId);
        if (hospitalData) {
          setHospital(hospitalData);
          const dateToSet = hospitalData.subscriptionExpiryDate ? hospitalData.subscriptionExpiryDate.toDate() : new Date();
          setExpiryDate(dateToSet.toISOString().split('T')[0]);
          setStatus(hospitalData.status);
          setSubscriptionPackageId(hospitalData.subscriptionPackageId || '');
          setSubscriptionInterval(hospitalData.subscriptionInterval || 'monthly');
        } else {
          addToast("Hospital not found in real-time data.", "error");
          navigate('/super-admin/dashboard');
        }
      }
    }, [hospitalId, allHospitals, addToast, navigate]);

    useEffect(() => {
        if(hospitalId && allSubscriptionTransactions.length > 0) {
            setTransactions(allSubscriptionTransactions.filter(tx => tx.hospitalId === hospitalId));
        }
    }, [hospitalId, allSubscriptionTransactions]);
    
    const totalTransactionPages = useMemo(() => Math.ceil(transactions.length / transactionsItemsPerPage), [transactions.length, transactionsItemsPerPage]);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (transactionsCurrentPage - 1) * transactionsItemsPerPage;
        return transactions.slice(startIndex, startIndex + transactionsItemsPerPage);
    }, [transactions, transactionsCurrentPage, transactionsItemsPerPage]);


    const handleSave = async () => {
        if (!hospital) return;
        setActionLoading(true);
        try {
            const updatePayload: { [key: string]: any } = {};
            let needsUpdate = false;
    
            const packageChanged = subscriptionPackageId !== (hospital.subscriptionPackageId || '');
            const intervalChanged = subscriptionInterval !== (hospital.subscriptionInterval || 'monthly');
            const statusChanged = status !== hospital.status;
            const expiryDateManuallyChanged = expiryDate !== (hospital.subscriptionExpiryDate ? hospital.subscriptionExpiryDate.toDate().toISOString().split('T')[0] : '');
    
            if (packageChanged) {
                updatePayload.subscriptionPackageId = subscriptionPackageId;
                needsUpdate = true;
            }
            if (intervalChanged) {
                updatePayload.subscriptionInterval = subscriptionInterval;
                needsUpdate = true;
            }
            if (statusChanged) {
                updatePayload.status = status;
                needsUpdate = true;
            }
    
            // If package or interval changed, recalculate expiry date
            if (packageChanged || intervalChanged) {
                const selectedPackage = allSubscriptionPackages.find(p => p.id === subscriptionPackageId);
                const isFreePlan = (selectedPackage?.prices?.monthly ?? -1) === 0;
                
                let newExpiryDate: Date;
    
                if (isFreePlan || !subscriptionPackageId) {
                    newExpiryDate = new Date('9999-12-31');
                } else {
                    const now = new Date();
                    newExpiryDate = new Date(now);
                    switch(subscriptionInterval) {
                        case 'monthly': newExpiryDate.setMonth(now.getMonth() + 1); break;
                        case 'quarterly': newExpiryDate.setMonth(now.getMonth() + 3); break;
                        case 'yearly': newExpiryDate.setFullYear(now.getFullYear() + 1); break;
                    }
                }
                
                updatePayload.subscriptionExpiryDate = firebase.firestore.Timestamp.fromDate(newExpiryDate);
                setExpiryDate(newExpiryDate.toISOString().split('T')[0]); // Also update local state
                needsUpdate = true;
    
            } else if (expiryDateManuallyChanged) {
                // Only update expiry date if it was manually changed AND package/interval were not.
                updatePayload.subscriptionExpiryDate = firebase.firestore.Timestamp.fromDate(new Date(expiryDate));
                needsUpdate = true;
            }
    
            if (needsUpdate) {
                await db.collection('hospitals').doc(hospital.id).update(updatePayload);
                addToast("Hospital updated successfully!", "success");
            } else {
                addToast("No changes to save.", "info");
            }
            
            setIsEditing(false);
    
        } catch (error) {
            addToast("Failed to update hospital.", "error");
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleCancel = () => {
        if (hospital) {
            const dateToSet = hospital.subscriptionExpiryDate ? hospital.subscriptionExpiryDate.toDate() : new Date();
            setExpiryDate(dateToSet.toISOString().split('T')[0]);
            setStatus(hospital.status);
            setSubscriptionPackageId(hospital.subscriptionPackageId || '');
            setSubscriptionInterval(hospital.subscriptionInterval || 'monthly');
        }
        setIsEditing(false);
    };
    
    const selectedPkgInForm = useMemo(() => allSubscriptionPackages.find(p => p.id === subscriptionPackageId), [allSubscriptionPackages, subscriptionPackageId]);

    if (loading || !hospital) {
        return <div className="p-8 text-center text-slate-500">Loading hospital details...</div>;
    }

    const owner = users.find(u => u.uid === hospital.ownerId);

    const TabButton: React.FC<{ tabId: string, title: string, icon: any }> = ({ tabId, title, icon }) => (
        <button onClick={() => setActiveTab(tabId)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === tabId ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <FontAwesomeIcon icon={icon} /> {title}
        </button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{hospital.name}</h1>
                <Button variant="light" onClick={() => navigate(-1)}>Back to Dashboard</Button>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className="-mb-px flex flex-wrap space-x-2 sm:space-x-8" aria-label="Tabs">
                    <TabButton tabId="details" title="Details" icon={faBuilding} />
                    <TabButton tabId="users" title="Users" icon={faUser} />
                    <TabButton tabId="transactions" title="Transactions" icon={faCalendar} />
                    <TabButton tabId="logs" title="Audit Logs" icon={faHistory} />
                </nav>
            </div>
            
            {activeTab === 'details' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2">
                        <DetailCard title="Hospital Information">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoItem icon={faBuilding} label="Hospital Name" value={hospital.name} />
                                <InfoItem icon={faPhone} label="Phone" value={hospital.phone} />
                                <div className="md:col-span-2"><InfoItem icon={faMapMarkerAlt} label="Address" value={`${hospital.address.street}, ${hospital.address.city}, ${hospital.address.country} - ${hospital.address.pincode}`} /></div>
                                <InfoItem icon={faIdBadge} label="Hospital ID" value={hospital.id} />
                                {owner && <InfoItem icon={faUserTie} label="Owner" value={`${owner.name} (${owner.email})`} />}
                            </div>
                        </DetailCard>
                    </div>
                    <div className="lg:col-span-1">
                        <DetailCard 
                            title="Settings" 
                            actions={!isEditing && <Button size="sm" variant="light" onClick={() => setIsEditing(true)}><FontAwesomeIcon icon={faPencilAlt} /></Button>}
                            footer={isEditing && (
                                <div className="flex justify-end gap-2">
                                    <Button variant="light" onClick={handleCancel} disabled={actionLoading}><FontAwesomeIcon icon={faTimes} className="mr-2"/>Cancel</Button>
                                    <Button variant="primary" onClick={handleSave} disabled={actionLoading}><FontAwesomeIcon icon={faSave} className="mr-2"/>{actionLoading ? 'Saving...' : 'Save'}</Button>
                                </div>
                            )}
                        >
                            <div className="space-y-4">
                                <Select label="Subscription Package" value={subscriptionPackageId} onChange={e => setSubscriptionPackageId(e.target.value)} disabled={!isEditing}>
                                    <option value="">-- No Package / Manual --</option>
                                    {allSubscriptionPackages.map(pkg => (<option key={pkg.id} value={pkg.id!}>{pkg.name}</option>))}
                                </Select>
                                <Select label="Subscription Interval" value={subscriptionInterval} onChange={e => setSubscriptionInterval(e.target.value as any)} disabled={!isEditing || !subscriptionPackageId || (selectedPkgInForm?.prices?.monthly ?? -1) === 0}>
                                    <option value="monthly">Monthly {selectedPkgInForm ? `(${formatCurrency(selectedPkgInForm.prices?.monthly ?? 0, 'INR')})` : ''}</option>
                                    <option value="quarterly">Quarterly {selectedPkgInForm ? `(${formatCurrency(selectedPkgInForm.prices?.quarterly ?? 0, 'INR')})` : ''}</option>
                                    <option value="yearly">Yearly {selectedPkgInForm ? `(${formatCurrency(selectedPkgInForm.prices?.yearly ?? 0, 'INR')})` : ''}</option>
                                </Select>
                                <Input label="Subscription Expiry Date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} disabled={!isEditing || (!!subscriptionPackageId && (selectedPkgInForm?.prices?.monthly ?? -1) === 0)} icon={<FontAwesomeIcon icon={faCalendarAlt} className="h-5 w-5 text-gray-400" />} />
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>{isEditing ? (<div className="flex gap-2"><Button type="button" onClick={() => setStatus('active')} className={`w-full ${status === 'active' ? '!bg-green-500 text-white' : ''}`} variant={status === 'active' ? 'success' : 'light'}>Active</Button><Button type="button" onClick={() => setStatus('inactive')} className={`w-full ${status === 'inactive' ? '!bg-red-500 text-white' : ''}`} variant={status === 'inactive' ? 'danger' : 'light'}>Inactive</Button></div>) : (<p className={`font-semibold capitalize ${hospital.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{hospital.status}</p>)}</div>
                                {(new Date(expiryDate) < new Date()) && (<div className="p-3 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm flex items-center"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-3"/>Subscription has expired.</div>)}
                            </div>
                        </DetailCard>
                    </div>
                </div>
            )}
            {activeTab === 'users' && (
                <DetailCard title={`Users (${users.length})`}>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Name</th><th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Role</th><th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th></tr></thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">{users.map(u => (<tr key={u.id}><td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"><div className="flex items-center"><Avatar avatar={u.profilePhotoUrl ? { type: 'image', value: u.profilePhotoUrl } : { type: 'initials', value: u.name.split(' ').map(n => n[0]).join('').toUpperCase(), color: 'bg-indigo-500' }} size="sm" /><div className="ml-3"><p>{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></td><td className="px-4 py-3 whitespace-nowrap text-sm capitalize text-slate-500">{u.roleName}</td><td className="px-4 py-3"><span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>{u.status}</span></td></tr>))}</tbody>
                        </table>
                    </div>
                </DetailCard>
            )}
            {activeTab === 'transactions' && (
                 <DetailCard title="Transaction History">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Package</th><th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Amount</th><th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th></tr></thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                {transactions.length > 0 ? paginatedTransactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{tx.createdAt.toDate().toLocaleDateString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{tx.packageName}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{formatCurrency(tx.amount, 'INR')}</td>
                                        <td className="px-4 py-3"><span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{tx.status}</span></td>
                                    </tr>
                                )) : (<tr><td colSpan={4} className="text-center p-6 text-slate-500 dark:text-slate-400">No transactions found.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                     <Pagination
                        currentPage={transactionsCurrentPage}
                        totalPages={totalTransactionPages}
                        onPageChange={setTransactionsCurrentPage}
                        itemsPerPage={transactionsItemsPerPage}
                        onItemsPerPageChange={(size) => { setTransactionsItemsPerPage(size); setTransactionsCurrentPage(1); }}
                        totalItems={transactions.length}
                        itemsOnPage={paginatedTransactions.length}
                    />
                </DetailCard>
            )}
            {activeTab === 'logs' && hospitalId && <LogsTab hospitalId={hospitalId} users={users} />}
        </div>
    );
};

export default SuperAdminHospitalDetailsScreen;