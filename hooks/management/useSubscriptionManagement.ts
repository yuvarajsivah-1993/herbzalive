// FIX: Add 'React' import to resolve namespace errors.
import React, { useCallback, useRef } from 'react';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { AppUser, SubscriptionPackage, NewSubscriptionPackageData, NewSubscriptionTransactionData, SubscriptionTransaction } from '../../types';
import { useToast } from '../useToast';

const { serverTimestamp } = firebase.firestore.FieldValue;

export const useSubscriptionManagement = (user: AppUser | null, setUser: React.Dispatch<React.SetStateAction<AppUser | null>>) => {
    const { addToast } = useToast();
    const paymentHandled = useRef(false);

    const getSubscriptionPackages = useCallback(async (): Promise<SubscriptionPackage[]> => {
        const querySnapshot = await db.collection('subscriptionPackages').get();
        const packages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPackage));
        // Sort client-side to handle potential missing fields gracefully
        packages.sort((a, b) => (a.prices?.monthly ?? 0) - (b.prices?.monthly ?? 0));
        return packages;
    }, []);

    const changeSubscriptionPackage = useCallback(async (packageId: string, interval: 'monthly' | 'quarterly' | 'yearly') => {
        if (!user || !user.hospitalId) throw new Error("Authentication error.");
        
        const packageDoc = await db.collection('subscriptionPackages').doc(packageId).get();
        if (!packageDoc.exists) throw new Error("Selected package not found.");
        
        const pkg = packageDoc.data() as SubscriptionPackage;
        const now = new Date();
        let newExpiryDate = new Date(now);

        switch(interval) {
            case 'monthly': newExpiryDate.setMonth(now.getMonth() + 1); break;
            case 'quarterly': newExpiryDate.setMonth(now.getMonth() + 3); break;
            case 'yearly': newExpiryDate.setFullYear(now.getFullYear() + 1); break;
        }

        await db.collection('hospitals').doc(user.hospitalId).update({
            subscriptionPackageId: packageId,
            subscriptionExpiryDate: firebase.firestore.Timestamp.fromDate(newExpiryDate),
            subscriptionStatus: 'active',
            subscriptionInterval: interval,
        });

        setUser(prev => prev ? ({ ...prev, subscriptionPackageId: packageId, subscriptionPackage: { id: packageId, ...pkg }, hospitalSubscriptionExpiryDate: firebase.firestore.Timestamp.fromDate(newExpiryDate), hospitalSubscriptionInterval: interval }) : null);

    }, [user, setUser]);

    const recordSubscriptionPayment = useCallback(async (data: NewSubscriptionTransactionData) => {
        if (!user || !user.hospitalId) throw new Error("Authentication error.");
        await db.collection('subscriptionTransactions').add({
          ...data,
          hospitalId: user.hospitalId,
          createdAt: serverTimestamp(),
        });
    }, [user]);
    
    const initiatePaymentForPackage = useCallback(async (packageToPurchase: SubscriptionPackage, interval: 'monthly' | 'quarterly' | 'yearly') => {
        if (!user) {
            addToast("You must be logged in to subscribe.", "error");
            return;
        }

        paymentHandled.current = false;

        const options: any = {
            key: 'rzp_test_1DP5mmOlF5G5ag',
            amount: packageToPurchase.prices[interval] * 100,
            currency: "INR",
            name: user.hospitalName || "Zendenta Subscription",
            description: `Payment for ${packageToPurchase.name} Plan (${interval})`,
            handler: async (response: any) => {
                paymentHandled.current = true;
                try {
                    await changeSubscriptionPackage(packageToPurchase.id!, interval);
                    
                    const transactionData: NewSubscriptionTransactionData = {
                        paymentId: response.razorpay_payment_id,
                        packageId: packageToPurchase.id!,
                        packageName: packageToPurchase.name,
                        amount: packageToPurchase.prices[interval],
                        currency: 'INR',
                        status: 'success',
                        interval: interval,
                    };
                    if (response.razorpay_order_id) transactionData.orderId = response.razorpay_order_id;
                    if (response.razorpay_signature) transactionData.signature = response.razorpay_signature;

                    await recordSubscriptionPayment(transactionData);
                    addToast("Payment successful! Your subscription has been updated.", "success");
                } catch (error) {
                    addToast("Payment was successful, but there was an issue updating your subscription. Please contact support.", "error");
                    const transactionData: NewSubscriptionTransactionData = {
                        paymentId: response.razorpay_payment_id,
                        packageId: packageToPurchase.id!,
                        packageName: packageToPurchase.name,
                        amount: packageToPurchase.prices[interval],
                        currency: 'INR',
                        status: 'failed',
                        interval: interval,
                    };
                    if (response.razorpay_order_id) transactionData.orderId = response.razorpay_order_id;
                    if (response.razorpay_signature) transactionData.signature = response.razorpay_signature;
                    await recordSubscriptionPayment(transactionData);
                }
            },
            prefill: {},
            notes: { hospitalId: user.hospitalId, hospitalName: user.hospitalName },
            theme: { color: "#3b82f6" },
            modal: {
                ondismiss: () => {
                    if (!paymentHandled.current) {
                        addToast("Payment was cancelled.", "info");
                    }
                }
            }
        };

        const prefill: { name?: string, email?: string, contact?: string } = {};
        if (user.name) prefill.name = user.name;
        if (user.email) prefill.email = user.email;
        if (user.phone) prefill.contact = user.phone;
        options.prefill = prefill;
        if (user.hospitalLogoUrl) options.image = user.hospitalLogoUrl;

        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async (response: any) => {
            paymentHandled.current = true;
            const transactionData: NewSubscriptionTransactionData = {
                paymentId: response.error.metadata.payment_id,
                packageId: packageToPurchase.id!,
                packageName: packageToPurchase.name,
                amount: packageToPurchase.prices[interval],
                currency: 'INR',
                status: 'failed',
                interval: interval,
            };
            if (response.error.metadata.order_id) transactionData.orderId = response.error.metadata.order_id;
            await recordSubscriptionPayment(transactionData);
            addToast(`Payment Failed: ${response.error.description}`, "error");
        });
        rzp.open();
    }, [user, addToast, changeSubscriptionPackage, recordSubscriptionPayment]);

    const getSubscriptionTransactions = useCallback(async (): Promise<SubscriptionTransaction[]> => {
        if (!user || !user.hospitalId) return [];
        const querySnapshot = await db.collection('subscriptionTransactions')
          .where('hospitalId', '==', user.hospitalId)
          .get();
        const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionTransaction));
        transactions.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        return transactions;
    }, [user]);

    const addSubscriptionPackage = useCallback(async (data: NewSubscriptionPackageData) => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        await db.collection('subscriptionPackages').add(data);
    }, [user]);

    const updateSubscriptionPackage = useCallback(async (packageId: string, data: NewSubscriptionPackageData) => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        await db.collection('subscriptionPackages').doc(packageId).update(data);
    }, [user]);

    const deleteSubscriptionPackage = useCallback(async (packageId: string) => {
        if (!user?.isSuperAdmin) throw new Error("Permission denied.");
        
        const packageRef = db.collection('subscriptionPackages').doc(packageId);
        const packageDoc = await packageRef.get();
        if (packageDoc.exists && packageDoc.data()?.name === 'Free Plan') {
            throw new Error("The default Free Plan cannot be deleted.");
        }

        await packageRef.delete();
    }, [user]);

    const switchToFreePlan = useCallback(async () => {
        if (!user || !user.hospitalId) throw new Error("Authentication error.");
    
        const packagesRef = db.collection('subscriptionPackages');
        const freePackageSnap = await packagesRef.where('name', '==', 'Free Plan').limit(1).get();
    
        if (freePackageSnap.empty) {
            throw new Error("Default 'Free Plan' not found. Please contact support.");
        }
        const freePackageDoc = freePackageSnap.docs[0];
        const freePackageId = freePackageDoc.id;
        const freePackageData = { id: freePackageId, ...freePackageDoc.data() } as SubscriptionPackage;
    
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const farFutureDate = new Date('9999-12-31');
    
        await hospitalRef.update({
            subscriptionPackageId: freePackageId,
            subscriptionExpiryDate: firebase.firestore.Timestamp.fromDate(farFutureDate),
            subscriptionStatus: 'active',
            subscriptionInterval: 'monthly',
        });
    
        setUser(prev => {
            if (!prev) return null;
            return {
                ...prev,
                subscriptionPackageId: freePackageId,
                subscriptionPackage: freePackageData,
                hospitalSubscriptionExpiryDate: firebase.firestore.Timestamp.fromDate(farFutureDate),
                hospitalSubscriptionInterval: 'monthly',
            };
        });
    
    }, [user, setUser]);

    return {
        getSubscriptionPackages,
        changeSubscriptionPackage,
        recordSubscriptionPayment,
        getSubscriptionTransactions,
        addSubscriptionPackage,
        updateSubscriptionPackage,
        deleteSubscriptionPackage,
        switchToFreePlan,
        initiatePaymentForPackage,
    };
};