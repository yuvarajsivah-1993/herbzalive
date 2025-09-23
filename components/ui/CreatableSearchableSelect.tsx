import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import Button from './Button';

interface CreatableSearchableSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onCreate: (value: string) => Promise<void>;
  onDelete: (value: string) => Promise<void>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const CreatableSearchableSelect: React.FC<CreatableSearchableSelectProps> = ({
  label, options, value, onChange, onCreate, onDelete, placeholder, required, disabled
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (!value) setSearchTerm('');
        else setSearchTerm(value);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm && value) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(term));
  }, [options, searchTerm, value]);

  const canCreate = searchTerm.trim().length > 0 && !options.some(opt => opt.toLowerCase() === searchTerm.trim().toLowerCase());

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setSearchTerm(optionValue);
    setIsOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (value) onChange('');
    if (!isOpen) setIsOpen(true);
  };

  const handleCreate = async () => {
    const newValue = searchTerm.trim();
    if (!newValue) return;
    try {
      await onCreate(newValue);
      onChange(newValue);
      setSearchTerm(newValue);
      setIsOpen(false);
    } catch (e) {
      console.error("Failed to create new option:", e);
    }
  };
  
  const handleDelete = async (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    await onDelete(optionValue);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && '*'}</label>
      <div className="relative" ref={containerRef}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text" value={searchTerm} onChange={handleInputChange} onFocus={() => setIsOpen(true)}
          placeholder={placeholder} disabled={disabled}
          className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
        />
        {isOpen && !disabled && (
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg">
            <ul className="max-h-60 overflow-y-auto">
              {filteredOptions.map(opt => (
                <li key={opt} onClick={() => handleSelect(opt)} className="group flex justify-between items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                  <span>{opt}</span>
                  <button type="button" onClick={(e) => handleDelete(e, opt)} className="p-1 rounded text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </li>
              ))}
              {canCreate && (
                <li onClick={handleCreate} className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer">
                  Create "{searchTerm.trim()}"
                </li>
              )}
               {filteredOptions.length === 0 && !canCreate && (
                 <li className="px-4 py-2 text-sm text-slate-500">No results found.</li>
               )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatableSearchableSelect;
