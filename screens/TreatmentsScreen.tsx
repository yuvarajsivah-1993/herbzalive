import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Treatment, NewTreatmentData, TaxGroup } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPencilAlt, faTrashAlt, faEllipsisV, faStethoscope, faCreditCard, faClock, faSearch, faThLarge, faList } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import FileInput from '../components/ui/FileInput';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';

const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
};

const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    const symbol = currencySymbols[currencyCode] || '$';
    const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `${symbol}${formattedAmount}`;
};

export const AddTreatmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: NewTreatmentData) => Promise<void>;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [cost, setCost] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [taxGroupId, setTaxGroupId] = useState('');
  const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);
  const { user, getTaxGroups } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  const currencySymbol = useMemo(() => currencySymbols[user?.hospitalCurrency || 'USD'] || '$', [user?.hospitalCurrency]);

  useEffect(() => {
    if (isOpen) {
        getTaxGroups()
            .then(setTaxGroups)
            .catch(() => addToast('Could not load tax groups.', 'error'));
    }
  }, [isOpen, getTaxGroups, addToast]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDuration('');
    setCost('');
    setPhoto(null);
    setTaxGroupId('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !duration || !cost) {
      setError("All fields are required.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onAdd({
        name,
        description,
        duration: parseInt(duration, 10),
        cost: parseFloat(cost),
        photo: photo || undefined,
        taxGroupId: taxGroupId || undefined,
      });
      // Success is handled by the `onAdd` function (`handleGenericSave`)
    } catch (err: any) {
      // Handle errors re-thrown by `handleGenericSave`
      const errorMessage = err.message || 'Failed to add treatment.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg m-4">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Add New Treatment</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Define a new service or treatment offered by your clinic.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="name" label="Treatment Name" type="text" required value={name} onChange={e => setName(e.target.value)} icon={<FontAwesomeIcon icon={faStethoscope} className="h-5 w-5 text-gray-400" />} />
            <Input id="description" label="Description" type="text" required value={description} onChange={e => setDescription(e.target.value)} />
            <Input id="duration" label="Duration (minutes)" type="number" required value={duration} onChange={e => setDuration(e.target.value)} icon={<FontAwesomeIcon icon={faClock} className="h-5 w-5 text-gray-400" />} />
            <Input id="cost" label={`Cost (${currencySymbol})`} type="number" step="0.01" required value={cost} onChange={e => setCost(e.target.value)} icon={<FontAwesomeIcon icon={faCreditCard} className="h-5 w-5 text-gray-400" />} />
            <div className="md:col-span-2">
                <Select id="taxGroup" label="Tax Group (Optional)" value={taxGroupId} onChange={e => setTaxGroupId(e.target.value)}>
                    <option value="">No Tax</option>
                    {taxGroups.map(group => (
                        <option key={group.id} value={group.id!}>{group.name} ({group.totalRate.toFixed(2)}%)</option>
                    ))}
                </Select>
            </div>
            <div className="md:col-span-2">
                <FileInput id="photo" label="Treatment Photo (Optional)" onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)} />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
          <div className="flex justify-end space-x-2 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
            <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Treatment'}</Button>
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

const TreatmentCard: React.FC<{ treatment: Treatment }> = ({ treatment }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const handleCardClick = () => {
        if (!treatment.id) return;
        navigate(`/hospitals/${user?.hospitalSlug}/treatments/${treatment.id}`);
    };

    return (
        <div onClick={handleCardClick} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200 flex flex-col">
            <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {treatment.photoUrl ? (
                    <img src={treatment.photoUrl} alt={treatment.name} className="w-full h-full object-cover" />
                ) : (
                    <FontAwesomeIcon icon={faStethoscope} className="h-16 w-16 text-slate-400" />
                )}
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{treatment.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex-grow">{treatment.description}</p>
                <div className="mt-4 flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center"><FontAwesomeIcon icon={faClock} className="mr-2 text-slate-400"/> {treatment.duration} min</span>
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{formatCurrency(treatment.cost, user?.hospitalCurrency)}</span>
                </div>
            </div>
        </div>
    );
};


const TreatmentsScreen: React.FC = () => {
  const { user, treatments, deleteTreatment } = useAuth();
  const navigate = useNavigate();
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, treatmentId: '' });
  const { addToast } = useToast();

  const [view, setView] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, view]);

  const filteredTreatments = useMemo(() => {
    if (!searchTerm) return treatments;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return treatments.filter(t => 
        t.name.toLowerCase().includes(lowerCaseSearch) ||
        t.description.toLowerCase().includes(lowerCaseSearch)
    );
  }, [treatments, searchTerm]);

  const totalPages = useMemo(() => Math.ceil(filteredTreatments.length / itemsPerPage), [filteredTreatments.length, itemsPerPage]);

  const paginatedTreatments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTreatments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTreatments, currentPage, itemsPerPage]);

  const handleDeleteRequest = (treatmentId: string) => {
    setConfirmModal({ isOpen: true, treatmentId });
  };

  const handleDeleteTreatment = async () => {
    const { treatmentId } = confirmModal;
    if (treatmentId) {
        try {
            await deleteTreatment(treatmentId);
            addToast('Treatment deleted successfully.', 'success');
        } catch (error) {
            console.error("Failed to delete treatment:", error);
            addToast('Could not delete treatment. Please try again.', 'error');
        }
    }
    setConfirmModal({ isOpen: false, treatmentId: '' });
  };

  const handleRowClick = (treatmentId: string | undefined) => {
    if (!treatmentId) return;
    navigate(`/hospitals/${user?.hospitalSlug}/treatments/${treatmentId}`);
  };

  const canWrite = user?.permissions?.treatments === 'write';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, treatmentId: '' })}
        onConfirm={handleDeleteTreatment}
        title="Delete Treatment"
        message="Are you sure you want to delete this treatment? This action cannot be undone."
        confirmButtonText="Delete"
        confirmButtonVariant="danger"
      />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="lg:col-span-3">
                  <Input label="Search Treatments" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or description..." icon={<FontAwesomeIcon icon={faSearch} />} />
              </div>
              <div className="flex items-center justify-end bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border dark:border-slate-700 h-[46px]">
                  <Button size="sm" variant={view === 'grid' ? 'light' : 'ghost'} onClick={() => setView('grid')} className="!rounded-md shadow-sm w-full"><FontAwesomeIcon icon={faThLarge} className="mr-2"/>Grid</Button>
                  <Button size="sm" variant={view === 'list' ? 'light' : 'ghost'} onClick={() => setView('list')} className="!rounded-md w-full"><FontAwesomeIcon icon={faList} className="mr-2"/>List</Button>
              </div>
          </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Photo</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cost</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedTreatments.length > 0 ? paginatedTreatments.map((treatment) => (
                  <tr key={treatment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => handleRowClick(treatment.id)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        {treatment.photoUrl ? (
                            <img src={treatment.photoUrl} alt={treatment.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                            <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <FontAwesomeIcon icon={faStethoscope} className="h-5 w-5 text-slate-400" />
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{treatment.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{treatment.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{treatment.duration} min</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatCurrency(treatment.cost, user?.hospitalCurrency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                        {canWrite && (
                           <ActionsDropdown
                             onEdit={() => handleRowClick(treatment.id)}
                             onDelete={() => handleDeleteRequest(treatment.id!)}
                           />
                        )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="text-center p-6 text-slate-500">No treatments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTreatments.length > 0 && (
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                totalItems={filteredTreatments.length}
                itemsOnPage={paginatedTreatments.length}
            />
          )}
        </div>
      ) : (
        <div>
            {filteredTreatments.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {paginatedTreatments.map(treatment => (
                        <TreatmentCard key={treatment.id} treatment={treatment} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <FontAwesomeIcon icon={faStethoscope} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Treatments Found</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your search returned no results.</p>
                </div>
            )}
            {filteredTreatments.length > 0 && (
                <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                        totalItems={filteredTreatments.length}
                        itemsOnPage={paginatedTreatments.length}
                    />
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default TreatmentsScreen;