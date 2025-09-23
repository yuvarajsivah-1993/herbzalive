import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Consultation } from '../../types';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

const PatientConsultationsScreen: React.FC = () => {
    const { myConsultations, doctors } = useAuth();
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('all');

    const doctorOptions = useMemo(() => {
        const uniqueDoctors = new Map<string, string>();
        myConsultations.forEach(c => {
            if (c.doctorId && c.doctorName) {
                uniqueDoctors.set(c.doctorId, c.doctorName);
            }
        });
        return Array.from(uniqueDoctors.entries()).map(([id, name]) => ({ id, name }));
    }, [myConsultations]);

    const consultationsWithDoctorNames = useMemo(() => {
        const doctorMap = new Map(doctors.map(d => [d.id!, d.name]));
        return myConsultations.map(c => ({
            ...c,
            doctorName: c.doctorName || doctorMap.get(c.doctorId) || 'Unknown Doctor'
        })).sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [myConsultations, doctors]);

    const filteredConsultations = useMemo(() => {
        return consultationsWithDoctorNames
            .filter(c => doctorFilter === 'all' || c.doctorId === doctorFilter)
            .filter(c => {
                if (!searchTerm.trim()) return true;
                const term = searchTerm.toLowerCase();
                return c.doctorName.toLowerCase().includes(term) ||
                       c.diagnosis?.toLowerCase().includes(term) ||
                       c.advice?.toLowerCase().includes(term);
            });
    }, [consultationsWithDoctorNames, searchTerm, doctorFilter]);

    const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);
    const paginatedConsultations = filteredConsultations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Consultations</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">A record of all your past consultations.</p>

            <Card className="mt-6 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label=""
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search diagnosis, advice..."
                        icon={<FontAwesomeIcon icon={faSearch} />}
                    />
                    <Select
                        label=""
                        value={doctorFilter}
                        onChange={e => setDoctorFilter(e.target.value)}
                    >
                        <option value="all">All Doctors</option>
                        {doctorOptions.map(doc => (
                            <option key={doc.id} value={doc.id}>{doc.name}</option>
                        ))}
                    </Select>
                </div>
            </Card>

            <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Diagnosis</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Next Visit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedConsultations.length > 0 ? (
                                paginatedConsultations.map(consultation => (
                                    <tr key={consultation.id} onClick={() => navigate(`/patient/consultations/${consultation.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                            {consultation.createdAt.toDate().toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {consultation.doctorName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                            {consultation.diagnosis || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                            {consultation.nextVisitDate ? consultation.nextVisitDate.toDate().toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={4} className="text-center p-8 text-slate-500">No consultation records found.</td></tr>
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
                        totalItems={filteredConsultations.length}
                        itemsOnPage={paginatedConsultations.length}
                    />
                )}
            </div>
        </div>
    );
};

export default PatientConsultationsScreen;
