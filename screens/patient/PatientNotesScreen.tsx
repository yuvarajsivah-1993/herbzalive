import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStickyNote } from '@fortawesome/free-solid-svg-icons';

const PatientNotesScreen: React.FC = () => {
    const { user } = useAuth();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const sortedNotes = useMemo(() => {
        if (!user || !user.notes) return [];
        return [...user.notes].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [user]);

    const totalPages = Math.ceil(sortedNotes.length / itemsPerPage);
    const paginatedNotes = sortedNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Notes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">A log of all notes recorded by your care providers during visits.</p>

            <div className="mt-6 space-y-6">
                {paginatedNotes.length > 0 ? (
                    paginatedNotes.map(note => (
                        <Card key={note.id}>
                            <div className="p-4">
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{note.text}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-right">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Noted by <strong>{note.createdBy}</strong> on {note.createdAt.toDate().toLocaleString()}
                                </p>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 rounded-lg border">
                        <FontAwesomeIcon icon={faStickyNote} className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                        <h3 className="text-lg font-semibold">No Notes Found</h3>
                        <p className="text-sm">Your provider has not added any notes to your record yet.</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-6">
                     <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                        totalItems={sortedNotes.length}
                        itemsOnPage={paginatedNotes.length}
                    />
                </div>
            )}
        </div>
    );
};

export default PatientNotesScreen;