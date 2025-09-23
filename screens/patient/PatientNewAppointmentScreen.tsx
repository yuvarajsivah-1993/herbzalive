import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
    DoctorDocument,
    Treatment,
    NewAppointmentData,
    DayOfWeek,
} from '../../types';
import Button from '../../components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faChevronLeft, faChevronRight, faCalendar, faClock,
    faUserMd, faStethoscope, faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';

const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PatientNewAppointmentScreen: React.FC = () => {
    const {
        user, doctors, treatments, getAppointments, addAppointment, taxGroups,
    } = useAuth();
    const { addToast } = useToast();

    const [step, setStep] = useState(1);
    const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);

    const currencySymbol = useMemo(() => {
        const symbols: { [key: string]: string } = {
            USD: '$', EUR: '€', GBP: '£', INR: '₹',
        };
        const code = user?.hospitalCurrency || 'INR';
        return symbols[code] || code;
    }, [user?.hospitalCurrency]);

    const formatLocalCurrency = (amount: number) => {
        if (isNaN(amount)) amount = 0;
        return `${currencySymbol}${amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const taxGroupMap = useMemo(() => {
        return new Map(taxGroups.map(group => [group.id, group]));
    }, [taxGroups]);

    const calculateTotalCost = useCallback((treatment: Treatment) => {
        if (!treatment.taxGroupId) {
            return treatment.cost;
        }
        const taxGroup = taxGroupMap.get(treatment.taxGroupId);
        if (!taxGroup) {
            return treatment.cost;
        }
        const totalTaxRate = taxGroup.totalRate;
        const taxAmount = treatment.cost * (totalTaxRate / 100);
        return treatment.cost + taxAmount;
    }, [taxGroupMap]);


    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
    }, []);

    const twoMonthsFromNow = useMemo(() => {
        const today = new Date();
        const limit = new Date(
            today.getFullYear(),
            today.getMonth() + 2,
            today.getDate()
        );
        limit.setHours(23, 59, 59, 999);
        return limit;
    }, []);

    const activeDoctors = useMemo(() =>
        doctors.filter(d => d.status === 'active'),
        [doctors]
    );
    const activeTreatments = useMemo(() =>
        treatments.filter(t =>
            activeDoctors.some(d => d.assignedTreatments.includes(t.id!))
        ), [treatments, activeDoctors]
    );
    const eligibleDoctors = useMemo(() => {
        if (!selectedTreatmentId) return [];
        return activeDoctors.filter(d =>
            d.assignedTreatments.includes(selectedTreatmentId)
        );
    }, [selectedTreatmentId, activeDoctors]);

    const selectedTreatment = useMemo(() =>
        treatments.find(t => t.id === selectedTreatmentId),
        [treatments, selectedTreatmentId]
    );
    const selectedDoctor = useMemo(() =>
        doctors.find(d => d.id === selectedDoctorId),
        [doctors, selectedDoctorId]
    );

    const weekDates = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        const dayOffset = today.getDate() - today.getDay() + (weekOffset * 7);
        startOfWeek.setDate(dayOffset);

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, [weekOffset]);

    const disableNextButton = useMemo(() => {
        const startOfNextWeek = new Date(weekDates[0]);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
        return startOfNextWeek > twoMonthsFromNow;
    }, [weekDates, twoMonthsFromNow]);

    const timeSlots = useMemo(() => {
        const morning: string[] = [];
        const afternoon: string[] = [];
        availableSlots.forEach(slot => {
            const [time, ampm] = slot.split(' ');
            const hour = parseInt(time.split(':')[0], 10);
            if (ampm === 'PM' && hour !== 12) {
                afternoon.push(slot);
            } else {
                morning.push(slot);
            }
        });
        return { morning, afternoon };
    }, [availableSlots]);


    useEffect(() => {
        const calculateSlots = async () => {
            if (!selectedDoctorId || !selectedTreatment || !selectedDate) {
                setAvailableSlots([]);
                return;
            }
            setLoadingSlots(true);
            setSelectedTime(null);

            const possibleSlots: Date[] = [];
            try {
                const doctor = activeDoctors.find(d => d.id === selectedDoctorId);
                if (!doctor) throw new Error("Doctor not found");

                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth();
                const day = selectedDate.getDate();
                const dayStart = new Date(year, month, day, 0, 0, 0, 0);
                const dayEnd = new Date(year, month, day, 23, 59, 59, 999);
                const dayOfWeek = DAY_NAMES[selectedDate.getDay()];
                const workingHour = doctor.workingHours[dayOfWeek];

                if (!workingHour) {
                    setAvailableSlots([]);
                    setLoadingSlots(false);
                    return;
                }

                const allAppointmentsForDay = await getAppointments(dayStart, dayEnd);
                const doctorAppointments = allAppointmentsForDay.filter(
                    app => app.doctorId === selectedDoctorId &&
                           app.status !== 'Cancelled'
                );

                const [startH, startM] = workingHour.start.split(':').map(Number);
                const [endH, endM] = workingHour.end.split(':').map(Number);

                let currentSlot = new Date(year, month, day, startH, startM);
                const endTime = new Date(year, month, day, endH, endM);

                const treatmentDurationMs = selectedTreatment.duration * 60000;

                while (
                    currentSlot.valueOf() + treatmentDurationMs <= endTime.valueOf()
                ) {
                    const slotEnd = new Date(
                        currentSlot.getTime() + treatmentDurationMs
                    );
                    const isBooked = doctorAppointments.some(
                        app => app.start.toDate() < slotEnd &&
                               app.end.toDate() > currentSlot
                    );

                    if (!isBooked) {
                        possibleSlots.push(new Date(currentSlot));
                    }
                    currentSlot.setMinutes(
                        currentSlot.getMinutes() + doctor.slotInterval
                    );
                }

                setAvailableSlots(possibleSlots.map(slot =>
                    slot.toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', hour12: true,
                    })
                ));

            } catch (error) {
                console.error("Error calculating slots:", error);
                addToast("Could not fetch available time slots.", "error");
            } finally {
                setLoadingSlots(false);
            }
        };
        calculateSlots();
    }, [
        selectedDoctorId, selectedDate, activeDoctors, getAppointments,
        selectedTreatment, addToast,
    ]);

    const handleSelectTreatment = (id: string) => {
        setSelectedTreatmentId(id);
        setStep(2);
    };

    const handleSelectDoctor = (id: string) => {
        setSelectedDoctorId(id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
        setWeekOffset(0);
        setStep(3);
    };

    const handleBackToService = () => {
        setSelectedTreatmentId(null);
        setSelectedDoctorId(null);
        setSelectedTime(null);
        setStep(1);
    };

    const handleBackToDoctor = () => {
        setSelectedDoctorId(null);
        setSelectedTime(null);
        setStep(2);
    };


    const handleSubmit = async () => {
        if (!user?.patientId || !selectedTreatmentId || !selectedDoctorId ||
            !selectedDate || !selectedTime) {
            addToast("Please complete all steps to book.", "warning");
            return;
        }

        setLoading(true);
        try {
            // REAL-TIME CHECK
            const dayStart = new Date(selectedDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(selectedDate);
            dayEnd.setHours(23, 59, 59, 999);

            const allAppointmentsForDay = await getAppointments(dayStart, dayEnd);
            const doctorAppointments = allAppointmentsForDay.filter(
                app => app.doctorId === selectedDoctorId && app.status !== 'Cancelled'
            );

            const [timePart, ampm] = selectedTime.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            const start = new Date(selectedDate);
            start.setHours(hours, minutes, 0, 0);
            const end = new Date(
                start.getTime() + selectedTreatment!.duration * 60000
            );

            const isSlotTaken = doctorAppointments.some(app => {
                const appStart = app.start.toDate();
                const appEnd = app.end.toDate();
                return (appStart < end) && (appEnd > start);
            });

            if (isSlotTaken) {
                addToast(
                    "This time slot has just been booked. Please select another one.",
                    "warning"
                );
                // Trigger a re-calculation of slots
                setSelectedDate(new Date(selectedDate));
                return;
            }

            await addAppointment({
                patientId: user.patientId,
                doctorId: selectedDoctorId,
                start,
                end,
                treatmentName: selectedTreatment!.name,
                status: 'Registered',
            });
            addToast("Appointment booked successfully!", "success");
            setStep(1);
            setSelectedTreatmentId(null);
            setSelectedDoctorId(null);
            setSelectedTime(null);
        } catch (error: any) {
            addToast(error.message || "Failed to book appointment.", "error");
        } finally {
            setLoading(false);
        }
    };

    const StepIndicator: React.FC<{currentStep: number}> = ({ currentStep }) => {
        return (
            <div className="flex items-center justify-center space-x-4 mb-8">
                {[1, 2, 3].map(stepNum => {
                    const stepTextColor = currentStep >= stepNum
                        ? 'text-blue-600' : 'text-slate-400';
                    const stepIndicatorClasses = currentStep >= stepNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700';
                    const stepLineClasses = currentStep > stepNum
                        ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700';

                    return (
                        <React.Fragment key={stepNum}>
                            <div className={`flex items-center gap-2 ${stepTextColor}`}>
                                <div className={
                                    `h-8 w-8 rounded-full flex items-center justify-center font-bold border-2 ${stepIndicatorClasses}`
                                }>
                                    {stepNum}
                                </div>
                            </div>
                            {stepNum < 3 && <div className={`h-1 flex-1 ${stepLineClasses}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                Book a New Appointment
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                Follow the steps below to schedule your visit.
            </p>

            <StepIndicator currentStep={step} />

            {(step > 1 && selectedTreatment) && (
                <Card className="mb-6">
                    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                <FontAwesomeIcon
                                    icon={faStethoscope}
                                    className="text-slate-500"
                                />
                                <span className="font-semibold">Service:</span>
                                <span>{selectedTreatment.name}</span>
                                <Button
                                    size="sm"
                                    variant="light"
                                    onClick={handleBackToService}
                                >
                                    Change
                                </Button>
                            </div>
                           {step > 2 && selectedDoctor && (
                                <div className="flex items-center gap-3">
                                    <FontAwesomeIcon
                                        icon={faUserMd}
                                        className="text-slate-500"
                                    />
                                    <span className="font-semibold">Doctor:</span>
                                    <span>Dr. {selectedDoctor.name}</span>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        onClick={handleBackToDoctor}
                                    >
                                        Change
                                    </Button>
                                </div>
                           )}
                        </div>
                    </div>
                </Card>
            )}

            <div className="space-y-8">
                {step === 1 && (
                    <Card>
                        <div className="p-6">
                            <h2 className="text-xl font-bold">1. Select a Service</h2>
                            <div className="mt-4 space-y-3">
                                {activeTreatments.map(treatment => (
                                    <div
                                        key={treatment.id}
                                        onClick={() => handleSelectTreatment(treatment.id!)}
                                        className="flex items-start p-4 rounded-lg border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer transition-all"
                                    >
                                        <div className="w-16 h-16 rounded-md bg-slate-100 dark:bg-slate-800 flex-shrink-0 mr-4">
                                            {treatment.photoUrl && <img src={treatment.photoUrl} alt={treatment.name} className="w-full h-full object-cover rounded-md" />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                                {treatment.name}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {treatment.description}
                                            </p>
                                        </div>
                                        <div className="text-right ml-4 flex-shrink-0">
                                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                                {formatLocalCurrency(calculateTotalCost(treatment))}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {treatment.duration} min
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}

                {step === 2 && (
                    <Card>
                         <div className="p-6">
                            <h2 className="text-xl font-bold">2. Select a Doctor</h2>
                            <div className="mt-4 space-y-3">
                                {eligibleDoctors.map(doctor => (
                                    <div
                                        key={doctor.id}
                                        onClick={() => handleSelectDoctor(doctor.id!)}
                                        className="flex items-center p-4 rounded-lg border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer transition-all"
                                    >
                                        <Avatar avatar={doctor.profilePhotoUrl ? { type: 'image', value: doctor.profilePhotoUrl } : { type: 'initials', value: doctor.name.split(' ').map(n=>n[0]).join(''), color: 'bg-teal-500'}} />
                                        <div className="ml-4">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                                Dr. {doctor.name}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {doctor.specialty}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}

                {step === 3 && (
                     <Card>
                        <div className="p-6">
                             <h2 className="text-xl font-bold">3. Select a Date & Time</h2>
                             <div className="mt-4">
                                <div className="flex justify-between items-center">
                                    <Button variant="light" size="sm" onClick={() => setWeekOffset(w => w - 1)} disabled={weekOffset <= 0}><FontAwesomeIcon icon={faChevronLeft}/></Button>
                                    <p className="font-semibold">{weekDates[0].toLocaleString('default', { month: 'long' })} {weekDates[0].getFullYear()}</p>
                                    <Button variant="light" size="sm" onClick={() => setWeekOffset(w => w + 1)} disabled={disableNextButton}><FontAwesomeIcon icon={faChevronRight}/></Button>
                                </div>
                                <div className="grid grid-cols-7 gap-2 mt-4 text-center">
                                    {weekDates.map((date, i) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const isPast = date < today;
                                        const isTooFar = date > twoMonthsFromNow;
                                        const isDisabled = isPast || isTooFar;

                                        const dateClasses = isDisabled
                                            ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                                            : isSameDay(date, selectedDate)
                                                ? 'bg-blue-600 text-white'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => !isDisabled && setSelectedDate(date)}
                                                className={`p-2 rounded-lg ${dateClasses}`}
                                            >
                                                <p className="text-xs">{DAY_NAMES[date.getDay()].slice(0, 3)}</p>
                                                <p className="font-bold text-lg">{date.getDate()}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                             </div>

                             <div className="mt-6">
                                {loadingSlots ? <div className="text-center p-8"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div> : (
                                    availableSlots.length > 0 ? (
                                        <div className="space-y-4">
                                            {timeSlots.morning.length > 0 && <div>
                                                <h3 className="font-semibold text-sm mb-2 text-slate-500">Morning</h3>
                                                <div className="flex flex-wrap gap-2">{timeSlots.morning.map(slot => <Button key={slot} variant={selectedTime === slot ? 'primary' : 'light'} onClick={() => setSelectedTime(slot)}>{slot}</Button>)}</div>
                                            </div>}
                                            {timeSlots.afternoon.length > 0 && <div>
                                                <h3 className="font-semibold text-sm mb-2 text-slate-500">Afternoon</h3>
                                                <div className="flex flex-wrap gap-2">{timeSlots.afternoon.map(slot => <Button key={slot} variant={selectedTime === slot ? 'primary' : 'light'} onClick={() => setSelectedTime(slot)}>{slot}</Button>)}</div>
                                            </div>}
                                        </div>
                                    ) : <p className="text-center text-slate-500 p-8">No available slots for this date. Please select another day.</p>
                                )}
                             </div>
                        </div>
                        {selectedTime && (
                            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-lg">Your Appointment</p>
                                    <p>{selectedTreatment?.name} on {selectedDate.toLocaleDateString()} at {selectedTime}</p>
                                </div>
                                <Button onClick={handleSubmit} disabled={loading}>
                                    {loading ? 'Booking...' : 'Confirm & Book'}
                                </Button>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

const isSameDay = (d1: Date, d2: Date) => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export default PatientNewAppointmentScreen;
