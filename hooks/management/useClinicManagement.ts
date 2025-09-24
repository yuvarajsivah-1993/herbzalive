// FIX: Add 'React' import to resolve namespace errors.
import React, { useCallback } from 'react';
import { db, storage, createAuditLog } from '../../services/firebase';
import { AppUser, Treatment, NewTreatmentData, TreatmentUpdateData, Medicine, NewMedicineData, DoctorDocument, NewDoctorData, DoctorUpdateData } from '../../types';

type UploadFileFunction = (file: File | Blob, path: string) => Promise<string>;

export const useClinicManagement = (user: AppUser | null, uploadFile: UploadFileFunction) => {
    // Treatment Management
    const addTreatment = useCallback(async (data: NewTreatmentData) => {
        if (!user) throw new Error("User not found");

        if (user.subscriptionPackage && user.subscriptionPackage.maxTreatments > 0) {
            const treatmentsSnapshot = await db.collection("treatments").where("hospitalId", "==", user.hospitalId).get();
            if (treatmentsSnapshot.size >= user.subscriptionPackage.maxTreatments) {
                throw new Error('LIMIT_REACHED:treatments');
            }
        }

        let photoUrl = '';
        if (data.photo) {
            let photoToUpload: Blob;
            if (typeof data.photo === 'string') {
                const response = await fetch(data.photo);
                photoToUpload = await response.blob();
            } else {
                photoToUpload = data.photo;
            }
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            photoUrl = await uploadFile(photoToUpload, `treatmentPhotos/${user.hospitalId}/${photoName}`);
        }

        const { photo, ...restData } = data;

        const docRef = await db.collection("treatments").add({
          ...restData,
          photoUrl,
          hospitalId: user.hospitalId,
        });
        await createAuditLog(user, 'CREATE', 'TREATMENT', docRef.id, `Created treatment: ${data.name}`);
    }, [user, uploadFile]);

    const getTreatments = useCallback(async (): Promise<Treatment[]> => {
        if (!user) return [];
        const treatmentsRef = db.collection("treatments");
        const q = treatmentsRef.where("hospitalId", "==", user.hospitalId);
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Treatment));
    }, [user]);

    const getTreatmentById = useCallback(async (treatmentId: string): Promise<Treatment | null> => {
        const treatmentDocRef = db.collection('treatments').doc(treatmentId);
        const docSnap = await treatmentDocRef.get();
        if (docSnap.exists) {
          return { id: docSnap.id, ...docSnap.data() } as Treatment;
        }
        return null;
    }, []);

    const updateTreatment = useCallback(async (treatmentId: string, data: TreatmentUpdateData) => {
        if (!user) throw new Error("User not found");
        const treatmentDocRef = db.collection('treatments').doc(treatmentId);

        const { photo, ...restData } = data;
        const updateData: { [key: string]: any } = { ...restData };

        if (photo === null) {
            const docSnap = await treatmentDocRef.get();
            const oldPhotoUrl = docSnap.data()?.photoUrl;
            if (oldPhotoUrl) {
                const oldPhotoRef = storage.refFromURL(oldPhotoUrl);
                await oldPhotoRef.delete().catch(e => console.error("Failed to delete old treatment photo", e));
            }
            updateData.photoUrl = '';
        } else if (photo) {
            const docSnap = await treatmentDocRef.get();
            const oldPhotoUrl = docSnap.data()?.photoUrl;
            if (oldPhotoUrl) {
                const oldPhotoRef = storage.refFromURL(oldPhotoUrl);
                await oldPhotoRef.delete().catch(e => console.error("Failed to delete old treatment photo", e));
            }
            
            let photoToUpload: Blob;
            if (typeof photo === 'string') {
                const response = await fetch(photo);
                photoToUpload = await response.blob();
            } else {
                photoToUpload = photo;
            }
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            updateData.photoUrl = await uploadFile(photoToUpload, `treatmentPhotos/${user.hospitalId}/${treatmentId}/${photoName}`);
        }
        
        await treatmentDocRef.update(updateData);
        await createAuditLog(user, 'UPDATE', 'TREATMENT', treatmentId, `Updated treatment: ${data.name}`);
    }, [user, uploadFile]);

    const deleteTreatment = useCallback(async (treatmentId: string) => {
        const treatmentDoc = await db.collection('treatments').doc(treatmentId).get();
        const treatmentName = treatmentDoc.data()?.name || `ID ${treatmentId}`;
        const treatmentDocRef = db.collection('treatments').doc(treatmentId);
        await treatmentDocRef.delete();
        await createAuditLog(user, 'DELETE', 'TREATMENT', treatmentId, `Deleted treatment: ${treatmentName}`);
    }, [user]);

    // Medicine Management
    const getMedicines = useCallback(async (): Promise<Medicine[]> => {
        if (!user) return [];
        const medicinesRef = db.collection("medicines");
        const q = medicinesRef.where("hospitalId", "==", user.hospitalId);
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
    }, [user]);

    const addMedicine = useCallback(async (data: NewMedicineData) => {
        if (!user) throw new Error("User not found");
        const docRef = await db.collection("medicines").add({ ...data, hospitalId: user.hospitalId });
        await createAuditLog(user, 'CREATE', 'MEDICINE', docRef.id, `Created medicine: ${data.name}`);
    }, [user]);

    const updateMedicine = useCallback(async (medicineId: string, data: NewMedicineData) => {
        await db.collection('medicines').doc(medicineId).update(data);
        await createAuditLog(user, 'UPDATE', 'MEDICINE', medicineId, `Updated medicine: ${data.name}`);
    }, [user]);

    const deleteMedicine = useCallback(async (medicineId: string) => {
        const medDoc = await db.collection('medicines').doc(medicineId).get();
        const medName = medDoc.data()?.name || `ID ${medicineId}`;
        await db.collection('medicines').doc(medicineId).delete();
        await createAuditLog(user, 'DELETE', 'MEDICINE', medicineId, `Deleted medicine: ${medName}`);
    }, [user]);

    // Doctor Management
    const addDoctor = useCallback(async (data: NewDoctorData) => {
        if (!user || !user.hospitalId) throw new Error("User not found");
        
        if (user.subscriptionPackage && user.subscriptionPackage.maxDoctors > 0) {
            const doctorsSnapshot = await db.collection("doctors").where("hospitalId", "==", user.hospitalId).where("status", "==", "active").get();
            if (doctorsSnapshot.size >= user.subscriptionPackage.maxDoctors) {
                throw new Error('LIMIT_REACHED:doctors');
            }
        }

        const usersRef = db.collection("users");
        const q = usersRef.where("email", "==", data.email);
        const querySnapshot = await q.get();
        if (!querySnapshot.empty) {
            throw new Error("A user with this email address already exists or has been invited.");
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
            profilePhotoUrl = await uploadFile(photoToUpload, `doctorPhotos/${user.hospitalId}/${photoName}`);
        }

        const { profilePhoto, address, ...doctorSpecificData } = data;

        const doctorRef = await db.collection("doctors").add({
          ...doctorSpecificData,
          profilePhotoUrl,
          hospitalId: user.hospitalId,
          status: 'active' as const,
        });

        await usersRef.add({
          name: data.name, email: data.email, phone: data.phone, address: data.address,
          profilePhotoUrl: profilePhotoUrl, roleName: 'doctor', hospitalId: user.hospitalId,
          hospitalSlug: user.hospitalSlug, status: 'invited', doctorId: doctorRef.id,
        });
        await createAuditLog(user, 'CREATE', 'DOCTOR', doctorRef.id, `Created doctor profile and invited user for: ${data.name}`);
    }, [user, uploadFile]);

    const getDoctors = useCallback(async (): Promise<DoctorDocument[]> => {
        if (!user) return [];
        const doctorsRef = db.collection("doctors");
        const q = doctorsRef.where("hospitalId", "==", user.hospitalId);
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DoctorDocument));
    }, [user]);

    const getDoctorById = useCallback(async (doctorId: string): Promise<DoctorDocument | null> => {
        const doctorDocRef = db.collection('doctors').doc(doctorId);
        const docSnap = await doctorDocRef.get();
        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() } as DoctorDocument;
        }
        return null;
    }, []);

    const updateDoctor = useCallback(async (doctorId: string, data: DoctorUpdateData) => {
        if (!user) throw new Error("User not found");
        const doctorDocRef = db.collection('doctors').doc(doctorId);

        const { profilePhoto, ...restData } = data;
        const updateData: { [key: string]: any } = { ...restData };

        if (profilePhoto === null) { // Handle photo removal
            const docSnap = await doctorDocRef.get();
            const oldPhotoUrl = docSnap.data()?.profilePhotoUrl;
            if (oldPhotoUrl) {
                try { await storage.refFromURL(oldPhotoUrl).delete(); } catch (e) { console.warn("Failed to delete old doctor photo", e); }
            }
            updateData.profilePhotoUrl = '';
        } else if (profilePhoto) { // Handle new photo upload
            const docSnap = await doctorDocRef.get();
            const oldPhotoUrl = docSnap.data()?.profilePhotoUrl;
            if (oldPhotoUrl) {
                try { await storage.refFromURL(oldPhotoUrl).delete(); } catch (e) { console.warn("Failed to delete old doctor photo", e); }
            }
            
            let photoToUpload: Blob;
            if (typeof profilePhoto === 'string') {
                photoToUpload = await (await fetch(profilePhoto)).blob();
            } else {
                photoToUpload = profilePhoto;
            }
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            updateData.profilePhotoUrl = await uploadFile(photoToUpload, `doctorPhotos/${user.hospitalId}/${doctorId}/${photoName}`);
        }
        
        await doctorDocRef.update(updateData);
        await createAuditLog(user, 'UPDATE', 'DOCTOR', doctorId, `Updated doctor details for ${data.name}`);

        // Also update the associated user document
        const usersRef = db.collection('users');
        const userQuery = await usersRef.where('doctorId', '==', doctorId).limit(1).get();
        if (!userQuery.empty) {
            const userDocRef = userQuery.docs[0].ref;
            const userUpdatePayload: { [key: string]: any } = {};
            if (updateData.profilePhotoUrl !== undefined) {
                userUpdatePayload.profilePhotoUrl = updateData.profilePhotoUrl;
            }
            if (updateData.assignedLocations !== undefined) {
                userUpdatePayload.assignedLocations = updateData.assignedLocations;
            }
            if (Object.keys(userUpdatePayload).length > 0) {
                await userDocRef.update(userUpdatePayload);
            }
        }
        // Dispatch event to notify other components of the change
        document.dispatchEvent(new CustomEvent('data-updated', { detail: 'doctors' }));
    }, [user, uploadFile]);

    const updateDoctorStatus = useCallback(async (doctorId: string, status: 'active' | 'inactive') => {
        await db.collection('doctors').doc(doctorId).update({ status });
        const doc = await db.collection('doctors').doc(doctorId).get();
        const docData = doc.data();
        if(docData) {
             await createAuditLog(user, 'UPDATE', 'DOCTOR', doctorId, `Set status to ${status} for doctor ${docData.name}.`);
        }
        document.dispatchEvent(new CustomEvent('data-updated', { detail: 'doctors' }));
    }, [user]);

    const deleteDoctor = useCallback(async (doctorId: string) => {
        const doc = await db.collection('doctors').doc(doctorId).get();
        const docData = doc.data();
        await db.collection('doctors').doc(doctorId).delete();
        if(docData) {
             await createAuditLog(user, 'DELETE', 'DOCTOR', doctorId, `Deleted doctor: ${docData.name}.`);
        }
        document.dispatchEvent(new CustomEvent('data-updated', { detail: 'doctors' }));
    }, [user]);

    return {
        getTreatments, getTreatmentById, addTreatment, updateTreatment, deleteTreatment,
        getMedicines, addMedicine, updateMedicine, deleteMedicine,
        addDoctor, getDoctors, getDoctorById, updateDoctor, updateDoctorStatus, deleteDoctor,
    };
};