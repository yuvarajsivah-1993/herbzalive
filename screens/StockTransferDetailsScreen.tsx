import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StockTransfer } from '../types';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">{footer}</div>}
    </div>
);

const StockTransferDetailsScreen: React.FC = () => {
    const { transferId } = useParams<{ transferId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, getStockTransferById, deleteStockTransfer } = useAuth();
    const { addToast } = useToast();

    const [transfer, setTransfer] = useState<StockTransfer | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const fetchData = useCallback(async () => {
        if (!transferId) return;
        setLoading(true);
        try {
            const data = await getStockTransferById(transferId);
            if (data) {
                setTransfer(data);
            } else {
                addToast("Stock transfer not found.", "error");
                navigate(-1);
            }
        } catch (error) {
            addToast("Failed to load transfer data.", "error");
        } finally {
            setLoading(false);
        }
    }, [transferId, getStockTransferById, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async () => {
        if (!transferId) return;
        setActionLoading(true);
        try {
            await deleteStockTransfer(transferId);
            addToast("Stock transfer successfully reversed.", "success");
            fetchData(); // Refetch to show the 'Reversed' status
        } catch (error: any) {
            addToast(error.message || "Failed to reverse transfer.", "error");
        } finally {
            setActionLoading(false);
            setConfirmDelete(false);
        }
    };
    
    if (loading) return <div className="p-8 text-center">Loading Transfer Details...</div>;
    if (!transfer) return <div className="p-8 text-center">Transfer not found.</div>;

    const canWrite = user?.permissions.stocks === 'write';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            <ConfirmationModal 
                isOpen={confirmDelete} 
                onClose={() => setConfirmDelete(false)} 
                onConfirm={handleDelete} 
                title="Reverse Stock Transfer" 
                message={`Are you sure you want to reverse this transfer? This will return the stock quantities to ${transfer.fromLocationName} and deduct them from ${transfer.toLocationName}. This action cannot be undone.`} 
                confirmButtonText="Yes, Reverse Transfer" 
                confirmButtonVariant="danger" 
                loading={actionLoading} 
            />
            
            <div className="flex justify-between items-center">
                 <Button variant="light" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`, { state: { fromTab: 'Transfers', ...(location.state || {}) } })}>
                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back
                </Button>
            </div>
            
            <DetailCard title={`Transfer Details: #${transfer.transferId}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-slate-500">From Location</p>
                        <p className="font-semibold text-lg">{transfer.fromLocationName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">To Location</p>
                        <p className="font-semibold text-lg">{transfer.toLocationName}</p>
                    </div>
                     <div>
                        <p className="text-sm text-slate-500">Date</p>
                        <p className="font-semibold">{transfer.transferDate.toDate().toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Status</p>
                        <p className={`font-semibold text-lg ${transfer.status === 'Reversed' ? 'text-red-500' : 'text-green-500'}`}>{transfer.status}</p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-sm text-slate-500">Notes</p>
                        <p className="whitespace-pre-wrap">{transfer.notes || 'No notes provided.'}</p>
                    </div>
                </div>
            </DetailCard>

            <DetailCard title="Transferred Items">
                 <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-3 text-left">Product</th>
                                <th className="p-3 text-left">SKU</th>
                                <th className="p-3 text-left">Batch No.</th>
                                <th className="p-3 text-right">Cost Price</th>
                                <th className="p-3 text-center">Quantity</th>
                                <th className="p-3 text-right">Total Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {transfer.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="p-3 font-medium text-slate-900 dark:text-slate-200">{item.name}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300">{item.sku}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{item.batchNumber}</td>
                                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.costPriceAtTransfer, user?.hospitalCurrency)}</td>
                                    <td className="p-3 text-center text-slate-900 dark:text-slate-200">{item.quantity}</td>
                                    <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(item.costPriceAtTransfer * item.quantity, user?.hospitalCurrency)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <td colSpan={5} className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">Total Transfer Value</td>
                                <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">{formatCurrency(transfer.totalValue, user?.hospitalCurrency)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </DetailCard>

            {canWrite && transfer.status === 'Completed' && (
                <DetailCard title="Danger Zone">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Reversing this transfer will return stock to its original location. This should only be done to correct mistakes.</p>
                    <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={actionLoading}>
                        <FontAwesomeIcon icon={faTrashAlt} className="mr-2" /> Reverse Transfer
                    </Button>
                </DetailCard>
            )}
        </div>
    );
};

export default StockTransferDetailsScreen;