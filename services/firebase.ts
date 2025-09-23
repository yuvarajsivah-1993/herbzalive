// FIX: Update Firebase imports for v8 compatibility by using compat libraries
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { AppUser, Timestamp } from '../types';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1fFRc8Td22ZKPDXbuifLGhX56ylAxxI4",
  authDomain: "herbzalive-1adf3.firebaseapp.com",
  projectId: "herbzalive-1adf3",
  storageBucket: "herbzalive-1adf3.firebasestorage.app",
  messagingSenderId: "529061356299",
  appId: "1:529061356299:web:06f6493f560971e855b80e",
  measurementId: "G-P4NZCVMZCJ"
};

// FIX: Update Firebase initialization to v8 syntax
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const storage = firebase.storage();
export const db = firebase.firestore();

// FIX: Use v8 syntax for Firestore settings and persistence
db.settings({
  experimentalForceLongPolling: true,
});
db.enablePersistence().catch((err) => {
    console.error("Firebase persistence error: ", err);
});

export const createAuditLog = async (
  user: AppUser | null,
  action: string,
  entityType: string,
  entityId: string,
  details: string
): Promise<void> => {
    if (!user || !user.hospitalId) {
        console.warn("Audit log skipped: No user or hospitalId.");
        return;
    }
    try {
        await db.collection('auditLogs').add({
            userId: user.uid,
            userName: user.name,
            hospitalId: user.hospitalId,
            action,
            entityType,
            entityId,
            details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() as Timestamp,
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
};
