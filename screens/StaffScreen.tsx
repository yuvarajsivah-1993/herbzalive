import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserDocument, NewStaffData, Address, HospitalLocation } from '../types';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUser, faEnvelope, faPhone, faLock, faEllipsisV, faPencilAlt, faTrashAlt, faSearch } from '@fortawesome/free-solid-svg-icons';
import Avatar from '../components/ui/Avatar';
import Input from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';


const AddUserModal: React.FC<{onClose: () => void; onAddUser: (data: NewStaffData) => Promise<void>; hospitalLocations: HospitalLocation[]}> = ({ onClose, onAddUser, hospitalLocations }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [pincode, setPincode] = useState('');
    const [password, setPassword] = useState('');
    const [assignedLocations, setAssignedLocations] = useState<string[]>([]);
    const [roleName, setRoleName] = useState<'staff' | 'admin'>('staff');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleLocationChange = (locationId: string) => {
        setAssignedLocations(prev => 
            prev.includes(locationId) 
                ? prev.filter(id => id !== locationId) 
                : [...prev, locationId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const address: Address = { street, city, country, pincode };
        const userData: NewStaffData = { name, email, phone, address, password, assignedLocations, roleName };

        try {
            await onAddUser(userData);
            addToast('Invitation sent successfully!', 'success');
            onClose();
        } catch(err: any) {
            const errorMessage = err.message || 'Failed to send invitation.';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg m-4">
                <form onSubmit={handleSubmit} className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Add New Staff Member</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        An invitation will be sent to the email address. They will set their own password upon signing up.
                    </p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                        <Input id="name" label="Full Name" type="text" required value={name} onChange={e => setName(e.target.value)} icon={<FontAwesomeIcon icon={faUser} className="h-5 w-5 text-gray-400" />} />
                        <Input id="email" label="Email Address" type="email" required value={email} onChange={e => setEmail(e.target.value)} icon={<FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-gray-400" />} />
                        <Input id="phone" label="Phone Number" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} icon={<FontAwesomeIcon icon={faPhone} className="h-5 w-5 text-gray-400" />} />
                        <Select label="Role" value={roleName} onChange={e => setRoleName(e.target.value as 'staff' | 'admin')}>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </Select>
                        <Input id="street" label="Street" type="text" required value={street} onChange={e => setStreet(e.target.value)} />
                        <Input id="city" label="City" type="text" required value={city} onChange={e => setCity(e.target.value)} />
                        <Input id="country" label="Country" type="text" required value={country} onChange={e => setCountry(e.target.value)} />
                        <Input id="pincode" label="Pincode" type="text" required value={pincode} onChange={e => setPincode(e.target.value)} />
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Locations</label>
                            <div className="p-4 border border-slate-300 dark:border-slate-700 rounded-lg max-h-40 overflow-y-auto">
                                {hospitalLocations.map(loc => (
                                    <label key={loc.id} className="flex items-center space-x-3 py-1">
                                        <input
                                            type="checkbox"
                                            checked={assignedLocations.includes(loc.id)}
                                            onChange={() => handleLocationChange(loc.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{loc.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                    <div className="flex justify-end space-x-2 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Sending Invitation...' : 'Send Invitation'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ActionsDropdown: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                        <button onClick={onEdit} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4 mr-3" /> Edit
                        </button>
                        <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const StaffScreen: React.FC = () => {
    const { usersForHospital, addUser, user, deleteUser, hospitalLocations } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: '' });
    const { addToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const handleAddUser = async (data: NewStaffData) => {
        await addUser(data);
    };
    
    const handleDeleteRequest = (userId: string) => {
      setConfirmModal({ isOpen: true, userId });
    };

    const handleDeleteUser = async () => {
        const { userId } = confirmModal;
        if (userId) {
            try {
                await deleteUser(userId);
                addToast('User deleted successfully.', 'success');
            } catch (error) {
                console.error("Failed to delete user:", error);
                addToast('Could not delete user. Please try again.', 'error');
            }
        }
        setConfirmModal({ isOpen: false, userId: '' });
    };

    const handleRowClick = (userId: string | undefined) => {
        if (!userId) return;
        navigate(`/hospitals/${user?.hospitalSlug}/staff/${userId}`);
    };

    const canManageUsers = user?.permissions?.staff === 'write';

    const filteredUsers = useMemo(() => {
        const staffAndAdmins = usersForHospital.filter(u => u.roleName !== 'doctor');
        return staffAndAdmins.filter(u => {
            if (roleFilter !== 'all' && u.roleName !== roleFilter) {
                return false;
            }
            if (statusFilter !== 'all' && u.status !== statusFilter) {
                return false;
            }
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
        });
    }, [usersForHospital, searchTerm, roleFilter, statusFilter]);

    const totalPages = useMemo(() => Math.ceil(filteredUsers.length / itemsPerPage), [filteredUsers.length, itemsPerPage]);
    
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, statusFilter]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, userId: '' })}
                onConfirm={handleDeleteUser}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
                confirmButtonText="Delete"
                confirmButtonVariant="danger"
            />
          {isModalOpen && <AddUserModal onClose={() => setIsModalOpen(false)} onAddUser={handleAddUser} hospitalLocations={hospitalLocations} />}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 border-b border-slate-200 dark:border-slate-800 items-end">
                <div className="lg:col-span-2">
                    <Input 
                        label="Search Users"
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        placeholder="Search by name or email..."
                        icon={<FontAwesomeIcon icon={faSearch}/>}
                    />
                </div>
                <div>
                    <Select label="Role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                        <option value="all">All Roles</option>
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                    </Select>
                </div>
                <div>
                    <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="invited">Invited</option>
                        <option value="inactive">Inactive</option>
                    </Select>
                </div>
                {canManageUsers && (
                    <Button variant="primary" onClick={() => setIsModalOpen(true)} className="h-[46px] w-full">
                        <FontAwesomeIcon icon={faPlus} className="w-5 h-5 mr-2" />
                        Add User
                    </Button>
                )}
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedUsers.length > 0 ? paginatedUsers.map((u) => (
                        <tr key={u.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => handleRowClick(u.id)}>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                <div className="flex items-center">
                                    <Avatar 
                                        avatar={
                                            u.profilePhotoUrl 
                                            ? { type: 'image', value: u.profilePhotoUrl } 
                                            : { type: 'initials', value: u.name.split(' ').map(n=>n[0]).join('').toUpperCase(), color: 'bg-indigo-500' }
                                        } 
                                        size="sm" 
                                    />
                                    <span className="ml-3">{u.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 capitalize">{u.roleName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {u.status === 'active' && (
                                    <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                        Active
                                    </span>
                                )}
                                {u.status === 'invited' && (
                                     <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                                        Invited
                                    </span>
                                )}
                                {u.status === 'inactive' && (
                                     <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                                        Inactive
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                                {canManageUsers && u.uid !== user?.uid && u.roleName !== 'owner' && (
                                    <ActionsDropdown 
                                        onEdit={() => handleRowClick(u.id)} 
                                        onDelete={() => handleDeleteRequest(u.id!)}
                                    />
                                )}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={5} className="text-center p-6 text-slate-500 dark:text-slate-400">No users found.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredUsers.length}
                itemsOnPage={paginatedUsers.length}
            />
          </div>
        </div>
    );
};

export default StaffScreen;