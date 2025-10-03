import { faUpload, faDownload, faFileCsv } from '@fortawesome/free-solid-svg-icons';
import Papa from 'papaparse';
import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Button from '../components/ui/Button';
import FileInput from '../components/ui/FileInput';
import { useInventoryManagement } from '../hooks/management/useInventoryManagement';

import { useFinancialManagement } from '../hooks/management/useFinancialManagement';
import { useSettingsManagement } from '../hooks/management/useSettingsManagement';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { StockImportRow } from '../types';
import ErrorModal from '../components/ui/ErrorModal';
import ProgressBar from '../components/ui/ProgressBar';

const BulkOperationsScreen: React.FC = () => {
  const { user, setUser, uploadFile, vendors, taxes, hospitalLocations, currentLocation, stockItems } = useAuth();
  const { addToast } = useToast();
  const { bulkImportStockWithProgress, addVendor, addStockUnitType, addStockBrand } = useInventoryManagement(user, uploadFile, setUser);
  const { addHospitalLocation, addTax } = useSettingsManagement(user, setUser, uploadFile);

  console.log('BulkOperationsScreen - hospitalStockUnitTypes:', user?.hospitalStockUnitTypes);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importErrors, setImportErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingMissing, setIsProcessingMissing] = useState(false);

  const [missingVendors, setMissingVendors] = useState<string[]>([]);
  const [missingUnitTypes, setMissingUnitTypes] = useState<string[]>([]);
  const [missingTaxes, setMissingTaxes] = useState<string[]>([]);
  const [missingLocations, setMissingLocations] = useState<string[]>([]);
  const [missingBrands, setMissingBrands] = useState<string[]>([]);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleAddMissingVendor = async (name: string) => {
    setIsProcessingMissing(true);
    try {
      await addVendor({ name, contactPerson: { name: 'N/A', phone: 'N/A', email: 'N/A' }, address: { street: 'N/A', city: 'N/A', country: 'N/A', pincode: 'N/A' } });
      addToast(`Vendor "${name}" added successfully!`, 'success');
      setMissingVendors(prev => prev.filter(v => v !== name));
    } catch (error: any) {
      addToast(`Failed to add vendor "${name}": ${error.message}`, 'error');
    } finally {
      setIsProcessingMissing(false);
    }
  };

  const handleAddMissingUnitType = async (name: string) => {
    setIsProcessingMissing(true);
    try {
      await addStockUnitType(name);
      addToast(`Unit Type "${name}" added successfully!`, 'success');
      setMissingUnitTypes(prev => prev.filter(u => u !== name));
    } catch (error: any) {
      addToast(`Failed to add unit type "${name}": ${error.message}`, 'error');
    } finally {
      setIsProcessingMissing(false);
    }
  };

  const handleAddMissingTax = async (name: string) => {
    setIsProcessingMissing(true);
    try {
      await addTax({ name, rate: 0, isGroup: false, components: [] });
      addToast(`Tax "${name}" added successfully!`, 'success');
      setMissingTaxes(prev => prev.filter(t => t !== name));
    } catch (error: any) {
      addToast(`Failed to add tax "${name}": ${error.message}`, 'error');
    } finally {
      setIsProcessingMissing(false);
    }
  };

  const handleAddMissingLocation = async (name: string) => {
    setIsProcessingMissing(true);
    try {
      await addHospitalLocation({ name, address: { street: 'N/A', city: 'N/A', country: 'N/A', pincode: 'N/A' }, phone: 'N/A', email: 'N/A' });
      addToast(`Location "${name}" added successfully!`, 'success');
      setMissingLocations(prev => prev.filter(l => l !== name));
    } catch (error: any) {
      addToast(`Failed to add location "${name}": ${error.message}`, 'error');
    } finally {
      setIsProcessingMissing(false);
    }
  };

  const handleAddMissingBrand = async (name: string) => {
    setIsProcessingMissing(true);
    try {
      await addStockBrand(name);
      addToast(`Brand "${name}" added successfully!`, 'success');
      setMissingBrands(prev => prev.filter(b => b !== name));
    } catch (error: any) {
      addToast(`Failed to add brand "${name}": ${error.message}`, 'error');
    } finally {
      setIsProcessingMissing(false);
    }
  };

  const handleRetryImport = () => {
    setIsErrorModalOpen(false);
    setImportErrors([]);
    setMissingVendors([]);
    setMissingUnitTypes([]);
    setMissingTaxes([]);
    setMissingLocations([]);
    setMissingBrands([]);
    handleUpload();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      addToast('Please select a CSV file to upload.', 'error');
      return;
    }

    setUploading(true);
    setImportErrors([]);
    setUploadProgress(0);

    try {
      const text = await selectedFile.text();
      const result = Papa.parse<StockImportRow>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      if (result.errors.length > 0) {
        addToast(`CSV parsing errors: ${result.errors[0].message}`, 'error');
        setUploading(false);
        return;
      }

      const errors: { row: number; field: string; message: string }[] = [];
      const localMissingVendors: Set<string> = new Set();
      const localMissingUnitTypes: Set<string> = new Set();
      const localMissingTaxes: Set<string> = new Set();
      const localMissingLocations: Set<string> = new Set();
      const localMissingBrands: Set<string> = new Set();

      const importData = result.data.map((row, index) => {
        const { vendorName, unitTypeName, taxName, locationName, brandName, ...rest } = row;

        const vendor = vendors.find(v => v.name === vendorName);
        if (!vendor) {
          errors.push({ row: index + 2, field: 'vendorName', message: `Vendor "${vendorName}" not found.` });
          if (vendorName) localMissingVendors.add(vendorName);
        }

        const unitType = (user?.hospitalStockUnitTypes || []).find(u => u === unitTypeName);
        if (!unitType) {
            errors.push({ row: index + 2, field: 'unitTypeName', message: `Unit Type "${unitTypeName}" not found.` });
            if (unitTypeName) localMissingUnitTypes.add(unitTypeName);
        }

        let taxId;
        if (taxName) {
            const tax = taxes.find(t => t.name === taxName);
            if (!tax) {
                errors.push({ row: index + 2, field: 'taxName', message: `Tax "${taxName}" not found.` });
                if (taxName) localMissingTaxes.add(taxName);
            }
            taxId = tax?.id;
        }

        const location = hospitalLocations.find(l => l.name === locationName);
        if (!location) {
            errors.push({ row: index + 2, field: 'locationName', message: `Location "${locationName}" not found.` });
            if (locationName) localMissingLocations.add(locationName);
        }

        if (brandName && !user?.hospitalStockBrands?.includes(brandName)) {
            errors.push({ row: index + 2, field: 'brandName', message: `Brand "${brandName}" not found.` });
            localMissingBrands.add(brandName);
        }

        return {
          ...rest,
          vendor: vendor?.id,
          brand: brandName,
          unitType: unitType,
          taxId: taxId,
          locationId: location?.id,
          lowStockThreshold: Number(row.lowStockThreshold),
          quantity: Number(row.quantity),
          costPrice: Number(row.costPrice),
          salePrice: Number(row.salePrice),
        };
      });

      if (errors.length > 0) {
        setMissingVendors(Array.from(localMissingVendors));
        setMissingUnitTypes(Array.from(localMissingUnitTypes));
        setMissingTaxes(Array.from(localMissingTaxes));
        setMissingLocations(Array.from(localMissingLocations));
        setMissingBrands(Array.from(localMissingBrands));
        setImportErrors(errors);
        setIsErrorModalOpen(true);
        setUploading(false);
        return;
      }

      const { successCount, errorCount, errors: importErrors } = await bulkImportStockWithProgress(importData, setUploadProgress);

      if (successCount > 0) {
        addToast(`${successCount} stock items imported successfully!`, 'success');
      }
      if (errorCount > 0) {
        addToast(`${errorCount} stock items failed to import. See console for details.`, 'error');
        console.error("Bulk Import Errors:", importErrors);
      }
      if (successCount === 0 && errorCount === 0) {
        addToast("No valid data found in CSV for import.", 'warning');
      }

      setSelectedFile(null);
    } catch (error: any) {
      addToast(error.message, 'error');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadTemplate = (type: 'stock') => {
    let csvContent = '';
    let filename = '';

    if (type === 'stock') {
      csvContent = 'name,category,sku,vendorName,brandName,unitTypeName,description,taxName,hsnCode,locationName,lowStockThreshold,batchNumber,expiryDate,quantity,costPrice,salePrice\n';
      filename = 'stock_import_template.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Stock import template downloaded.', 'success');
    }
  };

  const handleDownloadData = async (type: 'stock') => {
    setDownloading(true);
    addToast(`Downloading ${type} data...`, 'info');
    try {
      if (type === 'stock') {
        if (!currentLocation) {
          addToast('Please select a location from the header.', 'error');
          setDownloading(false);
          return;
        }

        const filteredStock = stockItems.filter(item => item.locationStock && item.locationStock[currentLocation.id]);

        const stockData = filteredStock.map(stock => {
          const locationData = {
            [`totalStock_${currentLocation.id}`]: stock.locationStock?.[currentLocation.id]?.totalStock,
            [`lowStockThreshold_${currentLocation.id}`]: stock.locationStock?.[currentLocation.id]?.lowStockThreshold,
          };

          return {
            name: stock.name,
            category: stock.category,
            sku: stock.sku,
            vendor: stock.vendor,
            brand: stock.brand, // Include brand in downloaded data
            unitType: stock.unitType,
            description: stock.description,
            taxId: stock.taxId,
            hsnCode: stock.hsnCode,
            ...locationData,
          };
        });

        const csv = Papa.unparse(stockData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `stock_data_${currentLocation.name}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          addToast('Stock data downloaded.', 'success');
        }
      }
    } catch (error) {
      addToast('Failed to download data.', 'error');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        errors={importErrors}
        missingVendors={missingVendors}
        onAddVendor={handleAddMissingVendor}
        missingUnitTypes={missingUnitTypes}
        onAddUnitType={handleAddMissingUnitType}
        missingTaxes={missingTaxes}
        onAddTax={handleAddMissingTax}
        missingLocations={missingLocations}
        onAddLocation={handleAddMissingLocation}
        missingBrands={missingBrands}
        onAddBrand={handleAddMissingBrand}
        onRetryImport={handleRetryImport}
        isProcessingMissing={isProcessingMissing}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Bulk Import Stock */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Bulk Import Stock</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Upload a CSV file to import multiple stock items at once. Ensure your CSV matches the template format.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <div className="flex-grow">
                <label htmlFor="stockCsvUpload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Stock CSV File
                </label>
                <input
                  id="stockCsvUpload"
                  name="stockCsvUpload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
              <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full sm:w-auto">
                <FontAwesomeIcon icon={faUpload} className="mr-2" /> {uploading ? 'Uploading...' : 'Upload CSV'}
              </Button>
            </div>
            {uploading && (
              <div className="mt-4">
                <ProgressBar progress={uploadProgress} />
              </div>
            )}
            <Button variant="secondary" onClick={() => handleDownloadTemplate('stock')}>
              <FontAwesomeIcon icon={faDownload} className="mr-2" /> Download Stock Template
            </Button>
          </div>

          {/* Bulk Download Data */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Bulk Download Data</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Download bulk information for the current location in CSV format.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="secondary" onClick={() => handleDownloadData('stock')} disabled={downloading}>
                <FontAwesomeIcon icon={faDownload} className="mr-2" /> {downloading ? 'Downloading...' : 'Download Stock Data'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkOperationsScreen;