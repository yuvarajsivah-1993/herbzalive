import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Vendor, NewVendorData, Address, VendorContactPerson } from '../types';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faEllipsisV, faPencilAlt, faTrashAlt, faChevronDown, faTimes, faEye, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Pagination from '../components/ui/Pagination';

export const AddVendorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewVendorData) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
    const { addToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);
    
    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [taxNumber, setTaxNumber] = useState('');
    const [address, setAddress] = useState<Address>({ street: '', city: '', country: '', pincode: '' });
    const [contactPersons, setContactPersons] = useState<Omit<VendorContactPerson, 'id'>[]>([]);

    const [loading, setLoading] = useState(false);
    const [moreInfoOpen, setMoreInfoOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const resetForm = () => {
        setName(''); setEmail(''); setPhone(''); setTaxNumber('');
        setAddress({ street: '', city: '', country: '', pincode: '' });
        setContactPersons([]);
        setMoreInfoOpen(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleAddressChange = (field: keyof Address, value: string) => {
        setAddress(prev => ({ ...prev, [field]: value }));
    };
    
    const addContactPerson = () => setContactPersons(prev => [...prev, { name: '', mobile: '' }]);
    const removeContactPerson = (index: number) => setContactPersons(prev => prev.filter((_, i) => i !== index));
    const handleContactPersonChange = (index: number, field: keyof Omit<VendorContactPerson, 'id'>, value: string) => {
        const newContacts = [...contactPersons];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setContactPersons(newContacts);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !phone) {
            addToast('Please fill all required fields.', 'error');
            return;
        }
        setLoading(true);
        try {
            await onSave({ name, email, phone, taxNumber, address, contactPersons });
        } catch (error) {
            // Error is handled by parent component which shows toast
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start py-10 overflow-y-auto">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl m-4">
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-2xl font-bold">Add New Vendor</h2>
                        <button type="button" onClick={handleClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faTimes} /></button>
                    </div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Vendor Name*" value={name} onChange={e => setName(e.target.value)} required />
                            <Input label="Email*" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                            <Input label="Phone*" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                        </div>
                        <Button type="button" variant="light" onClick={() => setMoreInfoOpen(prev => !prev)} className="w-full justify-start text-slate-600">
                            <FontAwesomeIcon icon={faChevronDown} className={`mr-2 transition-transform ${moreInfoOpen ? 'rotate-180' : ''}`} />
                            {moreInfoOpen ? 'Hide' : 'Show'} Additional Info
                        </Button>

                        {moreInfoOpen && (
                            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <Input label="Tax Number (GST/VAT)" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Street Address" value={address.street} onChange={e => handleAddressChange('street', e.target.value)} />
                                    <Input label="City" value={address.city} onChange={e => handleAddressChange('city', e.target.value)} />
                                    <Input label="Country" value={address.country} onChange={e => handleAddressChange('country', e.target.value)} />
                                    <Input label="Pincode" value={address.pincode} onChange={e => handleAddressChange('pincode', e.target.value)} />
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-md font-semibold mb-2">Contact Persons</h3>
                                    {contactPersons.map((person, index) => (
                                        <div key={index} className="p-4 border rounded-lg mb-2 bg-slate-50 dark:bg-slate-800/50">
                                            <div className="flex justify-end mb-2"><Button type="button" size="sm" variant="danger" onClick={() => removeContactPerson(index)}>Remove</Button></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input label="Name*" value={person.name} onChange={e => handleContactPersonChange(index, 'name', e.target.value)} required />
                                                <Input label="Mobile*" type="tel" value={person.mobile} onChange={e => handleContactPersonChange(index, 'mobile', e.target.value)} required />
                                                <Input label="Email" type="email" value={person.email || ''} onChange={e => handleContactPersonChange(index, 'email', e.target.value)} />
                                                <Input label="Designation" value={person.designation || ''} onChange={e => handleContactPersonChange(index, 'designation', e.target.value)} />
                                            </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="light" onClick={addContactPerson}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add Contact Person</Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-3 p-6 bg-slate-50 dark:bg-slate-950/50 border-t">
                        <Button type="button" variant="light" onClick={handleClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Vendor'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ActionsDropdown: React.FC<{ onView: () => void; onDelete: () => void; onToggleStatus: () => void; isInactive: boolean }> = ({ onView, onDelete, onToggleStatus, isInactive }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faEllipsisV} className="w-5 h-5 text-slate-500" /></button>
            {isOpen && <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10"><div className="py-1">
                <button onClick={onView} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faEye} className="w-4 h-4 mr-3" /> View Details</button>
                <button onClick={onToggleStatus} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={isInactive ? faCheckCircle : faTimesCircle} className="w-4 h-4 mr-3" />{isInactive ? 'Mark as Active' : 'Mark as Inactive'}</button>
                <button onClick={onDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"><FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-3" /> Delete</button>
            </div></div>}
        </div>
    );
};

const VendorsScreen: React.FC = () => {
    const { user, vendors, deleteVendor, updateVendorStatus, loading } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, vendorId: '', vendorName: '' });
    const [confirmStatusModal, setConfirmStatusModal] = useState<{ isOpen: boolean; vendor: Vendor | null }>({ isOpen: false, vendor: null });
  
    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
  
    const canWrite = user?.permissions.vendors === 'write';
    
    useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm, statusFilter]);
  
    const handleRowClick = (vendorId: string) => {
      navigate(`/hospitals/${user?.hospitalSlug}/vendors/${vendorId}`);
    };
  
    const handleDeleteRequest = (vendor: Vendor) => {
      setConfirmDeleteModal({ isOpen: true, vendorId: vendor.id, vendorName: vendor.name });
    };
  
    const handleDeleteVendor = async () => {
      const { vendorId } = confirmDeleteModal;
      try {
          await deleteVendor(vendorId);
          addToast('Vendor deleted successfully!', 'success');
      } catch (error) {
          addToast('Failed to delete vendor.', 'error');
      } finally {
          setConfirmDeleteModal({ isOpen: false, vendorId: '', vendorName: '' });
      }
    };
    
    const handleToggleStatusRequest = (vendor: Vendor) => {
      setConfirmStatusModal({ isOpen: true, vendor });
    };
  
    const handleUpdateStatus = async () => {
      const { vendor } = confirmStatusModal;
      if (!vendor || !vendor.id) return;
      const newStatus = vendor.status === 'active' ? 'inactive' : 'active';
      try {
          await updateVendorStatus(vendor.id, newStatus);
          addToast(`Vendor status updated to ${newStatus}.`, 'success');
      } catch (error) {
          addToast('Failed to update vendor status.', 'error');
      } finally {
          setConfirmStatusModal({ isOpen: false, vendor: null });
      }
    };
  
    const filteredVendors = useMemo(() => {
      return vendors
        .filter(v => statusFilter === 'all' || v.status === statusFilter)
        .filter(v => {
          if (!searchTerm) return true;
          const term = searchTerm.toLowerCase();
          return v.name.toLowerCase().includes(term) ||
                 v.vendorId.toLowerCase().includes(term) ||
                 v.email.toLowerCase().includes(term) ||
                 v.phone.includes(term);
        });
    }, [vendors, statusFilter, searchTerm]);
  
    const totalPages = useMemo(() => Math.ceil(filteredVendors.length / itemsPerPage), [filteredVendors.length, itemsPerPage]);
    const paginatedVendors = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredVendors.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredVendors, currentPage, itemsPerPage]);
  
    return (
      <div className="p-4 sm:p-6 lg:p-8">
          <ConfirmationModal
              isOpen={confirmDeleteModal.isOpen}
              onClose={() => setConfirmDeleteModal({ isOpen: false, vendorId: '', vendorName: '' })}
              onConfirm={handleDeleteVendor}
              title="Delete Vendor"
              message={`Are you sure you want to delete ${confirmDeleteModal.vendorName}? This action cannot be undone.`}
              confirmButtonText="Delete"
              confirmButtonVariant="danger"
          />
          {confirmStatusModal.isOpen && confirmStatusModal.vendor && (
              <ConfirmationModal 
                  isOpen={confirmStatusModal.isOpen}
                  onClose={() => setConfirmStatusModal({ isOpen: false, vendor: null })}
                  onConfirm={handleUpdateStatus}
                  title={`Mark as ${confirmStatusModal.vendor.status === 'active' ? 'Inactive' : 'Active'}`}
                  message={`Are you sure you want to mark ${confirmStatusModal.vendor.name} as ${confirmStatusModal.vendor.status === 'active' ? 'inactive' : 'active'}?`}
                  confirmButtonText={`Mark as ${confirmStatusModal.vendor.status === 'active' ? 'Inactive' : 'Active'}`}
                  confirmButtonVariant="primary"
              />
          )}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b items-end">
                  <Input label="Search Vendors" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name, ID, email..." icon={<FontAwesomeIcon icon={faSearch}/>}/>
                  <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                  </Select>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendor</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Contact</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {loading ? (
                             <tr><td colSpan={4} className="text-center p-6 text-slate-500">Loading vendors...</td></tr>
                          ) : paginatedVendors.map(vendor => (
                              <tr key={vendor.id} onClick={() => handleRowClick(vendor.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-6 py-4">
                                      <p className="font-medium text-slate-800 dark:text-slate-200">{vendor.name}</p>
                                      <p className="text-sm text-slate-500">{vendor.vendorId}</p>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{vendor.email}<br/>{vendor.phone}</td>
                                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${vendor.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'}`}>{vendor.status}</span></td>
                                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                      {canWrite && <ActionsDropdown onView={() => handleRowClick(vendor.id)} onDelete={() => handleDeleteRequest(vendor)} onToggleStatus={() => handleToggleStatusRequest(vendor)} isInactive={vendor.status === 'inactive'} />}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {filteredVendors.length === 0 && !loading && <p className="p-4 text-center text-slate-500">No vendors found.</p>}
              </div>
              <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  totalItems={filteredVendors.length}
                  itemsOnPage={paginatedVendors.length}
              />
          </div>
      </div>
    );
  };
export default VendorsScreen;
