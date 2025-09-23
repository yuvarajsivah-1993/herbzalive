import React from 'react';
import Button from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (size: number) => void;
  totalItems: number;
  itemsOnPage: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  itemsOnPage,
}) => {
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = startItem + itemsOnPage - 1;

  if (totalItems === 0) {
    return null;
  }

  // Use a very large number to represent "All" to avoid conflicts with totalItems
  const ALL_ITEMS_VALUE = Number.MAX_SAFE_INTEGER;
  const pageOptions = [5, 10, 25, 50, 100, 200, 500, 1000];

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value);
    onItemsPerPageChange(value === ALL_ITEMS_VALUE ? totalItems : value);
  };
  
  // If itemsPerPage is effectively all items, show "All" as selected
  const selectValue = (itemsPerPage >= totalItems && totalItems > 0) ? ALL_ITEMS_VALUE : itemsPerPage;


  return (
    <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span>Rows per page:</span>
        <select
          value={selectValue}
          onChange={handlePerPageChange}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md p-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {pageOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
          <option value={ALL_ITEMS_VALUE}>All</option>
        </select>
        <span className="hidden sm:inline-block">|</span>
        <span className="hidden sm:inline-block">
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="light" onClick={() => onPageChange(1)} disabled={currentPage === 1}>First</Button>
        <Button size="sm" variant="light" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
        <span className="text-sm font-medium px-2 text-slate-700 dark:text-slate-300">Page {currentPage} of {totalPages}</span>
        <Button size="sm" variant="light" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
        <Button size="sm" variant="light" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>Last</Button>
      </div>
    </div>
  );
};

export default Pagination;