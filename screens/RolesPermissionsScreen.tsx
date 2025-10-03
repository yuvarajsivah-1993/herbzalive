import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Permissions, PermissionLevel, AppModules, EditableRole } from '../types';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUndo, faShieldAlt, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// Hardcoded default permissions (copied from AuthContext for reset functionality)
// FIX: Add missing 'payroll' permission to the default permissions object.
const allModulesWrite: Permissions = {
  dashboard: 'write', reservations: 'write', patients: 'write', treatments: 'write', staff: 'write', accounts: 'write', sales: 'write', expenses: 'write', stocks: 'write', peripherals: 'write', report: 'write', appointments: 'write', doctors: 'write', profile: 'write', 'hospital-settings': 'write', 'invoice-settings': 'write', 'tax-rates': 'write', medicines: 'write', pos: 'write', 'pos-sales': 'write', notifications: 'write', vendors: 'write', payroll: 'write', 'payroll-settings': 'write', 'bulk-operations': 'write', 'chat': 'write', 'subscription': 'write', 'locations': 'write',
};
const adminPermissionsDefault: Permissions = {
  ...allModulesWrite,
  'hospital-settings': 'none', 'invoice-settings': 'none', 'tax-rates': 'none', notifications: 'none',
};
const staffPermissionsDefault: Permissions = {
  dashboard: 'read', reservations: 'write', patients: 'write', treatments: 'write', staff: 'none', accounts: 'read', sales: 'read', expenses: 'read', stocks: 'read', peripherals: 'write', report: 'none', appointments: 'write', doctors: 'write', profile: 'write', 'hospital-settings': 'none', 'invoice-settings': 'none', 'tax-rates': 'none', medicines: 'read', pos: 'write', 'pos-sales': 'write', notifications: 'none', vendors: 'read', payroll: 'none', 'payroll-settings': 'none', 'bulk-operations': 'none', 'chat': 'none', 'subscription': 'none', 'locations': 'none',
};
const doctorPermissionsDefault: Permissions = {
  dashboard: 'read', reservations: 'write', patients: 'write', treatments: 'read', doctors: 'none', staff: 'none', accounts: 'none', sales: 'none', expenses: 'none', stocks: 'none', peripherals: 'none', report: 'none', appointments: 'write', profile: 'write', 'hospital-settings': 'none', 'invoice-settings': 'none', 'tax-rates': 'none', medicines: 'read', pos: 'none', 'pos-sales': 'none', notifications: 'none', vendors: 'none', payroll: 'none', 'payroll-settings': 'none', 'bulk-operations': 'none', 'chat': 'none', 'subscription': 'none', 'locations': 'none',
};

const defaultPermissionsMap: Record<EditableRole, Permissions> = {
    admin: adminPermissionsDefault,
    staff: staffPermissionsDefault,
    doctor: doctorPermissionsDefault,
};

const MODULE_DEFINITIONS: { key: AppModules, name: string, description: string, group: string }[] = [
    { key: 'dashboard', name: 'Dashboard', description: 'View the main dashboard panels and statistics.', group: 'Main' },
    { key: 'reservations', name: 'Reservations', description: 'Access and manage the appointment calendar.', group: 'Main' },
    { key: 'appointments', name: 'Appointments', description: 'View and manage list of all appointments.', group: 'Main' },
    { key: 'patients', name: 'Patients', description: 'Create, view, and edit patient records.', group: 'Clinical' },
    { key: 'treatments', name: 'Treatments', description: 'Manage the list of available medical treatments.', group: 'Clinical' },
    { key: 'doctors', name: 'Doctors', description: 'Manage doctor profiles and schedules.', group: 'Clinical' },
    { key: 'staff', name: 'User Management', description: 'Manage staff and admin user accounts (excluding owner)..', group: 'Staff & Users' },
    { key: 'payroll', name: 'Payroll', description: 'Run payroll and manage employee salaries.', group: 'Staff & Users' },
    { key: 'accounts', name: 'Accounts', description: 'View financial accounts information.', group: 'Financial' },
    { key: 'sales', name: 'Sales', description: 'Manage treatment invoices and payments.', group: 'Financial' },
    { key: 'pos', name: 'Point of Sale (POS)', description: 'Access the POS interface to create new sales.', group: 'Financial' },
    { key: 'pos-sales', name: 'POS Sales', description: 'View history of all POS sales.', group: 'Financial' },
    { key: 'expenses', name: 'Expenses', description: 'Manage and track hospital expenses.', group: 'Financial' },
    { key: 'stocks', name: 'Stocks', description: 'Manage product inventory, orders, and returns.', group: 'Inventory' },
    { key: 'vendors', name: 'Vendors', description: 'Manage supplier and vendor information.', group: 'Inventory' },
    { key: 'chat', name: 'Chat', description: 'Enable real-time chat between staff members.', group: 'Tools & Comms' },
    { key: 'bulk-operations', name: 'Bulk Operations', description: 'Perform bulk data import/export operations.', group: 'Tools & Comms' },
    { key: 'hospital-settings', name: 'Hospital Settings', description: 'Edit core hospital details.', group: 'Settings' },
    { key: 'locations', name: 'Locations', description: 'Manage different hospital branches/locations.', group: 'Settings' },
    { key: 'invoice-settings', name: 'Invoice Settings', description: 'Configure invoice templates and numbering.', group: 'Settings' },
    { key: 'tax-rates', name: 'Tax Rates', description: 'Manage tax rates and groups.', group: 'Settings' },
    { key: 'notifications', name: 'Notification Settings', description: 'Configure automated email notifications.', group: 'Settings' },
    { key: 'subscription', name: 'Subscription', description: 'Manage hospital subscription plan.', group: 'Settings' },
    { key: 'peripherals', name: 'Peripherals', description: 'Manage hospital equipment and assets.', group: 'Settings' },
    { key: 'profile', name: 'My Profile', description: 'Allows users to view and edit their own profile.', group: 'Settings' },
    { key: 'medicines', name: 'Medicines', description: 'Manage the master list of medicines.', group: 'Settings' },
    { key: 'payroll-settings', name: 'Payroll Settings', description: 'Configure salary components and groups.', group: 'Settings' },
];


const RolesPermissionsScreen: React.FC = () => {
    const { user, updateRolePermissions } = useAuth();
    const { addToast } = useToast();
    const [selectedRole, setSelectedRole] = useState<EditableRole>('admin');
    const [permissions, setPermissions] = useState<Record<EditableRole, Permissions> | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            const newPermissionsState = JSON.parse(JSON.stringify(defaultPermissionsMap));
            
            if (user.hospitalRolePermissions && typeof user.hospitalRolePermissions === 'object') {
                for (const role of ['admin', 'staff', 'doctor'] as EditableRole[]) {
                    const customRolePerms = user.hospitalRolePermissions[role];
                    if (customRolePerms && typeof customRolePerms === 'object') {
                        newPermissionsState[role] = {
                            ...newPermissionsState[role],
                            ...customRolePerms
                        };
                    }
                }
            }
            setPermissions(newPermissionsState);
        }
    }, [user]);

    const handlePermissionChange = (module: AppModules, level: PermissionLevel) => {
        setPermissions(prev => {
            if (!prev) return null;
            const newRolePermissions = { ...prev[selectedRole], [module]: level };
            return {
                ...prev,
                [selectedRole]: newRolePermissions,
            };
        });
    };

    const handleSaveChanges = async () => {
        if (!permissions) return;
        setLoading(true);
        try {
            await updateRolePermissions(selectedRole, permissions[selectedRole]);
            addToast(`Permissions for ${selectedRole} role updated successfully!`, 'success');
        } catch (error) {
            addToast('Failed to update permissions.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetToDefault = () => {
        if (!permissions) return;
        const defaultPerms = defaultPermissionsMap[selectedRole];
        setPermissions({ ...permissions, [selectedRole]: defaultPerms });
        addToast(`Permissions for ${selectedRole} reset to default. Click Save to apply.`, 'info');
    };

    const hasChanges = useMemo(() => {
        if (!permissions || !user) {
            return false;
        }
        const statePermissions = permissions[selectedRole];
        const savedCustomPermissions = user.hospitalRolePermissions?.[selectedRole] || {};
        const originalEffectivePermissions = {
            ...defaultPermissionsMap[selectedRole],
            ...savedCustomPermissions
        };
        return JSON.stringify(statePermissions) !== JSON.stringify(originalEffectivePermissions);
    }, [permissions, selectedRole, user]);
    
    if (user?.roleName !== 'owner') {
        return (
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="h-6 w-6 text-yellow-500 mr-4"/>
                <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Access Denied</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">Permission management is only available to the hospital owner.</p>
                </div>
            </div>
        );
    }

    if (!permissions) {
        return <div className="p-6">Loading permissions...</div>
    }
    
    const currentRolePermissions = permissions[selectedRole];

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold">Roles & Permissions</h3>
                <p className="text-sm text-slate-500 mt-1">Define what different user roles can see and do in the portal.</p>
                <div className="mt-4 flex gap-2 border border-slate-200 dark:border-slate-700 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 max-w-sm">
                    {(['admin', 'staff', 'doctor'] as EditableRole[]).map(role => (
                        <Button 
                            key={role}
                            variant={selectedRole === role ? 'light' : 'ghost'}
                            onClick={() => setSelectedRole(role)}
                            className="w-full capitalize !rounded-md"
                        >
                            {role}
                        </Button>
                    ))}
                </div>
            </div>
            <div className="p-6">
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Module</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permission Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {Object.entries(
                                MODULE_DEFINITIONS.reduce((acc, module) => {
                                    if (!acc[module.group]) {
                                        acc[module.group] = [];
                                    }
                                    acc[module.group].push(module);
                                    return acc;
                                }, {} as Record<string, typeof MODULE_DEFINITIONS>)
                            ).map(([groupName, modules]) => (
                                <React.Fragment key={groupName}>
                                    <tr>
                                        <td colSpan={2} className="px-4 py-3 bg-slate-100 dark:bg-slate-800">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">{groupName}</h4>
                                        </td>
                                    </tr>
                                    {modules.map(({ key, name, description }) => (
                                        <tr key={key}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{name}</p>
                                                <p className="text-sm text-slate-500">{description}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <fieldset className="flex items-center gap-4">
                                                    <legend className="sr-only">Permission for {name}</legend>
                                                    {(['none', 'read', 'write'] as PermissionLevel[]).map(level => (
                                                        <div key={level} className="flex items-center">
                                                            <input 
                                                                id={`${key}-${level}`} 
                                                                name={`${key}-permission`}
                                                                type="radio" 
                                                                checked={currentRolePermissions[key] === level}
                                                                onChange={() => handlePermissionChange(key, level)}
                                                                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <label htmlFor={`${key}-${level}`} className="ml-2 block text-sm text-slate-700 dark:text-slate-300 capitalize">{level}</label>
                                                        </div>
                                                    ))}
                                                </fieldset>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg">
                <Button variant="light" onClick={handleResetToDefault} disabled={loading}>
                    <FontAwesomeIcon icon={faUndo} className="mr-2"/> Reset to Default
                </Button>
                <Button variant="primary" onClick={handleSaveChanges} disabled={loading || !hasChanges}>
                    <FontAwesomeIcon icon={faSave} className="mr-2"/> {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
};

export default RolesPermissionsScreen;