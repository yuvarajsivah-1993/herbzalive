import React from 'react';
import Button from './Button';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: { row: number; field: string; message: string }[];
  missingVendors: string[];
  onAddVendor: (name: string) => Promise<void>;
  missingUnitTypes: string[];
  onAddUnitType: (name: string) => Promise<void>;
  missingTaxes: string[];
  onAddTax: (name: string) => Promise<void>;
  missingLocations: string[];
  onAddLocation: (name: string) => Promise<void>;
  missingBrands: string[];
  onAddBrand: (name: string) => Promise<void>;
  onRetryImport: () => void;
  isProcessingMissing: boolean;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  errors,
  missingVendors,
  onAddVendor,
  missingUnitTypes,
  onAddUnitType,
  missingTaxes,
  onAddTax,
  missingLocations,
  onAddLocation,
  onRetryImport,
  isProcessingMissing,
  missingBrands,
  onAddBrand,
}) => {
  if (!isOpen) {
    return null;
  }

  const hasMissingItems = missingVendors.length > 0 || missingUnitTypes.length > 0 || missingTaxes.length > 0 || missingLocations.length > 0 || missingBrands.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Import Errors</h3>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {hasMissingItems && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Missing Data Detected:</p>
              {missingVendors.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">Vendors not found:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {missingVendors.map((name) => (
                      <Button key={name} size="sm" variant="secondary" onClick={() => onAddVendor(name)} disabled={isProcessingMissing}>
                        Add "{name}"
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {missingUnitTypes.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">Unit Types not found:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {missingUnitTypes.map((name) => (
                      <Button key={name} size="sm" variant="secondary" onClick={() => onAddUnitType(name)} disabled={isProcessingMissing}>
                        Add "{name}"
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {missingTaxes.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">Taxes not found:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {missingTaxes.map((name) => (
                      <Button key={name} size="sm" variant="secondary" onClick={() => onAddTax(name)} disabled={isProcessingMissing}>
                        Add "{name}"
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {missingLocations.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">Locations not found:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {missingLocations.map((name) => (
                      <Button key={name} size="sm" variant="secondary" onClick={() => onAddLocation(name)} disabled={isProcessingMissing}>
                        Add "{name}"
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {missingBrands.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">Brands not found:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {missingBrands.map((name) => (
                      <Button key={name} size="sm" variant="secondary" onClick={() => onAddBrand(name)} disabled={isProcessingMissing}>
                        Add "{name}"
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={onRetryImport} disabled={isProcessingMissing} className="mt-4 w-full">
                {isProcessingMissing ? 'Processing...' : 'Retry Import'}
              </Button>
            </div>
          )}

          {errors.length > 0 && (
            <>
              <p className="font-semibold text-red-800 dark:text-red-200 mb-2">Specific Row Errors:</p>
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700">
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Field</th>
                    <th className="p-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((error, index) => (
                    <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                      <td className="p-2">{error.row}</td>
                      <td className="p-2">{error.field}</td>
                      <td className="p-2">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {!hasMissingItems && errors.length === 0 && (
            <p className="text-slate-500">No specific errors to display.</p>
          )}
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
