// FIX: Add 'React' import to resolve namespace errors.
import React, { useCallback } from 'react';
import { db, auth, storage } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { AppUser, UserDocument, NewStaffData, UserUpdateData } from '../../types';

type UploadFileFunction = (file: File | Blob, path: string) => Promise<string>;

export const useUserManagement = (user: AppUser | null, uploadFile: UploadFileFunction, setUser: React.Dispatch<React.SetStateAction<AppUser | null>>) => {

    const addUser = useCallback(async (data: NewStaffData) => {
        if (!user) throw new Error("Admin user not found");
        const usersRef = db.collection("users");

        if (user.subscriptionPackage && user.subscriptionPackage.maxUsers > 0) {
            const snapshot = await usersRef
                .where("hospitalId", "==", user.hospitalId)
                .where("roleName", "in", ["admin", "staff"])
                .where("status", "in", ["active", "invited"])
                .get();
            if (snapshot.size >= user.subscriptionPackage.maxUsers) {
                throw new Error('LIMIT_REACHED:users');
            }
        }

        const q = usersRef.where("email", "==", data.email);
        const querySnapshot = await q.get();
        if (!querySnapshot.empty) {
            throw new Error("A user with this email address already exists or has been invited.");
        }
        
        await usersRef.add({
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            profilePhotoUrl: '',
            roleName: 'staff',
            hospitalId: user.hospitalId,
            hospitalSlug: user.hospitalSlug,
            status: 'invited',
        });
    }, [user]);

    const getUsersForHospital = useCallback(async (): Promise<UserDocument[]> => {
        if (!user) return [];
        const usersRef = db.collection("users");
        const q = usersRef.where("hospitalId", "==", user.hospitalId);
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
    }, [user]);

    const getUserById = useCallback(async (userId: string): Promise<UserDocument | null> => {
        const userDocRef = db.collection('users').doc(userId);
        const docSnap = await userDocRef.get();
        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() } as UserDocument;
        }
        return null;
    }, []);

    const updateUser = useCallback(async (userId: string, data: UserUpdateData) => {
        // Find the correct document reference first.
        let userDocRef: firebase.firestore.DocumentReference;
        const directRef = db.collection('users').doc(userId);
        const directSnap = await directRef.get();

        if (directSnap.exists) {
            userDocRef = directRef;
        } else {
            const query = db.collection('users').where('uid', '==', userId).limit(1);
            const querySnap = await query.get();
            if (!querySnap.empty) {
                userDocRef = querySnap.docs[0].ref;
            } else {
                throw new Error(`User document not found for id or uid: ${userId}`);
            }
        }

        const { profilePhoto, ...restData } = data;
        const updateData: { [key: string]: any } = { ...restData };

        if (profilePhoto === null) { // Remove photo
            const docSnap = await userDocRef.get();
            const oldPhotoUrl = docSnap.data()?.profilePhotoUrl;
            if (oldPhotoUrl) {
                try {
                    await storage.refFromURL(oldPhotoUrl).delete();
                } catch (e) {
                    console.warn("Failed to delete old profile photo, it might not exist.", e);
                }
            }
            updateData.profilePhotoUrl = '';
        } else if (profilePhoto) { // New photo
            const docSnap = await userDocRef.get();
            const oldPhotoUrl = docSnap.data()?.profilePhotoUrl;
            if (oldPhotoUrl) {
                try {
                    await storage.refFromURL(oldPhotoUrl).delete();
                } catch (e) {
                    console.warn("Failed to delete old profile photo, it might not exist.", e);
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
            updateData.profilePhotoUrl = await uploadFile(photoToUpload, `profilePhotos/${userDocRef.id}/${photoName}`);
        }

        await userDocRef.update(updateData);

        // If the updated user is a doctor, also update their doctor document.
        const docSnap = await userDocRef.get();
        const docData = docSnap.data() as UserDocument;

        if (docData.roleName === 'doctor' && docData.doctorId) {
            if (updateData.profilePhotoUrl !== undefined) {
                const doctorDocRef = db.collection('doctors').doc(docData.doctorId);
                await doctorDocRef.update({ profilePhotoUrl: updateData.profilePhotoUrl });
            }
            // Dispatch event to notify other components of the change
            document.dispatchEvent(new CustomEvent('data-updated', { detail: 'doctors' }));
        }

        if (user && (user.uid === userId || user.id === userId)) {
            setUser(prevUser => {
                if (!prevUser) return null;
                return { ...prevUser, ...updateData };
            });
        }
    }, [uploadFile, user, setUser]);

    const updateUserStatus = useCallback(async (userId: string, status: 'active' | 'inactive') => {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.update({ status });
    }, []);

    const changeUserRole = useCallback(async (userId: string, role: 'admin' | 'staff') => {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.update({ roleName: role });
    }, []);

    const resetUserPasswordByAdmin = useCallback(async (userId: string, newPassword: string) => {
        console.log(`[ADMIN] Requesting password reset for user ${userId} with new password: ${newPassword}`);
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            console.log(`This is a demo. In a real app, the password for user ${userId} would be securely reset via a backend service.`);
            resolve();
          }, 1000);
        });
    }, []);

    const changePassword = useCallback(async (oldPass: string, newPass: string) => {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser || !firebaseUser.email) {
          throw new Error("Not authenticated or user email is not available.");
        }
        const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, oldPass);
        try {
          await firebaseUser.reauthenticateWithCredential(credential);
          await firebaseUser.updatePassword(newPass);
        } catch (error: any) {
            console.error("Password change failed:", error);
            if (error.code === 'auth/wrong-password') {
                throw new Error('The current password you entered is incorrect.');
            }
            throw new Error('Failed to change password. Please try again.');
        }
    }, []);

    const deleteUser = useCallback(async (userId: string) => {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.delete();
    }, []);

    return {
        addUser,
        getUsersForHospital,
        getUserById,
        updateUser,
        updateUserStatus,
        changeUserRole,
        resetUserPasswordByAdmin,
        changePassword,
        deleteUser,
    };
};