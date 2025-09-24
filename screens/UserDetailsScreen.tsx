import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserDocument, Address, UserUpdateData, HospitalLocation } from '../types';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faUser, faLock, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import Select from '../components/ui/Select';
import MultiSelect, { MultiSelectOption } from '../components/ui/MultiSelect';

const ResetPasswordModal: React.FC<{
  userEmail: string;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}> = ({ userEmail, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await onConfirm(password);
            onClose(); // Close modal on success
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Reset Password</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Set a new password for {userEmail}.
                    </p>
                    <div className="mt-4">
                        <Input 
                            id="new-password" 
                            label="New Password" 
                            type="password" 
                            required 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} 
                        />
                    </div>
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                    <div className="flex justify-end space-x-2 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Set New Password'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
        {footer && (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">
                {footer}
            </div>
        )}
    </div>
);


const UserDetailsScreen: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { getUserById, updateUser, updateUserStatus, changeUserRole, resetUserPasswordByAdmin, deleteUser, user: currentUser, hospitalLocations } = useAuth();
    
    const [user, setUser] = useState<UserDocument | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const { addToast } = useToast();
    
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmButtonText: string; variant: 'primary' | 'danger';
    } | null>(null);


    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [pincode, setPincode] = useState('');
    const [roleName, setRoleName] = useState<'staff' | 'admin'>('staff');
    const [assignedLocations, setAssignedLocations] = useState<string[]>([]);

    const locationOptions = useMemo((): MultiSelectOption[] =>
        hospitalLocations.map(loc => ({ value: loc.id, label: loc.name }))
    , [hospitalLocations]);

    const populateForm = useCallback((userData: UserDocument) => {
        setName(userData.name);
        setPhone(userData.phone);
        setStreet(userData.address.street);
        setCity(userData.address.city);
        setCountry(userData.address.country);
        setPincode(userData.address.pincode);
        setRoleName(userData.roleName as 'staff' | 'admin');
        setAssignedLocations(userData.assignedLocations || []);
    }, []);

    const fetchUser = useCallback(async () => {
        if (!userId) return;
        setPageLoading(true);
        try {
            const userData = await getUserById(userId);
            if (userData) {
                setUser(userData);
                populateForm(userData);
            } else {
                addToast('User not found.', 'error');
            }
        } catch (e) {
            addToast('Failed to fetch user data.', 'error');
            console.error(e);
        } finally {
            setPageLoading(false);
        }
    }, [userId, getUserById, populateForm, addToast]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const handleUpdate = async () => {
        if (!userId) return;
        setActionLoading('update');
        try {
            const address: Address = { street, city, country, pincode };
            const updateData: UserUpdateData = { name, phone, address, roleName, assignedLocations };
            await updateUser(userId, updateData);
            setUser(prevUser => prevUser ? { ...prevUser, ...updateData } : null);
            setIsEditing(false);
            addToast('User details updated successfully!', 'success');
        } catch (err) {
            addToast('Failed to update user.', 'error');
            if (user) populateForm(user);
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };
    
    const handleStatusChange = async () => {
        if (!userId || !user) return;
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        setConfirmation({
            isOpen: true,
            title: `Mark as ${newStatus}`,
            message: `Are you sure you want to mark this user as ${newStatus}?`,
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading('status');
                try {
                    await updateUserStatus(userId, newStatus);
                    setUser(prevUser => prevUser ? { ...prevUser, status: newStatus } : null);
                    addToast(`User marked as ${newStatus}.`, 'success');
                } catch (err) {
                    addToast('Failed to update status.', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: `Mark as ${newStatus}`,
            variant: 'primary',
        });
    };

    const handleRoleChange = async () => {
        if (!userId || !user) return;
        const newRole = user.roleName === 'admin' ? 'staff' : 'admin';
        setConfirmation({
            isOpen: true,
            title: `Change Role to ${newRole}`,
            message: `Are you sure you want to change this user's role to ${newRole}?`,
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading('role');
                try {
                    await changeUserRole(userId, newRole);
                    setUser(prevUser => prevUser ? { ...prevUser, roleName: newRole } : null);
                    addToast('User role changed successfully.', 'success');
                } catch (err) {
                    addToast('Failed to update role.', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: 'Change Role',
            variant: 'primary',
        });
    };
    
    const handleConfirmPasswordReset = async (newPassword: string) => {
        if (!user || !userId) return;
        setActionLoading('password');
        try {
            await resetUserPasswordByAdmin(userId, newPassword);
            setIsResetModalOpen(false);
            addToast(`Password for ${user.email} has been reset.`, 'success');
        } catch (err) {
            addToast('Failed to reset password.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!userId) return;
        setConfirmation({
            isOpen: true,
            title: 'Delete User',
            message: 'Are you sure you want to permanently delete this user? This action cannot be undone.',
            onConfirm: async () => {
                setConfirmation(null);
                setActionLoading('delete');
                try {
                    await deleteUser(userId);
                    addToast('User deleted successfully.', 'success');
                    navigate(`/hospitals/${currentUser?.hospitalSlug}/staff`);
                } catch (err) {
                    addToast('An error occurred while deleting the user.', 'error');
                    console.error("Failed to delete user:", err);
                } finally {
                    setActionLoading(null);
                }
            },
            confirmButtonText: 'Delete User',
            variant: 'danger',
        });
    };

    if (pageLoading && !user) return <div className="p-8">Loading user details...</div>;
    if (!user) return <div className="p-8">User could not be loaded.</div>;
    
    const isCurrentUser = user.uid === currentUser?.uid;
    const isActionInProgress = !!actionLoading;
    const isAdminViewingOwner = currentUser?.roleName === 'admin' && user.roleName === 'owner';

    return (
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="mb-6 lg:col-span-3">
                <Button variant="light" onClick={() => navigate(-1)}>
                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back
                </Button>
            </div>
            {isResetModalOpen && user && (
                <ResetPasswordModal 
                    userEmail={user.email}
                    onClose={() => setIsResetModalOpen(false)}
                    onConfirm={handleConfirmPasswordReset}
                />
            )}
            {confirmation?.isOpen && (
                <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmButtonText={confirmation.confirmButtonText}
                    confirmButtonVariant={confirmation.variant}
                    loading={isActionInProgress}
                />
            )}
            <div className="lg:col-span-2 space-y-8">
                <DetailCard 
                    title="User Profile"
                    footer={!isAdminViewingOwner && (
                        isEditing ? (
                            <div className="flex justify-end gap-2">
                                <Button variant="light" onClick={() => { setIsEditing(false); if (user) populateForm(user); }} disabled={actionLoading === 'update'}>Cancel</Button>
                                <Button variant="primary" onClick={handleUpdate} disabled={isActionInProgress}>
                                    {actionLoading === 'update' ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        ) : (
                            <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                        )
                    )}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input id="name" label="Full Name" type="text" required value={name} onChange={e => setName(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-400" />} />
                        <Input id="email" label="Email" type="email" value={user.email} disabled icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
                        <Input id="phone" label="Phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
                        <Select label="Role" value={roleName} onChange={e => setRoleName(e.target.value as 'staff' | 'admin')} disabled={!isEditing}>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </Select>
                        <Input id="street" label="Street" type="text" required value={street} onChange={e => setStreet(e.target.value)} disabled={!isEditing} />
                        <Input id="city" label="City" type="text" required value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} />
                        <Input id="country" label="Country" type="text" required value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing} />
                        <Input id="pincode" label="Pincode" type="text" required value={pincode} onChange={e => setPincode(e.target.value)} disabled={!isEditing} />
                        <div className="md:col-span-2">
                            <MultiSelect label="Assigned Locations" options={locationOptions} selectedValues={assignedLocations} onChange={setAssignedLocations} placeholder="Select locations..." disabled={!isEditing} />
                        </div>
                    </div>
                </DetailCard>

                {!isCurrentUser && user.roleName !== 'owner' && (
                    <DetailCard title="Danger Zone">
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                This action is permanent and cannot be undone.
                            </p>
                            <Button variant="danger" onClick={handleDelete} disabled={isActionInProgress}>
                               {actionLoading === 'delete' ? 'Deleting...' : 'Delete User Account'}
                            </Button>
                        </div>
                    </DetailCard>
                )}
            </div>

            <div className="space-y-8">
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col items-center text-center">
                    <Avatar 
                        avatar={
                            user.profilePhotoUrl
                            ? { type: 'image', value: user.profilePhotoUrl }
                            : { type: 'initials', value: user.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-blue-600' }
                        } 
                        size="lg" 
                    />
                    <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-200">{user.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{user.roleName}</p>
                    <span className={`mt-2 px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                        user.status === 'inactive' ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                    }`}>
                        {user.status}
                    </span>
                </div>
                {!isCurrentUser && user.roleName !== 'owner' && (
                    <DetailCard title="Actions">
                        <div className="space-y-3 flex flex-col">
                            <Button variant="light" onClick={handleStatusChange} disabled={isActionInProgress}>
                                {actionLoading === 'status' ? 'Updating...' : user.status === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
                            </Button>
                            <Button variant="light" onClick={handleRoleChange} disabled={isActionInProgress}>
                                {actionLoading === 'role' ? 'Updating...' : `Change Role to ${user.roleName === 'admin' ? "'Staff'" : "'Admin'"}`}
                            </Button>
                             <Button variant="light" onClick={() => setIsResetModalOpen(true)} disabled={isActionInProgress}>
                                {actionLoading === 'password' ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </div>
                    </DetailCard>
                )}
            </div>
        </div>
    );
};

export default UserDetailsScreen;