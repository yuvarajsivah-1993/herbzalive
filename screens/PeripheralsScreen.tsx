

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Peripheral, PeripheralStatus } from '../types';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faDesktop, faExclamationCircle, faSearch, faFilter, faThLarge, faList } from '@fortawesome/free-solid-svg-icons';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Pagination from '../components/ui/Pagination';
import { usePaginationPersistence } from '../hooks/usePaginationPersistence';

const PeripheralCard: React.FC<{ peripheral: Peripheral; locationName: string }> = ({ peripheral, locationName }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Use': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'In Storage': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case 'In Repair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case 'Decommissioned': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200 flex flex-col"
            onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/peripherals/${peripheral.id}`)}
        >
            <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {peripheral.photoUrl ? (
                    <img src={peripheral.photoUrl} alt={peripheral.name} className="w-full h-full object-cover" />
                ) : (
                    <FontAwesomeIcon icon={faDesktop} className="h-16 w-16 text-slate-400" />
                )}
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{peripheral.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{peripheral.category}</p>
                <div className="mt-4 flex justify-between items-center text-sm">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(peripheral.status)}`}>
                        {peripheral.status}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{peripheral.assignedTo}</span>
                </div>
                {locationName && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Location: {locationName}</p>}
            </div>
        </div>
    );
};

const PeripheralsScreen: React.FC = () => {
    const { user, getPeripherals, hospitalLocations } = useAuth();
    const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const navigate = useNavigate();

    // UI State
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePaginationPersistence(30);

    const locationMap = useMemo(() => {
        return new Map(hospitalLocations.map(loc => [loc.id, loc.name]));
    }, [hospitalLocations]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            setPeripherals(await getPeripherals());
        } catch (error) {
            addToast("Failed to load peripherals.", "error");
        } finally {
            setLoading(false);
        }
    }, [getPeripherals, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const categories = useMemo(() => ['all', ...Array.from(new Set(peripherals.map(p => p.category)))], [peripherals]);
    const statuses: ('all' | PeripheralStatus)[] = ['all', 'In Use', 'In Storage', 'In Repair', 'Decommissioned'];
    const locationOptions = useMemo(() => [
        { value: 'all', label: 'All Locations' },
        ...(hospitalLocations || []).map(loc => ({ value: loc.id, label: loc.name }))
    ], [hospitalLocations]);
    
    const filteredPeripherals = useMemo(() => {
        return peripherals
            .filter(p => statusFilter === 'all' || p.status === statusFilter)
            .filter(p => categoryFilter === 'all' || p.category === categoryFilter)
            .filter(p => locationFilter === 'all' || p.locationId === locationFilter)
            .filter(p => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                const peripheralLocationName = p.locationId ? locationMap.get(p.locationId)?.toLowerCase() : '';
                return p.name.toLowerCase().includes(lowerSearch) ||
                       p.sku.toLowerCase().includes(lowerSearch) ||
                       p.assignedTo.toLowerCase().includes(lowerSearch) ||
                       peripheralLocationName.includes(lowerSearch);
            });
    }, [peripherals, searchTerm, statusFilter, categoryFilter, locationFilter, locationMap]);
    
     const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Use': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'In Storage': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case 'In Repair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case 'Decommissioned': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const totalPages = useMemo(() => Math.ceil(filteredPeripherals.length / itemsPerPage), [filteredPeripherals.length, itemsPerPage]);
    const paginatedPeripherals = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPeripherals.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPeripherals, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, categoryFilter, locationFilter, view]);


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Peripherals</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all your hospital equipment and peripherals.</p>
                </div>
                {user?.permissions.peripherals === 'write' && (
                    <Button onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/peripherals/new`)}>
                        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Peripheral
                    </Button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-grow"><Input label="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name, SKU, location..." icon={<FontAwesomeIcon icon={faSearch} />} /></div>
                    <div className="w-48"><Select label="Filter by Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
                    </Select></div>
                     <div className="w-48"><Select label="Filter by Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
                    </Select></div>
                    <div className="w-48"><Select label="Filter by Location" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
                        {locationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select></div>
                    <div className="flex items-center justify-end bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border dark:border-slate-700 self-end h-[46px] flex-shrink-0">
                        <Button size="sm" variant={view === 'grid' ? 'light' : 'ghost'} onClick={() => setView('grid')} className="!rounded-md shadow-sm w-full"><FontAwesomeIcon icon={faThLarge} className="mr-2"/>Grid</Button>
                        <Button size="sm" variant={view === 'list' ? 'light' : 'ghost'} onClick={() => setView('list')} className="!rounded-md w-full"><FontAwesomeIcon icon={faList} className="mr-2"/>List</Button>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-center text-slate-500 py-16">Loading peripherals...</p>
            ) : filteredPeripherals.length === 0 ? (
                 <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <FontAwesomeIcon icon={faDesktop} className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No Peripherals Found</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your search or filter returned no results.</p>
                </div>
            ) : view === 'grid' ? (
                 <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedPeripherals.map(p => (
                            <PeripheralCard key={p.id} peripheral={p} locationName={p.locationId ? locationMap.get(p.locationId) || 'N/A' : 'N/A'} />
                        ))}
                    </div>
                     <div className="mt-6">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} totalItems={filteredPeripherals.length} itemsOnPage={paginatedPeripherals.length}/>
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                             <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                             </thead>
                             <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                {paginatedPeripherals.map(p => (
                                    <tr key={p.id} onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/peripherals/${p.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mr-4">
                                                {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover rounded-md"/> : <FontAwesomeIcon icon={faDesktop} className="h-5 w-5 text-slate-400"/>}
                                            </div>
                                            {p.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{p.sku}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{p.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{p.assignedTo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{p.locationId ? locationMap.get(p.locationId) : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(p.status)}`}>{p.status}</span></td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} totalItems={filteredPeripherals.length} itemsOnPage={paginatedPeripherals.length}/>
                </div>
            )}
        </div>
    );
};

export default PeripheralsScreen;
