import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faFileInvoiceDollar, faCogs, faBriefcase, faHourglassHalf, faHandHoldingUsd } from '@fortawesome/free-solid-svg-icons';
import EmployeesTab from './payroll/EmployeesTab';
import SalaryTab from './payroll/SalaryTab';
import PayrollSettingsTab from './payroll/PayrollSettingsTab';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import LoansTab from './payroll/LoansTab';

type ActiveTab = 'employees' | 'salary' | 'loans' | 'settings';

const StatCard: React.FC<{ title: string; value: string | number; icon: any }> = ({ title, value, icon }) => (
    <Card className="p-6">
        <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center h-12 w-12">
                <FontAwesomeIcon icon={icon} className="h-6 w-6" />
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </Card>
);

const PayrollScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('employees');
    const { user, getEmployees, getPayrollRuns, getLoans } = useAuth();
    const [stats, setStats] = useState({ activeEmployees: 0, totalDepartments: 0, pendingRuns: 0, activeLoans: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const [employees, runs, loans] = await Promise.all([getEmployees(), getPayrollRuns(), getLoans()]);
                const activeEmployees = employees.filter(e => e.status === 'active').length;
                const departments = new Set(employees.map(e => e.department).filter(Boolean));
                const pendingRuns = runs.filter(r => r.status === 'draft').length;
                const activeLoans = loans.filter(l => l.status === 'active').length;
                setStats({ activeEmployees, totalDepartments: departments.size, pendingRuns, activeLoans });
            } catch {
                console.error("Failed to load payroll stats.");
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }, [getEmployees, getPayrollRuns, getLoans]);

    const TabButton: React.FC<{ tabId: ActiveTab, title: string, icon: any }> = ({ tabId, title, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 font-medium text-sm rounded-t-lg transition-colors border-b-2 ${
            activeTab === tabId
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
        >
            <FontAwesomeIcon icon={icon} className="w-4 h-4" />
            {title}
        </button>
    );
    
    const canSeeSettings = user?.permissions['payroll-settings'] !== 'none';

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Employees" value={statsLoading ? '...' : stats.activeEmployees} icon={faUsers} />
                <StatCard title="Total Departments" value={statsLoading ? '...' : stats.totalDepartments} icon={faBriefcase} />
                <StatCard title="Active Loans" value={statsLoading ? '...' : stats.activeLoans} icon={faHandHoldingUsd} />
                <StatCard title="Pending Salary Runs" value={statsLoading ? '...' : stats.pendingRuns} icon={faHourglassHalf} />
            </div>
            
            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className="-mb-px flex space-x-2 sm:space-x-8" aria-label="Tabs">
                    <TabButton tabId="employees" title="Employees" icon={faUsers} />
                    <TabButton tabId="salary" title="Salary Runs" icon={faFileInvoiceDollar} />
                    <TabButton tabId="loans" title="Loans" icon={faHandHoldingUsd} />
                    {canSeeSettings && <TabButton tabId="settings" title="Payroll Settings" icon={faCogs} />}
                </nav>
            </div>

            <div className="mt-6 flex-grow">
                {activeTab === 'employees' && <EmployeesTab />}
                {activeTab === 'salary' && <SalaryTab />}
                {activeTab === 'loans' && <LoansTab />}
                {activeTab === 'settings' && canSeeSettings && <PayrollSettingsTab />}
            </div>
        </div>
    );
};

export default PayrollScreen;