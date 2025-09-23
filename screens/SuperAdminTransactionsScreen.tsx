import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SubscriptionTransaction } from '../types';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import Input from '../components/ui/Input';
import { db } from '../services/firebase';
import Pagination from '../components/ui/Pagination';

const formatCurrency = (amount: number) => {
    if (isNaN(amount)) amount = 0;
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const SuperAdminTransactionsScreen: React.FC = () => {
    const { allSubscriptionTransactions, allHospitals } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    
    useEffect(() => {
      // Data comes from context, just manage loading state
      if(allSubscriptionTransactions && allHospitals) {
        setLoading(false);
      }
    }, [allSubscriptionTransactions, allHospitals]);

    const hospitalsMap = useMemo(() => new Map(allHospitals.map(h => [h.id, h.name])), [allHospitals]);

    const filteredTransactions = useMemo(() => {
        return allSubscriptionTransactions
            .filter(tx => {
                const statusMatch = statusFilter === 'all' || tx.status === statusFilter;
                const startDate = dateRange.start ? new Date(dateRange.start) : null;
                const endDate = dateRange.end ? new Date(dateRange.end) : null;
                if(endDate) endDate.setHours(23, 59, 59, 999);

                const dateMatch = (!startDate || tx.createdAt.toDate() >= startDate) && (!endDate || tx.createdAt.toDate() <= endDate);
                return statusMatch && dateMatch;
            })
            .filter(tx => {
                if (!searchTerm) return true;
                const lowercasedTerm = searchTerm.toLowerCase();
                const hospitalName = hospitalsMap.get(tx.hospitalId)?.toLowerCase() || '';
                return hospitalName.includes(lowercasedTerm) ||
                       tx.paymentId.toLowerCase().includes(lowercasedTerm);
            });
    }, [allSubscriptionTransactions, searchTerm, statusFilter, dateRange, hospitalsMap]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, dateRange]);

    const totalPages = useMemo(() => Math.ceil(filteredTransactions.length / itemsPerPage), [filteredTransactions.length, itemsPerPage]);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">All Transactions ({filteredTransactions.length})</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} />
                        <span className="text-slate-500">to</span>
                        <Input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} />
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm">
                            <option value="all">All Statuses</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                        </select>
                        <Input
                            type="search"
                            placeholder="Search by hospital, payment ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            icon={<FontAwesomeIcon icon={faSearch} className="text-slate-400" />}
                            className="w-full sm:w-64 !py-2 !bg-slate-50 dark:!bg-slate-800"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hospital</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Package</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Payment ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                            {loading && allSubscriptionTransactions.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-6 text-slate-500">Loading...</td></tr>
                            ) : paginatedTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{tx.createdAt.toDate().toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{hospitalsMap.get(tx.hospitalId) || tx.hospitalId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{tx.packageName} ({tx.interval})</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(tx.amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{tx.paymentId}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {tx.status}
                                        </span>
                                    </td>
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
                    totalItems={filteredTransactions.length}
                    itemsOnPage={paginatedTransactions.length}
                />
            </div>
        </div>
    );
};

export default SuperAdminTransactionsScreen;