// FIX: Update Firebase imports for v8 compatibility
import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db, storage, createAuditLog } from '../services/firebase';
// FIX: Added Timestamp to imports
// FIX: Add missing real-time data types to import
// FIX: Import `Appointment` type to resolve 'Cannot find name' errors.
import { AuthContextType, AppUser, UserDocument, Permissions, SignUpData, Hospital, FirebaseUser, SubscriptionPackage, NewSubscriptionPackageData, Timestamp, EditableRole, InvoiceSettingsData, IndividualInvoiceSettings, Invoice, POSSale, PatientDocument, DoctorDocument, Treatment, Medicine, StockItem, Vendor, Peripheral, Employee, Loan, Tax, TaxGroup, SalaryComponent, SalaryGroup, SubscriptionTransaction, StockOrder, StockReturn, Consultation, Address, Appointment, HospitalLocation, StockTransfer } from '../types';

import { useFileUpload } from '../hooks/useFileUpload';
import { useSuperAdmin } from '../hooks/management/useSuperAdmin';
import { useSubscriptionManagement } from '../hooks/management/useSubscriptionManagement';
import { useUserManagement } from '../hooks/management/useUserManagement';
import { useClinicManagement } from '../hooks/management/useClinicManagement';
import { usePatientCare } from '../hooks/management/usePatientCare';
import { useFinancialManagement } from '../hooks/management/useFinancialManagement';
import { useInventoryManagement } from '../hooks/management/useInventoryManagement';
import { useSettingsManagement } from '../hooks/management/useSettingsManagement';
import { usePayrollManagement } from '../hooks/management/usePayrollManagement';


// FIX: Define types and constants from firebase v8 SDK
type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
const { serverTimestamp } = firebase.firestore.FieldValue;


// FIX: Add missing properties for new modules to Permissions type.
const allModulesWrite: Permissions = {
  dashboard: 'write', reservations: 'write', patients: 'write', treatments: 'write', staff: 'write', accounts: 'write', sales: 'write', expenses: 'write', stocks: 'write', peripherals: 'write', report: 'write', appointments: 'write', doctors: 'write', profile: 'write', 'hospital-settings': 'write', 'invoice-settings': 'write', 'tax-rates': 'write', medicines: 'write', pos: 'write', 'pos-sales': 'write', notifications: 'write', vendors: 'write', payroll: 'write', 'payroll-settings': 'write',
};

const ownerPermissions = allModulesWrite;

const adminPermissions: Permissions = {
  ...allModulesWrite,
  'hospital-settings': 'none',
  'invoice-settings': 'none',
  'tax-rates': 'none',
  notifications: 'none',
};


// FIX: Add missing properties for new modules to Permissions type.
const staffPermissions: Permissions = {
  dashboard: 'read', reservations: 'write', patients: 'write', treatments: 'write', staff: 'none', accounts: 'read', sales: 'read', expenses: 'read', stocks: 'read', peripherals: 'write', report: 'none', appointments: 'write', doctors: 'write', profile: 'write', 'hospital-settings': 'none', 'invoice-settings': 'none', 'tax-rates': 'none', medicines: 'read', pos: 'write', 'pos-sales': 'write', notifications: 'none', vendors: 'read', payroll: 'none', 'payroll-settings': 'none',
};

// FIX: Add missing properties for new modules to Permissions type.
const doctorPermissions: Permissions = {
    dashboard: 'read',
    reservations: 'write',
    patients: 'write',
    treatments: 'read',
    doctors: 'none',
    staff: 'none',
    accounts: 'none',
    sales: 'none',
    expenses: 'none',
    stocks: 'none',
    peripherals: 'none',
    report: 'none',
    appointments: 'write',
    profile: 'write', 'hospital-settings': 'none', 'invoice-settings': 'none', 'tax-rates': 'none', medicines: 'read', pos: 'none', 'pos-sales': 'none', notifications: 'none', vendors: 'none', payroll: 'none', 'payroll-settings': 'none',
};

const defaultIndividualSettings: IndividualInvoiceSettings = {
    prefix: 'INV-',
    nextNumber: 1,
    footerText: 'Thank you for your business. Please contact us for any queries regarding this invoice.',
    emailTemplate: {
        subject: 'Your Invoice from {{hospitalName}}',
        body: 'Dear {{patientName}},\n\nPlease find your invoice attached for your recent treatment.\n\nTotal Amount: {{totalAmount}}\n\nThank you,\n{{hospitalName}}'
    },
    printerType: 'A4',
    design: 'modern'
};

const defaultInvoiceSettings: InvoiceSettingsData = {
    treatmentInvoice: { ...defaultIndividualSettings, prefix: 'INV-' },
    posInvoice: { ...defaultIndividualSettings, prefix: 'POS-', printerType: 'thermal', design: 'receipt' }
};


export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const permissionsByRole: Record<'owner' | 'admin' | 'staff' | 'doctor', Permissions> = {
  owner: ownerPermissions,
  admin: adminPermissions,
  staff: staffPermissions,
  doctor: doctorPermissions,
};

// FIX: Use v8 Firestore syntax
const fetchUserDoc = async (uid: string): Promise<DocumentSnapshot | null> => {
  let snap = await db.collection('users').doc(uid).get();
  if (snap.exists) return snap;

  // Fallback for invited users who just completed signup and have a different doc ID
  const q = db.collection("users").where("uid", "==", uid);
  const querySnapshot = await q.get();
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0];
  }
  return null;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // FIX: Add state for the global invoice print preview modal.
  const [invoiceToPrint, setInvoiceToPrint] = useState<{ invoice: Invoice | POSSale; type: 'Treatment' | 'POS' } | null>(null);
  const { uploadFile } = useFileUpload();

  // Real-time data for hospital users
  const [patients, setPatients] = useState<PatientDocument[]>([]);
  const [doctors, setDoctors] = useState<DoctorDocument[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [usersForHospital, setUsersForHospital] = useState<UserDocument[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockOrders, setStockOrders] = useState<StockOrder[]>([]);
  const [stockReturns, setStockReturns] = useState<StockReturn[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [salaryGroups, setSalaryGroups] = useState<SalaryGroup[]>([]);
  
  // FIX: Add state for patient-specific real-time data
  // Real-time data for patient users
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [myConsultations, setMyConsultations] = useState<Consultation[]>([]);
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [myPOSSales, setMyPOSSales] = useState<POSSale[]>([]);
  
  // Real-time data for Super Admin
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [allSubscriptionPackages, setAllSubscriptionPackages] = useState<SubscriptionPackage[]>([]);
  const [allSubscriptionTransactions, setAllSubscriptionTransactions] = useState<SubscriptionTransaction[]>([]);

  // Real-time listeners for hospital-specific collections (for staff/admin/owner)
  useEffect(() => {
    // This effect is exclusively for hospital staff.
    // It sets up real-time listeners for all necessary hospital-wide data.
    if (user && user.hospitalId && user.roleName !== 'patient' && !user.isSuperAdmin) {
        const createListener = (collectionName: string, setter: React.Dispatch<any>) => {
            let query: firebase.firestore.Query = db.collection(collectionName).where('hospitalId', '==', user.hospitalId);

            if (user.roleName !== 'owner' && user.roleName !== 'admin' && user.currentLocation) {
                const locationId = user.currentLocation.id;
                switch (collectionName) {
                    case 'patients':
                    case 'consultations':
                    case 'peripherals':
                    case 'employees':
                    case 'loans':
                        query = query.where("locationId", "==", locationId);
                        break;
                    case 'doctors':
                    case 'users': // For staff/admin users
                        query = query.where("assignedLocations", "array-contains", locationId);
                        break;
                    // For other collections (treatments, medicines, vendors, taxes, taxGroups, salaryComponents, salaryGroups),
                    // no location-specific filtering is applied as they are considered hospital-wide.
                }
            }
            
            return query.onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (collectionName === 'stocks') {
                    const transformedData = (data as StockItem[]).map((item) => {
                        const locId = user?.currentLocation?.id;
                        if (locId && item.locationStock?.[locId]) {
                            return { ...item, ...item.locationStock[locId] };
                        }
                        return { ...item, totalStock: 0, lowStockThreshold: 10, batches: [] };
                    });
                    setter(transformedData);
                } else {
                    setter(data);
                }
            }, err => console.error(`Error listening to ${collectionName}:`, err));
        };
        
        const unsubscribers = [
            createListener('patients', setPatients),
            createListener('doctors', setDoctors),
            createListener('treatments', setTreatments),
            createListener('medicines', setMedicines),
            createListener('consultations', setConsultations),
            createListener('users', setUsersForHospital),
            createListener('stocks', setStockItems),
            db.collection('stockOrders').where('hospitalId', '==', user.hospitalId)
                .onSnapshot(snapshot => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as StockOrder }));
                    data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setStockOrders(data);
                }, err => console.error(`Error listening to stockOrders:`, err)),
            db.collection('stockReturns').where('hospitalId', '==', user.hospitalId)
                .onSnapshot(snapshot => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as StockReturn }));
                    data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setStockReturns(data);
                }, err => console.error(`Error listening to stockReturns:`, err)),
            db.collection('stockTransfers').where('hospitalId', '==', user.hospitalId)
                .onSnapshot(snapshot => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as StockTransfer }));
                    data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setStockTransfers(data);
                }, err => console.error(`Error listening to stockTransfers:`, err)),
            createListener('vendors', setVendors),
            createListener('peripherals', setPeripherals),
            createListener('employees', setEmployees),
            createListener('loans', setLoans),
            createListener('taxes', setTaxes),
            createListener('taxGroups', setTaxGroups),
            createListener('salaryComponents', setSalaryComponents),
            createListener('salaryGroups', setSalaryGroups),
        ];
        
        // Cleanup function for when a staff member logs out or user changes.
        return () => unsubscribers.forEach(unsub => unsub());
    } 
    // This block runs for all other cases: patients, super admins, or logged-out users.
    else {
        // If the user is NOT a patient (i.e., they are a super admin or logged out),
        // we clear all hospital-level data.
        // We explicitly DO NOT clear state if it's a patient, as the patient-specific
        // data listener below needs some of this shared state (e.g., doctors, treatments).
        if (user?.roleName !== 'patient') {
            setPatients([]); setDoctors([]); setTreatments([]); setMedicines([]);
            setConsultations([]);
            setUsersForHospital([]); setStockItems([]); setStockOrders([]); setStockReturns([]); setStockTransfers([]); setVendors([]); setPeripherals([]);
            setEmployees([]); setLoans([]); setTaxes([]); setTaxGroups([]);
            setSalaryComponents([]); setSalaryGroups([]);
        }
    }
  }, [user, user?.currentLocation?.id]);

  // Real-time listeners for Super Admin collections
  useEffect(() => {
    if (user?.isSuperAdmin) {
      const unsubHospitals = db.collection('hospitals').onSnapshot(snap => {
        setAllHospitals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hospital)));
      });
      const unsubPackages = db.collection('subscriptionPackages').onSnapshot(snap => {
        setAllSubscriptionPackages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPackage)));
      });
      const unsubTransactions = db.collection('subscriptionTransactions').orderBy('createdAt', 'desc').onSnapshot(snap => {
        setAllSubscriptionTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionTransaction)));
      });

      return () => {
        unsubHospitals();
        unsubPackages();
        unsubTransactions();
      };
    } else {
      // Clear the state if user is not super admin
      setAllHospitals([]);
      setAllSubscriptionPackages([]);
      setAllSubscriptionTransactions([]);
    }
  }, [user?.isSuperAdmin]);

  // FIX: Add real-time listeners for patient-specific data
  useEffect(() => {
    if (user && user.roleName === 'patient' && user.patientId && user.hospitalId) {
        const appointmentsUnsub = db.collection('appointments')
            .where('hospitalId', '==', user.hospitalId)
            .where('patientId', '==', user.patientId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment ));
                data.sort((a,b) => (b.start?.seconds || 0) - (a.start?.seconds || 0));
                setMyAppointments(data);
            }, err => console.error(`Error listening to myAppointments:`, err));

        const consultationsUnsub = db.collection('consultations')
            .where('hospitalId', '==', user.hospitalId)
            .where('patientId', '==', user.patientId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Consultation }));
                data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setMyConsultations(data);
            }, err => console.error(`Error listening to myConsultations:`, err));

        const invoicesUnsub = db.collection('invoices')
            .where('hospitalId', '==', user.hospitalId)
            .where('patientId', '==', user.patientId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice ));
                data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setMyInvoices(data);
            }, err => console.error(`Error listening to myInvoices:`, err));

        const posSalesUnsub = db.collection('posSales')
            .where('hospitalId', '==', user.hospitalId)
            .where('patientId', '==', user.patientId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as POSSale ));
                data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setMyPOSSales(data);
            }, err => console.error(`Error listening to myPOSSales:`, err));

        const doctorsUnsub = db.collection('doctors')
            .where('hospitalId', '==', user.hospitalId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as DoctorDocument }));
                setDoctors(data);
            }, err => console.error(`Error listening to doctors for patient:`, err));
            
        const treatmentsUnsub = db.collection('treatments')
            .where('hospitalId', '==', user.hospitalId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Treatment }));
                setTreatments(data);
            }, err => console.error(`Error listening to treatments for patient:`, err));

        const taxesUnsub = db.collection('taxes')
            .where('hospitalId', '==', user.hospitalId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Tax }));
                setTaxes(data);
            }, err => console.error(`Error listening to taxes for patient:`, err));

        const taxGroupsUnsub = db.collection('taxGroups')
            .where('hospitalId', '==', user.hospitalId)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as TaxGroup }));
                setTaxGroups(data);
            }, err => console.error(`Error listening to tax groups for patient:`, err));

        return () => {
            appointmentsUnsub();
            consultationsUnsub();
            invoicesUnsub();
            posSalesUnsub();
            doctorsUnsub();
            treatmentsUnsub();
            taxesUnsub();
            taxGroupsUnsub();
        };
    } else {
        setMyAppointments([]);
        setMyConsultations([]);
        setMyInvoices([]);
        setMyPOSSales([]);
    }
  }, [user]);


  useEffect(() => {
    // This listener is the single source of truth for the user's authentication state.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
            setUser(null);
            setLoading(false);
            return;
        }

        // FIX: Add function to process patient logins
        const processPatientLogin = async (patientDoc: DocumentSnapshot) => {
            if (!patientDoc.exists) {
                console.error("Patient document does not exist:", patientDoc.id);
                await auth.signOut();
                return;
            }
            const patientDocData = { id: patientDoc.id, ...patientDoc.data() } as PatientDocument;
            
            const hospitalDoc = await db.collection('hospitals').doc(patientDocData.hospitalId).get();
            if (!hospitalDoc.exists) {
                console.error("Hospital document not found for patient:", firebaseUser.uid);
                await auth.signOut();
                return;
            }
            const hospitalData = hospitalDoc.data() as Hospital;
        
            const patientAddress: Address = {
                street: patientDocData.address,
                city: '', country: '', pincode: ''
            };
            
            const appUser: AppUser = {
                id: patientDoc.id,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: patientDocData.name,
                phone: patientDocData.phone,
                address: patientAddress,
                profilePhotoUrl: patientDocData.profilePhotoUrl,
                roleName: 'patient',
                hospitalId: hospitalDoc.id,
                hospitalSlug: hospitalData.slug,
                hospitalName: hospitalData.name,
                hospitalLogoUrl: hospitalData.logoUrl,
                patientId: patientDoc.id,
                documents: patientDocData.documents,
                notes: patientDocData.notes,
                registeredAt: patientDocData.registeredAt,
                hospitalCurrency: hospitalData.currency,
                hospitalTimezone: hospitalData.timezone,
                hospitalDateFormat: hospitalData.dateFormat,
                hospitalTimeFormat: hospitalData.timeFormat,
                hospitalPhone: hospitalData.phone,
                hospitalEmail: hospitalData.email,
                hospitalAddress: hospitalData.address,
            };
            setUser(appUser);
        };
        
        // This function builds the final AppUser object and sets the app state.
        // It's called only after all checks have passed.
        const processUserLogin = async (userDoc: DocumentSnapshot) => {
            if (!userDoc.exists) {
                console.error("User document does not exist:", userDoc.id);
                await auth.signOut();
                return;
            }
            const userDocData = { id: userDoc.id, ...userDoc.data() } as UserDocument;

            if (userDocData.isSuperAdmin) {
                // FIX: Explicitly pass 'id' to satisfy the AppUser type, which requires a non-optional id.
                setUser({ ...userDocData, id: userDoc.id, uid: firebaseUser.uid, isSuperAdmin: true });
                return;
            }
            if (userDocData.status === 'inactive') {
                console.log("User is inactive. Signing out.");
                await auth.signOut();
                return;
            }
            
            const hospitalDoc = await db.collection('hospitals').doc(userDocData.hospitalId).get();
            if (!hospitalDoc.exists) {
                console.error("Hospital document not found for user:", firebaseUser.uid);
                await auth.signOut();
                return;
            }
            
            const hospitalData = hospitalDoc.data() as Hospital;
            let subscriptionPackage: SubscriptionPackage | undefined;
            if (hospitalData.subscriptionPackageId) {
                const packageDoc = await db.collection('subscriptionPackages').doc(hospitalData.subscriptionPackageId).get();
                if (packageDoc.exists) {
                    subscriptionPackage = { id: packageDoc.id, ...packageDoc.data() } as SubscriptionPackage;
                }
            }
            
            let permissions: Permissions;
            const customRolePermissions = hospitalData.rolePermissions;
            const userRole = userDocData.roleName;

            if (userRole !== 'owner' && customRolePermissions && customRolePermissions[userRole as EditableRole]) {
                permissions = customRolePermissions[userRole as EditableRole];
            } else {
                permissions = permissionsByRole[userRole];
            }
            
            const hospitalInvoiceSettings = {
                ...defaultInvoiceSettings,
                ...(hospitalData.invoiceSettings || {}),
                treatmentInvoice: {
                    ...defaultInvoiceSettings.treatmentInvoice,
                    ...(hospitalData.invoiceSettings?.treatmentInvoice || {})
                },
                posInvoice: {
                    ...defaultInvoiceSettings.posInvoice,
                    ...(hospitalData.invoiceSettings?.posInvoice || {})
                }
            };

            const appUser: AppUser = {
                // FIX: Explicitly pass 'id' to satisfy the AppUser type, which requires a non-optional id.
                ...userDocData, id: userDoc.id, uid: firebaseUser.uid, permissions,
                hospitalName: hospitalData.name, hospitalAddress: hospitalData.address, hospitalPhone: hospitalData.phone,
                hospitalEmail: hospitalData.email,
                hospitalLogoUrl: hospitalData.logoUrl, doctorId: userDocData.doctorId, hospitalCurrency: hospitalData.currency,
                hospitalTimezone: hospitalData.timezone, hospitalDateFormat: hospitalData.dateFormat, hospitalTimeFormat: hospitalData.timeFormat,
                hospitalFinancialYearStartMonth: hospitalData.financialYearStartMonth, hospitalStockCategories: hospitalData.stockCategories || [],
                hospitalStockUnitTypes: hospitalData.stockUnitTypes || [],
                hospitalStockBrands: hospitalData.stockBrands || [],
                hospitalExpenseCategories: hospitalData.expenseCategories || [],
                hospitalStatus: hospitalData.status, hospitalCreatedAt: hospitalData.createdAt,
                hospitalSubscriptionExpiryDate: hospitalData.subscriptionExpiryDate, subscriptionPackageId: hospitalData.subscriptionPackageId,
                subscriptionPackage: subscriptionPackage, hospitalSubscriptionInterval: hospitalData.subscriptionInterval,
                hospitalNotificationSettings: hospitalData.notificationSettings,
                hospitalInvoiceSettings: hospitalInvoiceSettings,
                hospitalEmailSettings: hospitalData.emailSettings,
                hospitalRolePermissions: hospitalData.rolePermissions,
                hospitalGstin: hospitalData.gstin,
                hospitalDlNo: hospitalData.dlNo,
                hospitalCinNo: hospitalData.cinNo,
                hospitalFssaiNo: hospitalData.fssaiNo,
                hospitalWebsite: hospitalData.website,
                hospitalTelephone: hospitalData.telephone,
                hospitalMonthlyBonuses: hospitalData.monthlyBonuses || [],
                hospitalEmployeeLocations: hospitalData.employeeLocations || [],
                hospitalEmployeeDepartments: hospitalData.employeeDepartments || [],
                hospitalEmployeeDesignations: hospitalData.employeeDesignations || [],
                hospitalEmployeeShifts: hospitalData.employeeShifts || [],
                assignedLocations: userDocData.assignedLocations || [], // Ensure it's always an array
            };
            setUser(appUser);

            if (appUser.hospitalId) {
                await createAuditLog(
                    appUser,
                    'LOGIN',
                    'USER',
                    appUser.uid,
                    `${appUser.name} logged in.`
                );
            }
        };

        // --- Start Auth Flow ---
        const userDocSnap = await fetchUserDoc(firebaseUser.uid);

        if (userDocSnap && userDocSnap.exists) {
            const userDocData = userDocSnap.data() as UserDocument;
            
            // GATEKEEPER: Centralized check for email verification.
            if (!firebaseUser.emailVerified && !userDocData.isSuperAdmin) {
                // This user is not verified. Do not log them in.
                // We also don't sign them out to allow them to resend their verification email.
                setUser(null);
                setLoading(false);
                return;
            }
            
            await processUserLogin(userDocSnap);
            setLoading(false);

        } else {
            // FIX: Check if it's a patient login
            const patientQuery = await db.collection('patients').where('uid', '==', firebaseUser.uid).limit(1).get();
            if (!patientQuery.empty) {
                if (!firebaseUser.emailVerified) {
                    setUser(null);
                    setLoading(false);
                    return;
                }
                await processPatientLogin(patientQuery.docs[0]);
                setLoading(false);
                return;
            }
            
            // Document not found. This is likely a new user signup race condition.
            const creationTime = new Date(firebaseUser.metadata.creationTime!).getTime();
            const lastSignInTime = new Date(firebaseUser.metadata.lastSignInTime!).getTime();
            const isNewUser = Math.abs(creationTime - lastSignInTime) < 2500; // 2.5s tolerance

            if (isNewUser) {
                // Do nothing. The signup function is responsible for creating the user doc
                // and then signing the user out. The subsequent onAuthStateChanged(null)
                // event will correctly handle the state. This avoids a race condition.
            } else {
                // Existing user with no doc. This is an error.
                console.error("User document not found for existing UID:", firebaseUser.uid);
                await auth.signOut();
                setUser(null);
                setLoading(false);
            }
        }
    });

    return () => unsubscribe();
}, []);

  // FIX: Added a real-time listener for the currently logged-in user's document.
  // This ensures that any changes to their profile (name, photo, role, status)
  // are immediately reflected in the app's global state and UI, such as the header.
  useEffect(() => {
    if (user && user.id && !user.isSuperAdmin) {
      const collectionName = user.roleName === 'patient' ? 'patients' : 'users';
      const unsubscribe = db.collection(collectionName).doc(user.id).onSnapshot(
        (doc) => {
          if (doc.exists) {
            console.log("AuthContext - Raw doc.data():", doc.data());
            console.log("AuthContext - doc.data()?.assignedLocations:", doc.data()?.assignedLocations);
            
            if (user.roleName === 'patient') {
                const updatedPatientDoc = { id: doc.id, ...doc.data() } as PatientDocument;
                setUser(prevUser => {
                    if (!prevUser) return null;
                    const patientAddress: Address = { street: updatedPatientDoc.address, city: '', country: '', pincode: '' };
                    return {
                        ...prevUser,
                        name: updatedPatientDoc.name,
                        phone: updatedPatientDoc.phone,
                        address: patientAddress,
                        profilePhotoUrl: updatedPatientDoc.profilePhotoUrl,
                        documents: updatedPatientDoc.documents,
                        notes: updatedPatientDoc.notes,
                    };
                });
                return;
            }

            const updatedUserDoc = { id: doc.id, ...doc.data() } as UserDocument;
            
            if (updatedUserDoc.status === 'inactive') {
              console.log("User has been made inactive. Logging out.");
              auth.signOut();
              return;
            }

            setUser(prevUser => {
              if (!prevUser) return null;

              const newPermissions = prevUser.hospitalRolePermissions
                ? prevUser.hospitalRolePermissions[updatedUserDoc.roleName as EditableRole] || permissionsByRole[updatedUserDoc.roleName]
                : permissionsByRole[updatedUserDoc.roleName];

              const newUser = {
                ...prevUser,
                ...updatedUserDoc,
                permissions: newPermissions,
              };
              return newUser;
            });
          } else {
            console.warn("Current user's document was deleted. Logging out.");
            auth.signOut();
          }
        },
        (error) => {
          console.error("Error listening to user document:", error);
        }
      );

      return () => unsubscribe();
    }
  }, [user?.id, user?.isSuperAdmin, user?.roleName]);

  // Real-time listener for the hospital document to sync status, subscription, etc.
  useEffect(() => {
    if (user && user.hospitalId && !user.isSuperAdmin) {
      const hospitalUnsubscribe = db.collection('hospitals').doc(user.hospitalId).onSnapshot(async (hospitalDoc) => {
        if (hospitalDoc.exists) {
            const hospitalData = hospitalDoc.data() as Hospital;

            if (hospitalData.status === 'inactive') {
                console.log("Hospital account has been suspended. Logging out.");
                await auth.signOut();
                return;
            }

            let subscriptionPackage: SubscriptionPackage | undefined = user.subscriptionPackage;
            if (hospitalData.subscriptionPackageId && hospitalData.subscriptionPackageId !== user.subscriptionPackageId) {
                const packageDoc = await db.collection('subscriptionPackages').doc(hospitalData.subscriptionPackageId).get();
                if (packageDoc.exists) {
                    subscriptionPackage = { id: packageDoc.id, ...packageDoc.data() } as SubscriptionPackage;
                }
            } else if (!hospitalData.subscriptionPackageId) {
                subscriptionPackage = undefined;
            }

            setUser(prevUser => {
                if (!prevUser) return null;

                const commonUpdates: Partial<AppUser> = {
                    hospitalName: hospitalData.name,
                    hospitalAddress: hospitalData.address,
                    hospitalPhone: hospitalData.phone,
                    hospitalEmail: hospitalData.email,
                    hospitalLogoUrl: hospitalData.logoUrl,
                    hospitalStatus: hospitalData.status,
                    hospitalCurrency: hospitalData.currency,
                    hospitalTimezone: hospitalData.timezone,
                    hospitalDateFormat: hospitalData.dateFormat,
                    hospitalTimeFormat: hospitalData.timeFormat,
                };

                if (prevUser.roleName === 'patient') {
                    return { ...prevUser, ...commonUpdates };
                }

                const customRolePermissions = hospitalData.rolePermissions;
                const userRole = prevUser.roleName;
                let permissions: Permissions;
                if (userRole !== 'owner' && customRolePermissions && customRolePermissions[userRole as EditableRole]) {
                    permissions = customRolePermissions[userRole as EditableRole];
                } else {
                    permissions = permissionsByRole[userRole];
                }
                
                const hospitalInvoiceSettings = {
                    ...defaultInvoiceSettings,
                    ...(hospitalData.invoiceSettings || {}),
                    treatmentInvoice: { ...defaultInvoiceSettings.treatmentInvoice, ...(hospitalData.invoiceSettings?.treatmentInvoice || {}) },
                    posInvoice: { ...defaultInvoiceSettings.posInvoice, ...(hospitalData.invoiceSettings?.posInvoice || {}) }
                };

                return {
                    ...prevUser,
                    ...commonUpdates,
                    permissions,
                    hospitalFinancialYearStartMonth: hospitalData.financialYearStartMonth,
                    hospitalStockCategories: hospitalData.stockCategories || [],
                    hospitalStockUnitTypes: hospitalData.stockUnitTypes || [],
                    hospitalStockBrands: hospitalData.stockBrands || [],
                    hospitalExpenseCategories: hospitalData.expenseCategories || [],
                    hospitalCreatedAt: hospitalData.createdAt,
                    hospitalSubscriptionExpiryDate: hospitalData.subscriptionExpiryDate,
                    subscriptionPackageId: hospitalData.subscriptionPackageId,
                    subscriptionPackage: subscriptionPackage,
                    hospitalSubscriptionInterval: hospitalData.subscriptionInterval,
                    hospitalNotificationSettings: hospitalData.notificationSettings,
                    hospitalInvoiceSettings,
                    hospitalEmailSettings: hospitalData.emailSettings,
                    hospitalRolePermissions: hospitalData.rolePermissions,
                    hospitalGstin: hospitalData.gstin,
                    hospitalDlNo: hospitalData.dlNo,
                    hospitalCinNo: hospitalData.cinNo,
                    hospitalFssaiNo: hospitalData.fssaiNo,
                    hospitalWebsite: hospitalData.website,
                    hospitalTelephone: hospitalData.telephone,
                    hospitalMonthlyBonuses: hospitalData.monthlyBonuses || [],
                    hospitalEmployeeLocations: hospitalData.employeeLocations || [],
                    hospitalEmployeeDepartments: hospitalData.employeeDepartments || [],
                    hospitalEmployeeDesignations: hospitalData.employeeDesignations || [],
                    hospitalEmployeeShifts: hospitalData.employeeShifts || [],
                };
            });

        } else {
            console.warn("Hospital document associated with this user was deleted. Logging out.");
            await auth.signOut();
        }
      }, (error) => {
        console.error("Error listening to hospital document:", error);
      });

      return () => hospitalUnsubscribe();
    }
  }, [user?.hospitalId, user?.subscriptionPackageId]);

  // Real-time listener for hospital locations
  useEffect(() => {
    if (user && user.hospitalId && !user.isSuperAdmin && user.roleName !== 'patient') {
        const unsubscribe = db.collection('hospitalLocations')
            .where('hospitalId', '==', user.hospitalId)
            .onSnapshot(snapshot => {
                const locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HospitalLocation));
                
                setUser(prevUser => {
                    if (!prevUser) return null;
                    
                    let newCurrentLocation: HospitalLocation | null = null;
                    if (locations.length > 0) {
                        const savedLocationId = localStorage.getItem(`currentLocation_${prevUser.uid}`);
                        const savedLocation = locations.find(l => l.id === savedLocationId);
                        
                        if (savedLocation) {
                            newCurrentLocation = savedLocation;
                        } else {
                            // If current location is no longer valid, switch to first
                            const currentIsValid = prevUser.currentLocation && locations.some(l => l.id === prevUser.currentLocation?.id);
                            if (currentIsValid) {
                                newCurrentLocation = prevUser.currentLocation;
                            } else {
                                newCurrentLocation = locations[0];
                                localStorage.setItem(`currentLocation_${prevUser.uid}`, locations[0].id);
                            }
                        }
                    }

                    return {
                        ...prevUser,
                        hospitalLocations: locations,
                        currentLocation: newCurrentLocation,
                    };
                });
            }, err => console.error("Error listening to locations:", err));
        return () => unsubscribe();
    } else {
        // Clear locations if user logs out or is not applicable
        setUser(prevUser => {
            if (prevUser && (prevUser.hospitalLocations?.length || prevUser.currentLocation)) {
                return { ...prevUser, hospitalLocations: [], currentLocation: null };
            }
            return prevUser;
        });
    }
}, [user?.uid, user?.hospitalId, user?.isSuperAdmin, user?.roleName]);

  const login = useCallback(async (email: string, pass: string) => {
    const userCredential = await auth.signInWithEmailAndPassword(email, pass);
    const firebaseUser = userCredential.user!;

    const userDocSnap = await fetchUserDoc(firebaseUser.uid);
    
    if (userDocSnap && userDocSnap.exists) {
        const userData = userDocSnap.data() as UserDocument;

        if (!firebaseUser.emailVerified && !userData.isSuperAdmin) {
            const verificationError = new Error('Email not verified.');
            (verificationError as any).isVerificationError = true;
            (verificationError as any).firebaseUser = firebaseUser;
            throw verificationError;
        }

        if (userData.status === 'inactive') {
            await auth.signOut();
            throw new Error('Your account is inactive. Please contact your administrator.');
        }
    } else {
        // If not found in users, check patients collection.
        const patientQuery = await db.collection('patients').where('uid', '==', firebaseUser.uid).limit(1).get();
        if (patientQuery.empty) {
            await auth.signOut();
            throw new Error('User data not found. Please contact support.');
        }
        if (!firebaseUser.emailVerified) {
            const verificationError = new Error('Email not verified.');
            (verificationError as any).isVerificationError = true;
            (verificationError as any).firebaseUser = firebaseUser;
            throw verificationError;
        }
    }
  }, []);

  // FIX: Update signup function signature and implementation to handle patient activation
  const signup = useCallback(async (isInvited: boolean, isPatient: boolean, data: SignUpData, patientIdToLink?: string) => {
    const { 
        userEmail, userPassword,
        hospitalName, hospitalAddress, hospitalPhone, hospitalEmail, hospitalLogo, userName, userPhone, userAddress
    } = data;

    if (!userPassword) throw new Error("Password is required.");

    const userCredential = await auth.createUserWithEmailAndPassword(userEmail, userPassword);
    const firebaseUser = userCredential.user!;
    await firebaseUser.sendEmailVerification();

    const profilePhotoUrl = '';

    if (isPatient && patientIdToLink) {
        // This is a patient activating their account
        const patientDocRef = db.collection('patients').doc(patientIdToLink);
        const patientDoc = await patientDocRef.get();
        if (!patientDoc.exists) throw new Error("Patient record not found for activation.");
        
        await patientDocRef.update({
            uid: firebaseUser.uid,
            email: userEmail,
        });
    } else if (isInvited) {
        // This is an invited user completing registration
        const usersRef = db.collection("users");
        const q = usersRef.where("email", "==", userEmail).where("status", "==", "invited");
        const querySnapshot = await q.get();
        if (querySnapshot.empty) throw new Error("No pending invitation found for this email.");
        
        const userDoc = querySnapshot.docs[0];
        const userDocRef = db.collection('users').doc(userDoc.id);

        await userDocRef.update({
            uid: firebaseUser.uid,
            status: 'active',
        });
        
    } else {
        // This is a new hospital registration
        
        // Find or create the Free Plan
        const packagesRef = db.collection('subscriptionPackages');
        let freePackageSnap = await packagesRef.where('name', '==', 'Free Plan').limit(1).get();
        let freePackageId: string;
        let freePackageData: SubscriptionPackage | NewSubscriptionPackageData;
        
        if (freePackageSnap.empty) {
            freePackageData = {
                name: 'Free Plan',
                description: 'Basic features for getting started. Upgrade anytime.',
                prices: { monthly: 0, quarterly: 0, yearly: 0 },
                maxUsers: 2, maxDoctors: 1, maxPatients: 50, maxProducts: 25, maxTreatments: 25,
                maxReservationsPerMonth: 100, maxSalesPerMonth: 100, maxExpensesPerMonth: 100,
            };
            const newPackageRef = await packagesRef.add(freePackageData);
            freePackageId = newPackageRef.id;
        } else {
            freePackageId = freePackageSnap.docs[0].id;
            freePackageData = { id: freePackageSnap.docs[0].id, ...freePackageSnap.docs[0].data() } as SubscriptionPackage;
        }
        
        let logoUrl = '';
        if (hospitalLogo) {
            logoUrl = await uploadFile(hospitalLogo, `hospitalLogos/${firebaseUser.uid}/${hospitalLogo.name}`);
        }
        
        const hospitalSlug = hospitalName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const farFutureDate = new Date('9999-12-31');

        // FIX: Use v8 Firestore syntax
        const hospitalRef = await db.collection('hospitals').add({
          name: hospitalName,
          slug: hospitalSlug,
          phone: hospitalPhone,
          email: hospitalEmail,
          address: hospitalAddress,
          logoUrl: logoUrl,
// FIX: Cast serverTimestamp() to Timestamp to resolve type mismatch.
          createdAt: serverTimestamp() as Timestamp,
          ownerId: firebaseUser.uid,
          status: 'active',
          subscriptionStatus: 'active',
          subscriptionExpiryDate: firebase.firestore.Timestamp.fromDate(farFutureDate),
          subscriptionPackageId: freePackageId,
          subscriptionInterval: 'monthly',
          lastPatientNumber: 0,
          lastStockTransferNumber: 0,
          lastExpenseNumber: 0,
          lastVendorNumber: 0,
          lastEmployeeNumber: 0,
          lastLoanNumber: 0,
          currency: 'USD',
          timezone: '(UTC+00:00) Coordinated Universal Time',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12-hour',
          financialYearStartMonth: 'April',
          stockCategories: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment'],
          stockUnitTypes: ['pcs', 'box', 'mg', 'g', 'kg', 'ml', 'l'],
          stockBrands: [],
          expenseCategories: ['Rent', 'Salaries', 'Utilities', 'Supplies', 'Marketing'],
          rolePermissions: {
            admin: adminPermissions,
            staff: staffPermissions,
            doctor: doctorPermissions
          }
        });
        
        // Create the first default location for the hospital
        const locationRef = await db.collection('hospitalLocations').add({
          hospitalId: hospitalRef.id,
          name: hospitalName, // Using hospital name as the first branch name
          address: hospitalAddress,
          phone: hospitalPhone,
          email: hospitalEmail,
        });

        const userProfile: UserDocument = {
          uid: firebaseUser.uid,
          name: userName,
          email: userEmail,
          phone: userPhone,
          address: userAddress,
          profilePhotoUrl,
          roleName: 'owner',
          hospitalId: hospitalRef.id,
          hospitalSlug,
          status: 'active',
          assignedLocations: [locationRef.id], // Assign the new location ID here.
        };
        await db.collection('users').doc(firebaseUser.uid).set(userProfile);
    }
    await auth.signOut();
  }, [uploadFile]);

  const logout = useCallback(async () => {
    try {
      if (user) {
        await createAuditLog(
            user,
            'LOGOUT',
            'USER',
            user.uid,
            `${user.name} logged out.`
        );
      }
      // FIX: Use v8 auth syntax
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [user]);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
      await auth.sendPasswordResetEmail(email);
  }, []);
  
  // FIX: Implement setCurrentLocation and add location properties to the context value.
  const setCurrentLocation = useCallback((locationId: string) => {
    setUser(prevUser => {
        if (!prevUser || !prevUser.hospitalLocations) return prevUser;
        const newLocation = prevUser.hospitalLocations.find(l => l.id === locationId);
        if (newLocation) {
            localStorage.setItem(`currentLocation_${prevUser.uid}`, locationId);
            return { ...prevUser, currentLocation: newLocation };
        }
        return prevUser;
    });
  }, [setUser]);

  // Instantiate management hooks
  const superAdminMgmt = useSuperAdmin(user);
  const subscriptionMgmt = useSubscriptionManagement(user, setUser);
  const userMgmt = useUserManagement(user, uploadFile, setUser);
  const clinicMgmt = useClinicManagement(user, uploadFile);
  const patientCareMgmt = usePatientCare(user, uploadFile);
  const financialMgmt = useFinancialManagement(user, uploadFile);
  const inventoryMgmt = useInventoryManagement(user, uploadFile, setUser);
  const settingsMgmt = useSettingsManagement(user, setUser, uploadFile);
  const payrollMgmt = usePayrollManagement(user, uploadFile);

  // FIX: Provide real-time data to context to satisfy AuthContextType
  const contextValue: AuthContextType = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    sendPasswordResetEmail,
    invoiceToPrint,
    setInvoiceToPrint,
    // FIX: Add missing properties to context value
    hospitalLocations: user?.hospitalLocations || [],
    currentLocation: user?.currentLocation || null,
    setCurrentLocation,
    patients, doctors, treatments, medicines, consultations, usersForHospital, stockItems, stockOrders, stockReturns, stockTransfers, vendors, peripherals, employees, loans, taxes, taxGroups, salaryComponents, salaryGroups,
    myAppointments, myConsultations, myInvoices, myPOSSales,
    allHospitals, allSubscriptionPackages, allSubscriptionTransactions,
    ...superAdminMgmt,
    ...subscriptionMgmt,
    ...userMgmt,
    ...clinicMgmt,
    ...patientCareMgmt,
    ...financialMgmt,
    ...inventoryMgmt,
    ...settingsMgmt,
    // FIX: Add payroll management functions to the context value to match AuthContextType.
    ...payrollMgmt,
  }), [
      user, loading, login, signup, logout, sendPasswordResetEmail,
      invoiceToPrint,
      // FIX: Add missing properties to dependency array
      setCurrentLocation,
      patients, doctors, treatments, medicines, consultations, usersForHospital, stockItems, stockOrders, stockReturns, stockTransfers, vendors, peripherals, employees, loans, taxes, taxGroups, salaryComponents, salaryGroups,
      myAppointments, myConsultations, myInvoices, myPOSSales,
      allHospitals, allSubscriptionPackages, allSubscriptionTransactions,
      superAdminMgmt, subscriptionMgmt, userMgmt, clinicMgmt,
      patientCareMgmt, financialMgmt, inventoryMgmt, settingsMgmt,
      // FIX: Add payrollMgmt to the dependency array.
      payrollMgmt
  ]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};