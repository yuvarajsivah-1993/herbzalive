

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Invoice, POSSale, Expense, StockItem, StockOrder, StockReturn, UserDocument, PayrollRun, Payslip, Employee, Loan } from '../types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Sector, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faReceipt, faStethoscope, faFileInvoiceDollar, faDownload, faFileExport, faExclamationTriangle, IconDefinition, faPrint, faDolly, faUndo, faChevronDown, faChartBar, faHandHoldingUsd } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useToast } from '../hooks/useToast';
import Pagination from '../components/ui/Pagination';

// --- TYPES & CONSTANTS ---
type ReportType = 'pnl' | 'pos_sales' | 'treatment_sales' | 'purchase_sale' | 'stock_orders_by_vendor' | 'stock_returns_by_vendor' | 'payroll' | 'loan_report';
const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };

const reportList: { id: ReportType; name: string; description: string; icon: IconDefinition }[] = [
    { id: 'pnl', name: 'Profit & Loss', description: 'Financial summary of revenue and expenses.', icon: faChartLine },
    { id: 'pos_sales', name: 'POS Sales Report', description: 'Detailed breakdown of product sales.', icon: faChartBar },
    { id: 'treatment_sales', name: 'Treatment Sales Report', description: 'Detailed breakdown of service revenue.', icon: faStethoscope },
    { id: 'payroll', name: 'Payroll Report', description: 'Summary of payroll runs and expenses.', icon: faFileInvoiceDollar },
    { id: 'loan_report', name: 'Loan Report', description: 'Summary of all employee loans.', icon: faHandHoldingUsd },
    { id: 'purchase_sale', name: 'Purchase & Sale', description: 'Summary of purchases and sales.', icon: faFileInvoiceDollar },
    { id: 'stock_orders_by_vendor', name: 'Stock Orders Report', description: 'Summary of stock orders by vendor.', icon: faDolly },
    { id: 'stock_returns_by_vendor', name: 'Stock Returns Report', description: 'Summary of stock returns by vendor.', icon: faUndo },
];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#ec4899'];


// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbol = currencySymbols[currencyCode] || '$';
    if (typeof amount !== 'number' || isNaN(amount)) {
        amount = 0;
    }
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const escapeCsvCell = (cell: any): string => {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
};

// --- SHARED COMPONENTS ---
const ReportCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode }> = ({ title, children, actions }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            {actions && <div>{actions}</div>}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

const StatCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
        <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-semibold">{title}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
);

const NoDataPlaceholder: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <FontAwesomeIcon icon={faExclamationTriangle} className="h-12 w-12 text-slate-400 mb-4" />
        <h4 className="font-semibold text-lg">No Data Available</h4>
        <p className="text-sm">{message}</p>
    </div>
);

const ExportButton: React.FC<{ data: any[]; headers: { key: string; label: string }[]; filename: string }> = ({ data, headers, filename }) => {
    const handleExport = () => {
        const csvRows = [headers.map(h => escapeCsvCell(h.label)).join(',')];
        data.forEach(row => {
            const values = headers.map(header => {
                // Handle nested keys
                const keys = header.key.split('.');
                let value = row;
                for (const key of keys) {
                    if (value === null || value === undefined) {
                        value = '';
                        break;
                    }
                    value = value[key];
                }
                return escapeCsvCell(value);
            });
            csvRows.push(values.join(','));
        });
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return (
        <Button variant="light" size="sm" onClick={handleExport}>
            <FontAwesomeIcon icon={faFileExport} className="mr-2" /> Export CSV
        </Button>
    );
};

// --- REPORT COMPONENTS ---

const ProfitAndLossReport: React.FC<{ startDate: Date, endDate: Date }> = ({ startDate, endDate }) => {
    const { user, getInvoices, getPOSSales, getExpenses, getStocks, getPayrollRuns } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const calculateReport = async () => {
            setLoading(true);
            const [invoices, posSales, expenses, stockItems, allPayrollRuns] = await Promise.all([
                getInvoices(startDate, endDate),
                getPOSSales(startDate, endDate),
                getExpenses(startDate, endDate),
                getStocks(),
                // FIX: getPayrollRuns does not take date arguments. Filtering is done client-side.
                getPayrollRuns(),
            ]);

            const payrollRuns = allPayrollRuns.filter(run => {
                const runDate = run.runDate.toDate();
                return runDate >= startDate && runDate <= endDate;
            });

            const stockCostMap = new Map(stockItems.map(item => {
                const latestBatch = item.batches?.sort((a, b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0];
                return [item.id, latestBatch?.costPrice || 0];
            }));
            
            const treatmentRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
            const posRevenue = posSales.filter(s => s.status === 'Completed').reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalRevenue = treatmentRevenue + posRevenue;

            const cogs = posSales.filter(s => s.status === 'Completed').reduce((sum, sale) => {
                const saleCost = sale.items.reduce((itemSum, item) => itemSum + ((stockCostMap.get(item.stockItemId) || 0) * item.quantity), 0);
                return sum + saleCost;
            }, 0);
            
            const grossProfit = totalRevenue - cogs;
            
            const generalExpenses = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
            const payrollExpenses = payrollRuns
                .filter(run => run.status === 'finalized')
                .reduce((sum, run) => sum + run.totalAmount, 0);
            const totalOperatingExpenses = generalExpenses + payrollExpenses;

            const netProfit = grossProfit - totalOperatingExpenses;

            setData({
                totalRevenue, treatmentRevenue, posRevenue, cogs, grossProfit, 
                generalExpenses, payrollExpenses, totalOperatingExpenses, netProfit,
                expenseBreakdown: expenses.reduce((acc, curr) => {
                    acc[curr.category] = (acc[curr.category] || 0) + curr.totalAmount;
                    return acc;
                }, {} as Record<string, number>),
            });
            setLoading(false);
        };
        calculateReport();
    }, [startDate, endDate, getInvoices, getPOSSales, getExpenses, getStocks, getPayrollRuns]);

    if (loading) return <p className="text-center p-8">Generating report...</p>;
    if (!data) return <NoDataPlaceholder message="Could not generate profit and loss data." />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Total Revenue" value={formatCurrency(data.totalRevenue, user?.hospitalCurrency)} />
                <StatCard title="Gross Profit" value={formatCurrency(data.grossProfit, user?.hospitalCurrency)} />
                <StatCard title="Net Profit" value={formatCurrency(data.netProfit, user?.hospitalCurrency)} />
            </div>
            <ReportCard title="Profit & Loss Statement">
                <div className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
                    <div className="flex justify-between p-2 rounded"><p>Total Revenue</p><p className="font-semibold">{formatCurrency(data.totalRevenue, user?.hospitalCurrency)}</p></div>
                    <div className="flex justify-between p-2 ml-4"><p className="text-slate-600 dark:text-slate-400">Treatment Revenue</p><p>{formatCurrency(data.treatmentRevenue, user?.hospitalCurrency)}</p></div>
                    <div className="flex justify-between p-2 ml-4"><p className="text-slate-600 dark:text-slate-400">POS Revenue</p><p>{formatCurrency(data.posRevenue, user?.hospitalCurrency)}</p></div>
                    <div className="flex justify-between p-2 rounded"><p>Cost of Goods Sold (COGS)</p><p className="font-semibold">-{formatCurrency(data.cogs, user?.hospitalCurrency)}</p></div>
                    <div className="flex justify-between p-2 rounded border-t border-slate-200 dark:border-slate-800 font-bold text-lg"><p>Gross Profit</p><p>{formatCurrency(data.grossProfit, user?.hospitalCurrency)}</p></div>
                    <div className="flex justify-between p-2 rounded mt-4"><p>Operating Expenses</p><p className="font-semibold">-{formatCurrency(data.totalOperatingExpenses, user?.hospitalCurrency)}</p></div>
                    <div className="flex justify-between p-2 ml-4"><p className="text-slate-600 dark:text-slate-400">Payroll Expenses</p><p>{formatCurrency(data.payrollExpenses, user?.hospitalCurrency)}</p></div>
                    <div className="flex justify-between p-2 ml-4"><p className="text-slate-600 dark:text-slate-400">General & Administrative Expenses</p><p>{formatCurrency(data.generalExpenses, user?.hospitalCurrency)}</p></div>
                    {Object.entries(data.expenseBreakdown).map(([category, amount]) => (
                         <div key={category} className="flex justify-between p-2 ml-8 text-xs"><p className="text-slate-500 dark:text-slate-500">{category}</p><p>{formatCurrency(amount as number, user?.hospitalCurrency)}</p></div>
                    ))}
                    <div className="flex justify-between p-2 rounded border-t border-slate-200 dark:border-slate-800 font-bold text-lg"><p>Net Profit</p><p>{formatCurrency(data.netProfit, user?.hospitalCurrency)}</p></div>
                </div>
            </ReportCard>
        </div>
    );
};

const PayrollReport: React.FC<{ startDate: Date; endDate: Date }> = ({ startDate, endDate }) => {
    const { user, getPayrollRuns, getEmployees } = useAuth();
    const [loading, setLoading] = useState(true);
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allRuns, allEmployees] = await Promise.all([
                    getPayrollRuns(),
                    getEmployees()
                ]);
                
                setEmployees(allEmployees);

                const filteredRuns = allRuns.filter(run => {
                    if (run.status !== 'finalized') return false;
                    const [year, month] = run.period.split('-').map(Number);
                    const runPeriodStart = new Date(year, month - 1, 1);
                    const runPeriodEnd = new Date(year, month, 0);
                    runPeriodEnd.setHours(23, 59, 59, 999);
                    return runPeriodStart <= endDate && runPeriodEnd >= startDate;
                });
                setRuns(filteredRuns.sort((a, b) => a.period.localeCompare(b.period)));
            } catch (error) {
                console.error("Failed to fetch payroll report:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, getPayrollRuns, getEmployees]);

    const reportData = useMemo(() => {
        const finalizedRuns = runs;
        const allPayslips = finalizedRuns.flatMap(r => r.payslips);
        const employeesMap = new Map(employees.map(e => [e.id, e]));

        const totalNetPay = finalizedRuns.reduce((sum, r) => sum + r.totalAmount, 0);
        const totalGrossPay = allPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
        const uniqueEmployees = new Set(allPayslips.map(p => p.employeeId));
        const summary = {
            totalGrossPay,
            totalNetPay,
            employeesPaid: uniqueEmployees.size,
            runsProcessed: finalizedRuns.length,
        };

        const costTrendData = finalizedRuns.map(run => ({
            period: new Date(run.period + '-02').toLocaleString('default', { month: 'short', year: 'numeric' }),
            totalCost: run.payslips.reduce((sum, p) => sum + p.grossSalary, 0)
        }));

        const departmentCosts: Record<string, number> = {};
        const designationCosts: Record<string, number> = {};
        allPayslips.forEach(p => {
            const employee = employeesMap.get(p.employeeId);
            const department = employee?.department || 'Uncategorized';
            const designation = employee?.designation || 'Uncategorized';
            departmentCosts[department] = (departmentCosts[department] || 0) + p.grossSalary;
            designationCosts[designation] = (designationCosts[designation] || 0) + p.grossSalary;
        });
        const departmentData = Object.entries(departmentCosts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const designationData = Object.entries(designationCosts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        const earningsBreakdown: Record<string, number> = {};
        const deductionsBreakdown: Record<string, number> = {};
        allPayslips.forEach(p => {
            [...(p.earnings || []), ...(p.additionalEarnings || [])].forEach(item => {
                earningsBreakdown[item.name] = (earningsBreakdown[item.name] || 0) + item.amount;
            });
            [...(p.deductions || []), ...(p.additionalDeductions || [])].forEach(item => {
                deductionsBreakdown[item.name] = (deductionsBreakdown[item.name] || 0) + item.amount;
            });
        });
        const earningsData = Object.entries(earningsBreakdown).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const deductionsData = Object.entries(deductionsBreakdown).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        const exportData = finalizedRuns.flatMap(run => 
            run.payslips.map(payslip => {
                const emp = employeesMap.get(payslip.employeeId);
                return {
                    run_period: run.period,
                    employee_name: payslip.userName,
                    department: emp?.department || 'N/A',
                    designation: emp?.designation || 'N/A',
                    gross_salary: payslip.grossSalary,
                    net_pay: payslip.netPay,
                };
            })
        );

        return { summary, costTrendData, departmentData, designationData, earningsData, deductionsData, exportData };
    }, [runs, employees]);

    const toggleRunExpansion = (runId: string) => {
        setExpandedRuns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(runId)) newSet.delete(runId);
            else newSet.add(runId);
            return newSet;
        });
    };

    if (loading) return <p className="text-center p-8">Generating report...</p>;
    if (runs.length === 0) return <NoDataPlaceholder message="No finalized payroll runs found for the selected period." />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Gross Pay" value={formatCurrency(reportData.summary.totalGrossPay, user?.hospitalCurrency)} />
                <StatCard title="Total Net Pay" value={formatCurrency(reportData.summary.totalNetPay, user?.hospitalCurrency)} />
                <StatCard title="Unique Employees Paid" value={String(reportData.summary.employeesPaid)} />
                <StatCard title="Payroll Runs Processed" value={String(reportData.summary.runsProcessed)} />
            </div>

            <ReportCard title="Salary Cost Trend">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.costTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="period" />
                        <YAxis tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0, -3) + 'K'} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, user?.hospitalCurrency)} />
                        <Legend />
                        <Bar dataKey="totalCost" name="Total Gross Salary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ReportCard>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportCard title="Salary Cost by Department">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.departmentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0, -3)} />
                            <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, user?.hospitalCurrency)} />
                            <Bar dataKey="value" name="Gross Salary" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>
                <ReportCard title="Salary Cost by Designation">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.designationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0, -3)} />
                            <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, user?.hospitalCurrency)} />
                            <Bar dataKey="value" name="Gross Salary" fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>
            </div>
            
            <ReportCard title="Earnings & Deductions Breakdown">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                    <div>
                         <h4 className="font-semibold text-center mb-2">Earnings</h4>
                         <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={reportData.earningsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {reportData.earningsData.map((_entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value, user?.hospitalCurrency)} />
                                <Legend />
                            </PieChart>
                         </ResponsiveContainer>
                    </div>
                    <div>
                        <h4 className="font-semibold text-center mb-2">Deductions</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={reportData.deductionsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {reportData.deductionsData.map((_entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS.slice(2)[index % (CHART_COLORS.length - 2)]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value, user?.hospitalCurrency)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </ReportCard>

            <ReportCard title="Payroll Runs" actions={<ExportButton data={reportData.exportData} headers={[
                {key: 'run_period', label: 'Run Period'}, {key: 'employee_name', label: 'Employee Name'}, {key: 'department', label: 'Department'}, {key: 'designation', label: 'Designation'}, {key: 'gross_salary', label: 'Gross Salary'}, {key: 'net_pay', label: 'Net Pay'}
            ]} filename="payroll_report" />}>
                <div className="space-y-2">
                    {runs.map(run => (
                        <div key={run.id}>
                            <button onClick={() => toggleRunExpansion(run.id)} className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800">
                                <div>
                                    <h4 className="font-bold text-lg">{run.period}</h4>
                                    <p className="text-sm text-slate-500">Run Date: {run.runDate.toDate().toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold capitalize text-sm ${run.status === 'draft' ? 'text-yellow-600' : 'text-green-600'}`}>{run.status}</p>
                                    <p className="text-slate-500">{run.payslips.length} employees</p>
                                </div>
                                <FontAwesomeIcon icon={faChevronDown} className={`ml-4 transition-transform ${expandedRuns.has(run.id) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedRuns.has(run.id) && (
                                <div className="overflow-x-auto border rounded-b-lg p-2">
                                    <table className="min-w-full text-sm">
                                        <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase"><tr>
                                            <th className="p-2 text-left">Employee</th>
                                            <th className="p-2 text-right">Gross Salary</th>
                                            <th className="p-2 text-right">Bonus/Additions</th>
                                            <th className="p-2 text-right">Deductions</th>
                                            <th className="p-2 text-right">Net Pay</th>
                                            <th className="p-2 text-center">Status</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {run.payslips.map(p => (
                                                <tr key={p.id} className="text-slate-800 dark:text-slate-200">
                                                    <td className="p-2">{p.userName}</td>
                                                    <td className="p-2 text-right">{formatCurrency(p.grossSalary, user?.hospitalCurrency)}</td>
                                                    <td className="p-2 text-right">{formatCurrency((p.additionalEarnings || []).reduce((s, i) => s + i.amount, 0), user?.hospitalCurrency)}</td>
                                                    <td className="p-2 text-right">{formatCurrency(p.totalDeductions, user?.hospitalCurrency)}</td>
                                                    <td className="p-2 text-right font-bold">{formatCurrency(p.netPay, user?.hospitalCurrency)}</td>
                                                    <td className="p-2 text-center"><span className={`px-2 py-0.5 text-xs rounded-full ${p.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>{p.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ReportCard>
        </div>
    );
};

const LoanReport: React.FC<{ startDate: Date, endDate: Date }> = ({ startDate, endDate }) => {
    const { user, getLoans } = useAuth();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<Loan[]>([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const allLoans = await getLoans();
                const filteredLoans = allLoans.filter(loan => {
                    const disbursementDate = loan.disbursementDate.toDate();
                    return disbursementDate >= startDate && disbursementDate <= endDate;
                });
                setLoans(filteredLoans.sort((a, b) => b.disbursementDate.seconds - a.disbursementDate.seconds));
            } catch (error) {
                console.error("Failed to fetch loan report data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, getLoans]);

    const reportData = useMemo(() => {
        const totalDisbursed = loans.reduce((sum, l) => sum + l.loanAmount, 0);
        const totalRepaid = loans.reduce((sum, l) => sum + l.amountPaid, 0);
        const outstandingBalance = totalDisbursed - totalRepaid;
        const activeLoans = loans.filter(l => l.status === 'active').length;

        const byType = loans.reduce((acc, loan) => {
            acc[loan.loanType] = (acc[loan.loanType] || 0) + loan.loanAmount;
            return acc;
        }, {} as Record<string, number>);

        const byTypeChartData = Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        return {
            summary: { totalDisbursed, totalRepaid, outstandingBalance, activeLoans },
            byTypeChartData
        };
    }, [loans]);

    const totalPages = Math.ceil(loans.length / itemsPerPage);
    const paginatedLoans = loans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [startDate, endDate]);

    if (loading) return <p className="text-center p-8">Generating loan report...</p>;
    if (loans.length === 0) return <NoDataPlaceholder message="No loans found for the selected period." />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Disbursed" value={formatCurrency(reportData.summary.totalDisbursed, user?.hospitalCurrency)} />
                <StatCard title="Total Repaid" value={formatCurrency(reportData.summary.totalRepaid, user?.hospitalCurrency)} />
                <StatCard title="Outstanding Balance" value={formatCurrency(reportData.summary.outstandingBalance, user?.hospitalCurrency)} />
                <StatCard title="Active Loans" value={String(reportData.summary.activeLoans)} />
            </div>

            <ReportCard title="Loan Amount by Type">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.byTypeChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0, -3) + 'K'} />
                        <Tooltip formatter={(value: number) => formatCurrency(value, user?.hospitalCurrency)} />
                        <Legend />
                        <Bar dataKey="value" name="Amount Disbursed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ReportCard>
            
            <ReportCard title="Detailed Loan Report" actions={<ExportButton data={loans} headers={[
                {key: 'loanId', label: 'Loan ID'}, {key: 'employeeName', label: 'Employee Name'}, {key: 'loanType', label: 'Loan Type'}, {key: 'loanAmount', label: 'Loan Amount'}, {key: 'amountPaid', label: 'Amount Paid'}, {key: 'status', label: 'Status'}
            ]} filename="loan_report" />}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-xs text-slate-600 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="p-2 text-left">Loan ID</th>
                                <th className="p-2 text-left">Employee Name</th>
                                <th className="p-2 text-left">Loan Type</th>
                                <th className="p-2 text-right">Loan Amount</th>
                                <th className="p-2 text-right">Amount Paid</th>
                                <th className="p-2 text-right">Balance</th>
                                <th className="p-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {paginatedLoans.map(loan => (
                                <tr key={loan.id}>
                                    <td className="p-2 font-mono text-blue-600">{loan.loanId}</td>
                                    <td className="p-2">{loan.employeeName}</td>
                                    <td className="p-2">{loan.loanType}</td>
                                    <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(loan.loanAmount, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right text-green-600">{formatCurrency(loan.amountPaid, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right font-semibold text-red-600">{formatCurrency(loan.loanAmount - loan.amountPaid, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-center">{loan.status}</td>
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
                    totalItems={loans.length}
                    itemsOnPage={paginatedLoans.length}
                />
            </ReportCard>
        </div>
    );
};


const POSSalesReport: React.FC<{ startDate: Date, endDate: Date }> = ({ startDate, endDate }) => {
    const { user, getPOSSales, getStocks, getUsersForHospital } = useAuth();
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<POSSale[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [staffList, setStaffList] = useState<UserDocument[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [salesData, stockData, staffData] = await Promise.all([
                getPOSSales(startDate, endDate),
                getStocks(),
                getUsersForHospital()
            ]);
            setSales(salesData.filter(s => s.status === 'Completed'));
            setStockItems(stockData);
            setStaffList(staffData);
            setLoading(false);
        };
        fetchData();
    }, [startDate, endDate, getPOSSales, getStocks, getUsersForHospital]);

    useEffect(() => { setCurrentPage(1); }, [startDate, endDate]);

    const { summary, timeSeriesData, byCategory, byBrand, byStaff, byPaymentMode, productPerformance } = useMemo(() => {
        const stockCostMap = new Map(stockItems.map(item => {
            const latestBatch = item.batches?.sort((a, b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0];
            return [item.id!, latestBatch?.costPrice || 0];
        }));
        const stockInfoMap = new Map(stockItems.map(item => [item.id!, { category: item.category, brand: item.vendor }]));

        const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalCOGS = sales.reduce((sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + ((stockCostMap.get(i.stockItemId) || 0) * i.quantity), 0), 0);
        const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0);
        
        const summary = {
            totalSales,
            totalProfit: totalSales - totalCOGS,
            totalItems,
            numSales: sales.length
        };

        const timeSeriesMap: Record<string, number> = {};
        sales.forEach(s => {
            const dateKey = s.createdAt.toDate().toLocaleDateString('en-GB');
            timeSeriesMap[dateKey] = (timeSeriesMap[dateKey] || 0) + s.totalAmount;
        });
        const timeSeriesData = Object.entries(timeSeriesMap).map(([name, sales]) => ({ name, sales })).sort((a, b) => new Date(a.name.split('/').reverse().join('-')).getTime() - new Date(b.name.split('/').reverse().join('-')).getTime());

        const byCategory = sales.flatMap(s => s.items).reduce((acc, item) => {
            const category = stockInfoMap.get(item.stockItemId)?.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + (item.salePrice * item.quantity);
            return acc;
        }, {} as Record<string, number>);

        const byBrand = sales.flatMap(s => s.items).reduce((acc, item) => {
            const brand = stockInfoMap.get(item.stockItemId)?.brand || 'Unknown';
            acc[brand] = (acc[brand] || 0) + (item.salePrice * item.quantity);
            return acc;
        }, {} as Record<string, number>);

        const byStaff = sales.reduce((acc, s) => {
            acc[s.createdBy] = (acc[s.createdBy] || 0) + s.totalAmount;
            return acc;
        }, {} as Record<string, number>);
        
        const byPaymentMode = sales.reduce((acc, s) => {
            acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.totalAmount;
            return acc;
        }, {} as Record<string, number>);
        
        const productPerformanceMap = new Map<string, { name: string, sku: string, category: string, brand: string, qtySold: number, totalSales: number, totalCOGS: number }>();
        sales.flatMap(s => s.items).forEach(item => {
            const stock = stockItems.find(s => s.id === item.stockItemId);
            if (!stock) return;
            const existing = productPerformanceMap.get(item.stockItemId) || { name: item.name, sku: item.sku, category: stock.category, brand: stock.vendor, qtySold: 0, totalSales: 0, totalCOGS: 0 };
            const salePriceBeforeTax = item.salePrice;
            const costPrice = stockCostMap.get(item.stockItemId) || 0;

            existing.qtySold += item.quantity;
            existing.totalSales += salePriceBeforeTax * item.quantity;
            existing.totalCOGS += costPrice * item.quantity;
            productPerformanceMap.set(item.stockItemId, existing);
        });
        const productPerformance = Array.from(productPerformanceMap.values()).map(item => ({ ...item, profit: item.totalSales - item.totalCOGS })).sort((a, b) => b.profit - a.profit);
        
        return { summary, timeSeriesData, byCategory, byBrand, byStaff, byPaymentMode, productPerformance };
    }, [sales, stockItems]);
    
    const totalPages = Math.ceil(productPerformance.length / itemsPerPage);
    const paginatedProducts = productPerformance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return <p className="text-center p-8">Generating report...</p>;
    if (sales.length === 0) return <NoDataPlaceholder message="No POS sales found for the selected period." />;
    
    const toChartData = (data: Record<string, number>) => Object.entries(data).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Sales" value={formatCurrency(summary.totalSales, user?.hospitalCurrency)} />
                <StatCard title="Gross Profit" value={formatCurrency(summary.totalProfit, user?.hospitalCurrency)} />
                <StatCard title="Total Items Sold" value={summary.totalItems.toString()} />
                <StatCard title="Number of Sales" value={summary.numSales.toString()} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportCard title="Sales Over Time"><ResponsiveContainer width="100%" height={300}><BarChart data={timeSeriesData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} fontSize={12} /><Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} /><Bar dataKey="sales" fill="#3b82f6" name="Sales" /></BarChart></ResponsiveContainer></ReportCard>
                <ReportCard title="Sales by Category"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={toChartData(byCategory)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}>{toChartData(byCategory).map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} /></PieChart></ResponsiveContainer></ReportCard>
                <ReportCard title="Sales by Staff Member"><ResponsiveContainer width="100%" height={300}><BarChart data={toChartData(byStaff).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} /><YAxis type="category" dataKey="name" width={100} fontSize={12} /><Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} /><Bar dataKey="value" fill="#10b981" name="Sales" /></BarChart></ResponsiveContainer></ReportCard>
                <ReportCard title="Sales by Payment Mode"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={toChartData(byPaymentMode)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>{toChartData(byPaymentMode).map((_entry, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => formatCurrency(v, user?.hospitalCurrency)} /><Legend /></PieChart></ResponsiveContainer></ReportCard>
                <ReportCard title="Sales by Brand"><ResponsiveContainer width="100%" height={300}><BarChart data={toChartData(byBrand).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} /><YAxis type="category" dataKey="name" width={100} fontSize={12} /><Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} /><Bar dataKey="value" fill="#f97316" name="Sales" /></BarChart></ResponsiveContainer></ReportCard>
            </div>
             <ReportCard title="Top Selling Products" actions={<ExportButton data={productPerformance} headers={[{key: 'name', label: 'Product Name'}, {key: 'sku', label: 'SKU'}, {key: 'category', label: 'Category'}, {key: 'brand', label: 'Brand'}, {key: 'qtySold', label: 'Qty Sold'}, {key: 'totalSales', label: 'Total Sales'}, {key: 'totalCOGS', label: 'Total COGS'}, {key: 'profit', label: 'Profit'}]} filename="top_products_report" />}>
                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-xs text-slate-600 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800">
                            <tr><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty Sold</th><th className="p-2 text-right">Total Sales</th><th className="p-2 text-right">Total COGS</th><th className="p-2 text-right">Profit</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {paginatedProducts.map((item: any) => (
                                <tr key={item.sku}>
                                    <td className="p-2"><p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.sku} - {item.brand}</p></td>
                                    <td className="p-2 text-right">{item.qtySold}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.totalSales, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.totalCOGS, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right font-semibold text-green-600">{formatCurrency(item.profit, user?.hospitalCurrency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} totalItems={productPerformance.length} itemsOnPage={paginatedProducts.length} />
            </ReportCard>
        </div>
    );
};

const TreatmentSalesReport: React.FC<{ startDate: Date, endDate: Date }> = ({ startDate, endDate }) => {
     const { user, getInvoices } = useAuth();
     const [loading, setLoading] = useState(true);
     const [invoices, setInvoices] = useState<Invoice[]>([]);
     const [viewBy, setViewBy] = useState<'doctor' | 'treatment'>('doctor');
     const [currentPage, setCurrentPage] = useState(1);
     const [itemsPerPage, setItemsPerPage] = useState(10);

     useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setInvoices(await getInvoices(startDate, endDate));
            setLoading(false);
        };
        fetchData();
    }, [startDate, endDate, getInvoices]);

    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, viewBy]);

    const summary = useMemo(() => {
        const totalRevenue = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPaid = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
        return { totalRevenue, totalPaid, totalDue: totalRevenue - totalPaid, numInvoices: invoices.length };
    }, [invoices]);

    const revenueByDoctor = useMemo(() => {
        const byDoctor = invoices.reduce((acc, inv) => {
            acc[inv.doctorName] = (acc[inv.doctorName] || 0) + inv.totalAmount;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(byDoctor).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue-a.revenue);
    }, [invoices]);

    const revenueByTreatment = useMemo(() => {
        const byTreatment = invoices.flatMap(inv => inv.items).reduce((acc, item) => {
            acc[item.description] = (acc[item.description] || 0) + item.cost;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(byTreatment).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue-a.revenue).slice(0, 10);
    }, [invoices]);

    const totalPages = useMemo(() => Math.ceil(invoices.length / itemsPerPage), [invoices.length, itemsPerPage]);
    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return invoices.slice(startIndex, startIndex + itemsPerPage);
    }, [invoices, currentPage, itemsPerPage]);
    
    if (loading) return <p className="text-center p-8">Generating report...</p>;
    if (invoices.length === 0) return <NoDataPlaceholder message="No invoices found for the selected period." />;
    
    const chartData = viewBy === 'doctor' ? revenueByDoctor : revenueByTreatment;
    const chartTitle = viewBy === 'doctor' ? 'Revenue by Doctor' : 'Revenue by Treatment';

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value={formatCurrency(summary.totalRevenue, user?.hospitalCurrency)} />
                <StatCard title="Total Paid" value={formatCurrency(summary.totalPaid, user?.hospitalCurrency)} />
                <StatCard title="Total Dues" value={formatCurrency(summary.totalDue, user?.hospitalCurrency)} />
                <StatCard title="Total Invoices" value={summary.numInvoices.toString()} />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 border dark:border-slate-700 max-w-sm">
                <Button size="sm" variant={viewBy === 'doctor' ? 'light' : 'ghost'} onClick={() => setViewBy('doctor')} className="!rounded-md shadow-sm w-full">By Doctor</Button>
                <Button size="sm" variant={viewBy === 'treatment' ? 'light' : 'ghost'} onClick={() => setViewBy('treatment')} className="!rounded-md w-full">By Treatment</Button>
            </div>
             <ReportCard title={chartTitle}>
                 <ResponsiveContainer width="100%" height={300}>
                    {viewBy === 'doctor' ? (
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} fontSize={12} />
                            <Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} />
                            <Bar dataKey="revenue" fill="#8b5cf6" />
                        </BarChart>
                    ) : (
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-800" />
                            <XAxis type="number" tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, width: 140 }} />
                            <Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} />
                            <Bar dataKey="revenue">
                                {chartData.map((_entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    )}
                 </ResponsiveContainer>
            </ReportCard>
            <ReportCard title="Detailed Invoices" actions={<ExportButton data={invoices} headers={[{key: 'invoiceId', label: 'Invoice ID'}, {key: 'patientName', label: 'Patient'}, {key: 'doctorName', label: 'Doctor'}, {key: 'totalAmount', label: 'Total'}, {key: 'amountPaid', label: 'Paid'}, {key: 'status', label: 'Status'}]} filename="treatment_sales_report" />}>
                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-xs text-slate-600 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800">
                            <tr><th className="p-2 text-left">Invoice ID</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Patient</th><th className="p-2 text-left">Doctor</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Paid</th><th className="p-2 text-right">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {paginatedInvoices.map(inv => (
                                <tr key={inv.id}>
                                    <td className="p-2 font-mono text-blue-600 dark:text-blue-400">{inv.invoiceId}</td>
                                    <td className="p-2">{inv.createdAt.toDate().toLocaleString()}</td>
                                    <td className="p-2">{inv.patientName}</td>
                                    <td className="p-2">{inv.doctorName}</td>
                                    <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(inv.totalAmount, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right text-green-600 dark:text-green-400">{formatCurrency(inv.amountPaid, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right">{inv.status}</td>
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
                    totalItems={invoices.length}
                    itemsOnPage={paginatedInvoices.length}
                />
            </ReportCard>
        </div>
    );
};

const PurchaseAndSaleReport: React.FC<{ startDate: Date; endDate: Date }> = ({ startDate, endDate }) => {
    const { user, getStockOrders, getPOSSales, getStocks } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const calculateReport = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [orders, sales, stockItems] = await Promise.all([
                    getStockOrders(startDate, endDate),
                    getPOSSales(startDate, endDate),
                    getStocks(),
                ]);
                const stockCostMap = new Map(stockItems.map(item => {
                    const latestBatch = item.batches?.sort((a, b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0];
                    return [item.id!, latestBatch?.costPrice || 0];
                }));
                const stockCategoryMap = new Map(stockItems.map(item => [item.id!, item.category]));

                const totalPurchaseValue = orders.reduce((sum, order) => sum + order.totalValue, 0);
                const completedSales = sales.filter(s => s.status === 'Completed');
                const totalSalesValue = completedSales.reduce((sum, sale) => sum + sale.grossTotal, 0);

                const totalCOGS = completedSales.reduce((sum, sale) => {
                    const saleCost = sale.items.reduce((itemSum, item) => {
                        const cost = stockCostMap.get(item.stockItemId) || 0;
                        return itemSum + (cost * item.quantity);
                    }, 0);
                    return sum + saleCost;
                }, 0);

                const totalProfit = totalSalesValue - totalCOGS;
                const profitMargin = totalSalesValue > 0 ? (totalProfit / totalSalesValue) * 100 : 0;
                
                const timeSeriesData: { [key: string]: { purchase: number, sales: number } } = {};
                const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
                const isMonthly = diffDays > 60;
                const formatDateKey = (date: Date) => isMonthly ? date.toLocaleString('default', { month: 'short', year: 'numeric' }) : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                orders.forEach(order => {
                    const key = formatDateKey(order.orderDate.toDate());
                    if (!timeSeriesData[key]) timeSeriesData[key] = { purchase: 0, sales: 0 };
                    timeSeriesData[key].purchase += order.totalValue;
                });
                completedSales.forEach(sale => {
                    const key = formatDateKey(sale.createdAt.toDate());
                    if (!timeSeriesData[key]) timeSeriesData[key] = { purchase: 0, sales: 0 };
                    timeSeriesData[key].sales += sale.grossTotal;
                });
                const purchaseVsSalesChart = Object.entries(timeSeriesData).map(([name, values]) => ({ name, ...values }));

                const salesByCategory = completedSales.flatMap(s => s.items).reduce((acc, item) => {
                    const category = stockCategoryMap.get(item.stockItemId) || 'Uncategorized';
                    acc[category] = (acc[category] || 0) + (item.salePrice * item.quantity);
                    return acc;
                }, {} as Record<string, number>);
                const categoryChartData = Object.entries(salesByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

                const productPerformanceMap = new Map<string, { name: string, sku: string, category: string, qtySold: number, totalSales: number, totalCOGS: number }>();
                completedSales.flatMap(s => s.items).forEach(item => {
                    const stock = stockItems.find(s => s.id === item.stockItemId);
                    if (!stock) return;
                    const existing = productPerformanceMap.get(item.stockItemId) || { name: item.name, sku: item.sku, category: stock.category, qtySold: 0, totalSales: 0, totalCOGS: 0 };
                    existing.qtySold += item.quantity;
                    existing.totalSales += item.salePrice * item.quantity;
                    const costPrice = stock.batches?.sort((a, b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0]?.costPrice || 0;
                    existing.totalCOGS += (costPrice) * item.quantity;
                    productPerformanceMap.set(item.stockItemId, existing);
                });
                const detailedTableData = Array.from(productPerformanceMap.values()).map(item => ({ ...item, profit: item.totalSales - item.totalCOGS })).sort((a, b) => b.profit - a.profit);

                setData({ totalPurchaseValue, totalSalesValue, totalProfit, profitMargin, purchaseVsSalesChart, categoryChartData, detailedTableData });
            } catch (error) {
                addToast("Failed to generate report.", "error");
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        calculateReport();
    }, [startDate, endDate, user, getStockOrders, getPOSSales, getStocks, addToast]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate]);

    if (loading) return <p className="text-center p-8">Generating report...</p>;
    if (!data) return <NoDataPlaceholder message="No purchase or sale data found for the selected period." />;

    const detailedTableData = data.detailedTableData || [];
    const totalPages = Math.ceil(detailedTableData.length / itemsPerPage);
    const paginatedData = detailedTableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Purchase" value={formatCurrency(data.totalPurchaseValue, user?.hospitalCurrency)} />
                <StatCard title="Total Sales" value={formatCurrency(data.totalSalesValue, user?.hospitalCurrency)} />
                <StatCard title="Gross Profit" value={formatCurrency(data.totalProfit, user?.hospitalCurrency)} />
                <StatCard title="Profit Margin" value={`${data.profitMargin.toFixed(2)}%`} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <ReportCard title="Purchases vs Sales">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.purchaseVsSalesChart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} fontSize={12} />
                            <Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} />
                            <Legend />
                            <Bar dataKey="purchase" fill="#f97316" name="Purchases" />
                            <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                        </BarChart>
                    </ResponsiveContainer>
                </ReportCard>
                 <ReportCard title="Sales by Category">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                             <Pie data={data.categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                {data.categoryChartData.map((_entry: any, index: number) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} />
                        </PieChart>
                    </ResponsiveContainer>
                </ReportCard>
            </div>
             <ReportCard title="Product Performance" actions={<ExportButton data={data.detailedTableData} headers={[{key: 'name', label: 'Product Name'}, {key: 'sku', label: 'SKU'}, {key: 'category', label: 'Category'}, {key: 'qtySold', label: 'Qty Sold'}, {key: 'totalSales', label: 'Total Sales'}, {key: 'totalCOGS', label: 'Total COGS'}, {key: 'profit', label: 'Profit'}]} filename="product_performance_report" />}>
                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-xs text-slate-600 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800">
                            <tr><th className="p-2 text-left">Product</th><th className="p-2 text-right">Qty Sold</th><th className="p-2 text-right">Total Sales</th><th className="p-2 text-right">Total COGS</th><th className="p-2 text-right">Profit</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {paginatedData.map((item: any) => (
                                <tr key={item.sku}>
                                    <td className="p-2"><p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.sku} - {item.category}</p></td>
                                    <td className="p-2 text-right">{item.qtySold}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.totalSales, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.totalCOGS, user?.hospitalCurrency)}</td>
                                    <td className="p-2 text-right font-semibold text-green-600">{formatCurrency(item.profit, user?.hospitalCurrency)}</td>
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
                    totalItems={detailedTableData.length}
                    itemsOnPage={paginatedData.length}
                />
            </ReportCard>
        </div>
    );
};

const StockOrdersByVendorReport: React.FC<{ startDate: Date, endDate: Date }> = ({ startDate, endDate }) => {
    const { user, getStockOrders } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<StockOrder[]>([]);
    const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                setOrders(await getStockOrders(startDate, endDate));
            } catch (error) {
                console.error("Failed to fetch stock orders report:", error);
                addToast("Could not generate stock order report.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, getStockOrders, addToast]);

    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate]);

    const { summary, dataByVendor } = useMemo(() => {
        const byVendor = orders.reduce((acc, order) => {
            if (!acc[order.vendor]) {
                acc[order.vendor] = {
                    totalValue: 0,
                    totalItems: 0,
                    orders: []
                };
            }
            acc[order.vendor].totalValue += order.totalValue;
            acc[order.vendor].totalItems += order.totalItems;
            acc[order.vendor].orders.push(order);
            return acc;
        }, {} as Record<string, { totalValue: number; totalItems: number; orders: StockOrder[] }>);
        
        const summaryStats = {
            totalOrders: orders.length,
            totalOrderValue: orders.reduce((sum, o) => sum + o.totalValue, 0),
            totalItemsOrdered: orders.reduce((sum, o) => sum + o.totalItems, 0),
            numVendors: Object.keys(byVendor).length
        };

        return { summary: summaryStats, dataByVendor: Object.entries(byVendor).sort((a,b) => b[1].totalValue - a[1].totalValue) };
    }, [orders]);

    const totalPages = useMemo(() => Math.ceil(dataByVendor.length / itemsPerPage), [dataByVendor.length, itemsPerPage]);
    const paginatedVendors = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return dataByVendor.slice(startIndex, startIndex + itemsPerPage);
    }, [dataByVendor, currentPage, itemsPerPage]);


    const toggleVendor = (vendorName: string) => {
        setExpandedVendors(prev => {
            const newSet = new Set(prev);
            if (newSet.has(vendorName)) {
                newSet.delete(vendorName);
            } else {
                newSet.add(vendorName);
            }
            return newSet;
        });
    };

    const toggleAll = () => {
        if (expandedVendors.size === dataByVendor.length) {
            setExpandedVendors(new Set());
        } else {
            setExpandedVendors(new Set(dataByVendor.map(([vendor]) => vendor)));
        }
    };

    if (loading) return <p className="text-center p-8">Generating report...</p>;
    if (orders.length === 0) return <NoDataPlaceholder message="No stock orders found for the selected period." />;

    const chartData = dataByVendor.map(([name, data]) => ({ name, value: data.totalValue })).slice(0, 10);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Orders" value={summary.totalOrders.toString()} />
                <StatCard title="Total Order Value" value={formatCurrency(summary.totalOrderValue, user?.hospitalCurrency)} />
                <StatCard title="Total Items Ordered" value={summary.totalItemsOrdered.toString()} />
                <StatCard title="Number of Vendors" value={summary.numVendors.toString()} />
            </div>
            <ReportCard title="Top 10 Vendors by Order Value">
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} fontSize={12} />
                        <Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} />
                        <Bar dataKey="value" name="Order Value">
                            {chartData.map((_entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                 </ResponsiveContainer>
            </ReportCard>
            <ReportCard title="Detailed Orders by Vendor" actions={<ExportButton data={orders} headers={[{key: 'orderId', label: 'Order ID'}, {key: 'vendor', label: 'Vendor'}, {key: 'totalValue', label: 'Value'}, {key: 'status', label: 'Status'}]} filename="stock_orders_by_vendor" />}>
                <div className="text-right mb-2">
                    <Button variant="light" size="sm" onClick={toggleAll}>
                        {expandedVendors.size === dataByVendor.length ? 'Collapse All' : 'Expand All'}
                    </Button>
                </div>
                <div className="space-y-2">
                    {paginatedVendors.map(([vendor, data]) => (
                        <div key={vendor}>
                            <button onClick={() => toggleVendor(vendor)} className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{vendor} - Total Value: {formatCurrency(data.totalValue, user?.hospitalCurrency)}</h4>
                                <FontAwesomeIcon icon={faChevronDown} className={`transition-transform text-slate-500 ${expandedVendors.has(vendor) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedVendors.has(vendor) && (
                                <div className="overflow-x-auto border rounded-lg mt-2">
                                    <table className="min-w-full text-sm">
                                        <thead className="text-xs text-slate-600 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800">
                                            <tr><th className="p-2 text-left">Order ID</th><th className="p-2 text-left">Date</th><th className="p-2 text-right">Items</th><th className="p-2 text-right">Value</th><th className="p-2 text-center">Status</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                            {data.orders.map(order => (
                                                <tr key={order.id}>
                                                    <td className="p-2 font-mono text-blue-600 dark:text-blue-400">{order.orderId}</td>
                                                    <td className="p-2">{order.orderDate.toDate().toLocaleDateString()}</td>
                                                    <td className="p-2 text-right">{order.totalItems}</td>
                                                    <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(order.totalValue, user?.hospitalCurrency)}</td>
                                                    <td className="p-2 text-center"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">{order.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                    totalItems={dataByVendor.length}
                    itemsOnPage={paginatedVendors.length}
                />
            </ReportCard>
        </div>
    );
};

const StockReturnsByVendorReport: React.FC<{ startDate: Date, endDate: Date }> = ({ startDate, endDate }) => {
    const { user, getStockReturns } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [returns, setReturns] = useState<StockReturn[]>([]);
    const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                setReturns(await getStockReturns(startDate, endDate));
            } catch (error) {
                console.error("Failed to fetch stock returns report:", error);
                addToast("Could not generate stock returns report.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate, getStockReturns, addToast]);

    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate]);

    const { summary, dataByVendor } = useMemo(() => {
        const byVendor = returns.reduce((acc, ret) => {
            if (!acc[ret.vendor]) {
                acc[ret.vendor] = {
                    totalValue: 0,
                    totalItems: 0,
                    returns: []
                };
            }
            acc[ret.vendor].totalValue += ret.totalReturnValue;
            acc[ret.vendor].totalItems += ret.items.reduce((sum, item) => sum + item.returnedQty, 0);
            acc[ret.vendor].returns.push(ret);
            return acc;
        }, {} as Record<string, { totalValue: number; totalItems: number; returns: StockReturn[] }>);
        
        const summaryStats = {
            totalReturns: returns.length,
            totalReturnValue: returns.reduce((sum, r) => sum + r.totalReturnValue, 0),
            totalItemsReturned: returns.reduce((sum, r) => sum + r.items.reduce((itemSum, i) => itemSum + i.returnedQty, 0), 0),
            numVendors: Object.keys(byVendor).length
        };

        return { summary: summaryStats, dataByVendor: Object.entries(byVendor).sort((a,b) => b[1].totalValue - a[1].totalValue) };
    }, [returns]);

    const totalPages = useMemo(() => Math.ceil(dataByVendor.length / itemsPerPage), [dataByVendor.length, itemsPerPage]);
    const paginatedVendors = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return dataByVendor.slice(startIndex, startIndex + itemsPerPage);
    }, [dataByVendor, currentPage, itemsPerPage]);

    const toggleVendor = (vendorName: string) => {
        setExpandedVendors(prev => {
            const newSet = new Set(prev);
            if (newSet.has(vendorName)) {
                newSet.delete(vendorName);
            } else {
                newSet.add(vendorName);
            }
            return newSet;
        });
    };

    const toggleAll = () => {
        if (expandedVendors.size === dataByVendor.length) {
            setExpandedVendors(new Set());
        } else {
            setExpandedVendors(new Set(dataByVendor.map(([vendor]) => vendor)));
        }
    };
    
    if (loading) return <p className="text-center p-8">Generating report...</p>;
    if (returns.length === 0) return <NoDataPlaceholder message="No stock returns found for the selected period." />;

    const chartData = dataByVendor.map(([name, data]) => ({ name, value: data.totalValue })).slice(0, 10);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Returns" value={summary.totalReturns.toString()} />
                <StatCard title="Total Return Value" value={formatCurrency(summary.totalReturnValue, user?.hospitalCurrency)} />
                <StatCard title="Total Items Returned" value={summary.totalItemsReturned.toString()} />
                <StatCard title="Number of Vendors" value={summary.numVendors.toString()} />
            </div>
             <ReportCard title="Top 10 Vendors by Return Value">
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis tickFormatter={val => formatCurrency(val, user?.hospitalCurrency).slice(0,-3)} fontSize={12} />
                        <Tooltip formatter={(val: number) => formatCurrency(val, user?.hospitalCurrency)} />
                        <Bar dataKey="value" name="Return Value" fill="#ef4444">
                             {chartData.map((_entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                 </ResponsiveContainer>
            </ReportCard>
            <ReportCard title="Detailed Returns by Vendor" actions={<ExportButton data={returns} headers={[{key: 'returnId', label: 'Return ID'}, {key: 'vendor', label: 'Vendor'}, {key: 'totalReturnValue', label: 'Value'}]} filename="stock_returns_by_vendor" />}>
                <div className="text-right mb-2">
                    <Button variant="light" size="sm" onClick={toggleAll}>
                        {expandedVendors.size === dataByVendor.length ? 'Collapse All' : 'Expand All'}
                    </Button>
                </div>
                <div className="space-y-2">
                    {paginatedVendors.map(([vendor, data]) => (
                        <div key={vendor}>
                             <button onClick={() => toggleVendor(vendor)} className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{vendor} - Total Return Value: {formatCurrency(data.totalValue, user?.hospitalCurrency)}</h4>
                                <FontAwesomeIcon icon={faChevronDown} className={`transition-transform text-slate-500 ${expandedVendors.has(vendor) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedVendors.has(vendor) && (
                                <div className="overflow-x-auto border rounded-lg mt-2">
                                    <table className="min-w-full text-sm">
                                        <thead className="text-xs text-slate-600 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800">
                                            <tr><th className="p-2 text-left">Return ID</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Related Order</th><th className="p-2 text-right">Items</th><th className="p-2 text-right">Value</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                            {data.returns.map(ret => (
                                                <tr key={ret.id}>
                                                    <td className="p-2 font-mono text-blue-600 dark:text-blue-400">{ret.returnId}</td>
                                                    <td className="p-2">{ret.returnDate.toDate().toLocaleDateString()}</td>
                                                    <td className="p-2 font-mono">{ret.relatedOrderId}</td>
                                                    <td className="p-2 text-right">{ret.items.reduce((sum, i) => sum + i.returnedQty, 0)}</td>
                                                    <td className="p-2 text-right font-semibold text-red-600">-{formatCurrency(ret.totalReturnValue, user?.hospitalCurrency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                    totalItems={dataByVendor.length}
                    itemsOnPage={paginatedVendors.length}
                />
            </ReportCard>
        </div>
    );
};

const getDateRangeFromPreset = (preset: string, financialYearStartMonth: number = 3): { start: Date; end: Date } => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (preset) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(now.getDate() - 1);
            end.setDate(now.getDate() - 1);
            break;
        case 'last7':
            start.setDate(now.getDate() - 6);
            break;
        case 'last30':
            start.setDate(now.getDate() - 29);
            break;
        case 'thisMonth':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'lastMonth':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'thisMonthLastYear':
            start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            end = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'thisYear':
            start = new Date(now.getFullYear(), 0, 1);
            break;
        case 'lastYear':
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        case 'currentFy':
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            if (currentMonth >= financialYearStartMonth) {
                start = new Date(currentYear, financialYearStartMonth, 1);
            } else {
                start = new Date(currentYear - 1, financialYearStartMonth, 1);
            }
            end = now;
            break;
        case 'lastFy':
            const currentMonthLastFy = now.getMonth();
            const currentYearLastFy = now.getFullYear();
            if (currentMonthLastFy >= financialYearStartMonth) {
                start = new Date(currentYearLastFy - 1, financialYearStartMonth, 1);
                end = new Date(currentYearLastFy, financialYearStartMonth, 0);
            } else {
                start = new Date(currentYearLastFy - 2, financialYearStartMonth, 1);
                end = new Date(currentYearLastFy - 1, financialYearStartMonth, 0);
            }
            end.setHours(23, 59, 59, 999);
            break;
    }
    return { start, end };
};

// --- MAIN SCREEN COMPONENT ---
const ReportScreen: React.FC = () => {
    const { user } = useAuth();
    const [selectedReport, setSelectedReport] = useState<ReportType>('pnl');
    const [datePreset, setDatePreset] = useState<string>('thisMonth');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const financialYearStartMonth = useMemo(() => {
        const monthStr = user?.hospitalFinancialYearStartMonth || 'April';
        return new Date(Date.parse(monthStr +" 1, 2012")).getMonth();
    }, [user?.hospitalFinancialYearStartMonth]);
    
    useEffect(() => {
        if (datePreset !== 'custom') {
            const { start, end } = getDateRangeFromPreset(datePreset, financialYearStartMonth);
            setDateRange({
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            });
        }
    }, [datePreset, financialYearStartMonth]);

    const handlePrint = () => {
        window.print();
    };

    const { startDate, endDate } = useMemo(() => {
        if (!dateRange.start || !dateRange.end) {
            return { startDate: null, endDate: null };
        }
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
    }, [dateRange.start, dateRange.end]);

    const renderReport = () => {
        if (!startDate || !endDate) return <NoDataPlaceholder message="Please select a valid date range." />;
        
        switch (selectedReport) {
            case 'pnl': return <ProfitAndLossReport startDate={startDate} endDate={endDate} />;
            case 'pos_sales': return <POSSalesReport startDate={startDate} endDate={endDate} />;
            case 'treatment_sales': return <TreatmentSalesReport startDate={startDate} endDate={endDate} />;
            case 'payroll': return <PayrollReport startDate={startDate} endDate={endDate} />;
            case 'loan_report': return <LoanReport startDate={startDate} endDate={endDate} />;
            case 'purchase_sale': return <PurchaseAndSaleReport startDate={startDate} endDate={endDate} />;
            case 'stock_orders_by_vendor': return <StockOrdersByVendorReport startDate={startDate} endDate={endDate} />;
            case 'stock_returns_by_vendor': return <StockReturnsByVendorReport startDate={startDate} endDate={endDate} />;
            default: return <NoDataPlaceholder message="This report is not yet available." />;
        }
    };
    
    const datePresets = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'last7', label: 'Last 7 Days' },
        { value: 'last30', label: 'Last 30 Days' },
        { value: 'thisMonth', label: 'This Month' },
        { value: 'lastMonth', label: 'Last Month' },
        { value: 'thisMonthLastYear', label: 'This Month Last Year' },
        { value: 'thisYear', label: 'This Year' },
        { value: 'lastYear', label: 'Last Year' },
        { value: 'currentFy', label: 'Current Financial Year' },
        { value: 'lastFy', label: 'Last Financial Year' },
        { value: 'custom', label: 'Custom Range' },
    ];

  return (
    <>
    <style>{`
        @media print {
            body * { visibility: hidden; }
            .printable-area, .printable-area * { visibility: visible; }
            .printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
            .no-print { display: none; }
            .recharts-wrapper { width: 100% !important; height: auto !important; }
        }
    `}</style>
    <div className="flex flex-col lg:flex-row h-full bg-slate-100 dark:bg-slate-950">
      <aside className="w-full lg:w-72 flex-shrink-0 bg-white dark:bg-slate-900 lg:border-r border-b lg:border-b-0 border-slate-200 dark:border-slate-800 p-4 no-print">
        <nav className="space-y-2">
            {reportList.map(report => (
                <button 
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start ${selectedReport === report.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <FontAwesomeIcon icon={report.icon} className={`h-5 w-5 mt-0.5 mr-3 ${selectedReport === report.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                    <div>
                        <p className={`font-semibold ${selectedReport === report.id ? 'text-blue-800 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>{report.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{report.description}</p>
                    </div>
                </button>
            ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-center no-print">
            <Select label="Date Range:" value={datePreset} onChange={e => setDatePreset(e.target.value)}>
                {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            {datePreset === 'custom' && (
                <>
                    <Input type="date" label="Start Date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="max-w-xs" />
                    <Input type="date" label="End Date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="max-w-xs" />
                </>
            )}
             <div className="flex-grow flex justify-end">
                <Button variant="light" onClick={handlePrint}>
                    <FontAwesomeIcon icon={faPrint} className="mr-2" />
                    Print Report
                </Button>
            </div>
        </div>
        <div className="printable-area">
            {renderReport()}
        </div>
      </main>
    </div>
    </>
  );
};

export default ReportScreen;