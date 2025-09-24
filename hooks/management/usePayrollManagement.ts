// FIX: Add 'React' import to resolve namespace errors.
import React, { useCallback } from 'react';
import { db, storage } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import {
    AppUser, PayrollRun, Payslip, Employee, NewEmployeeData, SalaryComponent, NewSalaryComponentData, SalaryGroup, NewSalaryGroupData, PayslipItem, EmployeeDocument, SalaryHistoryEntry, Loan, NewLoanData, LoanStatus, LoanRepayment, Timestamp, ProofType
} from '../../types';

const { serverTimestamp, increment } = firebase.firestore.FieldValue;
type UploadFileFunction = (file: File | Blob, path: string) => Promise<string>;

export const usePayrollManagement = (user: AppUser | null, uploadFile: UploadFileFunction) => {

    const getEmployees = useCallback(async (): Promise<Employee[]> => {
        if (!user || !user.hospitalId) return [];
        let q: firebase.firestore.Query = db.collection('employees').where('hospitalId', '==', user.hospitalId);

        if (user.roleName !== 'owner' && user.roleName !== 'admin' && user.currentLocation) {
            q = q.where("locationId", "==", user.currentLocation.id);
        }

        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    }, [user]);

    const getEmployeeById = useCallback(async (employeeId: string): Promise<Employee | null> => {
        if (!user || !user.hospitalId) return null;
        const doc = await db.collection('employees').doc(employeeId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) {
            return { id: doc.id, ...doc.data() } as Employee;
        }
        return null;
    }, [user]);

    const addEmployee = useCallback(async (data: NewEmployeeData) => {
// FIX: Add check for user.currentLocation
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User not authenticated or location not set");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const newEmployeeRef = db.collection('employees').doc();
        const employeeId = newEmployeeRef.id;

        await db.runTransaction(async t => {
            const hospitalDoc = await t.get(hospitalRef);
            if (!hospitalDoc.exists) throw new Error("Hospital not found");
            const lastEmployeeNumber = hospitalDoc.data()!.lastEmployeeNumber || 0;
            const newEmployeeIdDisplay = `EMP-${String(lastEmployeeNumber + 1).padStart(4, '0')}`;

            const { profilePhoto, newDocuments, joiningDate, ...restData } = data;
            
            let profilePhotoUrl = '';
            if (profilePhoto) {
                let photoToUpload: Blob;
                if (typeof profilePhoto === 'string') photoToUpload = await (await fetch(profilePhoto)).blob();
                else photoToUpload = profilePhoto;
                const photoName = `${Date.now()}`;
                profilePhotoUrl = await uploadFile(photoToUpload, `employeePhotos/${user.hospitalId}/${employeeId}/${photoName}`);
            }

            const documents: EmployeeDocument[] = [];
            if (newDocuments) {
                for (const doc of newDocuments) {
                    const docName = `${Date.now()}-${doc.file.name}`;
                    const url = await uploadFile(doc.file, `employeeDocuments/${user.hospitalId}/${employeeId}/${docName}`);
                    documents.push({ id: db.collection('_').doc().id, name: doc.file.name, type: doc.type, url });
                }
            }

            const employeeData: Omit<Employee, 'id'> = {
                ...restData,
                profilePhotoUrl,
                documents,
                employeeId: newEmployeeIdDisplay,
                hospitalId: user.hospitalId,
// FIX: Add locationId to new employee
                locationId: user.currentLocation.id,
                joiningDate: firebase.firestore.Timestamp.fromDate(new Date(joiningDate)),
                salaryHistory: [{
                    effectiveDate: firebase.firestore.Timestamp.fromDate(new Date(joiningDate)),
                    annualCTC: data.annualCTC,
                    salaryGroupId: data.salaryGroupId!,
                    revisedBy: user.name
                }]
            };
            t.set(newEmployeeRef, employeeData);
            t.update(hospitalRef, { lastEmployeeNumber: increment(1) });
        });
    }, [user, uploadFile]);
    
    const updateEmployee = useCallback(async (employeeId: string, data: Partial<NewEmployeeData>) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const employeeRef = db.collection('employees').doc(employeeId);
        const { profilePhoto, newDocuments, removedDocumentIds, joiningDate, ...restData } = data;
        const updateData: { [key: string]: any } = { ...restData };
        if(joiningDate) updateData.joiningDate = firebase.firestore.Timestamp.fromDate(new Date(joiningDate));

        const employeeDoc = await employeeRef.get();
        if (!employeeDoc.exists) throw new Error("Employee not found");
        const existingEmployee = employeeDoc.data() as Employee;
        
        if (profilePhoto === null) {
            if(existingEmployee.profilePhotoUrl) await storage.refFromURL(existingEmployee.profilePhotoUrl).delete().catch(console.warn);
            updateData.profilePhotoUrl = '';
        } else if (profilePhoto) {
            if(existingEmployee.profilePhotoUrl) await storage.refFromURL(existingEmployee.profilePhotoUrl).delete().catch(console.warn);
            let photoToUpload: Blob;
            if (typeof profilePhoto === 'string') photoToUpload = await (await fetch(profilePhoto)).blob();
            else photoToUpload = profilePhoto;
            const photoName = `${Date.now()}`;
            updateData.profilePhotoUrl = await uploadFile(photoToUpload, `employeePhotos/${user.hospitalId}/${employeeId}/${photoName}`);
        }
        
        let currentDocuments = existingEmployee.documents || [];
        if (removedDocumentIds) {
            for (const docId of removedDocumentIds) {
                const docToRemove = currentDocuments.find(d => d.id === docId);
                if (docToRemove) await storage.refFromURL(docToRemove.url).delete().catch(console.warn);
            }
            currentDocuments = currentDocuments.filter(d => !removedDocumentIds.includes(d.id));
        }
        if (newDocuments) {
             for (const doc of newDocuments) {
                const docName = `${Date.now()}-${doc.file.name}`;
                const url = await uploadFile(doc.file, `employeeDocuments/${user.hospitalId}/${employeeId}/${docName}`);
                currentDocuments.push({ id: db.collection('_').doc().id, name: doc.file.name, type: doc.type, url });
            }
        }
        updateData.documents = currentDocuments;
        
        await employeeRef.update(updateData);
    }, [user, uploadFile]);

    const updateEmployeeStatus = useCallback(async (employeeId: string, status: 'active' | 'inactive') => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        await db.collection('employees').doc(employeeId).update({ status });
    }, [user]);

    const deleteEmployee = useCallback(async (employeeId: string) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        await db.collection('employees').doc(employeeId).delete();
    }, [user]);
    
    const reviseEmployeeSalary = useCallback(async (employeeId: string, newCTC: number, newGroupId: string) => {
        if (!user) throw new Error("User not authenticated");
        const employeeRef = db.collection('employees').doc(employeeId);
        const newHistoryEntry: SalaryHistoryEntry = {
            effectiveDate: firebase.firestore.Timestamp.now(),
            annualCTC: newCTC,
            salaryGroupId: newGroupId,
            revisedBy: user.name
        };
        await employeeRef.update({
            annualCTC: newCTC,
            salaryGroupId: newGroupId,
            salaryHistory: firebase.firestore.FieldValue.arrayUnion(newHistoryEntry)
        });
    }, [user]);

    const getSalaryComponents = useCallback(async (): Promise<SalaryComponent[]> => {
        if (!user) return [];
        const snapshot = await db.collection('salaryComponents').where('hospitalId', '==', user.hospitalId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryComponent));
    }, [user]);

    const addSalaryComponent = useCallback(async (data: NewSalaryComponentData) => {
        if (!user) throw new Error("Not authenticated");
        await db.collection('salaryComponents').add({ ...data, hospitalId: user.hospitalId });
    }, [user]);

    const updateSalaryComponent = useCallback(async (id: string, data: NewSalaryComponentData) => {
        await db.collection('salaryComponents').doc(id).update(data);
    }, []);

    const deleteSalaryComponent = useCallback(async (id: string) => {
        await db.collection('salaryComponents').doc(id).delete();
    }, []);

    const getSalaryGroups = useCallback(async (): Promise<SalaryGroup[]> => {
        if (!user) return [];
        const snapshot = await db.collection('salaryGroups').where('hospitalId', '==', user.hospitalId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryGroup));
    }, [user]);

    const addSalaryGroup = useCallback(async (data: NewSalaryGroupData) => {
        if (!user) throw new Error("Not authenticated");
        await db.collection('salaryGroups').add({ ...data, hospitalId: user.hospitalId });
    }, [user]);

    const updateSalaryGroup = useCallback(async (id: string, data: NewSalaryGroupData) => {
        await db.collection('salaryGroups').doc(id).update(data);
    }, []);

    const deleteSalaryGroup = useCallback(async (id: string) => {
        await db.collection('salaryGroups').doc(id).delete();
    }, []);

    const getPayrollRuns = useCallback(async (): Promise<PayrollRun[]> => {
        if (!user) return [];
        let q: firebase.firestore.Query = db.collection('payrollRuns').where('hospitalId', '==', user.hospitalId);

        if (user.roleName !== 'owner' && user.roleName !== 'admin' && user.currentLocation) {
            q = q.where("locationId", "==", user.currentLocation.id);
        }

        const snapshot = await q.get();
        const runs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollRun));
        runs.sort((a,b) => b.period.localeCompare(a.period));
        return runs;
    }, [user]);
    
    const getLoans = useCallback(async (): Promise<Loan[]> => {
        if (!user) return [];
        let q: firebase.firestore.Query = db.collection('loans').where('hospitalId', '==', user.hospitalId);

        if (user.roleName !== 'owner' && user.roleName !== 'admin' && user.currentLocation) {
            q = q.where("locationId", "==", user.currentLocation.id);
        }

        const snapshot = await q.get();
        const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
        loans.sort((a,b) => b.disbursementDate.seconds - a.disbursementDate.seconds);
        return loans;
    }, [user]);

    const getLoanById = useCallback(async (loanId: string): Promise<Loan | null> => {
        if (!user) return null;
        const doc = await db.collection('loans').doc(loanId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) {
            return { id: doc.id, ...doc.data() } as Loan;
        }
        return null;
    }, [user]);

    const addLoan = useCallback(async (data: NewLoanData) => {
// FIX: Add check for user.currentLocation
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("Not authenticated or location not set");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const newLoanRef = db.collection('loans').doc();

        await db.runTransaction(async t => {
            const hospitalDoc = await t.get(hospitalRef);
            if (!hospitalDoc.exists) throw new Error("Hospital not found");
            const lastLoanNumber = hospitalDoc.data()!.lastLoanNumber || 0;
            const newLoanIdDisplay = `L-${String(lastLoanNumber + 1).padStart(4, '0')}`;

            const employeeDoc = await db.collection('employees').doc(data.employeeId).get();
            if (!employeeDoc.exists) throw new Error("Employee not found");
            
            const loanData: Omit<Loan, 'id'> = {
                ...data,
                loanId: newLoanIdDisplay,
                employeeName: employeeDoc.data()!.name,
                disbursementDate: firebase.firestore.Timestamp.fromDate(new Date(data.disbursementDate)),
                repaymentStartDate: firebase.firestore.Timestamp.fromDate(new Date(data.repaymentStartDate)),
                status: 'pending',
                amountPaid: 0,
                repaymentHistory: [],
                createdBy: user.name,
                createdAt: firebase.firestore.Timestamp.now(),
                hospitalId: user.hospitalId!,
// FIX: Add locationId to new loan
                locationId: user.currentLocation.id,
            };
            t.set(newLoanRef, loanData);
            t.update(hospitalRef, { lastLoanNumber: increment(1) });
        });
    }, [user]);

    const updateLoanStatus = useCallback(async (loanId: string, status: LoanStatus) => {
        await db.collection('loans').doc(loanId).update({ status });
    }, []);

    const createPayrollRun = useCallback(async (period: string): Promise<string> => {
// FIX: Add check for user.currentLocation
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("Not authenticated or location not set");
        
        // Check for existing run
        const existingRun = await db.collection('payrollRuns').where('hospitalId', '==', user.hospitalId).where('period', '==', period).limit(1).get();
        if(!existingRun.empty) throw new Error(`A payroll run for ${period} already exists.`);

        // Fetch all data needed
        const [employees, salaryGroups, salaryComponents, loans, monthlyBonuses] = await Promise.all([
            getEmployees(), getSalaryGroups(), getSalaryComponents(), getLoans(), Promise.resolve(user.hospitalMonthlyBonuses || [])
        ]);

        const activeEmployees = employees.filter(e => e.status === 'active' && e.salaryGroupId && e.annualCTC > 0);
        if (activeEmployees.length === 0) throw new Error("No active employees with salary details found to run payroll.");

        const groupMap = new Map(salaryGroups.map(g => [g.id, g]));
        const componentMap = new Map(salaryComponents.map(c => [c.id, c]));
        
        const activeLoans = loans.filter(l => l.status === 'active' && l.repaymentStartDate.toDate() <= new Date(`${period}-28`));
        const bonusForPeriod = monthlyBonuses.find(b => b.period === period);

        const payslips: Payslip[] = activeEmployees.map(emp => {
            const group = groupMap.get(emp.salaryGroupId!);
            // FIX: Add null check for group to prevent accessing properties on undefined.
            if (!group) return null;

            const monthlyCTC = emp.annualCTC / 12;
            const earnings: PayslipItem[] = [];
            const deductions: PayslipItem[] = [];
            let basicPay = 0;
            let totalEarnings = 0;

            const groupComponents = group.components.map(id => componentMap.get(id)).filter(Boolean) as SalaryComponent[];

            const basicComponent = groupComponents.find(c => c.name.toLowerCase() === 'basic pay');
            if (basicComponent) {
                if (basicComponent.calculationType === 'percentage-ctc') basicPay = monthlyCTC * (basicComponent.value / 100);
                else if (basicComponent.calculationType === 'flat') basicPay = basicComponent.value;
                earnings.push({ id: basicComponent.id!, name: basicComponent.name, amount: basicPay });
                totalEarnings += basicPay;
            }

            groupComponents.forEach(comp => {
                if (comp.id === basicComponent?.id) return;
                let amount = 0;
                if (comp.calculationType === 'flat') amount = comp.value;
                else if (comp.calculationType === 'percentage-ctc') amount = monthlyCTC * (comp.value / 100);
                else if (comp.calculationType === 'percentage-basic' && basicPay > 0) amount = basicPay * (comp.value / 100);

                if (comp.type === 'earning') { earnings.push({ id: comp.id!, name: comp.name, amount }); totalEarnings += amount; }
                else { deductions.push({ id: comp.id!, name: comp.name, amount }); }
            });

            const specialAllowance = monthlyCTC - totalEarnings;
            if (specialAllowance > 0) earnings.push({ id: 'special-allowance', name: 'Special Allowance', amount: specialAllowance });

            const additionalEarnings: PayslipItem[] = [];
            const additionalDeductions: PayslipItem[] = [];

            if (bonusForPeriod) {
                let bonusAmount = 0;
                if (bonusForPeriod.type === 'flat') bonusAmount = bonusForPeriod.value;
                else if (bonusForPeriod.type === 'percentage-ctc') bonusAmount = monthlyCTC * (bonusForPeriod.value / 100);
                additionalEarnings.push({ id: bonusForPeriod.id, name: bonusForPeriod.description, amount: bonusAmount });
            }

            const employeeLoans = activeLoans.filter(l => l.employeeId === emp.id);
            employeeLoans.forEach(loan => {
                const remaining = loan.loanAmount - loan.amountPaid;
                const installment = Math.min(loan.installmentAmount, remaining);
                if (installment > 0) additionalDeductions.push({ id: loan.id!, name: `Loan Repayment (${loan.loanId})`, amount: installment });
            });

            const grossSalary = earnings.reduce((s,i) => s + i.amount, 0) + additionalEarnings.reduce((s,i) => s + i.amount, 0);
            const totalDeductions = deductions.reduce((s,i) => s + i.amount, 0) + additionalDeductions.reduce((s,i) => s + i.amount, 0);
            const netPay = grossSalary - totalDeductions;
            
            return {
                id: db.collection('_').doc().id, employeeId: emp.id!, userName: emp.name, userRole: emp.userId ? 'staff' : 'doctor',
                annualCTC: emp.annualCTC, monthlyCTC, earnings, additionalEarnings, deductions, additionalDeductions,
                grossSalary, totalDeductions, netPay, status: 'Unpaid'
            };
        }).filter(Boolean) as Payslip[];

        const totalAmount = payslips.reduce((sum, p) => sum + p.netPay, 0);

        const newRun: Omit<PayrollRun, 'id'> = {
            period, runDate: firebase.firestore.Timestamp.now(), totalAmount, status: 'draft', payslips, hospitalId: user.hospitalId!,
// FIX: Add locationId to new payroll run
            locationId: user.currentLocation.id,
        };

        const docRef = await db.collection('payrollRuns').add(newRun);
        return docRef.id;

    }, [user, getEmployees, getSalaryGroups, getSalaryComponents, getLoans]);

    const updatePayrollRun = useCallback(async (runId: string, data: Partial<Omit<PayrollRun, 'id' | 'hospitalId'>>) => {
        if (!user) throw new Error("Not authenticated");
        const runRef = db.collection('payrollRuns').doc(runId);
        
        // Handle loan repayments if run is finalized
        if (data.status === 'finalized') {
            const runDoc = await runRef.get();
            const runData = runDoc.data() as PayrollRun;
            
            await db.runTransaction(async t => {
                for (const payslip of runData.payslips) {
                    const loanDeduction = payslip.additionalDeductions?.find(d => d.name.startsWith('Loan Repayment'));
                    if (loanDeduction && loanDeduction.amount > 0) {
                        const loanId = loanDeduction.id;
                        const loanRef = db.collection('loans').doc(loanId);
                        const loanDoc = await t.get(loanRef);
                        if (loanDoc.exists) {
                            const loanData = loanDoc.data() as Loan;
                            const newAmountPaid = loanData.amountPaid + loanDeduction.amount;
                            const newRepayment: LoanRepayment = {
                                id: payslip.id,
                                period: runData.period,
                                amount: loanDeduction.amount,
                                paidDate: firebase.firestore.Timestamp.now()
                            };
                            const newStatus = newAmountPaid >= loanData.loanAmount ? 'closed' : loanData.status;

                            t.update(loanRef, {
                                amountPaid: newAmountPaid,
                                repaymentHistory: firebase.firestore.FieldValue.arrayUnion(newRepayment),
                                status: newStatus
                            });
                        }
                    }
                }
                t.update(runRef, data);
            });
        } else {
             await runRef.update(data);
        }
    }, [user]);

    const deletePayrollRun = useCallback(async (runId: string) => {
        const runRef = db.collection('payrollRuns').doc(runId);
        const doc = await runRef.get();
        if (doc.exists && doc.data()?.status !== 'draft') {
            throw new Error("Only draft payroll runs can be deleted.");
        }
        await runRef.delete();
    }, []);

    return {
        getEmployees, getEmployeeById, addEmployee, updateEmployee, updateEmployeeStatus, deleteEmployee, reviseEmployeeSalary,
        getSalaryComponents, addSalaryComponent, updateSalaryComponent, deleteSalaryComponent,
        getSalaryGroups, addSalaryGroup, updateSalaryGroup, deleteSalaryGroup,
        getPayrollRuns, createPayrollRun, updatePayrollRun, deletePayrollRun,
        getLoans, getLoanById, addLoan, updateLoanStatus
    };
};