import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faStethoscope, faNotesMedical, faPrescriptionBottleAlt, faFlask, faCommentMedical, faCalendarAlt, faPrint } from '@fortawesome/free-solid-svg-icons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const DetailCard: React.FC<{ title: string; icon: any; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center">
            <FontAwesomeIcon icon={icon} className="h-5 w-5 text-blue-500 mr-3" />
            <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="p-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {children}
        </div>
    </Card>
);

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    value ? <div className="whitespace-pre-wrap"><strong className="font-semibold text-slate-800 dark:text-slate-200">{label}:</strong> {value}</div> : null
);

const PatientConsultationDetailScreen: React.FC = () => {
    const { consultationId } = useParams<{ consultationId: string }>();
    const { myConsultations, doctors } = useAuth();
    const navigate = useNavigate();

    const consultation = useMemo(() => {
        if (!consultationId) return null;
        const consult = myConsultations.find(c => c.id === consultationId);
        if (!consult) return null;
        
        const doctorMap = new Map(doctors.map(d => [d.id!, d.name]));
        return {
            ...consult,
            doctorName: consult.doctorName || doctorMap.get(consult.doctorId) || 'Unknown Doctor'
        };
    }, [consultationId, myConsultations, doctors]);

    if (!consultation) {
        return <div className="p-8 text-center">Consultation not found.</div>;
    }

    return (
        <>
        <style>{`
            @media print {
                body * {
                    visibility: hidden;
                }
                .printable-area, .printable-area * {
                    visibility: visible;
                }
                .printable-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 2rem;
                    color: #000 !important;
                }
                .no-print {
                    display: none !important;
                }
                .printable-area .dark\\:text-slate-100,
                .printable-area .dark\\:text-slate-200,
                .printable-area .dark\\:text-slate-300,
                .printable-area .dark\\:text-slate-400 {
                    color: #000 !important;
                }
                .printable-area .dark\\:bg-slate-900,
                .printable-area .dark\\:bg-slate-800 {
                    background-color: #fff !important;
                }
                 .printable-area .border-slate-200,
                 .printable-area .dark\\:border-slate-800 {
                    border-color: #e2e8f0 !important;
                 }
            }
        `}</style>
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6 no-print">
                <Button variant="light" onClick={() => navigate(-1)}>
                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back to Consultations
                </Button>
                <Button variant="light" onClick={() => window.print()}>
                    <FontAwesomeIcon icon={faPrint} className="mr-2" /> Print / Save PDF
                </Button>
            </div>
            <div className="printable-area">
                <Card className="mb-6">
                    <div className="p-6 text-center">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Consultation Details</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            with <strong>Dr. {consultation.doctorName}</strong> on <strong>{consultation.createdAt.toDate().toLocaleDateString()}</strong>
                        </p>
                    </div>
                </Card>

                <div className="space-y-6">
                    <DetailCard title="Clinical Findings" icon={faStethoscope}>
                        <DetailItem label="Investigation" value={consultation.investigation} />
                        <DetailItem label="Diagnosis" value={consultation.diagnosis} />
                        <DetailItem label="Allergies Noted" value={consultation.allergies} />
                    </DetailCard>

                    <DetailCard title="Prescribed Medicines" icon={faPrescriptionBottleAlt}>
                        {consultation.prescribedMedicines.length > 0 ? (
                            <div className="overflow-x-auto -mx-4">
                                <table className="min-w-full text-sm">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="p-2 text-left">Medicine</th>
                                            <th className="p-2 text-left">Dosage</th>
                                            <th className="p-2 text-left">Frequency</th>
                                            <th className="p-2 text-left">Duration</th>
                                            <th className="p-2 text-left">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {consultation.prescribedMedicines.map((med, index) => (
                                            <tr key={index}>
                                                <td className="p-2 font-semibold text-slate-800 dark:text-slate-200">{med.name}</td>
                                                <td className="p-2 text-slate-800 dark:text-slate-200">{med.dosage}</td>
                                                <td className="p-2 text-slate-800 dark:text-slate-200">{med.frequency}</td>
                                                <td className="p-2 text-slate-800 dark:text-slate-200">{med.duration}</td>
                                                <td className="p-2 text-slate-800 dark:text-slate-200">{med.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p>No medicines were prescribed.</p>}
                    </DetailCard>

                    <DetailCard title="Plan & Advice" icon={faCommentMedical}>
                        {consultation.labTests.length > 0 && (
                            <div>
                                <strong className="font-semibold text-slate-800 dark:text-slate-200">Recommended Lab Tests:</strong>
                                <ul className="list-disc list-inside mt-1">
                                    {consultation.labTests.map((test, index) => <li key={index}>{test}</li>)}
                                </ul>
                            </div>
                        )}
                        <DetailItem label="Advice" value={consultation.advice} />
                        {consultation.nextVisitDate && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500" />
                                <strong className="font-semibold">Next Visit Recommended:</strong>
                                <span>{consultation.nextVisitDate.toDate().toLocaleDateString()}</span>
                            </div>
                        )}
                    </DetailCard>
                </div>
            </div>
        </div>
        </>
    );
};

export default PatientConsultationDetailScreen;
