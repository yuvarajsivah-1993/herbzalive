import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StockReturn } from '../types';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const StockReturnDetailsScreen: React.FC = () => {
    const { returnId } = useParams<{ returnId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, getStockReturnById } = useAuth();
    const [stockReturn, setStockReturn] = useState<StockReturn | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!returnId) return;
        setLoading(true);
        try {
            const data = await getStockReturnById(returnId);
            if (data) {
                setStockReturn(data);
            } else {
                navigate(-1);
            }
        } finally {
            setLoading(false);
        }
    }, [returnId, getStockReturnById, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <div className="p-8 text-center">Loading Return Details...</div>;
    if (!stockReturn) return <div className="p-8 text-center">Return not found.</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="light" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`, { state: location.state })}>
                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back
                </Button>
            </div>

            <DetailCard title={`Return Details: #${stockReturn.returnId}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <p className="text-sm text-slate-500">Vendor</p>
                        <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{stockReturn.vendor}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Return Date</p>
                        <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{stockReturn.returnDate.toDate().toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Related Order</p>
                        <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{stockReturn.relatedOrderId}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Total Return Value</p>
                        <p className="font-semibold text-lg text-red-600 dark:text-red-400">-{formatCurrency(stockReturn.totalReturnValue, user?.hospitalCurrency)}</p>
                    </div>
                </div>

                {stockReturn.notes && (
                    <div className="mb-6">
                        <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Notes</h4>
                        <p className="text-sm p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">{stockReturn.notes}</p>
                    </div>
                )}
                
                <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Returned Items</h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-3 text-left">Product</th>
                                <th className="p-3 text-left">SKU</th>
                                <th className="p-3 text-left">Batch No.</th>
                                <th className="p-3 text-right">Cost Price at Return</th>
                                <th className="p-3 text-center">Returned Qty</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {stockReturn.items.map(item => (
                                <tr key={item.stockItemId + item.batchId}>
                                    <td className="p-3 font-medium text-slate-900 dark:text-slate-200">{item.name}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300">{item.sku}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{item.batchNumber}</td>
                                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.costPriceAtReturn, user?.hospitalCurrency)}</td>
                                    <td className="p-3 text-center text-slate-900 dark:text-slate-200">{item.returnedQty}</td>
                                    <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(item.costPriceAtReturn * item.returnedQty, user?.hospitalCurrency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DetailCard>
        </div>
    );
};

export default StockReturnDetailsScreen;
