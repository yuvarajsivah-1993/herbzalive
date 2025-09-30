// FIX: Add 'React' import to resolve namespace errors.
import React, { useCallback } from 'react';
import { db, storage } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { AppUser, HospitalUpdateData, Tax, NewTaxData, TaxGroup, NewTaxGroupData, NotificationSettings, EmailSettings, EditableRole, Permissions, InvoiceSettingsData, MonthlyBonus, NewMonthlyBonusData, Hospital, NewHospitalLocationData, UpdateHospitalLocationData } from '../../types';

type UploadFileFunction = (file: File | Blob, path: string) => Promise<string>;

export const useSettingsManagement = (user: AppUser | null, setUser: React.Dispatch<React.SetStateAction<AppUser | null>>, uploadFile: UploadFileFunction) => {
    
    const updateHospitalSettings = useCallback(async (settings: HospitalUpdateData) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const hospitalDocRef = db.collection('hospitals').doc(user.hospitalId);
        const { logo, ...restData } = settings;
        const updateData: { [key: string]: any } = { ...restData };

        if (logo) {
            const docSnap = await hospitalDocRef.get();
            const oldLogoUrl = docSnap.data()?.logoUrl;
            if (oldLogoUrl) {
                try {
                    await storage.refFromURL(oldLogoUrl).delete();
                } catch (e) {
                    // console.warn("Failed to delete old hospital logo:", e);
                }
            }
            const logoName = `${Date.now()}-${logo.name}`;
            updateData.logoUrl = await uploadFile(logo, `hospitalLogos/${user.hospitalId}/${logoName}`);
        }
        
        await hospitalDocRef.update(updateData);

        setUser(prevUser => {
            if (!prevUser) return null;
            return {
                ...prevUser,
                hospitalName: updateData.name,
                hospitalPhone: updateData.phone,
                hospitalEmail: updateData.email,
                hospitalAddress: updateData.address,
                hospitalLogoUrl: updateData.logoUrl || prevUser.hospitalLogoUrl,
                hospitalCurrency: updateData.currency,
                hospitalTimezone: updateData.timezone,
                hospitalDateFormat: updateData.dateFormat,
                hospitalTimeFormat: updateData.timeFormat,
                hospitalFinancialYearStartMonth: updateData.financialYearStartMonth,
                hospitalGstin: updateData.gstin,
                hospitalDlNo: updateData.dlNo,
                hospitalCinNo: updateData.cinNo,
                hospitalFssaiNo: updateData.fssaiNo,
                hospitalWebsite: updateData.website,
                hospitalTelephone: updateData.telephone,
            };
        });
    }, [user, uploadFile, setUser]);

    const updateNotificationSettings = useCallback(async (settings: Partial<NotificationSettings>) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const hospitalDocRef = db.collection('hospitals').doc(user.hospitalId);

        const updatePayload: { [key: string]: any } = {};
        for (const key in settings) {
            if (Object.prototype.hasOwnProperty.call(settings, key)) {
                updatePayload[`notificationSettings.${key}`] = (settings as any)[key];
            }
        }

        await hospitalDocRef.update(updatePayload);

        // Update local user state to reflect changes instantly
        setUser(prevUser => {
            if (!prevUser) return null;
            return {
                ...prevUser,
                hospitalNotificationSettings: {
                    ...(prevUser.hospitalNotificationSettings as NotificationSettings),
                    ...settings
                }
            };
        });
    }, [user, setUser]);
    
    const updateInvoiceSettings = useCallback(async (settings: Partial<InvoiceSettingsData>) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const hospitalDocRef = db.collection('hospitals').doc(user.hospitalId);

        const updatePayload: { [key: string]: any } = {};
        for (const key in settings) {
            if (Object.prototype.hasOwnProperty.call(settings, key)) {
                updatePayload[`invoiceSettings.${key}`] = (settings as any)[key];
            }
        }

        await hospitalDocRef.update(updatePayload);

        // Update local user state
        setUser(prevUser => {
            if (!prevUser) return null;
            return {
                ...prevUser,
                hospitalInvoiceSettings: {
                    ...(prevUser.hospitalInvoiceSettings as InvoiceSettingsData),
                    ...settings
                }
            };
        });
    }, [user, setUser]);

    const updateEmailSettings = useCallback(async (settings: Omit<EmailSettings, 'provider'>) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const hospitalDocRef = db.collection('hospitals').doc(user.hospitalId);

        await hospitalDocRef.update({
            emailSettings: settings
        });

        // Update local user state
        setUser(prevUser => {
            if (!prevUser) return null;
            return {
                ...prevUser,
                hospitalEmailSettings: settings
            };
        });
    }, [user, setUser]);

    const updateRolePermissions = useCallback(async (roleName: EditableRole, permissions: Permissions) => {
        if (!user || !user.hospitalId || user.roleName !== 'owner') {
            throw new Error("Permission denied.");
        }
    
        const hospitalDocRef = db.collection('hospitals').doc(user.hospitalId);
        
        await hospitalDocRef.update({
            [`rolePermissions.${roleName}`]: permissions
        });
    
        setUser(prevUser => {
            if (!prevUser) return null;
            const newRolePermissions = {
                ...(prevUser.hospitalRolePermissions),
                [roleName]: permissions,
            };
            return {
                ...prevUser,
                hospitalRolePermissions: newRolePermissions as Record<EditableRole, Permissions>,
            };
        });
    }, [user, setUser]);
    
    const addHospitalLocation = useCallback(async (data: NewHospitalLocationData) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        await db.collection('hospitalLocations').add({
            ...data,
            hospitalId: user.hospitalId,
        });
    }, [user]);

    const updateHospitalLocation = useCallback(async (locationId: string, data: UpdateHospitalLocationData) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        await db.collection('hospitalLocations').doc(locationId).update(data);
    }, [user]);

    const deleteHospitalLocation = useCallback(async (locationId: string) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        // TODO: Add check to prevent deletion if location is assigned to users, doctors, or has associated data (patients, sales, etc.)
        await db.collection('hospitalLocations').doc(locationId).delete();
    }, [user]);

    // Tax Management
    const getTaxes = useCallback(async (): Promise<Tax[]> => {
        if (!user) return [];
        const q = db.collection("taxes").where("hospitalId", "==", user.hospitalId);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tax)).sort((a, b) => a.name.localeCompare(b.name));
    }, [user]);

    const addTax = useCallback(async (data: NewTaxData) => {
        if (!user) throw new Error("User not found");
        await db.collection("taxes").add({ ...data, hospitalId: user.hospitalId });
    }, [user]);

    const updateTax = useCallback(async (taxId: string, data: NewTaxData) => {
        await db.collection('taxes').doc(taxId).update(data);
    }, []);

    const deleteTax = useCallback(async (taxId: string) => {
        await db.collection('taxes').doc(taxId).delete();
    }, []);

    // Tax Group Management
    const getTaxGroups = useCallback(async (): Promise<TaxGroup[]> => {
        if (!user) return [];
        const q = db.collection("taxGroups").where("hospitalId", "==", user.hospitalId);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaxGroup)).sort((a, b) => a.name.localeCompare(b.name));
    }, [user]);
      
    const calculateTotalRate = async (hospitalId: string, taxIds: string[]): Promise<number> => {
        if (taxIds.length === 0) return 0;
        const snapshot = await db.collection('taxes').where('hospitalId', '==', hospitalId).get();
        const allTaxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tax));
        return allTaxes.filter(t => taxIds.includes(t.id!)).reduce((sum, tax) => sum + tax.rate, 0);
    };

    const addTaxGroup = useCallback(async (data: NewTaxGroupData) => {
        if (!user) throw new Error("User not found");
        const totalRate = await calculateTotalRate(user.hospitalId, data.taxIds);
        await db.collection("taxGroups").add({ ...data, totalRate, hospitalId: user.hospitalId });
    }, [user]);

    const updateTaxGroup = useCallback(async (taxGroupId: string, data: NewTaxGroupData) => {
        if (!user) throw new Error("User not found");
        const totalRate = await calculateTotalRate(user.hospitalId, data.taxIds);
        await db.collection('taxGroups').doc(taxGroupId).update({ ...data, totalRate });
    }, [user]);
      
    const deleteTaxGroup = useCallback(async (taxGroupId: string) => {
        await db.collection('taxGroups').doc(taxGroupId).delete();
    }, []);

    // Payroll Bonus Management
    const getMonthlyBonuses = useCallback(async (): Promise<MonthlyBonus[]> => {
        if (!user || !user.hospitalId) return [];
        return user.hospitalMonthlyBonuses || [];
    }, [user]);

    const addMonthlyBonus = useCallback(async (data: NewMonthlyBonusData) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const newBonus: MonthlyBonus = { ...data, id: db.collection('_').doc().id };
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        await hospitalRef.update({
            monthlyBonuses: firebase.firestore.FieldValue.arrayUnion(newBonus)
        });
        setUser(prev => prev ? { ...prev, hospitalMonthlyBonuses: [...(prev.hospitalMonthlyBonuses || []), newBonus] } : null);
    }, [user, setUser]);

    const updateMonthlyBonus = useCallback(async (bonusId: string, data: NewMonthlyBonusData) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        await db.runTransaction(async t => {
            const doc = await t.get(hospitalRef);
            const bonuses = (doc.data()?.monthlyBonuses || []) as MonthlyBonus[];
            const updatedBonuses = bonuses.map(b => b.id === bonusId ? { id: b.id, ...data } : b);
            t.update(hospitalRef, { monthlyBonuses: updatedBonuses });
            setUser(prev => prev ? { ...prev, hospitalMonthlyBonuses: updatedBonuses } : null);
        });
    }, [user, setUser]);

    const deleteMonthlyBonus = useCallback(async (bonusId: string) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        await db.runTransaction(async t => {
            const doc = await t.get(hospitalRef);
            const bonuses = (doc.data()?.monthlyBonuses || []) as MonthlyBonus[];
            const updatedBonuses = bonuses.filter(b => b.id !== bonusId);
            t.update(hospitalRef, { monthlyBonuses: updatedBonuses });
            setUser(prev => prev ? { ...prev, hospitalMonthlyBonuses: updatedBonuses } : null);
        });
    }, [user, setUser]);

    // Helper for managing various string array settings on the hospital doc
    const createHospitalArraySettingManager = (
        hospitalField: keyof Hospital,
        userField: keyof AppUser,
        checkUsageCollection: string,
        checkUsageField: string,
        entityName: string
    ) => {
        const add = useCallback(async (value: string) => {
            if (!user || !user.hospitalId) throw new Error("User not authenticated");
            await db.collection('hospitals').doc(user.hospitalId).update({
                [hospitalField]: firebase.firestore.FieldValue.arrayUnion(value)
            });
            setUser(prev => {
                if (!prev) return null;
                const existing = (prev[userField] as string[] || []);
                return { ...prev, [userField]: [...new Set([...existing, value])] };
            });
        }, [user, setUser, hospitalField, userField]);

        const remove = useCallback(async (value: string) => {
            if (!user || !user.hospitalId) throw new Error("User not authenticated");
            const snapshot = await db.collection(checkUsageCollection).where('hospitalId', '==', user.hospitalId).where(checkUsageField, '==', value).limit(1).get();
            if (!snapshot.empty) throw new Error(`Cannot delete ${entityName} as it is in use.`);
            
            await db.collection('hospitals').doc(user.hospitalId).update({
                [hospitalField]: firebase.firestore.FieldValue.arrayRemove(value)
            });
            setUser(prev => {
                if (!prev) return null;
                const existing = (prev[userField] as string[] || []);
                return { ...prev, [userField]: existing.filter(c => c !== value) };
            });
        }, [user, setUser, hospitalField, userField, checkUsageCollection, checkUsageField, entityName]);

        return { add, remove };
    };

    const { add: addEmployeeLocation, remove: deleteEmployeeLocation } = createHospitalArraySettingManager('employeeLocations', 'hospitalEmployeeLocations', 'employees', 'location', 'location');
    const { add: addEmployeeDepartment, remove: deleteEmployeeDepartment } = createHospitalArraySettingManager('employeeDepartments', 'hospitalEmployeeDepartments', 'employees', 'department', 'department');
    const { add: addEmployeeDesignation, remove: deleteEmployeeDesignation } = createHospitalArraySettingManager('employeeDesignations', 'hospitalEmployeeDesignations', 'employees', 'designation', 'designation');
    const { add: addEmployeeShift, remove: deleteEmployeeShift } = createHospitalArraySettingManager('employeeShifts', 'hospitalEmployeeShifts', 'employees', 'shift', 'shift');

    return {
        updateHospitalSettings,
        updateNotificationSettings,
        updateInvoiceSettings,
        updateEmailSettings,
        updateRolePermissions,
        addHospitalLocation,
        updateHospitalLocation,
        deleteHospitalLocation,
        getTaxes, addTax, updateTax, deleteTax,
        getTaxGroups, addTaxGroup, updateTaxGroup, deleteTaxGroup,
        getMonthlyBonuses, addMonthlyBonus, updateMonthlyBonus, deleteMonthlyBonus,
        addEmployeeLocation,
        deleteEmployeeLocation,
        addEmployeeDepartment,
        deleteEmployeeDepartment,
        addEmployeeDesignation,
        deleteEmployeeDesignation,
        addEmployeeShift,
        deleteEmployeeShift,
    };
};