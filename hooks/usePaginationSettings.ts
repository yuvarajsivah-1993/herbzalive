import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'paginationItemsPerPage';
const DEFAULT_ITEMS_PER_PAGE = 25;

export const usePaginationSettings = () => {
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        try {
            const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
            return storedValue ? parseInt(storedValue, 10) : DEFAULT_ITEMS_PER_PAGE;
        } catch (error) {
            console.error("Error reading from localStorage", error);
            return DEFAULT_ITEMS_PER_PAGE;
        }
    });

    const setItemsPerPageAndPersist = useCallback((newSize: number) => {
        setItemsPerPage(newSize);
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, newSize.toString());
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, []);

    return [itemsPerPage, setItemsPerPageAndPersist] as const;
};