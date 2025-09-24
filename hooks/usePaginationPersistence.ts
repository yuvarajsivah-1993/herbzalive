import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'paginationItemsPerPage';
const DEFAULT_ITEMS_PER_PAGE = 10; // Default value

export const usePaginationPersistence = (initialValue?: number) => {
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        if (initialValue) return initialValue;
        try {
            const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
            return storedValue ? parseInt(storedValue, 10) : DEFAULT_ITEMS_PER_PAGE;
        } catch (error) {
            console.error("Error reading from localStorage", error);
            return DEFAULT_ITEMS_PER_PAGE;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, itemsPerPage.toString());
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [itemsPerPage]);

    const handleItemsPerPageChange = (size: number) => {
        setItemsPerPage(size);
    };

    return [itemsPerPage, handleItemsPerPageChange];
};