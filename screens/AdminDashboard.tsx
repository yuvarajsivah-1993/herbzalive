


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faStar, faChevronDown, faCalendarDays, faReceipt, faStethoscope } from '@fortawesome/free-solid-svg-icons';
import { Appointment, Expense, Invoice, PatientDocument, StockItem, Treatment, POSSale } from '../types';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { db } from '../services/firebase';

// --- TYPES & CONSTANTS ---
const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
type Period = 'this-week' | 'this-month' | 'last-3-months' | 'last-6-months' | 'last-12-months';
const periods: { value: Period; label: string }[] = [
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'last-6-months', label: 'Last 6 Months' },
    { value: 'last-12-months', label: 'Last 12 Months' },
];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#ec4899'];

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbol = currencySymbols[currencyCode] || '$';
    if (isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getDateRange = (period: Period): { start: Date, end: Date } => {
    const end = new Date();
    let start = new Date();
    end.setHours(23, 59, 59, 999); 

    switch (period) {
        case 'this-week':
            start.setDate(end.getDate() - end.getDay());
            start.setHours(0, 0, 0, 0);
            break;
        case 'this-month':
            start = new Date(end.getFullYear(), end.getMonth(), 1);
            break;
        case 'last-3-months':
            start = new Date(end.getFullYear(), end.getMonth() - 2, 1);
            start.setHours(0,0,0,0);
            break;
        case 'last-6-months':
            start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
             start.setHours(0,0,0,0);
            break;
        case 'last-12-months':
            start = new Date(end.getFullYear() - 1, end.getMonth() + 1, 1);
             start.setHours(0,0,0,0);
            break;
    }
    return { start, end };
};


// --- UI COMPONENTS ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col ${className}`}>
        {children}
    </div>
);

export const FilterDropdown: React.FC<{ value: Period; onChange: (value: Period) => void; }> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedLabel = periods.find(p => p.value === value)?.label;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                {selectedLabel} <FontAwesomeIcon icon={faChevronDown} className="ml-2 w-3 h-3" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                        {periods.map(p => (
                            <button key={p.value} onClick={() => { onChange(p.value); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{p.label}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, currency, name, tickColor } = props;
    const formattedValue = formatCurrency(value, currency);
    const fontSizeClass = formattedValue.length > 12 ? 'text-xl' : 'text-2xl';

    return (
      <g>
        <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill={tickColor} className="text-sm">{name || payload.name || 'Total'}</text>
        <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill="#1e293b" className={`dark:fill-white font-bold ${fontSizeClass}`}>{formattedValue}</text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
      </g>
    );
};


// --- CARD COMPONENTS ---

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};

const DashboardHeader: React.FC<{ user: any }> = ({ user }) => (
    <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{getGreeting()}, {user?.name.split(' ')[0] || 'Admin'}!</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
);

const CashflowCard: React.FC<{ data: any, currency: string, period: Period, onPeriodChange: (p: Period) => void, tickColor: string }> = ({ data, currency, period, onPeriodChange, tickColor }) => {
    const formattedTotal = formatCurrency(data.total, currency);
    const fontSizeClass = formattedTotal.length > 12 ? 'text-2xl' : 'text-3xl';
    
    return (
    <Card>
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Cashflow</h3>
            <FilterDropdown value={period} onChange={onPeriodChange} />
        </div>
        <div className="mt-4"><p className="text-sm text-slate-500">TOTAL CASH</p>
            <div className="flex items-center gap-2">
                <p className={`font-bold ${fontSizeClass}`}>{formattedTotal}</p>
                <span className={`flex items-center text-sm font-semibold px-2 py-0.5 rounded-full ${data.change >= 0 ? 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50' : 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50'}`}>
                    <FontAwesomeIcon icon={data.change >= 0 ? faArrowUp : faArrowDown} className="w-3 h-3 mr-1" />
                    {data.change.toFixed(2)}%
                </span>
            </div>
        </div>
        <div className="h-64 mt-4 -ml-6 flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `${val/1000}K`} tick={{ fill: tickColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--tw-bg-white)', borderRadius: '0.5rem', border: '1px solid var(--tw-border-slate-200)' }} wrapperClassName="dark:!bg-slate-900 dark:!border-slate-700" />
                    <Line type="monotone" dataKey="cashflow" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </Card>
)};

const ExpensesCard: React.FC<{ data: any, currency: string, period: Period, onPeriodChange: (p: Period) => void, tickColor: string }> = ({ data, currency, period, onPeriodChange, tickColor }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const onPieEnter = useCallback((_: any, index: number) => { setActiveIndex(index); }, []);
    
    return (
        <Card>
            <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Expenses</h3><FilterDropdown value={period} onChange={onPeriodChange} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 mt-4 items-center flex-grow">
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie {...{ activeIndex: activeIndex, activeShape: (props: any) => renderActiveShape({ ...props, value: data.total, currency, name: 'Total Expense', tickColor }), data: data.chartData, cx: "50%", cy: "50%", innerRadius: 60, outerRadius: 80, dataKey: "value", onMouseEnter: onPieEnter }}>
                                {data.chartData.map((_entry: any, index: number) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-sm space-y-2">
                    {data.chartData.slice(0, 6).map((entry: any, index: number) => (<div key={index} className="flex items-center justify-between"><div className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span><span className="text-slate-600 dark:text-slate-300">{entry.name}</span></div><span className="font-semibold">{((entry.value / data.total) * 100 || 0).toFixed(0)}%</span></div>))}
                </div>
            </div>
            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                 <h4 className="font-semibold text-sm mb-2 uppercase text-slate-500">Top Expense</h4>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                     {data.chartData.slice(0, 4).map((entry: any, index: number) => (<div key={index}><p className="text-slate-600 dark:text-slate-300 text-sm flex items-center"><span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>{entry.name}</p><p className="font-bold text-lg">{formatCurrency(entry.value, currency)}</p></div>))}
                 </div>
            </div>
        </Card>
    );
};

const IncomeExpenseCard: React.FC<{ data: any, currency: string, period: Period, onPeriodChange: (p: Period) => void, tickColor: string, legendColor: string }> = ({ data, currency, period, onPeriodChange, tickColor, legendColor }) => {
    const formattedIncome = formatCurrency(data.totalIncome, currency);
    const incomeFontSize = formattedIncome.length > 12 ? 'text-xl' : 'text-2xl';
    const formattedExpenses = formatCurrency(data.totalExpenses, currency);
    const expenseFontSize = formattedExpenses.length > 12 ? 'text-xl' : 'text-2xl';

    return (
    <Card>
        <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Income & Expense</h3><FilterDropdown value={period} onChange={onPeriodChange} /></div>
        <div className="grid grid-cols-2 gap-4 mt-4">
            <div><p className="text-sm text-slate-500">TOTAL INCOME</p><div className="flex items-center gap-2"><p className={`font-bold ${incomeFontSize}`}>{formattedIncome}</p>{data.incomeChange !== undefined && !isNaN(data.incomeChange) && (
                <span className={`flex items-center text-sm font-semibold ${data.incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <FontAwesomeIcon icon={data.incomeChange >= 0 ? faArrowUp : faArrowDown} className="w-3 h-3 mr-1" />
                    {data.incomeChange.toFixed(2)}%
                </span>
            )}</div></div>
            <div><p className="text-sm text-slate-500">TOTAL EXPENSES</p><div className="flex items-center gap-2"><p className={`font-bold ${expenseFontSize}`}>{formattedExpenses}</p>{data.expenseChange !== undefined && !isNaN(data.expenseChange) && (
                <span className={`flex items-center text-sm font-semibold ${data.expenseChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <FontAwesomeIcon icon={data.expenseChange >= 0 ? faArrowUp : faArrowDown} className="w-3 h-3 mr-1" />
                    {data.expenseChange.toFixed(2)}%
                </span>
            )}</div></div>
        </div>
        <div className="h-64 mt-4 -ml-6 flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fill: tickColor }} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={(val) => `${val/1000}K`} tick={{ fill: tickColor }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--tw-bg-white)', borderRadius: '0.5rem', border: '1px solid var(--tw-border-slate-200)' }} wrapperClassName="dark:!bg-slate-900 dark:!border-slate-700" />
                    <Legend wrapperStyle={{ color: legendColor }} />
                    <Bar dataKey="treatmentIncome" name="Treatment Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="posIncome" name="POS Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </Card>
)};

const PatientsCard: React.FC<{ data: any }> = ({ data }) => (
    <Card>
        <h3 className="text-lg font-semibold">Patients</h3>
        <div className="grid grid-cols-2 gap-4 mt-4 flex-grow content-center">
            <div className="text-center"><p className="text-4xl font-bold text-teal-500">{data.newPatients}</p><p className="text-sm text-slate-500">New patients this month</p></div>
            <div className="text-center"><p className="text-4xl font-bold text-blue-500">{data.returningPatients}</p><p className="text-sm text-slate-500">Returning patients</p></div>
        </div>
        <div className="mt-4 space-y-2">
            <div><div className="flex justify-between text-sm mb-1"><span className="font-semibold">{data.newPatientPercent.toFixed(1)}%</span><span>New patients</span></div><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5"><div className="bg-teal-500 h-2.5 rounded-full" style={{ width: `${data.newPatientPercent}%` }}></div></div></div>
            <div><div className="flex justify-between text-sm mb-1"><span className="font-semibold">{data.returningPatientPercent.toFixed(1)}%</span><span>Returning patients</span></div><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${data.returningPatientPercent}%` }}></div></div></div>
        </div>
    </Card>
);

const StockAvailabilityCard: React.FC<{ data: any, currency: string }> = ({ data, currency }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const formattedAssetValue = formatCurrency(data.totalAssetValue, currency);
    const assetValueFontSize = formattedAssetValue.length > 12 ? 'text-2xl' : 'text-3xl';
    
    return (
        <Card>
            <h3 className="text-lg font-semibold">Stock Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 flex-grow">
                <div className="md:col-span-1 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div><p className="text-sm text-slate-500">TOTAL ASSET</p><p className={`font-bold ${assetValueFontSize}`}>{formattedAssetValue}</p></div>
                        <div><p className="text-sm text-slate-500">TOTAL PRODUCT</p><p className="text-2xl font-bold">{data.totalProducts}</p></div>
                    </div>
                    <div>
                        <div className="flex w-full h-3 rounded-full overflow-hidden mt-4"><div className="bg-green-500" style={{ width: `${data.availablePercent}%` }} title="Available"></div><div className="bg-yellow-500" style={{ width: `${data.lowStockPercent}%` }} title="Low Stock"></div><div className="bg-red-500" style={{ width: `${data.outOfStockPercent}%` }} title="Out of Stock"></div></div>
                        <div className="flex justify-between text-xs mt-2">
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Available</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5"></span>Low Stock</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>Out of stock</span>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-6 pt-6 md:pt-0">
                    <div className="flex justify-between items-center mb-2"><h4 className="font-semibold">LOW STOCK</h4><button onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`)} className="text-sm text-blue-600 font-semibold">View all</button></div>
                    <div className="space-y-2">
                        {data.lowStockItems.slice(0, 3).map((item: any) => (<div key={item.id} className="grid grid-cols-3 items-center p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <p className="font-medium col-span-1">{item.name}</p><p className="text-sm text-slate-500">Qty: <span className="font-bold text-red-500">{item.totalStock}</span></p><div className="text-right"><Button size="sm" variant="light" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks`)}>Order</Button></div></div>))}
                    </div>
                </div>
            </div>
        </Card>
    );
};

const TreatmentSalesCard: React.FC<{ data: any, currency: string, period: Period, onPeriodChange: (p: Period) => void, tickColor: string }> = ({ data, currency, period, onPeriodChange, tickColor }) => (
    <Card>
        <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Treatment Revenue</h3><FilterDropdown value={period} onChange={onPeriodChange} /></div>
        <div className="h-80 mt-4 -ml-6 flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis type="number" tickFormatter={(val) => formatCurrency(val, currency).slice(0,-3)} tick={{ fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: tickColor, width: 110 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--tw-bg-white)', borderRadius: '0.5rem', border: '1px solid var(--tw-border-slate-200)' }} wrapperClassName="dark:!bg-slate-900 dark:!border-slate-700" formatter={(value: number) => formatCurrency(value, currency)} />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </Card>
);

const ReservationsCard: React.FC<{ data: any, period: Period, onPeriodChange: (p: Period) => void, tickColor: string }> = ({ data, period, onPeriodChange, tickColor }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const onPieEnter = useCallback((_: any, index: number) => { setActiveIndex(index); }, []);
    return (
        <Card>
            <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Reservations</h3><FilterDropdown value={period} onChange={onPeriodChange} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 mt-4 items-center flex-grow">
                <div className="h-48">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie {...{ activeIndex: activeIndex, activeShape: (props: any) => renderActiveShape({ ...props, value: data.total, name: 'Total Reservations', tickColor }), data: data.chartData, cx: "50%", cy: "50%", innerRadius: 60, outerRadius: 80, dataKey: "value", onMouseEnter: onPieEnter }}>
                                {data.chartData.map((_entry: any, index: number) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-sm space-y-2">
                    {data.chartData.map((entry: any, index: number) => (<div key={index} className="flex items-center justify-between"><div className="flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span><span className="text-slate-600 dark:text-slate-300">{entry.name}</span></div><span className="font-semibold">{entry.value}</span></div>))}
                </div>
            </div>
        </Card>
    );
};

const POSSalesCard: React.FC<{ data: any, currency: string, period: Period, onPeriodChange: (p: Period) => void, tickColor: string, legendColor: string }> = ({ data, currency, period, onPeriodChange, tickColor, legendColor }) => (
    <Card>
        <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">POS Sales</h3><FilterDropdown value={period} onChange={onPeriodChange} /></div>
        <div className="h-64 mt-4 -ml-6 flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => formatCurrency(val, currency).slice(0,-3)} tick={{ fill: tickColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--tw-bg-white)', borderRadius: '0.5rem', border: '1px solid var(--tw-border-slate-200)' }} wrapperClassName="dark:!bg-slate-900 dark:!border-slate-700" formatter={(value: number) => formatCurrency(value, currency)} />
                    <Legend wrapperStyle={{ color: legendColor }} />
                    <Line type="monotone" dataKey="sales" name="POS Sales" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </Card>
);


// --- MAIN COMPONENT ---
const AdminDashboard: React.FC = () => {
    const { user, patients, stockItems } = useAuth();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    
    const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b'; // slate-400 dark, slate-500 light
    const legendColor = theme === 'dark' ? '#cbd5e1' : '#475569'; // slate-300 dark, slate-600 light
    
    // Period states
    const [cashflowPeriod, setCashflowPeriod] = useState<Period>('last-12-months');
    const [expensesPeriod, setExpensesPeriod] = useState<Period>('last-6-months');
    const [incomeExpensePeriod, setIncomeExpensePeriod] = useState<Period>('last-6-months');
    const [treatmentSalesPeriod, setTreatmentSalesPeriod] = useState<Period>('this-month');
    const [reservationsPeriod, setReservationsPeriod] = useState<Period>('this-month');
    const [posSalesPeriod, setPosSalesPeriod] = useState<Period>('this-month');

    // Raw data states
    const [rawInvoices, setRawInvoices] = useState<Invoice[]>([]);
    const [rawExpenses, setRawExpenses] = useState<Expense[]>([]);
    const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
    const [rawPOSSales, setRawPOSSales] = useState<POSSale[]>([]);

    useEffect(() => {
        if (!user || !user.hospitalId) return;

        const createListener = (collectionName: string, setter: React.Dispatch<any>, dateField: string) => {
            let query: firebase.firestore.Query = db.collection(collectionName).where('hospitalId', '==', user.hospitalId);

            if (user.currentLocation) {
                query = query.where("locationId", "==", user.currentLocation.id);
            }

            return query.onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(data);
            }, err => console.error(`Error listening to ${collectionName}:`, err));
        };
        
        const unsubscribers = [
            createListener('invoices', setRawInvoices, 'createdAt'),
            createListener('expenses', setRawExpenses, 'date'),
            createListener('appointments', setRawAppointments, 'start'),
            createListener('posSales', setRawPOSSales, 'createdAt')
        ];
        
        setLoading(false);

        return () => unsubscribers.forEach(unsub => unsub());
    }, [user, user?.currentLocation?.id]);
    
    const rawPatients = patients;
    const rawStocks = stockItems;

    // Memoized data processing
    const cashflowData = useMemo(() => {
        const { start, end } = getDateRange(cashflowPeriod);
        const dateArray: Date[] = [];
        let currentDate = new Date(start);
        while (currentDate <= end) { dateArray.push(new Date(currentDate)); currentDate.setMonth(currentDate.getMonth() + 1); if (dateArray.length > 12) break; }
    
        const formatKey = (date: Date) => date.toLocaleString('default', { month: 'short' });
        const dataMap = new Map<string, { income: number; expenses: number }>();
        dateArray.forEach(date => dataMap.set(formatKey(date), { income: 0, expenses: 0 }));
    
        rawInvoices.forEach(inv => {
            const invDate = inv.createdAt.toDate();
            if (invDate >= start && invDate <= end) {
                const key = formatKey(invDate);
                if (dataMap.has(key)) dataMap.get(key)!.income += inv.totalAmount;
            }
        });

        rawPOSSales.forEach(sale => {
            if (sale.status === 'Completed') {
                const saleDate = sale.createdAt.toDate();
                if (saleDate >= start && saleDate <= end) {
                    const key = formatKey(saleDate);
                    if (dataMap.has(key)) dataMap.get(key)!.income += sale.totalAmount;
                }
            }
        });
    
        rawExpenses.forEach(exp => {
            const expDate = exp.date.toDate();
            if (expDate >= start && expDate <= end) {
                const key = formatKey(expDate);
                if (dataMap.has(key)) dataMap.get(key)!.expenses += exp.totalAmount;
            }
        });
    
        const chartData = Array.from(dataMap.entries()).map(([name, values]) => ({ name, cashflow: values.income - values.expenses }));
        
        const totalIncome = Array.from(dataMap.values()).reduce((acc, curr) => acc + curr.income, 0);
        const totalExpenses = Array.from(dataMap.values()).reduce((acc, curr) => acc + curr.expenses, 0);
        const totalNet = totalIncome - totalExpenses;
        const change = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;
    
        return { chartData, total: totalNet, change: isNaN(change) ? 0 : change };
    }, [cashflowPeriod, rawInvoices, rawExpenses, rawPOSSales]);
    
    const expensesData = useMemo(() => {
        const { start, end } = getDateRange(expensesPeriod);
        const filtered = rawExpenses.filter(e => e.date.toDate() >= start && e.date.toDate() <= end);
        const byCategory = filtered.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.totalAmount;
            return acc;
        }, {} as Record<string, number>);
        const chartData = Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
        return { chartData, total };
    }, [expensesPeriod, rawExpenses]);
    
    const incomeExpenseData = useMemo(() => {
        const { start, end } = getDateRange(incomeExpensePeriod);
        
        // Calculate previous period
        const getPreviousDateRange = (currentPeriod: Period) => {
            const prevEnd = new Date(start.getTime() - 1);
            let prevStart = new Date(start);

            switch (currentPeriod) {
                case 'this-week':
                    prevStart.setDate(start.getDate() - 7);
                    break;
                case 'this-month':
                    prevStart.setMonth(start.getMonth() - 1);
                    break;
                case 'last-3-months':
                    prevStart.setMonth(start.getMonth() - 3);
                    break;
                case 'last-6-months':
                    prevStart.setMonth(start.getMonth() - 6);
                    break;
                case 'last-12-months':
                    prevStart.setFullYear(start.getFullYear() - 1);
                    break;
            }
            return { start: prevStart, end: prevEnd };
        };

        const { start: prevStart, end: prevEnd } = getPreviousDateRange(incomeExpensePeriod);

        const filterDataByDateRange = (data: any[], dateField: string, rangeStart: Date, rangeEnd: Date) => {
            return data.filter(item => {
                const itemDate = item[dateField].toDate();
                return itemDate >= rangeStart && itemDate <= rangeEnd;
            });
        };

        const calculateTotals = (invoices: Invoice[], posSales: POSSale[], expenses: Expense[]) => {
            const totalTreatmentIncome = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
            const totalPosIncome = posSales.filter(sale => sale.status === 'Completed').reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalIncome = totalTreatmentIncome + totalPosIncome;
            const totalExpenses = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
            return { totalIncome, totalExpenses };
        };

        // Current period data
        const currentInvoices = filterDataByDateRange(rawInvoices, 'createdAt', start, end);
        const currentPOSSales = filterDataByDateRange(rawPOSSales, 'createdAt', start, end);
        const currentExpenses = filterDataByDateRange(rawExpenses, 'date', start, end);
        const currentTotals = calculateTotals(currentInvoices, currentPOSSales, currentExpenses);

        // Previous period data
        const prevInvoices = filterDataByDateRange(rawInvoices, 'createdAt', prevStart, prevEnd);
        const prevPOSSales = filterDataByDateRange(rawPOSSales, 'createdAt', prevStart, prevEnd);
        const prevExpenses = filterDataByDateRange(rawExpenses, 'date', prevStart, prevEnd);
        const prevTotals = calculateTotals(prevInvoices, prevPOSSales, prevExpenses);

        const incomeChange = prevTotals.totalIncome > 0 
            ? ((currentTotals.totalIncome - prevTotals.totalIncome) / prevTotals.totalIncome) * 100 
            : (currentTotals.totalIncome > 0 ? 100 : 0); // If previous was 0 and current is > 0, it's 100% increase

        const expenseChange = prevTotals.totalExpenses > 0 
            ? ((currentTotals.totalExpenses - prevTotals.totalExpenses) / prevTotals.totalExpenses) * 100 
            : (currentTotals.totalExpenses > 0 ? 100 : 0); // If previous was 0 and current is > 0, it's 100% increase

        const dateArray: Date[] = [];
        let currentDate = new Date(start);
        while (currentDate <= end) { dateArray.push(new Date(currentDate)); currentDate.setMonth(currentDate.getMonth() + 1); if (dateArray.length > 12) break; }
        const formatKey = (date: Date) => date.toLocaleString('default', { month: 'short' });
        
        const dataMap = new Map<string, { treatmentIncome: number, posIncome: number, expenses: number }>();
        dateArray.forEach(date => dataMap.set(formatKey(date), { treatmentIncome: 0, posIncome: 0, expenses: 0 }));
    
        currentInvoices.forEach(inv => {
            const invDate = inv.createdAt.toDate();
            const key = formatKey(invDate);
            if (dataMap.has(key)) dataMap.get(key)!.treatmentIncome += inv.totalAmount;
        });
        currentPOSSales.forEach(sale => {
            if (sale.status === 'Completed') {
                const saleDate = sale.createdAt.toDate();
                const key = formatKey(saleDate);
                if (dataMap.has(key)) dataMap.get(key)!.posIncome += sale.totalAmount;
            }
        });
        currentExpenses.forEach(exp => {
            const expDate = exp.date.toDate();
            const key = formatKey(expDate);
            if (dataMap.has(key)) dataMap.get(key)!.expenses += exp.totalAmount;
        });
    
        const chartData = Array.from(dataMap.entries()).map(([name, values]) => ({ name, treatmentIncome: values.treatmentIncome, posIncome: values.posIncome, expenses: values.expenses }));
        
        return { chartData, totalIncome: currentTotals.totalIncome, totalExpenses: currentTotals.totalExpenses, incomeChange, expenseChange };
    }, [incomeExpensePeriod, rawInvoices, rawExpenses, rawPOSSales]);
    
    const patientData = useMemo(() => {
        const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const appointmentsThisMonth = rawAppointments.filter(app => app.start.toDate() >= thisMonthStart);
        const patientIdsThisMonth = [...new Set(appointmentsThisMonth.map(app => app.patientId))];
        let newPatients = 0;
        patientIdsThisMonth.forEach(patientId => {
            const patient = rawPatients.find(p => p.id === patientId);
            if (patient && patient.registeredAt.toDate() >= thisMonthStart) newPatients++;
        });
        const returningPatients = patientIdsThisMonth.length - newPatients;
        const total = patientIdsThisMonth.length || 1;
        return { newPatients, returningPatients, newPatientPercent: (newPatients / total) * 100, returningPatientPercent: (returningPatients / total) * 100 };
    }, [rawPatients, rawAppointments]);

    const stockData = useMemo(() => {
        const totalAssetValue = rawStocks.reduce((sum, item) => sum + (item.batches || []).reduce((batchSum, batch) => batchSum + (batch.costPrice * batch.quantity), 0), 0);
        const inStock = rawStocks.filter(i => i.totalStock > i.lowStockThreshold).length;
        const lowStockCount = rawStocks.filter(i => i.totalStock > 0 && i.totalStock <= i.lowStockThreshold).length;
        const outOfStock = rawStocks.filter(i => i.totalStock <= 0).length;
        const totalProducts = rawStocks.length || 1;
        return { totalAssetValue, totalProducts: rawStocks.length, lowStockItems: rawStocks.filter(i => i.totalStock <= i.lowStockThreshold && i.totalStock > 0), availablePercent: (inStock/totalProducts)*100, lowStockPercent: (lowStockCount/totalProducts)*100, outOfStockPercent: (outOfStock/totalProducts)*100 };
    }, [rawStocks]);
    
    const treatmentSalesData = useMemo(() => {
        const { start, end } = getDateRange(treatmentSalesPeriod);
        const filtered = rawInvoices.filter(i => i.createdAt.toDate() >= start && i.createdAt.toDate() <= end);
        const byTreatment = filtered.flatMap(i => i.items).reduce((acc, curr) => {
            acc[curr.description] = (acc[curr.description] || 0) + curr.cost;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(byTreatment).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue).slice(0, 7);
    }, [treatmentSalesPeriod, rawInvoices]);
    
    const reservationsData = useMemo(() => {
        const { start, end } = getDateRange(reservationsPeriod);
        const filtered = rawAppointments.filter(a => a.start.toDate() >= start && a.start.toDate() <= end);
        const byStatus = filtered.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const chartData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
        return { chartData, total: filtered.length };
    }, [reservationsPeriod, rawAppointments]);
    
    const posSalesData = useMemo(() => {
        const { start, end } = getDateRange(posSalesPeriod);
        const stockItemCostMap = new Map(rawStocks.map(item => {
            const latestBatch = item.batches?.sort((a,b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0];
            return [item.id, latestBatch?.costPrice || 0];
        }));
    
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dateArray: Date[] = [];
        let currentDate = new Date(start);
        let formatKey: (date: Date) => string;
    
        if (diffDays <= 31) {
            formatKey = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            while (currentDate <= end) { dateArray.push(new Date(currentDate)); currentDate.setDate(currentDate.getDate() + 1); }
        } else {
            formatKey = (date: Date) => date.toLocaleString('default', { month: 'short' });
            while (currentDate <= end) { dateArray.push(new Date(currentDate)); currentDate.setMonth(currentDate.getMonth() + 1); if(dateArray.length > 12) break;}
        }
    
        const dataMap = new Map<string, { sales: number; profit: number }>();
        dateArray.forEach(date => dataMap.set(formatKey(date), { sales: 0, profit: 0 }));
    
        rawPOSSales.forEach(sale => {
            if (sale.status === 'Completed') {
                const saleDate = sale.createdAt.toDate();
                if (saleDate >= start && saleDate <= end) {
                    const key = formatKey(saleDate);
                    if (dataMap.has(key)) {
                        const saleRevenue = sale.totalAmount;
                        let saleCOGS = 0;
                        for (const item of sale.items) {
                            const costPrice = stockItemCostMap.get(item.stockItemId) || 0; // Default to 0 if not found
                            saleCOGS += costPrice * item.quantity;
                        }
                        const saleProfit = saleRevenue - saleCOGS;

                        const current = dataMap.get(key)!;
                        current.sales += saleRevenue;
                        current.profit += saleProfit;
                    }
                }
            }
        });
        return Array.from(dataMap.entries()).map(([name, values]) => ({ name, sales: values.sales, profit: values.profit }));
    }, [posSalesPeriod, rawPOSSales, rawStocks]);
    
    if (loading) { return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading dashboard...</div>; }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-950 min-h-full">
            <DashboardHeader user={user} />
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3"><CashflowCard data={cashflowData} currency={user?.hospitalCurrency || 'USD'} period={cashflowPeriod} onPeriodChange={setCashflowPeriod} tickColor={tickColor} /></div>
                <div className="lg:col-span-2"><ExpensesCard data={expensesData} currency={user?.hospitalCurrency || 'USD'} period={expensesPeriod} onPeriodChange={setExpensesPeriod} tickColor={tickColor} /></div>
                <div className="lg:col-span-3"><IncomeExpenseCard data={incomeExpenseData} currency={user?.hospitalCurrency || 'USD'} period={incomeExpensePeriod} onPeriodChange={setIncomeExpensePeriod} tickColor={tickColor} legendColor={legendColor} /></div>
                <div className="lg:col-span-2"><PatientsCard data={patientData} /></div>
                
                <div className="lg:col-span-3"><TreatmentSalesCard data={treatmentSalesData} currency={user?.hospitalCurrency || 'USD'} period={treatmentSalesPeriod} onPeriodChange={setTreatmentSalesPeriod} tickColor={tickColor} /></div>
                <div className="lg:col-span-2"><ReservationsCard data={reservationsData} period={reservationsPeriod} onPeriodChange={setReservationsPeriod} tickColor={tickColor} /></div>

                <div className="lg:col-span-5"><POSSalesCard data={posSalesData} currency={user?.hospitalCurrency || 'USD'} period={posSalesPeriod} onPeriodChange={setPosSalesPeriod} tickColor={tickColor} legendColor={legendColor} /></div>
                <div className="lg:col-span-5"><StockAvailabilityCard data={stockData} currency={user?.hospitalCurrency || 'USD'} /></div>
            </div>
        </div>
    );
};

export default AdminDashboard;