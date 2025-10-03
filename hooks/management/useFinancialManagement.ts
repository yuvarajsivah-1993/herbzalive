// hooks/management/useFinancialManagement.ts
import { useCallback } from 'react';
import { db, storage, createAuditLog } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { AppUser, Appointment, Treatment, Invoice, InvoiceStatus, Payment, Expense, NewExpenseData, POSSale, NewPOSSaleData, StockMovement, POSSalePaymentStatus, Timestamp, POSSaleStatus, StockItem, InvoiceTaxComponent, Tax, TaxGroup, ExpenseComment, ExpenseUpdateData, PayrollRun, Payslip, Employee, NewEmployeeData, SalaryComponent, NewSalaryComponentData, SalaryGroup, NewSalaryGroupData, PayslipItem, EmployeeDocument, SalaryHistoryEntry, Loan, NewLoanData, LoanStatus, LoanRepayment, StockBatch } from '../../types';

const { serverTimestamp, increment } = firebase.firestore.FieldValue;
type UploadFileFunction = (file: File | Blob, path: string) => Promise<string>;

// Helper function to calculate expense totals
const calculateExpenseTotals = async (hospitalId: string, subtotal: number, taxGroupId?: string | null, discountPercentage?: number) => {
    let taxes: InvoiceTaxComponent[] = [];
    let totalTax = 0;

    if (taxGroupId) {
        const groupDoc = await db.collection('taxGroups').doc(taxGroupId).get();
        if (groupDoc.exists && groupDoc.data()?.hospitalId === hospitalId) {
            const groupData = groupDoc.data() as TaxGroup;
            if (groupData.taxIds && groupData.taxIds.length > 0) {
                 const taxDocs = await Promise.all(groupData.taxIds.map(id => db.collection('taxes').doc(id).get()));
                 taxes = taxDocs.filter(d => d.exists).map(d => {
                    const taxData = d.data() as Tax;
                    const taxAmount = subtotal * (taxData.rate / 100);
                    totalTax += taxAmount;
                    return { name: taxData.name, rate: taxData.rate, amount: taxAmount };
                });
            }
        }
    }
    
    const discountAmount = subtotal * ((discountPercentage || 0) / 100);
    const totalAmount = subtotal + totalTax - discountAmount;

    return { taxes, totalTax, discountAmount, totalAmount };
};


export const useFinancialManagement = (user: AppUser | null, uploadFile: UploadFileFunction) => {
    
    // Invoice Management
    const getInvoices = useCallback(async (startDate?: Date, endDate?: Date, locationIdFilter?: string): Promise<Invoice[]> => {
        if (!user) return [];
        let q: firebase.firestore.Query = db.collection("invoices").where("hospitalId", "==", user.hospitalId);

        if (locationIdFilter && locationIdFilter !== 'all') {
            q = q.where("locationId", "==", locationIdFilter);
        }

        if (startDate) {
            q = q.where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(startDate));
        }
        if (endDate) {
            q = q.where("createdAt", "<=", firebase.firestore.Timestamp.fromDate(endDate));
        }
        const snapshot = await q.get();
        const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
        invoices.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        return invoices;
    }, [user]);

    const addInvoice = useCallback(async (appointment: Appointment, treatment: Treatment) => {
// FIX: Add check for user.currentLocation
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User or location not found");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const newInvoiceRef = db.collection("invoices").doc();
        let invoiceIdDisplay: string;

        try {
            let taxes: InvoiceTaxComponent[] = [];
            let totalTax = 0;
            let totalAmount = treatment.cost;

            if (treatment.taxGroupId && user.hospitalId) {
                const groupDoc = await db.collection('taxGroups').doc(treatment.taxGroupId).get();
                if (groupDoc.exists && groupDoc.data()?.hospitalId === user.hospitalId) {
                    const groupData = groupDoc.data() as TaxGroup;
                    if (groupData.taxIds && groupData.taxIds.length > 0) {
                        const taxDocs = await Promise.all(groupData.taxIds.map(id => db.collection('taxes').doc(id).get()));
                        taxes = taxDocs.filter(d => d.exists).map(d => {
                            const taxData = d.data() as Tax;
                            const taxAmount = treatment.cost * (taxData.rate / 100);
                            totalTax += taxAmount;
                            return { name: taxData.name, rate: taxData.rate, amount: taxAmount };
                        });
                        totalAmount += totalTax;
                    }
                }
            }

            await db.runTransaction(async (transaction) => {
                const hospitalDoc = await transaction.get(hospitalRef);
                if (!hospitalDoc.exists) throw "Hospital document not found!";

                const locationRef = db.collection('hospitalLocations').doc(user.currentLocation!.id);
                const locationDoc = await transaction.get(locationRef);
                if (!locationDoc.exists) throw "Hospital location document not found!";

                const lastInvoiceNumber = locationDoc.data()!.lastInvoiceNumber || 0;
                const prefix = user.hospitalInvoiceSettings?.treatmentInvoice.prefix || 'INV-';
                const locationCode = user.currentLocation!.code || user.currentLocation!.name.substring(0, 3).toUpperCase(); // Use a code or first 3 letters of name
                invoiceIdDisplay = `${prefix}${locationCode}-${String(lastInvoiceNumber + 1).padStart(6, '0')}`;

                const invoiceData: Omit<Invoice, 'id'> = {
                    invoiceId: invoiceIdDisplay,
                    appointmentId: appointment.id,
                    patientId: appointment.patientId,
                    patientName: appointment.patientName,
                    doctorId: appointment.doctorId,
                    doctorName: appointment.doctorName,
                    hospitalId: user.hospitalId!,
// FIX: Add locationId to new invoice
                    locationId: user.currentLocation!.id,
                    createdAt: serverTimestamp() as Timestamp,
                    appointmentDate: appointment.start,
                    items: [{ description: treatment.name, cost: treatment.cost }],
                    subtotal: treatment.cost,
                    taxes,
                    totalTax,
                    totalAmount,
                    status: 'Unpaid',
                    amountPaid: 0,
                    paymentHistory: [],
                };
                transaction.set(newInvoiceRef, invoiceData);
                transaction.update(locationRef, { lastInvoiceNumber: increment(1) });
            });
        } catch (e) {
            throw new Error("Could not create new invoice. Please try again.");
        }
    }, [user]);

    const updateInvoicePayment = useCallback(async (invoiceId: string, payment: Omit<Payment, 'date'|'id'|'recordedBy'>) => {
        if (!user) throw new Error("User not authenticated");
        const invoiceRef = db.collection("invoices").doc(invoiceId);
        const newPayment: Payment = { ...payment, id: db.collection('_').doc().id, date: firebase.firestore.Timestamp.now(), recordedBy: user.name };

        await db.runTransaction(async (t) => {
            // --- READS ---
            const doc = await t.get(invoiceRef);
            if (!doc.exists) throw new Error("Invoice not found");
            const data = doc.data() as Invoice;

            const newAmountPaid = parseFloat(((data.amountPaid || 0) + payment.amount).toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: InvoiceStatus = newAmountPaid >= totalAmount ? 'Paid' : 'Partially Paid';
            
            let appDoc: firebase.firestore.DocumentSnapshot | null = null;
            let appointmentRef: firebase.firestore.DocumentReference | null = null;
            if (paymentStatus === 'Paid' && data.appointmentId) {
                appointmentRef = db.collection('appointments').doc(data.appointmentId);
                appDoc = await t.get(appointmentRef);
            }
            
            // --- WRITES ---
            t.update(invoiceRef, { 
                amountPaid: newAmountPaid, 
                status: paymentStatus, 
                paymentHistory: [...(data.paymentHistory || []), newPayment] 
            });

            if (appDoc && appDoc.exists && appointmentRef) {
                t.update(appointmentRef, { 
                    status: 'Finished',
                    videoCallChannel: null,
                    videoCallToken: null,
                    videoCallStartedByDoctor: false,
                    videoCallActive: false
                });
            }
        });
    }, [user]);

    const updateInvoicePaymentDetails = useCallback(async (invoiceId: string, paymentToUpdate: Payment) => {
        const invoiceRef = db.collection("invoices").doc(invoiceId);
        await db.runTransaction(async (t) => {
            // --- READS ---
            const doc = await t.get(invoiceRef);
            if (!doc.exists) throw new Error("Invoice not found");
            const data = doc.data() as Invoice;
            
            let appDoc: firebase.firestore.DocumentSnapshot | null = null;
            let appointmentRef: firebase.firestore.DocumentReference | null = null;
            if (data.appointmentId) {
                appointmentRef = db.collection('appointments').doc(data.appointmentId);
                appDoc = await t.get(appointmentRef);
            }

            // --- PREPARATION ---
            let amountPaid = 0;
            const newPayments = (data.paymentHistory || []).map(p => { 
                if (p.id === paymentToUpdate.id) { 
                    amountPaid += paymentToUpdate.amount; 
                    return paymentToUpdate; 
                } 
                amountPaid += p.amount; 
                return p; 
            });
            
            const finalAmountPaid = parseFloat(amountPaid.toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: InvoiceStatus = finalAmountPaid >= totalAmount ? 'Paid' : finalAmountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            
            // --- WRITES ---
            if (appDoc && appDoc.exists && appointmentRef) {
                const newAppointmentStatus = paymentStatus === 'Paid' ? 'Finished' : 'Waiting Payment';
                const updateData: {status: string, videoCallChannel?: null, videoCallToken?: null, videoCallStartedByDoctor?: boolean, videoCallActive?: boolean} = { status: newAppointmentStatus };
                if (newAppointmentStatus === 'Finished') {
                    updateData.videoCallChannel = null;
                    updateData.videoCallToken = null;
                    updateData.videoCallStartedByDoctor = false;
                    updateData.videoCallActive = false;
                }
                t.update(appointmentRef, updateData);
            }
        });
    }, []);

    const deleteInvoicePayment = useCallback(async (invoiceId: string, paymentId: string) => {
        const invoiceRef = db.collection("invoices").doc(invoiceId);
        await db.runTransaction(async (t) => {
            // --- READS ---
            const doc = await t.get(invoiceRef);
            if (!doc.exists) throw new Error("Invoice not found");
            const data = doc.data() as Invoice;

            let appDoc: firebase.firestore.DocumentSnapshot | null = null;
            let appointmentRef: firebase.firestore.DocumentReference | null = null;
            if (data.appointmentId) {
                appointmentRef = db.collection('appointments').doc(data.appointmentId);
                appDoc = await t.get(appointmentRef);
            }
            
            // --- PREPARATION ---
            const paymentToRemove = (data.paymentHistory || []).find(p => p.id === paymentId);
            if (!paymentToRemove) return;
            const newPayments = data.paymentHistory.filter(p => p.id !== paymentId);
            
            const newAmountPaid = parseFloat(((data.amountPaid || 0) - paymentToRemove.amount).toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: InvoiceStatus = newAmountPaid >= totalAmount ? 'Paid' : newAmountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            
            // --- WRITES ---
            t.update(invoiceRef, { paymentHistory: newPayments, amountPaid: newAmountPaid, status: paymentStatus });

            if (appDoc && appDoc.exists && appointmentRef) {
                const newAppointmentStatus = paymentStatus === 'Paid' ? 'Finished' : 'Waiting Payment';
                t.update(appointmentRef, { status: newAppointmentStatus });
            }
        });
    }, []);

    // Expense Management
    const getExpenses = useCallback(async (
        locationId?: string,
        startDate?: Date,
        endDate?: Date,
        limitVal: number = 20,
        lastVisible: firebase.firestore.QueryDocumentSnapshot | null = null,
        categoryFilter?: string,
        searchTerm?: string
    ): Promise<{ expenses: Expense[]; lastVisible: firebase.firestore.QueryDocumentSnapshot | null }> => {
        if (!user) return { expenses: [], lastVisible: null };

        let q: firebase.firestore.Query = db.collection("expenses");

        // Equality filters
        q = q.where("hospitalId", "==", user.hospitalId);
        if (locationId && locationId !== 'all') {
            q = q.where("locationId", "==", locationId);
        }
        if (categoryFilter) {
            q = q.where("category", "==", categoryFilter);
        }

        // Ordering and range filters
        if (searchTerm) {
            q = q.orderBy('expenseId').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
        } else {
            q = q.orderBy("date", "desc");
            if (startDate) {
                q = q.where("date", ">=", firebase.firestore.Timestamp.fromDate(startDate));
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                q = q.where("date", "<=", firebase.firestore.Timestamp.fromDate(endOfDay));
            }
        }

        if (lastVisible) {
            q = q.startAfter(lastVisible);
        }

        const snapshot = await q.limit(limitVal).get();
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

        return { expenses, lastVisible: newLastVisible };
    }, [user]);

    const getExpenseById = useCallback(async (expenseId: string): Promise<Expense | null> => {
        if (!user) return null;
        const doc = await db.collection('expenses').doc(expenseId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) return { id: doc.id, ...doc.data() } as Expense;
        return null;
    }, [user]);
    
    const addExpense = useCallback(async (data: NewExpenseData): Promise<Expense> => {
// FIX: Add check for user.currentLocation
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User not authenticated or location not set");
        const locationRef = db.collection('hospitalLocations').doc(user.currentLocation.id);
        const newExpenseRef = db.collection("expenses").doc();
        let newExpense: Expense;

        await db.runTransaction(async (t) => {
            const locationDoc = await t.get(locationRef);
            if (!locationDoc.exists) throw "Hospital location document not found!";
            const lastExpenseNumber = locationDoc.data()!.lastExpenseNumber || 0;
            const prefix = 'EXP-';
            const locationCode = user.currentLocation!.code || user.currentLocation!.name.substring(0, 3).toUpperCase();
            const expenseId = `${prefix}${locationCode}-${String(lastExpenseNumber + 1).padStart(6, '0')}`;

            let documentUrl = '', documentName = '';
            if (data.document) {
                const file = data.document;
                documentName = file.name;
                documentUrl = await uploadFile(file, `expenseDocuments/${user.hospitalId!}/${newExpenseRef.id}/${file.name}`);
            }

            const { document, ...restData } = data;
            
            const { taxes, totalTax, discountAmount, totalAmount } = await calculateExpenseTotals(user.hospitalId!, data.subtotal, data.taxGroupId, data.discountPercentage);

            const newData: Omit<Expense, 'id'> = {
                ...restData,
                expenseId,
                date: firebase.firestore.Timestamp.fromDate(data.date),
                subtotal: data.subtotal,
                taxes,
                totalTax,
                discountPercentage: data.discountPercentage || 0,
                discountAmount,
                totalAmount,
                paymentStatus: 'Unpaid',
                amountPaid: 0,
                paymentHistory: [],
                hospitalId: user.hospitalId!,
// FIX: Add locationId to new expense
                locationId: user.currentLocation!.id,
                documentUrl,
                documentName,
            };
            
            newExpense = { ...newData, id: newExpenseRef.id };
            console.log("Saving new expense with locationId:", newData.locationId);
            t.set(newExpenseRef, newData);
            t.update(locationRef, { lastExpenseNumber: increment(1) });
        });

        return newExpense!;
    }, [user, uploadFile]);
    
    const updateExpense = useCallback(async (expenseId: string, data: ExpenseUpdateData) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const expenseRef = db.collection('expenses').doc(expenseId);
        const { document, ...restData } = data;

        const { taxes, totalTax, discountAmount, totalAmount } = await calculateExpenseTotals(user.hospitalId, data.subtotal, data.taxGroupId, data.discountPercentage);
        
        const updateData: any = {
            ...restData,
            date: firebase.firestore.Timestamp.fromDate(data.date),
            subtotal: data.subtotal,
            taxes,
            totalTax,
            discountPercentage: data.discountPercentage || 0,
            discountAmount,
            totalAmount,
        };
        if (document) {
            const docName = `${Date.now()}-${document.name}`;
            updateData.documentUrl = await uploadFile(document, `expenseDocuments/${user.hospitalId}/${expenseId}/${docName}`);
            updateData.documentName = document.name;
        } else if (document === null) {
            updateData.documentUrl = '';
            updateData.documentName = '';
        }

        const expenseDoc = await expenseRef.get();
        if(expenseDoc.exists) {
            const currentExpense = expenseDoc.data() as Expense;
            const amountPaid = currentExpense.amountPaid;
            if (amountPaid >= totalAmount) {
                updateData.paymentStatus = 'Paid';
            } else if (amountPaid > 0) {
                updateData.paymentStatus = 'Partially Paid';
            } else {
                updateData.paymentStatus = 'Unpaid';
            }
        }

        await expenseRef.update(updateData);
    }, [user, uploadFile]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('expenses').doc(expenseId).delete();
    }, [user]);

    const updateExpensePayment = useCallback(async (expenseId: string, payment: Omit<Payment, 'date'|'id'|'recordedBy'>) => {
        if (!user) throw new Error("User not authenticated");
        const expenseRef = db.collection("expenses").doc(expenseId);
        const newPayment: Payment = { ...payment, id: db.collection('_').doc().id, date: firebase.firestore.Timestamp.now(), recordedBy: user.name };

        await db.runTransaction(async (t) => {
            const doc = await t.get(expenseRef);
            if (!doc.exists) throw new Error("Expense not found");
            const data = doc.data() as Expense;
            const newAmountPaid = parseFloat(((data.amountPaid || 0) + payment.amount).toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: InvoiceStatus = newAmountPaid >= totalAmount ? 'Paid' : 'Partially Paid';
            t.update(expenseRef, { 
                amountPaid: newAmountPaid, 
                paymentStatus, 
                paymentHistory: [...(data.paymentHistory || []), newPayment] 
            });
        });
    }, [user]);

    const updateExpensePaymentDetails = useCallback(async (expenseId: string, paymentToUpdate: Payment) => {
        const expenseRef = db.collection("expenses").doc(expenseId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(expenseRef);
            if (!doc.exists) throw new Error("Expense not found");
            const data = doc.data() as Expense;
            let amountPaid = 0;
            const newPayments = (data.paymentHistory || []).map(p => { 
                if (p.id === paymentToUpdate.id) { 
                    amountPaid += paymentToUpdate.amount; 
                    return paymentToUpdate; 
                } 
                amountPaid += p.amount; 
                return p; 
            });
            const finalAmountPaid = parseFloat(amountPaid.toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: InvoiceStatus = finalAmountPaid >= totalAmount ? 'Paid' : finalAmountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            t.update(expenseRef, { paymentHistory: newPayments, amountPaid: finalAmountPaid, paymentStatus });
        });
    }, []);

    const deleteExpensePayment = useCallback(async (expenseId: string, paymentId: string) => {
        const expenseRef = db.collection("expenses").doc(expenseId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(expenseRef);
            if (!doc.exists) throw new Error("Expense not found");
            const data = doc.data() as Expense;
            const paymentToRemove = (data.paymentHistory || []).find(p => p.id === paymentId);
            if (!paymentToRemove) return;
            const newPayments = data.paymentHistory.filter(p => p.id !== paymentId);
            const newAmountPaid = parseFloat(((data.amountPaid || 0) - paymentToRemove.amount).toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: InvoiceStatus = newAmountPaid >= totalAmount ? 'Paid' : newAmountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            t.update(expenseRef, { paymentHistory: newPayments, amountPaid: newAmountPaid, paymentStatus });
        });
    }, []);

    const addExpenseComment = useCallback(async (expenseId: string, text: string) => {
        if (!user) throw new Error("User not authenticated");
        const expenseRef = db.collection('expenses').doc(expenseId);
        const newComment: ExpenseComment = {
            id: db.collection('_').doc().id, text, userId: user.uid, userName: user.name,
            userProfilePhotoUrl: user.profilePhotoUrl, createdAt: firebase.firestore.Timestamp.now(),
        };
        await expenseRef.update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) });
    }, [user]);

    const updateExpenseComment = useCallback(async (expenseId: string, comment: ExpenseComment) => {
        if (!user) throw new Error("User not authenticated");
        const expenseRef = db.collection('expenses').doc(expenseId);
        await db.runTransaction(async t => {
            const doc = await t.get(expenseRef);
            const data = doc.data() as Expense;
            const comments = (data.comments || []).map(c => c.id === comment.id ? { ...comment, updatedAt: firebase.firestore.Timestamp.now() } : c);
            t.update(expenseRef, { comments });
        });
    }, [user]);

    const deleteExpenseComment = useCallback(async (expenseId: string, commentId: string) => {
        if (!user) throw new Error("User not authenticated");
        const expenseRef = db.collection('expenses').doc(expenseId);
        await db.runTransaction(async t => {
            const doc = await t.get(expenseRef);
            const data = doc.data() as Expense;
            const comments = (data.comments || []).filter(c => c.id !== commentId);
            t.update(expenseRef, { comments });
        });
    }, [user]);

    // POS Sales
    const getPOSSales = useCallback(async (startDate?: Date, endDate?: Date, locationId?: string): Promise<POSSale[]> => {
        if (!user) return [];
        let q: firebase.firestore.Query = db.collection("posSales").where("hospitalId", "==", user.hospitalId);
        if (locationId && locationId !== 'all') {
            q = q.where("locationId", "==", locationId);
        }
         if (startDate) {
            q = q.where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(startDate));
        }
        if (endDate) {
            q = q.where("createdAt", "<=", firebase.firestore.Timestamp.fromDate(endDate));
        }
        const snapshot = await q.get();
        const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as POSSale));
        sales.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
        return sales;
    }, [user]);

    const getPOSSaleById = useCallback(async (saleId: string): Promise<POSSale | null> => {
        if (!user) return null;
        const doc = await db.collection('posSales').doc(saleId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) return { id: doc.id, ...doc.data() } as POSSale;
        return null;
    }, [user]);

    const addPOSSale = useCallback(async (data: NewPOSSaleData): Promise<POSSale> => {
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User not found or location not set");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const newSaleRef = db.collection('posSales').doc();
        let saleIdDisplay = '';
    
        await db.runTransaction(async t => {
            const hospitalDoc = await t.get(hospitalRef);
            if (!hospitalDoc.exists) throw new Error("Hospital not found");

            const locationRef = db.collection('hospitalLocations').doc(user.currentLocation!.id);
            const locationDoc = await t.get(locationRef);
            if (!locationDoc.exists) throw new Error("Hospital location document not found!");
    
            const stockRefs = data.items.map(item => db.collection('stocks').doc(item.stockItemId));
            const stockDocs = await Promise.all(stockRefs.map(ref => t.get(ref)));
    
            const lastSaleNum = locationDoc.data()?.lastPOSSaleNumber || 0;
            const prefix = user.hospitalInvoiceSettings?.posInvoice.prefix || 'POS-';
            const locationCode = user.currentLocation!.code || user.currentLocation!.name.substring(0, 3).toUpperCase(); // Use a code or first 3 letters of name
            saleIdDisplay = `${prefix}${locationCode}-${String(lastSaleNum + 1).padStart(6, '0')}`;
    
            const updates: { 
                stockRef: firebase.firestore.DocumentReference, 
                updatedData: { [key: string]: any },
                movementData: Omit<StockMovement, 'id'> 
            }[] = [];

            const locationId = user.currentLocation!.id;
    
            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                const stockDoc = stockDocs[i];
    
                if (!stockDoc.exists) throw new Error(`Stock item ${item.name} could not be found.`);
                const stockData = stockDoc.data() as StockItem;
                
                const locationStock = stockData.locationStock?.[locationId];
                if (!locationStock) throw new Error(`Stock data for location not found for item ${item.name}.`);

                const batches = locationStock.batches || [];
                const batchIndex = batches.findIndex(b => b.id === item.batchId);
                if (batchIndex === -1) throw new Error(`Batch ${item.batchNumber} for ${item.name} not found in this location.`);
                
                const batch = batches[batchIndex];
                if (batch.quantity < item.quantity) throw new Error(`Insufficient stock for ${item.name} (Batch: ${item.batchNumber}). Available: ${batch.quantity}, Requested: ${item.quantity}.`);
    
                const updatedBatches = [...batches];
                updatedBatches[batchIndex] = { ...batch, quantity: batch.quantity - item.quantity };
                const newTotalStock = locationStock.totalStock - item.quantity;
                
                const movementData: Omit<StockMovement, 'id'> = {
                    date: serverTimestamp() as Timestamp,
                    type: 'sale',
                    quantityChange: -item.quantity,
                    notes: `Sold in POS Sale #${saleIdDisplay}`,
                    relatedInvoiceId: newSaleRef.id,
                    batchNumber: item.batchNumber,
                    locationId: locationId,
                };
    
                updates.push({ 
                    stockRef: stockRefs[i], 
                    updatedData: { 
                        [`locationStock.${locationId}.batches`]: updatedBatches,
                        [`locationStock.${locationId}.totalStock`]: newTotalStock,
                    },
                    movementData
                });
            }
    
            for (const update of updates) {
                t.update(update.stockRef, update.updatedData);
                const movementRef = update.stockRef.collection('movements').doc();
                t.set(movementRef, update.movementData);
            }
    
            const saleData: Omit<POSSale, 'id'> = {
                ...data,
                saleId: saleIdDisplay,
                createdAt: serverTimestamp() as Timestamp,
                hospitalId: user.hospitalId!,
                locationId: user.currentLocation.id,
                createdBy: user.name,
                paymentHistory: data.amountPaid > 0 ? [{ id: db.collection('_').doc().id, amount: data.amountPaid, method: data.paymentMethod, date: firebase.firestore.Timestamp.now(), recordedBy: user.name }] : [],
                paymentStatus: data.paymentStatus || (data.amountPaid >= data.totalAmount ? 'Paid' : data.amountPaid > 0 ? 'Partially Paid' : 'Unpaid'),
            };
    
            t.set(newSaleRef, saleData);
            t.update(locationRef, { lastPOSSaleNumber: increment(1) });
        });
    
        const finalSaleDoc = await newSaleRef.get();
        return { id: finalSaleDoc.id, ...finalSaleDoc.data() } as POSSale;
    
    }, [user]);

    const deletePOSSale = useCallback(async (saleId: string) => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('posSales').doc(saleId).update({ status: 'Cancelled' });
    }, [user]);
    
    const updatePOSSalePayment = useCallback(async (saleId: string, payment: Omit<Payment, 'date'|'id'|'recordedBy'>) => {
        if (!user) throw new Error("User not authenticated");
        const saleRef = db.collection("posSales").doc(saleId);
        const newPayment: Payment = { ...payment, id: db.collection('_').doc().id, date: firebase.firestore.Timestamp.now(), recordedBy: user.name };
        
        await db.runTransaction(async t => {
            const doc = await t.get(saleRef);
            if (!doc.exists) throw new Error("Sale record not found");
            const data = doc.data() as POSSale;
            const newAmountPaid = parseFloat(((data.amountPaid || 0) + payment.amount).toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: POSSalePaymentStatus = newAmountPaid >= totalAmount ? 'Paid' : 'Partially Paid';
            t.update(saleRef, {
                amountPaid: newAmountPaid,
                paymentStatus,
                paymentHistory: [...(data.paymentHistory || []), newPayment]
            });
        });
    }, [user]);

    const updatePOSSalePaymentDetails = useCallback(async (saleId: string, paymentToUpdate: Payment) => {
        const saleRef = db.collection("posSales").doc(saleId);
        await db.runTransaction(async t => {
            const doc = await t.get(saleRef);
            if (!doc.exists) throw new Error("Sale not found");
            const data = doc.data() as POSSale;
            let amountPaid = 0;
            const newPayments = (data.paymentHistory || []).map(p => {
                if (p.id === paymentToUpdate.id) { amountPaid += paymentToUpdate.amount; return paymentToUpdate; }
                amountPaid += p.amount; return p;
            });
            const finalAmountPaid = parseFloat(amountPaid.toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: POSSalePaymentStatus = finalAmountPaid >= totalAmount ? 'Paid' : finalAmountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            t.update(saleRef, { paymentHistory: newPayments, amountPaid: finalAmountPaid, paymentStatus });
        });
    }, []);

    const deletePOSSalePayment = useCallback(async (saleId: string, paymentId: string) => {
        const saleRef = db.collection("posSales").doc(saleId);
        await db.runTransaction(async t => {
            const doc = await t.get(saleRef);
            if (!doc.exists) throw new Error("Sale not found");
            const data = doc.data() as POSSale;
            const paymentToRemove = (data.paymentHistory || []).find(p => p.id === paymentId);
            if(!paymentToRemove) return;
            const newPayments = data.paymentHistory.filter(p => p.id !== paymentId);
            const newAmountPaid = parseFloat(((data.amountPaid || 0) - paymentToRemove.amount).toFixed(2));
            const totalAmount = parseFloat(data.totalAmount.toFixed(2));
            const paymentStatus: POSSalePaymentStatus = newAmountPaid >= totalAmount ? 'Paid' : newAmountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            t.update(saleRef, { paymentHistory: newPayments, amountPaid: newAmountPaid, paymentStatus });
        });
    }, []);

    return {
        getInvoices, addInvoice, updateInvoicePayment, updateInvoicePaymentDetails, deleteInvoicePayment,
        getExpenses, getExpenseById, addExpense, updateExpense, deleteExpense,
        updateExpensePayment, updateExpensePaymentDetails, deleteExpensePayment,
        addExpenseComment, updateExpenseComment, deleteExpenseComment,
        getPOSSales, getPOSSaleById, addPOSSale, deletePOSSale,
        updatePOSSalePayment, updatePOSSalePaymentDetails, deletePOSSalePayment,
    };
};