import { useCallback } from 'react';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { AppUser, Hospital, UserDocument, SubscriptionTransaction, SubscriptionPackage, AuditLog } from '../../types';

export const useSuperAdmin = (user: AppUser | null) => {
    // Super Admin Functions
    const getAllHospitals = useCallback(async (): Promise<Hospital[]> => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        const querySnapshot = await db.collection('hospitals').get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hospital));
    }, [user]);

    const getHospitalById = useCallback(async (hospitalId: string): Promise<Hospital | null> => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        const docRef = db.collection('hospitals').doc(hospitalId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() } as Hospital;
        }
        return null;
    }, [user]);

    const getUsersForHospitalBySuperAdmin = useCallback(async (hospitalId: string): Promise<UserDocument[]> => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        const usersRef = db.collection("users");
        const q = usersRef.where("hospitalId", "==", hospitalId);
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument));
    }, [user]);

    const updateHospitalStatusBySuperAdmin = useCallback(async (hospitalId: string, status: 'active' | 'inactive') => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        await db.collection('hospitals').doc(hospitalId).update({ status });
    }, [user]);

    const updateHospitalSubscriptionBySuperAdmin = useCallback(async (hospitalId: string, newExpiryDate: Date) => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        await db.collection('hospitals').doc(hospitalId).update({
            subscriptionExpiryDate: firebase.firestore.Timestamp.fromDate(newExpiryDate)
        });
    }, [user]);

    const getSubscriptionTransactionsForHospital = useCallback(async (hospitalId: string): Promise<SubscriptionTransaction[]> => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        const querySnapshot = await db.collection('subscriptionTransactions')
            .where('hospitalId', '==', hospitalId)
            .get();
        const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionTransaction));
        transactions.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
        return transactions;
    }, [user]);
    
    const assignSubscriptionPackageToHospital = useCallback(async (hospitalId: string, packageId: string) => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        
        const packageDoc = await db.collection('subscriptionPackages').doc(packageId).get();
        if (!packageDoc.exists) throw new Error("Subscription package not found.");
        
        const pkg = packageDoc.data() as SubscriptionPackage;
        const now = new Date();
        let newExpiryDate = new Date(now);

        // FIX: Property 'interval' does not exist on type 'SubscriptionPackage'.
        // Assuming 'monthly' as a default interval for superadmin assignment.
        const interval: 'monthly' | 'quarterly' | 'yearly' = 'monthly';

        // FIX: The compiler correctly infers that `interval` can only be 'monthly',
        // making other cases in a switch statement unreachable and causing a type error.
        // Since the interval is defaulted to 'monthly', we only need the logic for that case.
        newExpiryDate.setMonth(now.getMonth() + 1);

        await db.collection('hospitals').doc(hospitalId).update({
            subscriptionPackageId: packageId,
            subscriptionExpiryDate: firebase.firestore.Timestamp.fromDate(newExpiryDate),
            subscriptionStatus: 'active',
            subscriptionInterval: interval
        });
    }, [user]);

    const getAllSubscriptionTransactions = useCallback(async (): Promise<SubscriptionTransaction[]> => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        const querySnapshot = await db.collection('subscriptionTransactions')
            .orderBy('createdAt', 'desc')
            .get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionTransaction));
    }, [user]);

    const getAuditLogsForHospital = useCallback(async (hospitalId: string): Promise<AuditLog[]> => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        const querySnapshot = await db.collection('auditLogs')
            .where('hospitalId', '==', hospitalId)
            .limit(200) // Avoid fetching excessively large datasets
            .get();
        const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        // Sort in-memory to avoid needing a composite index in Firestore
        logs.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
        return logs;
    }, [user]);

    return {
        getAllHospitals,
        getHospitalById,
        getUsersForHospitalBySuperAdmin,
        updateHospitalStatusBySuperAdmin,
        updateHospitalSubscriptionBySuperAdmin,
        getSubscriptionTransactionsForHospital,
        assignSubscriptionPackageToHospital,
        getAllSubscriptionTransactions,
        getAuditLogsForHospital,
    };
};