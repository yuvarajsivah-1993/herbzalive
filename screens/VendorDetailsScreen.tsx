import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Vendor, VendorUpdateData, Address, VendorContactPerson, StockOrder, StockOrderStatus, StockReturn } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faChevronLeft, faTrashAlt, faPencilAlt, faPlus, faInfoCircle, faDolly, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import AddressInput from '../components/ui/AddressInput';

const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DetailCard: React.FC<{ title: string, children: React.ReactNode, footer?: React.ReactNode }> = ({ title, children, footer }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">{footer}</div>}
    </div>
);

const OrderStatusBadge: React.FC<{ status: StockOrderStatus }> = ({ status }) => {
    const statusConfig = {
        'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Partially Received': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Complete': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Cancelled': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig[status]}`}>
            {status}
        </span>
    );
};

const VendorDetailsScreen: React.FC = () => {
    const { vendorId } = useParams<{ vendorId: string }>();
    const navigate = useNavigate();
    const { user, getVendorById, updateVendor, deleteVendor, updateVendorStatus, getStockOrders, getStockReturns } = useAuth();
    const { addToast } = useToast();

    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [orders, setOrders] = useState<StockOrder[]>([]);
    const [returns, setReturns] = useState<StockReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [taxNumber, setTaxNumber] = useState('');
    const [address, setAddress] = useState<Address>({ street: '', city: '', country: '', pincode: '' });
    const [contactPersons, setContactPersons] = useState<VendorContactPerson[]>([]);

    const populateForm = useCallback((data: Vendor) => {
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone);
        setTaxNumber(data.taxNumber || '');
        setAddress(data.address);
        setContactPersons(data.contactPersons || []);
    }, []);

    const fetchData = useCallback(async () => {
        if (!vendorId) return;
        setLoading(true);
        try {
            const [data, allOrders, allReturns] = await Promise.all([
                getVendorById(vendorId),
                getStockOrders(),
                getStockReturns()
            ]);

            if (data) {
                setVendor(data);
                populateForm(data);
                const vendorOrders = allOrders.filter(o => o.vendor === data.name);
                setOrders(vendorOrders);
                const vendorReturns = allReturns.filter(r => vendorOrders.some(o => o.orderId === r.relatedOrderId));
                setReturns(vendorReturns);
            } else {
                addToast("Vendor not found.", "error");
                navigate(-1);
            }
        } catch (error) { addToast("Failed to load vendor data.", "error"); }
        finally { setLoading(false); }
    }, [vendorId, getVendorById, getStockOrders, getStockReturns, addToast, navigate, populateForm]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const toggleOrderExpansion = (orderId: string) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const handleUpdate = async () => {
        if (!vendorId) return;
        setActionLoading(true);
        try {
            const updateData: VendorUpdateData = { name, email, phone, taxNumber, address, contactPersons };
            await updateVendor(vendorId, updateData);
            addToast("Vendor updated successfully!", "success");
            setIsEditing(false);
            fetchData();
        } catch (error) { addToast("Failed to update vendor.", "error"); }
        finally { setActionLoading(false); }
    };
    
    const handleDelete = async () => {
        if (!vendorId) return;
        setActionLoading(true);
        try {
            await deleteVendor(vendorId);
            addToast("Vendor deleted.", "success");
            navigate(`/hospitals/${user?.hospitalSlug}/vendors`);
        } catch (error) { addToast("Failed to delete vendor.", "error"); }
        finally { setActionLoading(false); setConfirmDelete(false); }
    };
    
    const addContactPerson = () => setContactPersons(prev => [...prev, { id: Date.now().toString(), name: '', mobile: '' }]);
    const removeContactPerson = (id: string) => setContactPersons(prev => prev.filter(p => p.id !== id));
    const handleContactChange = (id: string, field: keyof VendorContactPerson, value: string) => {
        setContactPersons(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    if (loading) return <p className="p-8 text-center">Loading...</p>;
    if (!vendor) return <p className="p-8 text-center">Vendor not found.</p>;
    
    const canWrite = user?.permissions.vendors === 'write';

    const TabButton: React.FC<{ tabId: string; title: string; icon: any; }> = ({ tabId, title, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center whitespace-nowrap py-3 px-4 font-medium text-sm rounded-t-lg transition-colors border-b-2 ${
            activeTab === tabId
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
        >
            <FontAwesomeIcon icon={icon} className="w-4 h-4 mr-2" />
            {title}
        </button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            <ConfirmationModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={handleDelete} title="Delete Vendor" message={`Are you sure you want to delete ${vendor.name}?`} confirmButtonText="Delete" confirmButtonVariant="danger" loading={actionLoading} />
            
            <div className="flex justify-between items-center">
                 <Button variant="light" onClick={() => navigate(-1)}><FontAwesomeIcon icon={faChevronLeft} className="mr-2"/> Back</Button>
                {canWrite && !isEditing && activeTab === 'details' && <Button variant="primary" onClick={() => setIsEditing(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2"/>Edit</Button>}
            </div>

            <div className="mb-6">
                <nav className="flex space-x-2 border-b border-slate-200 dark:border-slate-800" aria-label="Tabs">
                    <TabButton tabId="details" title="Vendor Details" icon={faInfoCircle} />
                    <TabButton tabId="orders" title="Order History" icon={faDolly} />
                </nav>
            </div>
            
            {activeTab === 'details' && (
                <div className="space-y-6">
                    <DetailCard title="Vendor Information" footer={isEditing ? (
                        <div className="flex justify-end gap-2">
                            <Button variant="light" onClick={() => { setIsEditing(false); populateForm(vendor); }}>Cancel</Button>
                            <Button onClick={handleUpdate} disabled={actionLoading}><FontAwesomeIcon icon={faSave} className="mr-2"/>{actionLoading ? 'Saving...' : 'Save'}</Button>
                        </div>
                    ) : undefined}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Vendor Name*" value={name} onChange={e => setName(e.target.value)} disabled={!isEditing} />
                            <Input label="Email*" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!isEditing} />
                            <Input label="Phone*" type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} />
                            <Input label="Tax Number" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} disabled={!isEditing} />
                            <div className="md:col-span-2">
                                <AddressInput label="Address" id="vendor-address" value={address.street} onChange={val => setAddress({...address, street: val})} disabled={!isEditing} />
                            </div>
                        </div>
                    </DetailCard>

                     <DetailCard title="Contact Persons">
                        <div className="space-y-4">
                            {contactPersons.map((person) => (
                                <div key={person.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                     {isEditing && <div className="flex justify-end mb-2"><Button type="button" size="sm" variant="danger" onClick={() => removeContactPerson(person.id)}>Remove</Button></div>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Name*" value={person.name} onChange={e => handleContactChange(person.id, 'name', e.target.value)} disabled={!isEditing} />
                                        <Input label="Mobile*" type="tel" value={person.mobile} onChange={e => handleContactChange(person.id, 'mobile', e.target.value)} disabled={!isEditing} />
                                        <Input label="Email" type="email" value={person.email || ''} onChange={e => handleContactChange(person.id, 'email', e.target.value)} disabled={!isEditing} />
                                        <Input label="Designation" value={person.designation || ''} onChange={e => handleContactChange(person.id, 'designation', e.target.value)} disabled={!isEditing} />
                                    </div>
                                </div>
                            ))}
                            {isEditing && <Button variant="light" onClick={addContactPerson}><FontAwesomeIcon icon={faPlus} className="mr-2"/>Add Contact</Button>}
                        </div>
                     </DetailCard>

                    {!isEditing && canWrite && (
                        <DetailCard title="Danger Zone">
                            <p className="text-sm text-slate-500 mb-4">Deleting this vendor is permanent and cannot be undone.</p>
                            <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={actionLoading}>
                                <FontAwesomeIcon icon={faTrashAlt} className="mr-2"/> Delete Vendor
                            </Button>
                        </DetailCard>
                    )}
                </div>
            )}
            
            {activeTab === 'orders' && (
                <DetailCard title={`Order History (${orders.length})`}>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Items (O/R/R)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Order Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                {orders.map(order => {
                                    const orderReturns = returns.filter(r => r.relatedOrderId === order.orderId);
                                    const isExpanded = expandedOrders.has(order.id!);
                                    const totalReturned = order.items.reduce((sum, item) => sum + (item.returnedQty || 0), 0);
                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center">
                                                        <button onClick={() => toggleOrderExpansion(order.id!)} className="p-1 mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-expanded={isExpanded}>
                                                            <FontAwesomeIcon icon={faChevronDown} className={`w-3 h-3 transition-transform text-slate-600 dark:text-slate-400 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        <span onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks/orders/${order.id}`)} className="font-mono text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{order.orderId}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{order.createdAt.toDate().toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{order.totalItems} / {order.totalReceivedItems} / {totalReturned}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 font-semibold">{formatCurrency(order.totalValue, user?.hospitalCurrency)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm"><OrderStatusBadge status={order.status} /></td>
                                            </tr>
                                            {isExpanded && orderReturns.length > 0 && (
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <td colSpan={5} className="p-4">
                                                        <h4 className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-200">Return History for this Order</h4>
                                                        {orderReturns.map(ret => (
                                                            <div key={`${order.id}-${ret.id}`} className="mb-2 p-2 border rounded-lg bg-white dark:bg-slate-900">
                                                                <p className="font-semibold text-slate-700 dark:text-slate-300">Return ID: <span className="font-mono text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/hospitals/${user?.hospitalSlug}/stocks/returns/${ret.id}`)}>{ret.returnId}</span> on {ret.returnDate.toDate().toLocaleDateString()}</p>
                                                                <table className="w-full text-xs mt-1 text-slate-700 dark:text-slate-300">
                                                                    <thead><tr className="border-b"><th className="p-1 text-left">Item</th><th className="p-1 text-left">Batch No.</th><th className="p-1 text-right">Qty Returned</th></tr></thead>
                                                                    <tbody>{ret.items.map((item) => (<tr key={item.stockItemId}><td className="p-1">{item.name}</td><td className="p-1 font-mono">{item.batchNumber}</td><td className="p-1 text-right">{item.returnedQty}</td></tr>))}</tbody>
                                                                </table>
                                                            </div>
                                                        ))}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                        {orders.length === 0 && <p className="p-6 text-center text-slate-500">No orders found for this vendor.</p>}
                    </div>
                </DetailCard>
            )}
        </div>
    );
};

export default VendorDetailsScreen;
