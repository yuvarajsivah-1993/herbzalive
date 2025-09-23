import React, { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Appointment, Consultation, PatientDocument } from '../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faUser, faStethoscope, faNotesMedical } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface TimelineEvent {
  date: Date;
  type: 'registration' | 'diagnosis' | 'treatment';
  title: string;
  description: string;
  icon: IconDefinition;
}

const PatientTreatmentJourneyScreen: React.FC = () => {
    const { user, myAppointments, myConsultations } = useAuth();
    
    const events = useMemo((): TimelineEvent[] => {
        if (!user) return [];
        const allEvents: TimelineEvent[] = [];

        if (user.registeredAt) {
             allEvents.push({
                date: user.registeredAt.toDate(),
                type: 'registration',
                title: 'Patient Registered',
                description: `Your journey with ${user.hospitalName} began.`,
                icon: faUser,
            });
        }

        myAppointments.forEach(app => {
            allEvents.push({
                date: app.start.toDate(),
                type: 'treatment',
                title: `Appointment: ${app.treatmentName}`,
                description: `With Dr. ${app.doctorName}. Status: ${app.status}`,
                icon: faStethoscope,
            });
        });

        myConsultations.forEach(con => {
            if (con.diagnosis && con.diagnosis.trim() !== '') {
                allEvents.push({
                    date: con.createdAt.toDate(),
                    type: 'diagnosis',
                    title: `Diagnosis Recorded`,
                    description: con.diagnosis,
                    icon: faNotesMedical,
                });
            }
        });

        return allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [user, myAppointments, myConsultations]);

    if (!user) return null;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Treatment Journey</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">A timeline of all your interactions with {user.hospitalName}.</p>

            <div className="mt-8">
                {events.length > 1 ? (
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 pl-8 py-4">
                        {events.map((event, index) => {
                            let iconBgColor = 'bg-slate-400';
                            if (event.type === 'registration') iconBgColor = 'bg-blue-500';
                            if (event.type === 'treatment') iconBgColor = 'bg-teal-500';
                            if (event.type === 'diagnosis') iconBgColor = 'bg-indigo-500';
                            
                            return (
                                <div key={index} className="mb-10 relative">
                                    <div className={`absolute -left-[45px] top-1 h-6 w-6 ${iconBgColor} rounded-full flex items-center justify-center ring-8 ring-slate-50 dark:ring-slate-950`}>
                                        <FontAwesomeIcon icon={event.icon} className="h-3 w-3 text-white" />
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                                        <time className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                            {event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </time>
                                        <h4 className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-200">{event.title}</h4>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{event.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg shadow-sm border">
                        <FontAwesomeIcon icon={faChartLine} className="h-12 w-12 mb-4 text-slate-300 dark:text-slate-700" />
                        <h3 className="text-lg font-semibold">Your journey is just beginning!</h3>
                        <p className="text-sm">Your appointments and consultations will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientTreatmentJourneyScreen;
