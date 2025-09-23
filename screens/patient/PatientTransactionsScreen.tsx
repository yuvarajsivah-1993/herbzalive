import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Invoice, POSSale, InvoiceStatus } from '../../types';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFileInvoiceDollar, faReceipt } from '@fortawesome/free-solid-svg-icons';

type TransactionItem = {
    id: string;
    type: 'Treatment' | 'Sale';
    date: Date;
    transactionId: string;
    description: string;
    amount: number;
    status: InvoiceStatus | POSSale['paymentStatus'];
};

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const symbol = currencySymbols[currencyCode] || '$';
    if (isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStatusBadge = (status: TransactionItem['status']) => {
    const baseClasses = "px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status) {
        case 'Paid': return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
        case 'Unpaid': return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
        case 'Partially Paid': return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
        default: return `${baseClasses} bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300`;
    }
};

const PatientTransactionsScreen: React.FC = () => {
    const { user, myInvoices, myPOSSales } = useAuth();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const allTransactions = useMemo((): TransactionItem[] => {
        const invoices: TransactionItem[] = myInvoices.map(inv => ({
            id: inv.id,
            type: 'Treatment',
            date: inv.createdAt.toDate(),
            transactionId: inv.invoiceId,
            description: inv.items.map(i => i.description).join(', '),
            amount: inv.totalAmount,
            status: inv.status,
        }));
        const sales: TransactionItem[] = myPOSSales.map(sale => ({
            id: sale.id,
            type: 'Sale',
            date: sale.createdAt.toDate(),
            transactionId: sale.saleId,
            description: `${sale.items.length} item(s)`,
            amount: sale.totalAmount,
            status: sale.paymentStatus,
        }));
        
        return [...invoices, ...sales].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [myInvoices, myPOSSales]);
    
    const filteredTransactions = useMemo(() => {
        return allTransactions
            .filter(t => typeFilter === 'all' || t.type === typeFilter)
            .filter(t => statusFilter === 'all' || t.status === statusFilter)
            .filter(t => {
                if (!searchTerm.trim()) return true;
                const term = searchTerm.toLowerCase();
                return t.transactionId.toLowerCase().includes(term) ||
                       t.description.toLowerCase().includes(term);
            });
    }, [allTransactions, searchTerm, typeFilter, statusFilter]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Transactions</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">A record of all your bills and payments.</p>
            
            <Card className="mt-6 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by ID or description..." icon={<FontAwesomeIcon icon={faSearch} />}/>
                    <Select label="" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="Treatment">Treatment</option>
                        <option value="Sale">Sale</option>
                    </Select>
                    <Select label="" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Unpaid">Unpaid</option>
                    </Select>
                </div>
            </Card>

            <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedTransactions.length > 0 ? (
                                paginatedTransactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{tx.date.toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 dark:text-blue-400">{tx.transactionId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                            <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'Treatment' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                                                <FontAwesomeIcon icon={tx.type === 'Treatment' ? faFileInvoiceDollar : faReceipt} />
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{tx.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(tx.amount, user?.hospitalCurrency)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusBadge(tx.status)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="text-center p-8 text-slate-500">No transactions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && (
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                        totalItems={filteredTransactions.length}
                        itemsOnPage={paginatedTransactions.length}
                    />
                )}
            </div>
        </div>
    );
};

export default PatientTransactionsScreen;