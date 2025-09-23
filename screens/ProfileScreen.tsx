import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Address, UserUpdateData } from '../types';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faUser, faLock, faBuilding, faSave, faTimes, faKey } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../hooks/useToast';
import FileInput from '../components/ui/FileInput';

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

const ProfileScreen: React.FC = () => {
    const { user: currentUser, updateUser, changePassword } = useAuth();
    const { addToast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Profile form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [pincode, setPincode] = useState('');
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

    // Password form state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const populateForm = useCallback(() => {
        if (currentUser) {
            setName(currentUser.name);
            setPhone(currentUser.phone);
            setStreet(currentUser.address.street);
            setCity(currentUser.address.city);
            setCountry(currentUser.address.country);
            setPincode(currentUser.address.pincode);
            setProfilePhoto(null);
        }
    }, [currentUser]);

    useEffect(() => {
        populateForm();
    }, [populateForm]);
    
    const handleProfileUpdate = async () => {
        if (!currentUser) return;
        setActionLoading('profile');
        try {
            const address: Address = { street, city, country, pincode };
            const updateData: UserUpdateData = { name, phone, address };
            if (profilePhoto) {
                updateData.profilePhoto = profilePhoto;
            }
            await updateUser(currentUser.uid, updateData);
            setIsEditing(false);
            addToast('Profile updated successfully!', 'success');
            // User data will refresh via AuthContext side-effect
        } catch (err) {
            addToast('Failed to update profile. Please try again.', 'error');
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };
    
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast("New passwords do not match.", "error");
            return;
        }
        if (newPassword.length < 6) {
             addToast("Password must be at least 6 characters.", "error");
             return;
        }
        
        setActionLoading('password');
        try {
            await changePassword(oldPassword, newPassword);
            addToast('Password changed successfully!', 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            addToast(err.message || 'Failed to change password. Please check your current password.', 'error');
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    if (!currentUser) {
        return <div className="p-8">Loading profile...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <DetailCard 
                    title="Edit Profile"
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
                        {isEditing && (
                           <div className="md:col-span-2">
                                <FileInput id="profilePhoto" label="Profile Photo" onChange={(e) => setProfilePhoto(e.target.files ? e.target.files[0] : null)} />
                           </div>
                        )}
                        <Input id="name" label="Full Name" type="text" required value={name} onChange={e => setName(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-400" />} />
                        <Input id="email" label="Email" type="email" value={currentUser.email || ''} disabled icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
                        <Input id="phone" label="Phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
                        <Input id="street" label="Street" type="text" required value={street} onChange={e => setStreet(e.target.value)} disabled={!isEditing} />
                        <Input id="city" label="City" type="text" required value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} />
                        <Input id="country" label="Country" type="text" required value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing} />
                        <Input id="pincode" label="Pincode" type="text" required value={pincode} onChange={e => setPincode(e.target.value)} disabled={!isEditing} />
                    </div>
                </DetailCard>
                 <form onSubmit={handlePasswordChange}>
                    <DetailCard 
                        title="Change Password"
                        footer={
                            <Button type="submit" variant="primary" disabled={actionLoading === 'password'}>
                                <FontAwesomeIcon icon={faKey} className="mr-2" /> {actionLoading === 'password' ? 'Updating...' : 'Update Password'}
                            </Button>
                        }
                    >
                        <div className="space-y-4">
                             <Input id="old-password" label="Current Password" type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} />
                             <Input id="new-password" label="New Password" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} />
                             <Input id="confirm-password" label="Confirm New Password" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} icon={<FontAwesomeIcon icon={faLock} className="h-5 w-5 text-gray-400" />} />
                        </div>
                    </DetailCard>
                </form>
            </div>

            <div className="space-y-8">
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 flex flex-col items-center text-center">
                    <Avatar 
                        avatar={
                            currentUser.profilePhotoUrl
                            ? { type: 'image', value: currentUser.profilePhotoUrl }
                            : { type: 'initials', value: currentUser.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-blue-600' }
                        } 
                        size="lg" 
                    />
                    <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{currentUser.roleName}</p>
                    <div className="mt-4 w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-left text-sm">
                       <p className="flex items-center"><FontAwesomeIcon icon={faBuilding} className="w-4 h-4 mr-3 text-slate-500"/> {currentUser.hospitalName}</p>
                       <p className="flex items-center mt-2"><FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-3 text-slate-500"/> {currentUser.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileScreen;
