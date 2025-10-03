// hooks/management/usePatientCare.ts
import { useCallback } from 'react';
import { db, storage, createAuditLog } from '../../services/firebase';
import firebase from 'firebase/compat/app';
// FIX: Added Timestamp to imports
import { AppUser, NewPatientData, PatientDocument, PatientUpdateData, PatientNote, PatientDocumentFile, NewAppointmentData, Appointment, Consultation, ConsultationUpdateData, Timestamp } from '../../types';


const { serverTimestamp, increment } = firebase.firestore.FieldValue;
type UploadFileFunction = (file: File | Blob, path: string) => Promise<string>;

export const usePatientCare = (user: AppUser | null, uploadFile: UploadFileFunction) => {
    // Patient Management
    const addPatient = useCallback(async (data: NewPatientData) => {
        if (!user || !user.hospitalId) throw new Error("User not found");
        if (!user.currentLocation) throw new Error("No location selected. Please select a location from the header.");

        if (user.subscriptionPackage && user.subscriptionPackage.maxPatients > 0) {
            const snapshot = await db.collection("patients").where("hospitalId", "==", user.hospitalId).get();
            if (snapshot.size >= user.subscriptionPackage.maxPatients) {
                throw new Error('LIMIT_REACHED:patients');
            }
        }
        
        let profilePhotoUrl = '';
        if (data.profilePhoto) {
            let photoToUpload: Blob;
            if (typeof data.profilePhoto === 'string') {
                const response = await fetch(data.profilePhoto);
                photoToUpload = await response.blob();
            } else {
                photoToUpload = data.profilePhoto;
            }
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            profilePhotoUrl = await uploadFile(photoToUpload, `patientPhotos/${user.hospitalId}/${photoName}`);
        }

        const { profilePhoto, ...restData } = data;
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const newPatientRef = db.collection("patients").doc();

        let patientIdDisplay = '';
        try {
            await db.runTransaction(async (transaction) => {
                const hospitalDoc = await transaction.get(hospitalRef);
                if (!hospitalDoc.exists) throw "Hospital document not found!";
                const lastPatientNumber = hospitalDoc.data()!.lastPatientNumber || 0;
                patientIdDisplay = `PT-${String(lastPatientNumber + 1).padStart(2, '0')}`;
                
                transaction.set(newPatientRef, {
                    ...restData, patientId: patientIdDisplay, profilePhotoUrl, hospitalId: user.hospitalId,
                    locationId: user.currentLocation!.id,
                    registeredAt: serverTimestamp() as Timestamp, status: 'active' as const,
                });
                transaction.update(hospitalRef, { lastPatientNumber: increment(1) });
            });
            await createAuditLog(user, 'CREATE', 'PATIENT', newPatientRef.id, `Created patient: ${data.name} (${patientIdDisplay!})`);
        } catch (e) {
            throw new Error("Could not create new patient. Please try again.");
        }
        


    }, [user, uploadFile]);

    const getPatients = useCallback(async (
        limit: number,
        lastVisible: firebase.firestore.QueryDocumentSnapshot | null,
        orderByField: string = 'registeredAt', // Default order by registration date
        direction: 'asc' | 'desc' = 'desc', // Default to descending order
        searchTerm: string = '',
        statusFilter: 'all' | 'active' | 'inactive' = 'all',
        dateRangeStart: string = '',
        dateRangeEnd: string = ''
    ): Promise<{ patients: PatientDocument[], lastVisible: firebase.firestore.QueryDocumentSnapshot | null, hasMore: boolean }> => {
        if (!user) return { patients: [], lastVisible: null, hasMore: false };

        let q: firebase.firestore.Query = db.collection("patients")
            .where("hospitalId", "==", user.hospitalId);

        if (user.roleName !== 'owner' && user.roleName !== 'admin' && user.currentLocation) {
            q = q.where("locationId", "==", user.currentLocation.id);
        }

        if (statusFilter !== 'all') {
            q = q.where("status", "==", statusFilter);
        }

        // Date range filtering for 'registeredAt'
        if (dateRangeStart) {
            const start = new Date(dateRangeStart);
            start.setHours(0, 0, 0, 0);
            q = q.where("registeredAt", ">=", firebase.firestore.Timestamp.fromDate(start));
        }
        if (dateRangeEnd) {
            const end = new Date(dateRangeEnd);
            end.setHours(23, 59, 59, 999);
            q = q.where("registeredAt", "<=", firebase.firestore.Timestamp.fromDate(end));
        }

        // Basic search for name or patientId (prefix matching)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            // Firestore doesn't support OR queries directly for different fields
            // This would require multiple queries or an external search solution for robust search
            // For now, we'll do a basic prefix search on 'name'
            q = q.where("name", ">=", term)
                 .where("name", "<=", term + '\uf8ff');
            // Note: For patientId or phone, separate queries would be needed, or client-side filtering of results
            // For a simple example, we'll focus on name.
        }

        q = q.orderBy(orderByField, direction)
             .limit(limit + 1); // Fetch one more to check if there's a next page

        if (lastVisible) {
            q = q.startAfter(lastVisible);
        }
        
        const querySnapshot = await q.get();
        const patients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PatientDocument));

        const hasMore = patients.length > limit;
        const patientsToReturn = hasMore ? patients.slice(0, limit) : patients;
        const newLastVisible = hasMore ? querySnapshot.docs[limit - 1] : null;

        return { patients: patientsToReturn, lastVisible: newLastVisible, hasMore };
    }, [user]);

    const getPatientById = useCallback(async (patientId: string): Promise<PatientDocument | null> => {
        if (!user) return null;
        const patientDocRef = db.collection('patients').doc(patientId);
        try {
            const docSnap = await patientDocRef.get();
            if (docSnap.exists && docSnap.data()?.hospitalId === user.hospitalId) {
                return { id: docSnap.id, ...docSnap.data() } as PatientDocument;
            }
            return null;
        } catch (error) {
            return null;
        }
    }, [user]);

    const updatePatient = useCallback(async (patientId: string, data: PatientUpdateData) => {
        if (!user) throw new Error("User not found");
        const patientDocRef = db.collection('patients').doc(patientId);
        
        const { profilePhoto, ...restData } = data;
        const updateData: { [key: string]: any } = { ...restData };

        if (profilePhoto === null) { // Remove photo
            const docSnap = await patientDocRef.get();
            const oldPhotoUrl = docSnap.data()?.profilePhotoUrl;
            if (oldPhotoUrl) {
                try {
                    await storage.refFromURL(oldPhotoUrl).delete();
                } catch (e) {
                    // console.warn("Failed to delete old patient photo", e);
                }
            }
            updateData.profilePhotoUrl = '';
        } else if (profilePhoto) { // New photo
            const docSnap = await patientDocRef.get();
            const oldPhotoUrl = docSnap.data()?.profilePhotoUrl;
            if (oldPhotoUrl) {
                try {
                    await storage.refFromURL(oldPhotoUrl).delete();
                } catch (e) {
                    // console.warn("Failed to delete old patient photo", e);
                }
            }

            let photoToUpload: Blob;
            if (typeof profilePhoto === 'string') {
                const response = await fetch(profilePhoto);
                photoToUpload = await response.blob();
            } else {
                photoToUpload = profilePhoto;
            }
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            updateData.profilePhotoUrl = await uploadFile(photoToUpload, `patientPhotos/${user.hospitalId}/${patientId}/${photoName}`);
        }

        await patientDocRef.update(updateData);
        await createAuditLog(user, 'UPDATE', 'PATIENT', patientId, `Updated patient details for ${data.name}.`);
    }, [user, uploadFile]);

    const deletePatient = useCallback(async (patientId: string) => {
        const patientDoc = await db.collection('patients').doc(patientId).get();
        const patientData = patientDoc.data();
        await db.collection('patients').doc(patientId).delete();
        if (patientData) {
            await createAuditLog(user, 'DELETE', 'PATIENT', patientId, `Deleted patient: ${patientData.name} (${patientData.patientId}).`);
        }
    }, [user]);

    const updatePatientStatus = useCallback(async (patientId: string, status: 'active' | 'inactive') => {
        await db.collection('patients').doc(patientId).update({ status });
        const patientDoc = await db.collection('patients').doc(patientId).get();
        const patientData = patientDoc.data();
        if (patientData) {
            await createAuditLog(user, 'UPDATE', 'PATIENT', patientId, `Set status to ${status} for patient ${patientData.name}.`);
        }
    }, [user]);

    const addPatientNote = useCallback(async (patientId: string, noteText: string) => {
        if (!user) throw new Error("User not authenticated");
        const patientDocRef = db.collection('patients').doc(patientId);
        const newNote: PatientNote = {
            id: db.collection('_').doc().id, text: noteText,
            createdBy: user.name, createdAt: firebase.firestore.Timestamp.now(),
        };
        let patientName = 'Unknown Patient';
        await db.runTransaction(async (t) => {
            const doc = await t.get(patientDocRef);
            if (!doc.exists) throw new Error("Patient document does not exist.");
            patientName = doc.data()?.name || 'Unknown Patient';
            const notes = [...(doc.data()!.notes || []), newNote];
            t.update(patientDocRef, { notes });
        });
        await createAuditLog(user, 'CREATE', 'PATIENT_NOTE', patientId, `Added note to patient ${patientName}.`);
    }, [user]);

    const deletePatientNote = useCallback(async (patientId: string, noteId: string) => {
        if (!user) throw new Error("User not authenticated");
        const patientDocRef = db.collection('patients').doc(patientId);
        let patientName = 'Unknown Patient';
        await db.runTransaction(async (t) => {
            const doc = await t.get(patientDocRef);
            if (!doc.exists) throw "Patient document not found!";
            patientName = doc.data()?.name || 'Unknown Patient';
            const newNotes = (doc.data()!.notes as PatientNote[] || []).filter(n => n.id !== noteId);
            t.update(patientDocRef, { notes: newNotes });
        });
        await createAuditLog(user, 'DELETE', 'PATIENT_NOTE', patientId, `Deleted note from patient ${patientName}.`);
    }, [user]);

    const uploadPatientDocument = useCallback(async (patientId: string, file: File) => {
        if (!user) throw new Error("User not authenticated");
        const docName = `${Date.now()}-${file.name}`;
        const downloadURL = await uploadFile(file, `patientDocuments/${user.hospitalId}/${patientId}/${docName}`);
        const patientDocRef = db.collection('patients').doc(patientId);
        const newDocument: PatientDocumentFile = {
            id: db.collection('_').doc().id, name: file.name, url: downloadURL,
            uploadedBy: user.name, uploadedAt: firebase.firestore.Timestamp.now(),
        };
        try {
            let patientName = 'Unknown Patient';
            await db.runTransaction(async (t) => {
                const doc = await t.get(patientDocRef);
                if (!doc.exists) throw new Error("Patient document does not exist.");
                patientName = doc.data()!.name;
                t.update(patientDocRef, { documents: [...(doc.data()!.documents || []), newDocument] });
            });
            await createAuditLog(user, 'CREATE', 'PATIENT_DOCUMENT', patientId, `Uploaded document "${file.name}" for patient ${patientName}.`);
        } catch (error) {
            await storage.refFromURL(downloadURL).delete().catch(() => {}); // Replace console.error with empty catch
            throw error;
        }
    }, [user, uploadFile]);

    const deletePatientDocument = useCallback(async (patientId: string, documentFile: PatientDocumentFile) => {
        if (!user) throw new Error("User not authenticated");
        const patientDocRef = db.collection('patients').doc(patientId);
        await storage.refFromURL(documentFile.url).delete().catch(() => {}); // Replace console.error with empty catch
        
        let patientName = 'Unknown Patient';
        await db.runTransaction(async (t) => {
            const doc = await t.get(patientDocRef);
            if (!doc.exists) throw "Patient document not found!";
            patientName = doc.data()!.name;
            const newDocs = (doc.data()!.documents as PatientDocumentFile[] || []).filter(d => d.id !== documentFile.id);
            t.update(patientDocRef, { documents: newDocs });
        });
        await createAuditLog(user, 'DELETE', 'PATIENT_DOCUMENT', patientId, `Deleted document "${documentFile.name}" for patient ${patientName}.`);
    }, [user]);

    // Appointment Management
    const addAppointment = useCallback(async (data: NewAppointmentData) => {
        if (!user) throw new Error("User not found");
        if (user.subscriptionPackage && user.subscriptionPackage.maxReservationsPerMonth > 0) {
            const now = new Date(), startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1), endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const snapshot = await db.collection("appointments").where("hospitalId", "==", user.hospitalId).where("start", ">=", startOfMonth).where("start", "<=", endOfMonth).get();
            if (snapshot.size >= user.subscriptionPackage.maxReservationsPerMonth) throw new Error('LIMIT_REACHED:reservations');
        }
        const [patientDoc, doctorDoc] = await Promise.all([db.collection("patients").doc(data.patientId).get(), db.collection("doctors").doc(data.doctorId).get()]);
        if (!patientDoc.exists || !doctorDoc.exists) throw new Error("Patient or Doctor not found");

        const newAppointmentRef = db.collection("appointments").doc();

        const appointmentData: any = {
            ...data,
            patientName: patientDoc.data()!.name,
            doctorName: doctorDoc.data()!.name,
            start: firebase.firestore.Timestamp.fromDate(data.start),
            end: firebase.firestore.Timestamp.fromDate(data.end),
            hospitalId: user.hospitalId,
            locationId: user.currentLocation.id,
            meetingStarted: false, // Default to false
        };

        await newAppointmentRef.set(appointmentData);

        // Create a corresponding consultation document
        await db.collection("consultations").add({
            appointmentId: newAppointmentRef.id,
            patientId: data.patientId,
            doctorId: data.doctorId,
            hospitalId: user.hospitalId,
            patientName: patientDoc.data()!.name,
            doctorName: doctorDoc.data()!.name,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            investigation: '',
            diagnosis: '',
            prescribedMedicines: [],
            labTests: [],
            allergies: '',
            advice: '',
        });

        await createAuditLog(user, 'CREATE', 'APPOINTMENT', newAppointmentRef.id, `Scheduled ${data.consultationType} appointment for ${patientDoc.data()!.name} with Dr. ${doctorDoc.data()!.name}.`);
    }, [user]);

    const getAppointments = useCallback(async (startDate: Date, endDate: Date): Promise<Appointment[]> => {
        if (!user) return [];
        let q = db.collection("appointments").where("hospitalId", "==", user.hospitalId)
            .where("start", ">=", firebase.firestore.Timestamp.fromDate(startDate))
            .where("start", "<", firebase.firestore.Timestamp.fromDate(endDate));

        if (user.roleName !== 'owner' && user.roleName !== 'admin' && user.currentLocation) {
            q = q.where("locationId", "==", user.currentLocation.id);
        }

        if (user.roleName === 'doctor' && user.doctorId) q = q.where("doctorId", "==", user.doctorId);
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    }, [user]);
    
    const getAppointmentsForPatient = useCallback(async (patientId: string): Promise<Appointment[]> => {
        if (!user) return [];
        try {
            const q = db.collection("appointments").where("hospitalId", "==", user.hospitalId).where("patientId", "==", patientId);
            const snapshot = await q.get();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
            return data.sort((a, b) => b.start.seconds - a.start.seconds);
        } catch (error) { return []; }
    }, [user]);

    const updateAppointment = useCallback(async (appointmentId: string, data: Partial<NewAppointmentData>) => {
        const updateData: { [key: string]: any } = { ...data };
        if (data.start) updateData.start = firebase.firestore.Timestamp.fromDate(data.start);
        if (data.end) updateData.end = firebase.firestore.Timestamp.fromDate(data.end);
        await db.collection('appointments').doc(appointmentId).update(updateData);
        const appDoc = await db.collection('appointments').doc(appointmentId).get();
        const appData = appDoc.data();
        if(appData) {
            await createAuditLog(user, 'UPDATE', 'APPOINTMENT', appointmentId, `Updated appointment for ${appData.patientName}.`);
        }
    }, [user]);

    const deleteAppointment = useCallback(async (appointmentId: string) => {
        const appDoc = await db.collection('appointments').doc(appointmentId).get();
        const appData = appDoc.data();
        await db.collection('appointments').doc(appointmentId).delete();
        if (appData) {
            await createAuditLog(user, 'DELETE', 'APPOINTMENT', appointmentId, `Deleted appointment for ${appData.patientName}.`);
        }
    }, [user]);

    // Consultation Management
    const getConsultationForAppointment = useCallback(async (appointmentId: string): Promise<Consultation | null> => {
        if (!user) return null;
        const q = db.collection("consultations").where("appointmentId", "==", appointmentId).limit(1);
        const snapshot = await q.get();
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Consultation;
    }, [user]);

    const getConsultationsForPatient = useCallback(async (patientId: string): Promise<Consultation[]> => {
        if (!user) return [];
        try {
            const q = db.collection("consultations").where("hospitalId", "==", user.hospitalId).where("patientId", "==", patientId);
            const snapshot = await q.get();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation));
            return data.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        } catch (error) { return []; }
    }, [user]);

    const saveConsultation = useCallback(async (appointment: Appointment, data: ConsultationUpdateData) => {
        if (!user) throw new Error("User not authenticated");
        const q = db.collection("consultations").where("appointmentId", "==", appointment.id).limit(1);
        const snapshot = await q.get();
        const saveData = {
            ...data,
            nextVisitDate: data.nextVisitDate ? firebase.firestore.Timestamp.fromDate(data.nextVisitDate) : null,
            updatedAt: serverTimestamp() as Timestamp,
        };
        if (snapshot.empty) {
            // FIX: Add doctorName to the new consultation document
            const docRef = await db.collection("consultations").add({
                ...saveData, appointmentId: appointment.id, patientId: appointment.patientId,
                doctorId: appointment.doctorId, doctorName: appointment.doctorName, hospitalId: user.hospitalId, createdAt: serverTimestamp() as Timestamp,
            });
            await createAuditLog(user, 'CREATE', 'CONSULTATION', docRef.id, `Created consultation for ${appointment.patientName}.`);
        } else {
            const docRef = snapshot.docs[0].ref;
            await docRef.update(saveData);
            await createAuditLog(user, 'UPDATE', 'CONSULTATION', docRef.id, `Updated consultation for ${appointment.patientName}.`);
        }
    }, [user]);

    const getAppointmentById = useCallback(async (appointmentId: string): Promise<Appointment | null> => {
        if (!user) return null;
        try {
            const docSnap = await db.collection("appointments").doc(appointmentId).get();
            if (docSnap.exists && docSnap.data()?.hospitalId === user.hospitalId) {
                return { id: docSnap.id, ...docSnap.data() } as Appointment;
            }
            return null;
        } catch (error) {
            return null;
        }
    }, [user]);

    const updateAppointmentMeetingStatus = useCallback(async (appointmentId: string, meetingStarted: boolean) => {
        if (!user) throw new Error("User not authenticated.");
        await db.collection('appointments').doc(appointmentId).update({ meetingStarted });
        await createAuditLog(user, 'UPDATE', 'APPOINTMENT', appointmentId, `Meeting status updated to ${meetingStarted} for appointment ${appointmentId}.`);
    }, [user]);

    return {
        addPatient, getPatients, getPatientById, updatePatient, deletePatient, updatePatientStatus,
        addPatientNote, deletePatientNote, uploadPatientDocument, deletePatientDocument,
        addAppointment, getAppointments, getAppointmentsForPatient, updateAppointment, deleteAppointment, getAppointmentById, updateAppointmentMeetingStatus,
        getConsultationForAppointment, getConsultationsForPatient, saveConsultation,
    };
};