import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Medicine, NewMedicineData } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPencilAlt, faTrashAlt, faEllipsisV, faFileImport, faFileExport, faDownload } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';

export const MedicineModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewMedicineData, id?: string) => Promise<void>;
  medicineToEdit: Medicine | null;
}> = ({ isOpen, onClose, onSave, medicineToEdit }) => {
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState<NewMedicineData['form']>('Tablet');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (medicineToEdit) {
        setName(medicineToEdit.name);
        setGenericName(medicineToEdit.genericName);
        setStrength(medicineToEdit.strength);
        setForm(medicineToEdit.form);
      } else {
        setName('');
        setGenericName('');
        setStrength('');
        setForm('Tablet');
      }
      setError('');
    }
  }, [isOpen, medicineToEdit]);
  
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !genericName || !strength) {
      setError("All fields are required.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSave({ name, genericName, strength, form }, medicineToEdit?.id);
      addToast(`Medicine ${medicineToEdit ? 'updated' : 'added'} successfully!`, 'success');
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save medicine.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg m-4">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{medicineToEdit ? 'Edit Medicine' : 'Add New Medicine'}</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="name" label="Brand Name" type="text" required value={name} onChange={e => setName(e.target.value)} />
            <Input id="genericName" label="Generic Name" type="text" required value={genericName} onChange={e => setGenericName(e.target.value)} />
            <Input id="strength" label="Strength" type="text" required value={strength} onChange={e => setStrength(e.target.value)} placeholder="e.g., 500mg" />
            <Select id="form" label="Form" required value={form} onChange={e => setForm(e.target.value as any)}>
                <option>Tablet</option> <option>Syrup</option> <option>Capsule</option>
                <option>Injection</option> <option>Ointment</option> <option>Other</option>
            </Select>
          </div>
          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
          <div className="flex justify-end space-x-2 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
            <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Medicine'}</Button>
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
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
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

// Helper function to escape CSV cell content
const escapeCsvCell = (cell: any): string => {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
};


const MedicinesScreen: React.FC = () => {
  const { user, getMedicines, addMedicine, updateMedicine, deleteMedicine } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicineToEdit, setMedicineToEdit] = useState<Medicine | null>(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, medicineId: '' });
  const { addToast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);


  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMedicines();
      setMedicines(list);
    } catch (error) {
      console.error("Failed to fetch medicines:", error);
    } finally {
      setLoading(false);
    }
  }, [getMedicines]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleSaveMedicine = async (data: NewMedicineData, id?: string) => {
    if (id) {
        await updateMedicine(id, data);
    } else {
        await addMedicine(data);
    }
    fetchMedicines();
  };

  const openAddModal = () => {
    setMedicineToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (medicine: Medicine) => {
    setMedicineToEdit(medicine);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (medicineId: string) => {
    setConfirmModal({ isOpen: true, medicineId });
  };

  const handleDelete = async () => {
    const { medicineId } = confirmModal;
    if (medicineId) {
        try {
            await deleteMedicine(medicineId);
            addToast('Medicine deleted successfully.', 'success');
            fetchMedicines();
        } catch (error) {
            addToast('Could not delete medicine.', 'error');
        }
    }
    setConfirmModal({ isOpen: false, medicineId: '' });
  };
  
  const handleDownloadTemplate = () => {
    const headers = ['name', 'genericName', 'strength', 'form'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'medicines_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Template downloaded. Note: 'form' must be one of 'Tablet', 'Syrup', 'Capsule', 'Injection', 'Ointment', 'Other'.", "info");
  };

  const handleExport = () => {
    const headers = ['name', 'genericName', 'strength', 'form'];
    const csvRows = [headers.join(',')];
    medicines.forEach(med => {
        const row = [
            escapeCsvCell(med.name),
            escapeCsvCell(med.genericName),
            escapeCsvCell(med.strength),
            escapeCsvCell(med.form)
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `medicines_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const csv = event.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            addToast("CSV file is empty or has no data rows.", "error");
            return;
        }

        const headers = lines[0].trim().split(',');
        const requiredHeaders = ['name', 'genericName', 'strength', 'form'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
            addToast(`CSV headers must include: ${requiredHeaders.join(', ')}`, 'error');
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        const validForms = ['Tablet', 'Syrup', 'Capsule', 'Injection', 'Ointment', 'Other'];

        addToast(`Importing ${lines.length - 1} medicines...`, 'info');
        setLoading(true);

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].trim().split(',');
            const row: { [key: string]: string } = {};
            headers.forEach((header, index) => { row[header] = values[index]; });

            try {
                if (!validForms.includes(row.form)) {
                    throw new Error(`Invalid form type: ${row.form}`);
                }
                const medData: NewMedicineData = {
                    name: row.name,
                    genericName: row.genericName,
                    strength: row.strength,
                    form: row.form as NewMedicineData['form'],
                };
                await addMedicine(medData);
                successCount++;
            } catch (err: any) {
                errorCount++;
                console.error(`Error importing row ${i + 1}: ${err.message}`);
            }
        }
        
        addToast(`${successCount} medicines imported successfully. ${errorCount} rows failed.`, errorCount > 0 ? 'warning' : 'success');
        fetchMedicines();
    };
    reader.readAsText(file);
    if(importInputRef.current) importInputRef.current.value = "";
  };


  const canWrite = user?.permissions?.medicines === 'write';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, medicineId: '' })} onConfirm={handleDelete} title="Delete Medicine" message="Are you sure you want to delete this medicine? This action cannot be undone." confirmButtonText="Delete" confirmButtonVariant="danger" />
      <MedicineModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveMedicine} medicineToEdit={medicineToEdit} />
      <input type="file" ref={importInputRef} className="hidden" accept=".csv" onChange={handleImport} />
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Medicines</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage all medicines available in the hospital.</p>
          </div>
          <div className="flex items-center space-x-2">
            {canWrite && (
              <>
                <Button variant="light" onClick={handleDownloadTemplate}><FontAwesomeIcon icon={faDownload} className="w-4 h-4 mr-2" />Template</Button>
                <Button variant="light" onClick={() => importInputRef.current?.click()}><FontAwesomeIcon icon={faFileImport} className="w-4 h-4 mr-2" />Import</Button>
              </>
            )}
            <Button variant="light" onClick={handleExport}><FontAwesomeIcon icon={faFileExport} className="w-4 h-4 mr-2" />Export</Button>
            {canWrite && <Button variant="primary" onClick={openAddModal}><FontAwesomeIcon icon={faPlus} className="w-5 h-5 mr-2" />Add Medicine</Button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? <p className="p-6 text-slate-500">Loading medicines...</p> : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Brand Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Generic Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Strength</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Form</th>
                  {canWrite && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{med.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{med.genericName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{med.strength}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{med.form}</td>
                    {canWrite && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <ActionsDropdown onEdit={() => openEditModal(med)} onDelete={() => handleDeleteRequest(med.id!)} />
                        </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {medicines.length === 0 && !loading && <p className="p-6 text-center text-slate-500">No medicines found. Get started by adding one.</p>}
        </div>
      </div>
    </div>
  );
};

export default MedicinesScreen;