import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Address, UserUpdateData } from '../../types';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faUser, faLock, faSave, faTimes, faKey } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../hooks/useToast';

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b"><h3 className="text-lg font-semibold">{title}</h3></div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t text-right">{footer}</div>}
    </div>
);

const PatientProfileScreen: React.FC = () => {
    const { user, updateUser, changePassword } = useAuth();
    const { addToast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Profile form state
    const [phone, setPhone] = useState(user?.phone || '');
    const [street, setStreet] = useState(user?.address.street || '');
    const [city, setCity] = useState(user?.address.city || '');
    const [country, setCountry] = useState(user?.address.country || '');
    const [pincode, setPincode] = useState(user?.address.pincode || '');
   
    // Password form state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const populateForm = useCallback(() => {
        if (user) {
            setPhone(user.phone);
            setStreet(user.address.street);
            setCity(user.address.city);
            setCountry(user.address.country);
            setPincode(user.address.pincode);
        }
    }, [user]);
    
    const handleProfileUpdate = async () => {
        if (!user) return;
        setActionLoading('profile');
        try {
            const address: Address = { street, city, country, pincode };
            const updateData: UserUpdateData = { name: user.name, phone, address };
            await updateUser(user.uid, updateData);
            setIsEditing(false);
            addToast('Profile updated successfully!', 'success');
        } catch (err) {
            addToast('Failed to update profile.', 'error');
        } finally {
            setActionLoading(null);
        }
    };
    
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { addToast("New passwords do not match.", "error"); return; }
        if (newPassword.length < 6) { addToast("Password must be at least 6 characters.", "error"); return; }
        
        setActionLoading('password');
        try {
            await changePassword(oldPassword, newPassword);
            addToast('Password changed successfully!', 'success');
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err: any) {
            addToast(err.message || 'Failed to change password.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    if (!user) return <div className="p-8">Loading profile...</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <DetailCard 
                    title="My Profile"
                    footer={
                        isEditing ? (
                            <div className="flex justify-end gap-2">
                                <Button variant="light" onClick={() => { setIsEditing(false); populateForm(); }} disabled={actionLoading === 'profile'}>
                                    <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancel
                                </Button>
                                <Button variant="primary" onClick={handleProfileUpdate} disabled={actionLoading === 'profile'}>
                                    <FontAwesomeIcon icon={faSave} className="mr-2" /> {actionLoading === 'profile' ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        ) : (
                            <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                        )
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input id="name" label="Full Name" value={user.name} disabled icon={<FontAwesomeIcon icon={faUser} />} />
                        <Input id="email" label="Email" value={user.email || ''} disabled />
                        <Input id="phone" label="Phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faPhone} />} />
                        <Input id="street" label="Street" required value={street} onChange={e => setStreet(e.target.value)} disabled={!isEditing} />
                        <Input id="city" label="City" required value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} />
                        <Input id="country" label="Country" required value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing} />
                        <Input id="pincode" label="Pincode" required value={pincode} onChange={e => setPincode(e.target.value)} disabled={!isEditing} />
                    </div>
                </DetailCard>
                 <form onSubmit={handlePasswordChange}>
                    <DetailCard 
                        title="Change Password"
                        footer={<Button type="submit" variant="primary" disabled={actionLoading === 'password'}><FontAwesomeIcon icon={faKey} className="mr-2" /> Update Password</Button>}
                    >
                        <div className="space-y-4">
                             <Input id="old-password" label="Current Password" type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} />} />
                             <Input id="new-password" label="New Password" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} />} />
                             <Input id="confirm-password" label="Confirm New Password" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} />} />
                        </div>
                    </DetailCard>
                </form>
            </div>

            <div className="space-y-8">
                 <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border text-center flex flex-col items-center">
                    <Avatar avatar={user.profilePhotoUrl ? { type: 'image', value: user.profilePhotoUrl } : { type: 'initials', value: user.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-blue-600' }} className="w-32 h-32" />
                    <h2 className="text-xl font-bold mt-4">{user.name}</h2>
                    <p className="text-sm text-slate-500">Patient at {user.hospitalName}</p>
                </div>
            </div>
        </div>
    );
};

export default PatientProfileScreen;
