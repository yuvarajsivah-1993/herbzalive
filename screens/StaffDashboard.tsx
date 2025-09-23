import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { POSSale, StockItem, StockOrder, Invoice } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// FIX: Import the 'faReceipt' icon to resolve the 'Cannot find name' error.
import { faCashRegister, faBoxes, faDolly, faFileInvoiceDollar, faExclamationTriangle, faReceipt } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { db } from '../services/firebase';
// FIX: Add firebase import for firestore types
import firebase from 'firebase/compat/app';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    if (isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatCard: React.FC<{ title: string, value: string | number, icon: any, onClick?: () => void }> = ({ title, value, icon, onClick }) => {
    const valueStr = typeof value === 'string' ? value : String(value);
    const fontSizeClass = valueStr.length > 12 ? 'text-xl' : 'text-2xl';

    return (
    <div className={`bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex items-center ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`} onClick={onClick}>
        <div className="p-3 rounded-full bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 h-12 w-12 flex items-center justify-center">
            <FontAwesomeIcon icon={icon} className="h-6 w-6" />
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className={`font-semibold text-slate-900 dark:text-slate-100 ${fontSizeClass}`}>{value}</p>
        </div>
    </div>
)};

const StaffDashboard: React.FC = () => {
    const { user, stockItems } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    
    // Real-time data states
    const [todaysPosSales, setTodaysPosSales] = useState<POSSale[]>([]);
    const [pendingStockOrders, setPendingStockOrders] = useState<StockOrder[]>([]);
    const [invoicesWithDues, setInvoicesWithDues] = useState<Invoice[]>([]);
    const [posSalesWithDues, setPosSalesWithDues] = useState<POSSale[]>([]);

    useEffect(() => {
        if (!user || !user.hospitalId) return;
        setLoading(true);
        const unsubscribers: (() => void)[] = [];

        // FIX: Add type for query to resolve namespace error.
        const createListener = (query: firebase.firestore.Query, setter: React.Dispatch<any>) => {
            const unsubscribe = query.onSnapshot(snapshot => {
                setter(snapshot.docs.map(doc => doc.data()));
            }, err => console.error("Listener error:", err));
            unsubscribers.push(unsubscribe);
        };

        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

        // Listeners for various stats
        createListener(db.collection('posSales').where('hospitalId', '==', user.hospitalId).where('status', '==', 'Completed').where('createdAt', '>=', todayStart).where('createdAt', '<=', todayEnd), setTodaysPosSales);
        createListener(db.collection('stockOrders').where('hospitalId', '==', user.hospitalId).where('status', 'in', ['Pending', 'Partially Received']), setPendingStockOrders);
        createListener(db.collection('invoices').where('hospitalId', '==', user.hospitalId).where('status', 'in', ['Unpaid', 'Partially Paid']), setInvoicesWithDues);
        createListener(db.collection('posSales').where('hospitalId', '==', user.hospitalId).where('paymentStatus', 'in', ['Unpaid', 'Partially Paid']), setPosSalesWithDues);

        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());

    }, [user]);

    const dashboardData = useMemo(() => {
        const salesToday = todaysPosSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const lowStockItems = stockItems.filter(s => s.totalStock > 0 && s.totalStock <= s.lowStockThreshold);
        const outOfStockItems = stockItems.filter(s => s.totalStock <= 0);
        const posDues = posSalesWithDues.reduce((sum, s) => sum + (s.totalAmount - s.amountPaid), 0);
        const invoiceDues = invoicesWithDues.reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);

        return {
            salesToday,
            lowStockCount: lowStockItems.length,
            outOfStockCount: outOfStockItems.length,
            pendingOrdersCount: pendingStockOrders.length,
            totalDues: posDues + invoiceDues
        };
    }, [todaysPosSales, stockItems, pendingStockOrders, invoicesWithDues, posSalesWithDues]);
    
    if (loading) {
        return <div className="p-8 text-center">Loading Staff Dashboard...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-950 min-h-full">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome, {user?.name.split(' ')[0]}!</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Here's a summary of today's operations.</p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Today's POS Sales" value={formatCurrency(dashboardData.salesToday, user?.hospitalCurrency)} icon={faCashRegister} onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/pos`)} />
                <StatCard title="Low Stock Items" value={dashboardData.lowStockCount} icon={faBoxes} onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`)} />
                <StatCard title="Pending Stock Orders" value={dashboardData.pendingOrdersCount} icon={faDolly} onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`)} />
                <StatCard title="Total Dues Pending" value={formatCurrency(dashboardData.totalDues, user?.hospitalCurrency)} icon={faFileInvoiceDollar} onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/sales`)} />
            </div>

            <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                </div>
                 <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="primary" size="lg" className="flex-col h-24" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/pos`)}>
                        <FontAwesomeIcon icon={faCashRegister} className="h-6 w-6 mb-2"/>
                        New Sale
                    </Button>
                    <Button variant="light" size="lg" className="flex-col h-24" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`)}>
                        <FontAwesomeIcon icon={faBoxes} className="h-6 w-6 mb-2"/>
                        Manage Stock
                    </Button>
                     <Button variant="light" size="lg" className="flex-col h-24" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/sales`)}>
                        <FontAwesomeIcon icon={faFileInvoiceDollar} className="h-6 w-6 mb-2"/>
                        View Invoices
                    </Button>
                     <Button variant="light" size="lg" className="flex-col h-24" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/pos-sales`)}>
                        <FontAwesomeIcon icon={faReceipt} className="h-6 w-6 mb-2"/>
                        View POS Sales
                    </Button>
                 </div>
            </div>
            
            {dashboardData.outOfStockCount > 0 && (
                 <div className="mt-6 flex items-center p-4 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="h-8 w-8 text-red-600 dark:text-red-400 mr-4"/>
                    <div>
                        <h4 className="font-bold text-red-800 dark:text-red-200">{dashboardData.outOfStockCount} item(s) are out of stock.</h4>
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Some products cannot be sold. Please create a purchase order to restock.
                        </p>
                    </div>
                    <Button variant='danger' className="ml-auto" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`)}>View Items</Button>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;