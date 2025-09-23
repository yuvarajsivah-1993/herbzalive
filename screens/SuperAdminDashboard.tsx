import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Hospital, SubscriptionPackage, UserDocument } from '../types';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import { db } from '../services/firebase';
import Pagination from '../components/ui/Pagination';

const SuperAdminDashboard: React.FC = () => {
    const { allHospitals, allSubscriptionPackages, getUsersForHospitalBySuperAdmin } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserDocument[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [packageFilter, setPackageFilter] = useState('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const fetchOwners = useCallback(async () => {
        try {
            const usersSnapshot = await db.collection('users').where('roleName', '==', 'owner').get();
            setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument)));
        } catch (error) {
            addToast("Failed to load owner data.", "error");
        }
    }, [addToast]);

    useEffect(() => {
        setLoading(true);
        fetchOwners().finally(() => setLoading(false));
    }, [fetchOwners]);

    const packagesMap = useMemo(() => new Map(allSubscriptionPackages.map(p => [p.id, p.name])), [allSubscriptionPackages]);
    const ownersMap = useMemo(() => new Map(users.filter(u => u.uid).map(u => [u.uid, u.name])), [users]);

    const filteredHospitals = useMemo(() => {
        return allHospitals
            .filter(h => {
                const statusMatch = statusFilter === 'all' || h.status === statusFilter;
                const packageMatch = packageFilter === 'all' || h.subscriptionPackageId === packageFilter;
                return statusMatch && packageMatch;
            })
            .filter(h => {
                if (!searchTerm) return true;
                const lowercasedTerm = searchTerm.toLowerCase();
                const ownerName = ownersMap.get(h.ownerId)?.toLowerCase() || '';
                return h.name.toLowerCase().includes(lowercasedTerm) ||
                       ownerName.includes(lowercasedTerm);
            });
    }, [allHospitals, searchTerm, statusFilter, packageFilter, ownersMap]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, packageFilter]);

    const totalPages = useMemo(() => Math.ceil(filteredHospitals.length / itemsPerPage), [filteredHospitals.length, itemsPerPage]);
    const paginatedHospitals = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredHospitals.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredHospitals, currentPage, itemsPerPage]);


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">All Hospitals ({filteredHospitals.length})</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm">
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <select value={packageFilter} onChange={e => setPackageFilter(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm">
                            <option value="all">All Packages</option>
                            {allSubscriptionPackages.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
                        </select>
                        <Input
                            type="search"
                            placeholder="Search by name or owner..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            icon={<FontAwesomeIcon icon={faSearch} className="text-slate-400" />}
                            className="w-full sm:w-64 !py-2 !bg-slate-50 dark:!bg-slate-800 focus:!bg-white dark:focus:!bg-slate-900"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hospital Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Package</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Interval</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Expiry Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {loading && allHospitals.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-6 text-slate-500">Loading...</td></tr>
                            ) : paginatedHospitals.map(h => {
                                const hospitalPackage = packagesMap.get(h.subscriptionPackageId || '');
                                const hospitalOwner = ownersMap.get(h.ownerId);
                                return (
                                <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => navigate(`/super-admin/hospitals/${h.id}`)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{h.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{hospitalOwner || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${h.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {h.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{hospitalPackage || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-slate-800 dark:text-slate-200">{h.subscriptionInterval || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{h.subscriptionExpiryDate ? h.subscriptionExpiryDate.toDate().toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                 <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                    totalItems={filteredHospitals.length}
                    itemsOnPage={paginatedHospitals.length}
                />
            </div>
        </div>
    );
};

export default SuperAdminDashboard;