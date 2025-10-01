import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faStethoscope, faFileMedicalAlt, faPlus, faArrowRight, faVideo } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Appointment, Consultation } from '../../types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '../../hooks/useToast';
import { AgoraRTCProvider } from "agora-rtc-react";
import AgoraRTC from "agora-rtc-sdk-ng";
import VideoCall from '../../components/video/VideoCall';
import CallAlertModal from '../../components/ui/CallAlertModal';

const AGORA_APP_ID = 'f720ed7d09824cb1a85f18ae07bb6465';

const StatCard: React.FC<{ title: string; value: string | number; icon: any; color: string }> = ({ title, value, icon, color }) => (
    <Card className="p-6">
        <div className="flex items-center">
            <div className={`p-3 rounded-full h-12 w-12 flex items-center justify-center ${color}`}>
                <FontAwesomeIcon icon={icon} className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </Card>
);

const UpcomingAppointmentCard: React.FC<{ appointment: Appointment, children?: React.ReactNode }> = ({ appointment, children }) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{appointment.treatmentName}</p>
            <p className="text-sm text-slate-500">with Dr. {appointment.doctorName}</p>
            <p className="text-xs text-slate-500 mt-1">{appointment.start.toDate().toLocaleDateString()}, {appointment.start.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="text-right">
            {children}
        </div>
    </div>
);

const RecentConsultationCard: React.FC<{ consultation: Consultation }> = ({ consultation }) => (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Consultation with Dr. {consultation.doctorName}</p>
                <p className="text-xs text-slate-500">{consultation.createdAt.toDate().toLocaleDateString()}</p>
            </div>
            {consultation.diagnosis && <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium">{consultation.diagnosis}</span>}
        </div>
        {consultation.advice && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">{consultation.advice}</p>}
    </div>
);


const PatientDashboard: React.FC = () => {
    const { user, myAppointments, myConsultations, doctors } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Video Call State
    const [activeCallAppointment, setActiveCallAppointment] = useState<Appointment | null>(null);
    const [videoToken, setVideoToken] = useState<string | null>(null);
    const [isJoiningCall, setIsJoiningCall] = useState(false);
    const client = React.useMemo(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }), []);

    // Modal State
    const [showCallAlertModal, setShowCallAlertModal] = useState(false);
    const [modalAppointment, setModalAppointment] = useState<Appointment | null>(null);

    const stats = useMemo(() => {
        const upcomingAppointments = myAppointments.filter(app => (new Date(app.start.toDate()) > new Date() && app.status === 'Registered') || (app.consultationType === 'online' && app.videoCallActive)).length;
        const totalConsultations = myConsultations.length;
        return { upcomingAppointments, totalConsultations };
    }, [myAppointments, myConsultations]);
    
    const activeAndUpcomingAppointments = useMemo(() => {
        return myAppointments
            .filter(app => {
              const isUpcoming = new Date(app.start.toDate()) > new Date() && app.status === 'Registered';
              const isActiveOnlineCall = app.consultationType === 'online' && app.videoCallActive === true;
              return isUpcoming || isActiveOnlineCall;
            })
            .sort((a, b) => a.start.seconds - b.start.seconds)
            .slice(0, 5);
    }, [myAppointments]);

    const consultationsWithDoctorNames = useMemo(() => {
        const doctorMap = new Map(doctors.map(d => [d.id!, d.name]));
        return myConsultations.map(c => ({
            ...c,
            doctorName: c.doctorName || doctorMap.get(c.doctorId) || 'Unknown Doctor'
        })).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [myConsultations, doctors]);

    const recentConsultations = useMemo(() => {
        return consultationsWithDoctorNames.slice(0, 3);
    }, [consultationsWithDoctorNames]);

    const handleJoinCall = useCallback(async (appointment: Appointment) => {
        if (!appointment?.videoCallChannel || !user) return;
        setIsJoiningCall(true);
        setShowCallAlertModal(false); // Close modal if open
        try {
            const functions = getFunctions();
            const generateAgoraToken = httpsCallable(functions, 'generateAgoraToken');
            const result = await generateAgoraToken({ channelName: appointment.videoCallChannel, uid: 2 }); // Patient is UID 2
            const token = (result.data as { token: string }).token;
            if (token) {
                setActiveCallAppointment(appointment);
                setVideoToken(token);
            } else {
                throw new Error("Token was not generated");
            }
        } catch (error) {
            console.error("Error joining call:", error);
            addToast("Failed to join video call.", "error");
        } finally {
            setIsJoiningCall(false);
        }
    }, [addToast, user]);

    const handleEndCall = async () => {
        if (!activeCallAppointment) return;
        try {
            const functions = getFunctions();
            const endVideoCall = httpsCallable(functions, 'endVideoCall');
            await endVideoCall({ appointmentId: activeCallAppointment.id });
        } catch (error) {
            console.error("Error ending call on backend:", error);
            addToast("Failed to end call.", "error");
        } finally {
            setActiveCallAppointment(null);
            setVideoToken(null);
        }
    };

    // Clear local video token if call has ended on the backend
    useEffect(() => {
        if (activeCallAppointment && !activeCallAppointment.videoCallActive && videoToken) {
            setVideoToken(null);
            setActiveCallAppointment(null);
        }
    }, [activeCallAppointment, videoToken]);

    // Effect to trigger call alert modal for patient
    useEffect(() => {
        const activeOnlineCall = myAppointments.find(app => 
            app.consultationType === 'online' && 
            app.videoCallActive === true && 
            app.callStartTime && 
            !activeCallAppointment // Only show if not already in a call
        );

        if (activeOnlineCall && !showCallAlertModal) {
            setModalAppointment(activeOnlineCall);
            setShowCallAlertModal(true);
        } else if (!activeOnlineCall && showCallAlertModal) {
            // If call ends while modal is open, close it
            setShowCallAlertModal(false);
            setModalAppointment(null);
        }
    }, [myAppointments, showCallAlertModal, activeCallAppointment]);

    return (
        <>
            {activeCallAppointment && videoToken && (
                <AgoraRTCProvider client={client}>
                    <VideoCall 
                        appId={AGORA_APP_ID}
                        channelName={activeCallAppointment.videoCallChannel!}
                        token={videoToken}
                        onCallEnd={handleEndCall}
                        userName={user?.name}
                        doctorName={activeCallAppointment.doctorName || 'Doctor'}
                        patientName={user?.name || 'Patient'}
                        localUserUid={2} // Patient is UID 2
                        callStartTime={activeCallAppointment.callStartTime!}
                    />
                </AgoraRTCProvider>
            )}
            <div className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome, {user?.name.split(' ')[0]}!</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Here's a summary of your health portal.</p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Active & Upcoming" value={stats.upcomingAppointments} icon={faCalendarCheck} color="bg-blue-500" />
                    <StatCard title="Total Consultations" value={stats.totalConsultations} icon={faStethoscope} color="bg-teal-500" />
                    <StatCard title="Health Records" value={user?.documents?.length || 0} icon={faFileMedicalAlt} color="bg-indigo-500" />
                </div>
                
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-0 flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Active & Upcoming Appointments</h3>
                            <Button variant="light" size="sm" onClick={() => navigate('/patient/new-appointment')}>
                                Book New <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
                            </Button>
                        </div>
                        <div className="p-6 space-y-3 flex-grow">
                            {activeAndUpcomingAppointments.length > 0 ? (
                                activeAndUpcomingAppointments.map(app => {
                                    const isActiveCall = app.consultationType === 'online' && app.videoCallActive === true;
                                    return (
                                        <UpcomingAppointmentCard key={app.id} appointment={app}>
                                            {isActiveCall ? (
                                                <Button onClick={() => handleJoinCall(app)} disabled={isJoiningCall} icon={<FontAwesomeIcon icon={faVideo} />}>
                                                    {isJoiningCall ? 'Joining...' : 'Join Call'}
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={() => navigate(`/patient/consultations/${app.id}`)}>View</Button>
                                            )}
                                        </UpcomingAppointmentCard>
                                    )
                                })
                            ) : <div className="flex items-center justify-center h-full"><p className="text-slate-500 text-center py-8">No active or upcoming appointments.</p></div>}
                        </div>
                    </Card>
                    <Card className="p-0 flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Recent Activity</h3>
                            <Button variant="light" size="sm" onClick={() => navigate('/patient/consultations')}>
                                View All <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
                            </Button>
                        </div>
                        <div className="p-6 space-y-3 flex-grow">
                            {recentConsultations.length > 0 ? (
                                recentConsultations.map(con => <RecentConsultationCard key={con.id} consultation={con} />)
                            ) : <div className="flex items-center justify-center h-full"><p className="text-slate-500 text-center py-8">No recent activity to show.</p></div>}
                        </div>
                    </Card>
                </div>


                <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button variant="primary" size="lg" className="flex-col h-24" onClick={() => navigate('/patient/new-appointment')}>
                            <FontAwesomeIcon icon={faPlus} className="h-6 w-6 mb-2"/>
                            New Appointment
                        </Button>
                        <Button variant="light" size="lg" className="flex-col h-24" onClick={() => navigate('/patient/consultations')}>
                            <FontAwesomeIcon icon={faStethoscope} className="h-6 w-6 mb-2"/>
                            My Consultations
                        </Button>
                        <Button variant="light" size="lg" className="flex-col h-24" onClick={() => navigate('/patient/health-records')}>
                            <FontAwesomeIcon icon={faFileMedicalAlt} className="h-6 w-6 mb-2"/>
                            Health Records
                        </Button>
                    </div>
                </div>
            </div>
            {modalAppointment && (
                <CallAlertModal 
                    isOpen={showCallAlertModal}
                    onClose={() => setShowCallAlertModal(false)}
                    onJoinCall={handleJoinCall}
                    appointment={modalAppointment}
                />
            )}
        </>
    );
};

export default PatientDashboard;
