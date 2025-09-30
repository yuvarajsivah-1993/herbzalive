import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Appointment, Consultation, Invoice, PatientDocument } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faCalendarCheck, faHourglassHalf, faFileInvoiceDollar, faArrowRight, faStethoscope } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { db } from '../services/firebase';
// FIX: Add firebase import for firestore types
import firebase from 'firebase/compat/app';

// --- Type definitions and constants ---
const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];

// --- Helper Functions ---


// --- Sub-components ---
const StatCard: React.FC<{ title: string, value: string | number, icon: any, color: string }> = ({ title, value, icon, color }) => {
    const valueStr = typeof value === 'string' ? value : String(value);
    const fontSizeClass = valueStr.length > 12 ? 'text-xl' : 'text-2xl';

    return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
        <div className={`p-3 rounded-full h-12 w-12 flex items-center justify-center ${color}`}>
            <FontAwesomeIcon icon={icon} className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className={`font-semibold text-slate-900 dark:text-slate-100 ${fontSizeClass}`}>{value}</p>
        </div>
    </div>
)};

const AppointmentCard: React.FC<{ appointment: Appointment, patient?: PatientDocument, isNext: boolean, hasConsultation: boolean, formatTime: (date: Date) => string }> = ({ appointment, patient, isNext, hasConsultation, formatTime }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleConsultationAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/hospitals/${user?.hospitalSlug}/appointments/${appointment.id}/consultation`);
    };

    const handleViewPatient = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (patient) {
            navigate(`/hospitals/${user?.hospitalSlug}/patients/${patient.id}`);
        }
    };
    
    const isFinished = appointment.status === 'Finished' || appointment.status === 'Cancelled';
    const buttonText = isFinished ? "View Consultation" : hasConsultation ? "Edit Consultation" : "Start Consultation";

    return (
        <div className={`flex items-center p-4 rounded-lg transition-all ${isNext ? 'bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-500' : 'bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'}`}>
            <Avatar avatar={patient?.profilePhotoUrl ? { type: 'image', value: patient.profilePhotoUrl } : { type: 'initials', value: patient?.name.split(' ').map(n=>n[0]).join('').toUpperCase() || '?', color: 'bg-indigo-500' }} size="md" />
            <div className="ml-4 flex-grow">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{patient?.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatTime(appointment.start.toDate())} - {formatTime(appointment.end.toDate())}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{appointment.treatmentName}</p>
            </div>
            <div className="text-right">
                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full mb-2 ${appointment.status === 'Finished' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>{appointment.status}</span>
                <div className="flex items-center justify-end gap-2 mt-1">
                    <Button variant="light" size="sm" onClick={handleViewPatient} disabled={!patient}>
                        View Patient
                    </Button>
                    
                        <Button variant={hasConsultation || isFinished ? "light" : "primary"} size="sm" onClick={handleConsultationAction} disabled={isFinished}>
                            {buttonText} <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
                        </Button>
                    
                </div>
            </div>
        </div>
    );
};


import { useFormatting } from '@/utils/formatting';

const DoctorDashboard: React.FC = () => {
    const { user, patients } = useAuth();
    const { theme } = useTheme();
    const { formatDate, formatTime, formatCurrency } = useFormatting();
    const [loading, setLoading] = useState(true);

    const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b'; // slate-400 dark, slate-500 light
    const legendColor = theme === 'dark' ? '#cbd5e1' : '#475569'; // slate-300 dark, slate-600 light
    
    const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
    const [patientsMap, setPatientsMap] = useState<Map<string, PatientDocument>>(new Map());
    const [stats, setStats] = useState({ appointments: 0, completed: 0, pending: 0, earnings: 0 });
    const [consultations, setConsultations] = useState<Consultation[]>([]);

    const [appointmentOverviewData, setAppointmentOverviewData] = useState<any[]>([]);
    const [topDiagnosesData, setTopDiagnosesData] = useState<any[]>([]);
    const [earningsByTreatmentData, setEarningsByTreatmentData] = useState<{name: string, value: number}[]>([]);
    const [totalMonthlyEarnings, setTotalMonthlyEarnings] = useState(0);
    // FIX: Changed useAuth to useToast to get the addToast function.
    const { addToast } = useToast();

    useEffect(() => {
        if (!user || !user.doctorId) return;
        setLoading(true);
    
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const last7DaysStart = new Date(now); last7DaysStart.setDate(now.getDate() - 6); last7DaysStart.setHours(0,0,0,0);
        const last30DaysStart = new Date(now); last30DaysStart.setDate(now.getDate() - 29); last30DaysStart.setHours(0,0,0,0);
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const unsubscribers: (() => void)[] = [];

        const createListener = (query: firebase.firestore.Query, callback: (snapshot: firebase.firestore.QuerySnapshot) => void) => {
            let finalQuery = query;
            if (user.currentLocation) {
                finalQuery = finalQuery.where("locationId", "==", user.currentLocation.id);
            }
            const unsubscribe = finalQuery.onSnapshot(callback, (error) => {
                console.error("Firestore listener error:", error);
                addToast("Error fetching real-time data.", "error");
            });
            unsubscribers.push(unsubscribe);
        };
        
        // Today's Appointments
        createListener(db.collection('appointments').where('hospitalId', '==', user.hospitalId).where('doctorId', '==', user.doctorId).where('start', '>=', todayStart).where('start', '<=', todayEnd),
            (snapshot) => {
                const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)).sort((a,b) => a.start.seconds - b.start.seconds);
                setTodaysAppointments(apps);
                setStats(prev => ({...prev, appointments: apps.length, completed: apps.filter(a => a.status === 'Finished').length, pending: apps.filter(a => ['Registered', 'Encounter', 'Waiting Payment'].includes(a.status)).length }));
            }
        );

        // Today's Earnings
        createListener(db.collection('invoices').where('hospitalId', '==', user.hospitalId).where('doctorId', '==', user.doctorId).where('createdAt', '>=', todayStart).where('createdAt', '<=', todayEnd),
            (snapshot) => {
                const invs = snapshot.docs.map(doc => doc.data() as Invoice);
                const todaysEarnings = invs.reduce((sum: number, inv) => sum + Number(inv.totalAmount || 0), 0);
                setStats(prev => ({...prev, earnings: todaysEarnings}));
            }
        );
        
        // Appointments last 7 days for overview chart
        createListener(db.collection('appointments').where('hospitalId', '==', user.hospitalId).where('doctorId', '==', user.doctorId).where('start', '>=', last7DaysStart).where('start', '<=', todayEnd),
            (snapshot) => {
                const doc7DaysApps = snapshot.docs.map(doc => doc.data() as Appointment);
                const dailyCounts: {[key: string]: number} = {};
                for(let i=0; i<7; i++) {
                    const day = new Date(last7DaysStart); day.setDate(last7DaysStart.getDate() + i);
                    dailyCounts[formatDate(day, 'ddd')] = 0;
                }
                doc7DaysApps.forEach(app => {
                    const dayString = formatDate(app.start.toDate(), 'ddd');
                    if(dailyCounts.hasOwnProperty(dayString)) dailyCounts[dayString]++;
                });
                setAppointmentOverviewData(Object.entries(dailyCounts).map(([name, count]) => ({ name, appointments: count })));
            }
        );

        // Consultations last 30 days for diagnoses
        createListener(db.collection('consultations').where('hospitalId', '==', user.hospitalId).where('doctorId', '==', user.doctorId).where('createdAt', '>=', last30DaysStart).where('createdAt', '<=', todayEnd),
            (snapshot) => {
                const consults = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as Consultation));
                setConsultations(consults);
                const diagnosisCounts = consults.reduce((acc: Record<string, number>, curr) => {
                    if (curr.diagnosis) {
                        const diagnosis = curr.diagnosis.trim();
                        if(diagnosis) acc[diagnosis] = (acc[diagnosis] || 0) + 1;
                    }
                    return acc;
                }, {});
                setTopDiagnosesData(Object.entries(diagnosisCounts).map(([name, count]) => ({name, count})).sort((a,b) => b.count-a.count).slice(0,5));
            }
        );
        
        // Invoices this month for earnings by treatment
        createListener(db.collection('invoices').where('hospitalId', '==', user.hospitalId).where('doctorId', '==', user.doctorId).where('createdAt', '>=', thisMonthStart).where('createdAt', '<=', todayEnd),
            (snapshot) => {
                 const docMonthInvoices = snapshot.docs.map(doc => doc.data() as Invoice);
                const treatmentEarnings: Record<string, number> = {};
                docMonthInvoices.forEach(inv => {
                    (inv.items || []).forEach(item => {
                        // FIX: Explicitly convert potential non-numeric Firestore values and calculate proportion safely to avoid arithmetic errors.
                        const subtotal = Number(inv.subtotal) || 0;
                        const totalAmount = Number(inv.totalAmount) || 0;
                        const cost = Number(item.cost) || 0;

                        const itemValueWithTax = subtotal > 0 ? (cost / subtotal) * totalAmount : cost;
                        treatmentEarnings[item.description] = (treatmentEarnings[item.description] || 0) + itemValueWithTax;
                    });
                });
                
                const totalEarnings = Object.values(treatmentEarnings).reduce((sum, val) => sum + val, 0);
                setTotalMonthlyEarnings(totalEarnings);
                setEarningsByTreatmentData(Object.entries(treatmentEarnings).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value));
            }
        );
    
        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
    
    }, [user, addToast, user.currentLocation]);

    useEffect(() => {
        setPatientsMap(new Map(patients.map(p => [p.id, p])));
    }, [patients]);
    
    const nextAppointmentIndex = useMemo(() => {
        const now = new Date();
        return todaysAppointments.findIndex(app => (app.status === 'Registered' || app.status === 'Encounter') && app.start.toDate() > now);
    }, [todaysAppointments]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading Dashboard...</div>;
    }

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 min-h-full">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{getGreeting()}, Dr. {user?.name || 'Doctor'}!</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{formatDate(new Date())}</p>
            </div>

            {/* 1. Today at a Glance */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Appointments Today" value={stats.appointments} icon={faCalendarCheck} color="bg-blue-500" />
                <StatCard title="Completed Today" value={stats.completed} icon={faStethoscope} color="bg-green-500" />
                <StatCard title="Pending" value={stats.pending} icon={faHourglassHalf} color="bg-yellow-500" />
                <StatCard title="Today's Earnings" value={formatCurrency(stats.earnings)} icon={faFileInvoiceDollar} color="bg-indigo-500" />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* 2. Today's Schedule */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-semibold p-4 border-b border-slate-200 dark:border-slate-800">Today's Schedule</h3>
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {todaysAppointments.length > 0 ? (
                            todaysAppointments.map((app, index) => {
                                const hasConsultation = consultations.some(c => c.appointmentId === app.id);
                                return (
                                <AppointmentCard key={app.id} appointment={app} patient={patientsMap.get(app.patientId)} isNext={index === nextAppointmentIndex} hasConsultation={hasConsultation} formatTime={formatTime} />
                            )})
                        ) : (
                            <div className="text-center py-16 text-slate-500">No appointments scheduled for today.</div>
                        )}
                    </div>
                </div>

                {/* 3. Performance & Insights */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-semibold mb-2">Appointments (Last 7 Days)</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={appointmentOverviewData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                                    <Tooltip wrapperClassName="dark:!bg-slate-800 dark:!border-slate-700" contentStyle={{ backgroundColor: 'var(--tw-bg-white)', borderRadius: '0.5rem', border: '1px solid var(--tw-border-slate-200)' }}/>
                                    <Bar dataKey="appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                     <div className="bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-semibold mb-2">Earnings by Treatment (This Month)</h3>
                        <div className="h-56 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={earningsByTreatmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                        {earningsByTreatmentData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} wrapperClassName="dark:!bg-slate-800 dark:!border-slate-700" contentStyle={{ backgroundColor: 'var(--tw-bg-white)', borderRadius: '0.5rem', border: '1px solid var(--tw-border-slate-200)' }} />
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-slate-800 dark:fill-white">{formatCurrency(totalMonthlyEarnings)}</text>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
            
             <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold">Top 5 Diagnoses (Last 30 Days)</h3>
                <div className="h-64 mt-4">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDiagnosesData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-800" />
                            <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: tickColor, width: 140 }} axisLine={false} tickLine={false} />
                            <Tooltip wrapperClassName="dark:!bg-slate-800 dark:!border-slate-700" contentStyle={{ backgroundColor: 'var(--tw-bg-white)', borderRadius: '0.5rem', border: '1px solid var(--tw-border-slate-200)' }} />
                            <Bar dataKey="count" name="Cases" fill="#10b981" radius={[0, 4, 4, 0]}>
                                {topDiagnosesData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
};

export default DoctorDashboard;