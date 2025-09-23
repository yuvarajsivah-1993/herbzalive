import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PatientDocumentFile } from '../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileImage, faFileAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return faFileImage;
    if (ext === 'pdf') return faFilePdf;
    return faFileAlt;
};

const HealthRecordsScreen: React.FC = () => {
    const { user } = useAuth();
    const documents = useMemo(() => {
        if (!user || !user.documents) return [];
        return [...user.documents].sort((a,b) => b.uploadedAt.seconds - a.uploadedAt.seconds);
    }, [user]);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const totalPages = Math.ceil(documents.length / itemsPerPage);
    const paginatedDocuments = documents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Health Records</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">View and download documents shared by the clinic.</p>

            <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Document Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Uploaded On</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Uploaded By</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedDocuments.length > 0 ? paginatedDocuments.map(doc => (
                                <tr key={doc.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <FontAwesomeIcon icon={getFileIcon(doc.name)} className="h-5 w-5 text-slate-500 mr-3" />
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                        {doc.uploadedAt.toDate().toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                        {doc.uploadedBy}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                                            <Button size="sm" variant="light">
                                                <FontAwesomeIcon icon={faDownload} className="mr-2"/>
                                                Download
                                            </Button>
                                        </a>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-slate-500">
                                        No documents have been uploaded for you.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                     <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                        totalItems={documents.length}
                        itemsOnPage={paginatedDocuments.length}
                    />
                )}
            </div>
        </div>
    );
};

export default HealthRecordsScreen;
