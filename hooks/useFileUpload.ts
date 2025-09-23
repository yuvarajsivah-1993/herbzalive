import { useCallback } from 'react';
import { storage } from '../services/firebase';

export const useFileUpload = () => {
    const uploadFile = useCallback(async (file: File | Blob, path: string): Promise<string> => {
        const storageRef = storage.ref(path);
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();
        return downloadURL;
    }, []);

    return { uploadFile };
};
