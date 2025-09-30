import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  // FIX: Add 'disabled' prop to support disabling the component.
  disabled?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selectedValues, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = useMemo(() => options.filter(opt => selectedValues.includes(opt.value)), [options, selectedValues]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleOption = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newSelection);
  };

  const removeOption = (value: string) => {
    onChange(selectedValues.filter(v => v !== value));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 min-h-[46px] text-left ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-2 items-center">
            {selectedOptions.length > 0 ? (
              selectedOptions.map(option => (
                <div key={option.value} className="flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium px-2.5 py-1 rounded-full">
                  <span>{option.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); removeOption(option.value); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); removeOption(option.value); } }}
                    className="ml-2 -mr-1 flex-shrink-0 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-800 hover:text-blue-600 focus:outline-none cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </span>
                </div>
              ))
            ) : (
              <span className="text-slate-400 dark:text-slate-500">{placeholder || 'Select...'}</span>
            )}
          </div>
           <FontAwesomeIcon icon={faChevronDown} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {options.length > 0 ? options.map(option => (
              <label key={option.value} className={`flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 ${!disabled && 'hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={disabled}
                />
                <span className="ml-3">{option.label}</span>
              </label>
            )) : <div className="p-4 text-sm text-slate-500">No options available.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;