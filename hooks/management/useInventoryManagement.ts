
import { useCallback } from 'react';
import { db, storage } from '../../services/firebase';
import firebase from 'firebase/compat/app';
// FIX: Added Timestamp to imports to allow type casting.
// FIX: Import the 'StockTransfer' type to resolve 'Cannot find name' errors.
import { AppUser, StockItem, NewStockItemData, StockMovement, StockOrder, NewStockOrderData, StockOrderItem, StockOrderStatus, Peripheral, NewPeripheralData, PeripheralUpdateData, PeripheralAttachment, Vendor, NewVendorData, VendorUpdateData, StockAttachment, Timestamp, StockOrderComment, Tax, TaxGroup, StockReturn, NewStockReturnData, StockReturnItem, InvoiceStatus, Payment, StockItemUpdateData, StockBatch, StockLocationInfo, InitialBatchDetails, NewStockTransferData, StockTransfer, StockTransferItem } from '../../types';

const { serverTimestamp, increment } = firebase.firestore.FieldValue;
type UploadFileFunction = (file: File | Blob, path: string) => Promise<string>;

// FIX: Define formatCurrency function to resolve 'Cannot find name' error.
const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    if (isNaN(amount)) amount = 0;
    const symbol = currencySymbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const useInventoryManagement = (user: AppUser | null, uploadFile: UploadFileFunction, setUser: React.Dispatch<React.SetStateAction<AppUser | null>>) => {
    // Stock Management
    const getStocks = useCallback(async (): Promise<StockItem[]> => {
        if (!user) return [];
        const q = db.collection("stocks").where("hospitalId", "==", user.hospitalId);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockItem)).sort((a, b) => a.name.localeCompare(b.name));
    }, [user]);

    const getStockItemById = useCallback(async (stockId: string): Promise<StockItem | null> => {
        if (!user) return null;
        const doc = await db.collection('stocks').doc(stockId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) return { id: doc.id, ...doc.data() } as StockItem;
        return null;
    }, [user]);

    const addStock = useCallback(async (data: NewStockItemData) => {
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User not found or location not set");
    
        if (user.subscriptionPackage && user.subscriptionPackage.maxProducts > 0) {
            const snapshot = await db.collection("stocks").where("hospitalId", "==", user.hospitalId).get();
            if (snapshot.size >= user.subscriptionPackage.maxProducts) {
                throw new Error('LIMIT_REACHED:products');
            }
        }
        
        const { photo, initialLocationStock, ...restData } = data;
        let photoUrl = '';
        if (photo) {
            let photoToUpload: Blob;
            if (typeof photo === 'string') {
                photoToUpload = await (await fetch(photo)).blob();
            } else {
                photoToUpload = photo;
            }
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            photoUrl = await uploadFile(photoToUpload, `stockPhotos/${user.hospitalId}/${photoName}`);
        }
        const stockRef = db.collection("stocks").doc();
    
        await db.runTransaction(async (t) => {
            const locationStock: { [key: string]: StockLocationInfo } = {};
    
            for (const locId in initialLocationStock) {
                if (Object.prototype.hasOwnProperty.call(initialLocationStock, locId)) {
                    const locData = initialLocationStock[locId];
                    const newBatches: StockBatch[] = [];
                    let totalStock = 0;
    
                    if (locData.initialBatch && locData.initialBatch.quantity > 0) {
                        const batchData = locData.initialBatch;
                        const newBatch: StockBatch = {
                            id: db.collection('_').doc().id,
                            batchNumber: batchData.batchNumber || `INIT-${Date.now().toString().slice(-6)}`,
                            quantity: batchData.quantity,
                            costPrice: batchData.costPrice,
                            salePrice: batchData.salePrice,
                        };
                        if (batchData.expiryDate) {
                            newBatch.expiryDate = firebase.firestore.Timestamp.fromDate(new Date(batchData.expiryDate));
                        }
                        newBatches.push(newBatch);
                        totalStock = batchData.quantity;
    
                        const movementRef = stockRef.collection('movements').doc();
                        t.set(movementRef, {
                            date: serverTimestamp() as Timestamp,
                            type: 'initial',
                            quantityChange: totalStock,
                            cost: batchData.costPrice,
                            notes: `Initial stock for batch ${newBatch.batchNumber}`,
                            batchNumber: newBatch.batchNumber,
                            locationId: locId,
                        });
                    }
    
                    locationStock[locId] = {
                        totalStock: totalStock,
                        lowStockThreshold: locData.lowStockThreshold || 10,
                        batches: newBatches,
                    };
                }
            }
    
            const dataToSet: Omit<StockItem, 'id' | 'totalStock' | 'lowStockThreshold' | 'batches'> = {
                ...restData,
                photoUrl,
                hospitalId: user.hospitalId!,
                locationStock,
            };
            t.set(stockRef, dataToSet);
        });
    }, [user, uploadFile]);
    
    const updateStock = useCallback(async (stockId: string, data: any) => {
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User or location not set");
        const stockDocRef = db.collection('stocks').doc(stockId);
        
        const { photo, lowStockThreshold, batches, ...restData } = data;
        const updateData: { [key: string]: any } = { ...restData };
        
        const docSnap = await stockDocRef.get();
        if (!docSnap.exists) throw new Error("Stock item not found");
        const existingStock = docSnap.data() as StockItem;

        // FIX: Handle flattened properties by updating the nested locationStock object.
        if (lowStockThreshold !== undefined || batches !== undefined) {
            const locId = user.currentLocation.id;
            const locationStock = existingStock.locationStock?.[locId] || { totalStock: 0, lowStockThreshold: 10, batches: [] };
            
            if (lowStockThreshold !== undefined) {
                locationStock.lowStockThreshold = lowStockThreshold;
            }
            if (batches !== undefined) {
                locationStock.batches = batches;
                // Recalculate totalStock for this location
                locationStock.totalStock = batches.reduce((sum: number, batch: StockBatch) => sum + batch.quantity, 0);
            }
            updateData[`locationStock.${locId}`] = locationStock;
        }

        const oldPhotoUrl = existingStock.photoUrl;

        if (photo === null && oldPhotoUrl) {
            await storage.refFromURL(oldPhotoUrl).delete().catch(console.error);
            updateData.photoUrl = '';
        } else if (photo) {
            if (oldPhotoUrl) await storage.refFromURL(oldPhotoUrl).delete().catch(console.error);
            let photoToUpload: Blob;
            if (typeof photo === 'string') {
                photoToUpload = await (await fetch(photo)).blob();
            } else {
                photoToUpload = photo;
            }
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            updateData.photoUrl = await uploadFile(photoToUpload, `stockPhotos/${user.hospitalId}/${stockId}/${photoName}`);
        }
        await stockDocRef.update(updateData);
    }, [user, uploadFile]);

    const deleteStock = useCallback(async (stockId: string) => {
        const stockDocRef = db.collection('stocks').doc(stockId);
        const docSnap = await stockDocRef.get();
        const oldPhotoUrl = docSnap.data()?.photoUrl;
        if (oldPhotoUrl) await storage.refFromURL(oldPhotoUrl).delete().catch(console.warn);
        await stockDocRef.delete();
    }, []);

    const getStockMovements = useCallback(async (stockId: string): Promise<StockMovement[]> => {
        if (!user) return [];
        const snapshot = await db.collection('stocks').doc(stockId).collection('movements').orderBy('date', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement));
    }, [user]);

    // FIX: Add missing `locationId` parameter and use it in the transaction.
    const adjustStockQuantity = useCallback(async (stockId: string, locationId: string, batchId: string, quantityChange: number, reason: string) => {
        if (!user) throw new Error("User not authenticated");
        const stockRef = db.collection('stocks').doc(stockId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(stockRef);
            if (!doc.exists || doc.data()?.hospitalId !== user.hospitalId) throw new Error("Permission denied or item not found");
            
            const stockData = doc.data() as StockItem;
            
            const locationStock = stockData.locationStock?.[locationId];
            if (!locationStock) throw new Error("Stock data not found for this location.");

            const batches = locationStock.batches || [];
            const batchIndex = batches.findIndex(b => b.id === batchId);

            if (batchIndex === -1) throw new Error("Batch not found.");

            const batch = batches[batchIndex];
            if (batch.quantity + quantityChange < 0) throw new Error(`Cannot adjust quantity below zero for batch ${batch.batchNumber}.`);

            batches[batchIndex].quantity += quantityChange;
            const newTotalStock = locationStock.totalStock + quantityChange;

            const updatedLocationStockData = {
                ...stockData.locationStock,
                [locationId]: {
                    ...locationStock,
                    batches: batches,
                    totalStock: newTotalStock,
                }
            };
            
            t.update(stockRef, { locationStock: updatedLocationStockData });
            
            const movementRef = stockRef.collection('movements').doc();
            t.set(movementRef, {
                date: serverTimestamp() as Timestamp,
                type: 'adjustment',
                quantityChange,
                notes: `${reason} (Batch: ${batch.batchNumber})`,
                batchNumber: batch.batchNumber,
                locationId: locationId,
            });
        });
    }, [user]);

    const getStockTransfers = useCallback(async (startDate?: Date, endDate?: Date): Promise<StockTransfer[]> => {
        if (!user) return [];
        let q: firebase.firestore.Query = db.collection("stockTransfers").where("hospitalId", "==", user.hospitalId);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockTransfer)).sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [user]);

    const addStockTransfer = useCallback(async (data: NewStockTransferData) => {
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User not authenticated or location not set");
        const fromLocationId = user.currentLocation.id;
        const toLocationId = data.toLocationId;

        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const newTransferRef = db.collection("stockTransfers").doc();

        await db.runTransaction(async (t) => {
            // --- READS ---
            const hospitalDoc = await t.get(hospitalRef);
            if (!hospitalDoc.exists) throw new Error("Hospital document not found!");
            const stockRefs = data.items.map(i => db.collection('stocks').doc(i.stockItemId));
            const stockDocs = await Promise.all(stockRefs.map(ref => t.get(ref)));

            // --- PREPARATION ---
            const lastTransferNum = hospitalDoc.data()!.lastStockTransferNumber || 0;
            const transferId = `TRN-${String(lastTransferNum + 1).padStart(4, '0')}`;
            let totalValue = 0;
            const transferItems: StockTransferItem[] = [];

            for(let i=0; i < data.items.length; i++) {
                const item = data.items[i];
                const stockDoc = stockDocs[i];
                if (!stockDoc.exists) throw new Error("A selected stock item could not be found.");
                const stockData = stockDoc.data() as StockItem;

                const fromLocationStock = stockData.locationStock?.[fromLocationId];
                if (!fromLocationStock) throw new Error(`Stock data not found for ${stockData.name} at the source location.`);

                const batchIndex = fromLocationStock.batches.findIndex(b => b.id === item.batchId);
                if (batchIndex === -1) throw new Error(`Batch for ${stockData.name} not found at source location.`);
                
                const batchToTransfer = { ...fromLocationStock.batches[batchIndex] };
                if (batchToTransfer.quantity < item.quantity) throw new Error(`Insufficient stock for ${stockData.name} in batch ${batchToTransfer.batchNumber}.`);

                totalValue += batchToTransfer.costPrice * item.quantity;
                transferItems.push({
                    stockItemId: item.stockItemId,
                    name: stockData.name,
                    sku: stockData.sku,
                    unitType: stockData.unitType,
                    batchId: item.batchId,
                    batchNumber: batchToTransfer.batchNumber,
                    quantity: item.quantity,
                    costPriceAtTransfer: batchToTransfer.costPrice,
                });

                // Update From Location
                fromLocationStock.batches[batchIndex].quantity -= item.quantity;
                fromLocationStock.totalStock -= item.quantity;

                // Update To Location
                let toLocationStock = stockData.locationStock?.[toLocationId] || { totalStock: 0, lowStockThreshold: 10, batches: [] };
                const existingToBatchIndex = toLocationStock.batches.findIndex(b => b.batchNumber === batchToTransfer.batchNumber);

                if (existingToBatchIndex > -1) {
                    toLocationStock.batches[existingToBatchIndex].quantity += item.quantity;
                } else {
                    const newBatchForTo: StockBatch = { ...batchToTransfer, quantity: item.quantity };
                    toLocationStock.batches.push(newBatchForTo);
                }
                toLocationStock.totalStock += item.quantity;

                const updatedLocationStock = { ...stockData.locationStock, [fromLocationId]: fromLocationStock, [toLocationId]: toLocationStock };
                t.update(stockDoc.ref, { locationStock: updatedLocationStock });

                // Create movements
                const movementOutRef = stockDoc.ref.collection('movements').doc();
                const movementInRef = stockDoc.ref.collection('movements').doc();
                t.set(movementOutRef, { date: serverTimestamp() as Timestamp, type: 'transfer-out', quantityChange: -item.quantity, notes: `To ${user.hospitalLocations?.find(l=>l.id===toLocationId)?.name}. Ref: ${transferId}`, relatedTransferId: newTransferRef.id, batchNumber: batchToTransfer.batchNumber, locationId: fromLocationId });
                t.set(movementInRef, { date: serverTimestamp() as Timestamp, type: 'transfer-in', quantityChange: item.quantity, notes: `From ${user.currentLocation?.name}. Ref: ${transferId}`, relatedTransferId: newTransferRef.id, batchNumber: batchToTransfer.batchNumber, locationId: toLocationId });
            }
            
            // Create Transfer Record
            const fromLocationName = user.currentLocation.name;
            const toLocationName = user.hospitalLocations?.find(l => l.id === toLocationId)?.name || 'Unknown Location';

            const newTransferData = {
                transferId,
                fromLocationId, fromLocationName, toLocationId, toLocationName,
                transferDate: firebase.firestore.Timestamp.fromDate(data.transferDate),
                items: transferItems,
                totalValue,
                status: 'Completed' as const,
                notes: data.notes,
                hospitalId: user.hospitalId!,
                createdBy: user.name,
                createdAt: serverTimestamp() as Timestamp,
            };
            t.set(newTransferRef, newTransferData);
            
            // Update hospital counter
            t.update(hospitalRef, { lastStockTransferNumber: increment(1) });
        });
    }, [user]);

    // FIX: Implement getStockTransferById and deleteStockTransfer to satisfy AuthContextType.
    const getStockTransferById = useCallback(async (transferId: string): Promise<StockTransfer | null> => {
        if (!user) return null;
        const doc = await db.collection('stockTransfers').doc(transferId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) {
            return { id: doc.id, ...doc.data() } as StockTransfer;
        }
        return null;
    }, [user]);

    const deleteStockTransfer = useCallback(async (transferId: string) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const transferRef = db.collection('stockTransfers').doc(transferId);
    
        await db.runTransaction(async t => {
            const transferDoc = await t.get(transferRef);
            if (!transferDoc.exists) throw new Error("Stock transfer not found.");
            const transferData = transferDoc.data() as StockTransfer;
    
            if (transferData.status === 'Reversed') throw new Error("This transfer has already been reversed.");
    
            const stockRefs = transferData.items.map(i => db.collection('stocks').doc(i.stockItemId));
            const stockDocs = await Promise.all(stockRefs.map(ref => t.get(ref)));
            
            for(let i = 0; i < transferData.items.length; i++) {
                const item = transferData.items[i];
                const stockDoc = stockDocs[i];
                if (!stockDoc.exists) throw new Error(`Stock item ${item.name} not found.`);
                const stockData = stockDoc.data() as StockItem;
    
                const fromLocationId = transferData.fromLocationId;
                const toLocationId = transferData.toLocationId;
    
                // --- Update TO location (remove stock) ---
                const toLocationStock = stockData.locationStock?.[toLocationId];
                if (!toLocationStock) throw new Error(`Stock data for ${stockData.name} not found at destination location.`);
                const toBatchIndex = toLocationStock.batches.findIndex(b => b.id === item.batchId);
                if (toBatchIndex === -1) throw new Error(`Batch ${item.batchNumber} for ${stockData.name} not found at destination.`);
                
                const batchBeingReversed = toLocationStock.batches[toBatchIndex];
                if (batchBeingReversed.quantity < item.quantity) throw new Error(`Insufficient stock in batch ${item.batchNumber} at destination to reverse.`);
                
                batchBeingReversed.quantity -= item.quantity;
                toLocationStock.totalStock -= item.quantity;
                
                // --- Update FROM location (add stock back) ---
                let fromLocationStock = stockData.locationStock?.[fromLocationId] || { totalStock: 0, lowStockThreshold: 10, batches: [] };
                const fromBatchIndex = fromLocationStock.batches.findIndex(b => b.id === item.batchId);
                if(fromBatchIndex > -1) {
                    fromLocationStock.batches[fromBatchIndex].quantity += item.quantity;
                } else {
                    fromLocationStock.batches.push({
                        ...batchBeingReversed,
                        quantity: item.quantity,
                    });
                }
                fromLocationStock.totalStock += item.quantity;
    
                const updatedLocationStock = { ...stockData.locationStock, [fromLocationId]: fromLocationStock, [toLocationId]: toLocationStock };
                t.update(stockDoc.ref, { locationStock: updatedLocationStock });
    
                // --- Create reversal movements ---
                const movementInRef = stockDoc.ref.collection('movements').doc();
                const movementOutRef = stockDoc.ref.collection('movements').doc();
                t.set(movementInRef, { date: serverTimestamp() as Timestamp, type: 'transfer-reversal', quantityChange: item.quantity, notes: `Reversal of transfer ${transferData.transferId}`, relatedTransferId: transferId, batchNumber: item.batchNumber, locationId: fromLocationId });
                t.set(movementOutRef, { date: serverTimestamp() as Timestamp, type: 'transfer-reversal', quantityChange: -item.quantity, notes: `Reversal of transfer ${transferData.transferId}`, relatedTransferId: transferId, batchNumber: item.batchNumber, locationId: toLocationId });
            }
            
            t.update(transferRef, { status: 'Reversed' });
        });
    }, [user]);

    // Stock Order Management
    const getStockOrders = useCallback(async (startDate?: Date, endDate?: Date): Promise<StockOrder[]> => {
        if (!user) return [];
        let q: firebase.firestore.Query = db.collection("stockOrders").where("hospitalId", "==", user.hospitalId);
        if (startDate) {
            q = q.where("orderDate", ">=", firebase.firestore.Timestamp.fromDate(startDate));
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            q = q.where("orderDate", "<=", firebase.firestore.Timestamp.fromDate(endOfDay));
        }
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockOrder)).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [user]);

    const getStockOrderById = useCallback(async (orderId: string): Promise<StockOrder | null> => {
        if (!user) return null;
        const doc = await db.collection('stockOrders').doc(orderId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) return { id: doc.id, ...doc.data() } as StockOrder;
        return null;
    }, [user]);

    const addStockOrder = useCallback(async (data: NewStockOrderData) => {
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User not authenticated or location not set");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const stocksRef = db.collection('stocks');
        const newOrderRef = db.collection("stockOrders").doc();

        const attachments: StockAttachment[] = [];
        if (data.attachments && data.attachments.length > 0) {
            for (const file of data.attachments) {
                const fileName = `${newOrderRef.id}-${file.name}`;
                const url = await uploadFile(file, `stockOrderAttachments/${user.hospitalId}/${fileName}`);
                attachments.push({ name: file.name, url });
            }
        }

        try {
            await db.runTransaction(async (t) => {
                const hospitalDoc = await t.get(hospitalRef);
                if (!hospitalDoc.exists) throw new Error("Hospital document not found!");

                const locationRef = db.collection('hospitalLocations').doc(user.currentLocation!.id);
                const locationDoc = await t.get(locationRef);
                if (!locationDoc.exists) throw new Error("Hospital location document not found!");

                const lastOrderNum = locationDoc.data()!.lastStockOrderNumber || 0;
                const prefix = 'OS-';
                const locationCode = user.currentLocation!.code || user.currentLocation!.name.substring(0, 3).toUpperCase();
                const orderId = `${prefix}${locationCode}-${String(lastOrderNum + 1).padStart(6, '0')}`;
                
                const stockDocs = await Promise.all(data.items.map(i => t.get(stocksRef.doc(i.stockItemId))));
                let totalValue = 0;
                const orderItems: StockOrderItem[] = stockDocs.map((d, i) => {
                    if (!d.exists) throw new Error(`Stock item with ID ${data.items[i].stockItemId} not found.`);
                    const stockData = d.data() as StockItem;
                    const costPrice = data.items[i].costPrice;
                    const itemValue = costPrice * data.items[i].orderedQty;
                    totalValue += itemValue;
                    return {
                        stockItemId: data.items[i].stockItemId,
                        name: stockData.name,
                        sku: stockData.sku,
                        orderedQty: data.items[i].orderedQty,
                        receivedQty: 0,
                        returnedQty: 0,
                        category: stockData.category,
                        unitType: stockData.unitType,
                        costPrice: costPrice,
                    };
                });
                
                const newOrderData: Omit<StockOrder, 'id'> = {
                    orderId,
                    vendor: data.vendor,
                    createdAt: serverTimestamp() as Timestamp,
                    orderDate: firebase.firestore.Timestamp.fromDate(data.orderDate),
                    paymentTerms: data.paymentTerms,
                    attachments,
                    totalValue,
                    status: 'Pending' as StockOrderStatus,
                    items: orderItems,
                    totalItems: orderItems.reduce((sum, item) => sum + item.orderedQty, 0),
                    totalReceivedItems: 0,
                    hospitalId: user.hospitalId!,
                    locationId: user.currentLocation!.id,
                    paymentStatus: 'Unpaid',
                    amountPaid: 0,
                    paymentHistory: [],
                    createdBy: user.name,
                };

                t.set(newOrderRef, newOrderData);
                t.update(locationRef, { lastStockOrderNumber: increment(1) });
            });
        } catch (e: any) {
            console.error("Stock order creation failed", e);
            throw new Error(e.message || "Could not create stock order.");
        }
    }, [user, uploadFile]);

    const receiveStockOrderItems = useCallback(async (orderId: string, receivedItems: { stockItemId: string; batches: { receivedNowQty: number; costPrice: number; batchNumber?: string; expiryDate?: string; }[] }[]) => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        const orderRef = db.collection('stockOrders').doc(orderId);
    
        await db.runTransaction(async (t) => {
            // --- STAGE 1: READS ---
            const orderDoc = await t.get(orderRef);
            if (!orderDoc.exists) throw new Error("Order not found");
            const orderData = orderDoc.data() as StockOrder;
    
            const stockRefs = receivedItems.map(item => db.collection('stocks').doc(item.stockItemId));
            const stockDocs = await Promise.all(stockRefs.map(ref => t.get(ref)));
    
            // --- STAGE 2: PREPARATION (NO WRITES) ---
            const stockUpdates: { ref: firebase.firestore.DocumentReference, data: any }[] = [];
            const movementWrites: { ref: firebase.firestore.DocumentReference, data: any }[] = [];
    
            for (let i = 0; i < receivedItems.length; i++) {
                const receivedItem = receivedItems[i];
                const stockDoc = stockDocs[i];
    
                if (!stockDoc.exists) throw new Error(`Stock item ${receivedItem.stockItemId} not found.`);
                
                const stockData = stockDoc.data() as StockItem;
                let totalQtyReceivedThisTime = 0;
                
                const locationStock = stockData.locationStock?.[orderData.locationId] || { totalStock: 0, lowStockThreshold: 10, batches: [] };

                for (const batch of receivedItem.batches) {
                    totalQtyReceivedThisTime += batch.receivedNowQty;
    
                    const newBatch: Omit<StockBatch, 'id'> & { id: string } = {
                        id: db.collection('_').doc().id,
                        batchNumber: batch.batchNumber || `AUTO-${Date.now()}`,
                        quantity: batch.receivedNowQty,
                        costPrice: batch.costPrice,
                        salePrice: 0,
                    };
                     if (batch.expiryDate) {
                        newBatch.expiryDate = firebase.firestore.Timestamp.fromDate(new Date(batch.expiryDate));
                    }
    
                    let salePrice = 0;
                    if (locationStock.batches && locationStock.batches.length > 0) {
                        const latestBatch = [...locationStock.batches].sort((a,b) => (b.expiryDate?.seconds || 0) - (a.expiryDate?.seconds || 0))[0];
                        if (latestBatch.costPrice > 0) {
                            const profitMargin = (latestBatch.salePrice / latestBatch.costPrice) - 1;
                            salePrice = batch.costPrice * (1 + profitMargin);
                        }
                    }
                    if (salePrice === 0) {
                        salePrice = batch.costPrice * 1.2;
                    }
                    newBatch.salePrice = salePrice;
    
                    locationStock.batches.push(newBatch);
    
                    const movementData = {
                        date: serverTimestamp() as Timestamp,
                        type: 'received' as const,
                        quantityChange: batch.receivedNowQty,
                        notes: `Received from order #${orderData.orderId}`,
                        relatedOrderId: orderId,
                        cost: batch.costPrice,
                        batchNumber: newBatch.batchNumber,
                        locationId: orderData.locationId,
                    };
                    const movementRef = stockDoc.ref.collection('movements').doc();
                    movementWrites.push({ ref: movementRef, data: movementData });
                }
    
                locationStock.totalStock += totalQtyReceivedThisTime;

                const updatedLocationStockData = {
                    ...stockData.locationStock,
                    [orderData.locationId]: locationStock,
                };
                
                stockUpdates.push({ ref: stockDoc.ref, data: { locationStock: updatedLocationStockData }});
            }
    
            const updatedOrderItems = orderData.items.map(item => {
                const receivedInfo = receivedItems.find(ri => ri.stockItemId === item.stockItemId);
                const qtyReceivedNow = receivedInfo ? receivedInfo.batches.reduce((sum, b) => sum + b.receivedNowQty, 0) : 0;
                const newReceivedQty = item.receivedQty + qtyReceivedNow;
                return { ...item, receivedQty: newReceivedQty };
            });
            
            const totalReceivedInOrder = updatedOrderItems.reduce((sum, item) => sum + item.receivedQty, 0);
            const newStatus: StockOrderStatus = totalReceivedInOrder >= orderData.totalItems ? 'Complete' : 'Partially Received';
            
            const orderUpdateData = {
                items: updatedOrderItems,
                totalReceivedItems: totalReceivedInOrder,
                status: newStatus,
            };
    
            // --- STAGE 3: WRITES ---
            stockUpdates.forEach(update => t.update(update.ref, update.data));
            movementWrites.forEach(write => t.set(write.ref, write.data));
            t.update(orderRef, orderUpdateData);
        });
    }, [user]);
    

    const cancelStockOrder = useCallback(async (orderId: string) => {
        if (!user) throw new Error("User not authenticated");
        const orderRef = db.collection('stockOrders').doc(orderId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists || doc.data()?.hospitalId !== user.hospitalId) throw new Error("Permission denied or order not found");
            const data = doc.data() as StockOrder;
            if (['Complete', 'Cancelled'].includes(data.status)) throw new Error(`Cannot cancel an order that is already ${data.status}.`);
            if (data.totalReceivedItems > 0) throw new Error("Cannot cancel an order that has received items. Please create a stock return instead.");
            t.update(orderRef, { status: 'Cancelled' });
        });
    }, [user]);

    const deleteStockOrder = useCallback(async (orderId: string) => {
        if (!user) throw new Error("User not authenticated");
        const orderRef = db.collection('stockOrders').doc(orderId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists || doc.data()?.hospitalId !== user.hospitalId) throw new Error("Permission denied or order not found");
            const data = doc.data() as StockOrder;
            if (['Partially Received', 'Complete'].includes(data.status)) throw new Error(`Cannot delete an order that has received items.`);
            t.delete(orderRef);
        });
    }, [user]);

    const addStockOrderComment = useCallback(async (orderId: string, text: string) => {
        if (!user) throw new Error("User not authenticated");
        const orderRef = db.collection('stockOrders').doc(orderId);
        const newComment: StockOrderComment = {
            id: db.collection('_').doc().id,
            text,
            createdAt: firebase.firestore.Timestamp.now(),
            userId: user.uid,
            userName: user.name,
            userProfilePhotoUrl: user.profilePhotoUrl,
        };
        await orderRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        });
    }, [user]);

    const updateStockOrderComment = useCallback(async (orderId: string, comment: StockOrderComment) => {
        if (!user) throw new Error("User not authenticated");
        const orderRef = db.collection('stockOrders').doc(orderId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists) throw new Error("Order not found.");
            const data = doc.data() as StockOrder;
            const comments = data.comments || [];
            const commentIndex = comments.findIndex(c => c.id === comment.id);
            if (commentIndex === -1) throw new Error("Comment not found.");
            if (comments[commentIndex].userId !== user.uid) throw new Error("Permission denied.");
            comments[commentIndex] = { ...comment, updatedAt: firebase.firestore.Timestamp.now() };
            t.update(orderRef, { comments });
        });
    }, [user]);

    const deleteStockOrderComment = useCallback(async (orderId: string, commentId: string) => {
        if (!user) throw new Error("User not authenticated");
        const orderRef = db.collection('stockOrders').doc(orderId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists) throw new Error("Order not found.");
            const data = doc.data() as StockOrder;
            const commentToDelete = (data.comments || []).find(c => c.id === commentId);
            if (!commentToDelete) return; // Already deleted
            if (commentToDelete.userId !== user.uid && user.roleName !== 'owner' && user.roleName !== 'admin') {
                throw new Error("Permission denied to delete this comment.");
            }
            const newComments = (data.comments || []).filter(c => c.id !== commentId);
            t.update(orderRef, { comments: newComments });
        });
    }, [user]);

    const updateStockOrderPayment = useCallback(async (orderId: string, payment: Omit<Payment, 'date'|'id'|'recordedBy'>) => {
        if (!user) throw new Error("User not authenticated");
        const orderRef = db.collection("stockOrders").doc(orderId);
        const newPayment: Payment = { ...payment, id: db.collection('_').doc().id, date: firebase.firestore.Timestamp.now(), recordedBy: user.name };

        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists) throw new Error("Order not found");
            const data = doc.data() as StockOrder;
            const newAmountPaid = (data.amountPaid || 0) + payment.amount;
            const paymentStatus: InvoiceStatus = newAmountPaid >= data.totalValue ? 'Paid' : 'Partially Paid';
            t.update(orderRef, { 
                amountPaid: newAmountPaid, 
                paymentStatus, 
                paymentHistory: [...(data.paymentHistory || []), newPayment] 
            });
        });
    }, [user]);

    const updateStockOrderPaymentDetails = useCallback(async (orderId: string, paymentToUpdate: Payment) => {
        const orderRef = db.collection("stockOrders").doc(orderId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists) throw new Error("Order not found");
            const data = doc.data() as StockOrder;
            let amountPaid = 0;
            const newPayments = (data.paymentHistory || []).map(p => { 
                if (p.id === paymentToUpdate.id) { 
                    amountPaid += paymentToUpdate.amount; 
                    return paymentToUpdate; 
                } 
                amountPaid += p.amount; 
                return p; 
            });
            const paymentStatus: InvoiceStatus = amountPaid >= data.totalValue ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            t.update(orderRef, { paymentHistory: newPayments, amountPaid, paymentStatus });
        });
    }, []);

    const deleteStockOrderPayment = useCallback(async (orderId: string, paymentId: string) => {
        const orderRef = db.collection("stockOrders").doc(orderId);
        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists) throw new Error("Order not found");
            const data = doc.data() as StockOrder;
            const paymentToRemove = (data.paymentHistory || []).find(p => p.id === paymentId);
            if (!paymentToRemove) return;
            const newPayments = data.paymentHistory.filter(p => p.id !== paymentId);
            const newAmountPaid = (data.amountPaid || 0) - paymentToRemove.amount;
            const paymentStatus: InvoiceStatus = newAmountPaid >= data.totalValue ? 'Paid' : newAmountPaid > 0 ? 'Partially Paid' : 'Unpaid';
            t.update(orderRef, { paymentHistory: newPayments, amountPaid: newAmountPaid, paymentStatus });
        });
    }, []);

    // Stock Return Management
    const getStockReturns = useCallback(async (startDate?: Date, endDate?: Date): Promise<StockReturn[]> => {
        if (!user) return [];
        let q: firebase.firestore.Query = db.collection("stockReturns").where("hospitalId", "==", user.hospitalId);
        if (startDate) {
            q = q.where("returnDate", ">=", firebase.firestore.Timestamp.fromDate(startDate));
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            q = q.where("returnDate", "<=", firebase.firestore.Timestamp.fromDate(endOfDay));
        }
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockReturn)).sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [user]);

    const getStockReturnById = useCallback(async (returnId: string): Promise<StockReturn | null> => {
        if (!user) return null;
        const doc = await db.collection('stockReturns').doc(returnId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) {
            return { id: doc.id, ...doc.data() } as StockReturn;
        }
        return null;
    }, [user]);
    
    const addStockReturn = useCallback(async (data: NewStockReturnData) => {
// FIX: Add check for user.currentLocation
        if (!user || !user.hospitalId || !user.currentLocation) throw new Error("User not authenticated or location not set");
    
        const orderQuery = await db.collection('stockOrders').where('hospitalId', '==', user.hospitalId).where('orderId', '==', data.relatedOrderId).limit(1).get();
        if (orderQuery.empty) throw new Error("Related stock order not found.");
        const orderDoc = orderQuery.docs[0];
        const orderRef = orderDoc.ref;
    
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const newReturnRef = db.collection("stockReturns").doc();
    
        try {
            await db.runTransaction(async (t) => {
                // --- STAGE 1: READS ---
                const hospitalDoc = await t.get(hospitalRef);
                if (!hospitalDoc.exists) throw new Error("Hospital document not found!");

                const locationRef = db.collection('hospitalLocations').doc(user.currentLocation!.id);
                const locationDoc = await t.get(locationRef);
                if (!locationDoc.exists) throw new Error("Hospital location document not found!");
                
                const freshOrderDoc = await t.get(orderRef);
                if (!freshOrderDoc.exists) throw new Error("Related stock order disappeared during transaction.");
    
                const stockRefs = data.items.map(item => db.collection('stocks').doc(item.stockItemId));
                const stockDocs = await Promise.all(stockRefs.map(ref => t.get(ref)));
    
                // --- STAGE 2: PREPARATION ---
                const lastReturnNum = locationDoc.data()!.lastStockReturnNumber || 0;
                const prefix = 'RET-';
                const locationCode = user.currentLocation!.code || user.currentLocation!.name.substring(0, 3).toUpperCase();
                const returnId = `${prefix}${locationCode}-${String(lastReturnNum + 1).padStart(4, '0')}`;
                const freshOrderData = freshOrderDoc.data() as StockOrder;
                
                let totalReturnValue = 0;
                const returnItems: StockReturnItem[] = [];
                const stockUpdates: { ref: firebase.firestore.DocumentReference, data: any }[] = [];
                const movementWrites: { ref: firebase.firestore.DocumentReference, data: any }[] = [];
    
                for (let i = 0; i < data.items.length; i++) {
                    const itemData = data.items[i];
                    const stockDoc = stockDocs[i];
    
                    if (!stockDoc.exists) throw new Error(`Stock item with ID ${itemData.stockItemId} not found.`);
                    
                    const stockData = stockDoc.data() as StockItem;
                    
                    const locationStock = stockData.locationStock?.[freshOrderData.locationId];
                    if (!locationStock) throw new Error(`Stock data for location not found for item ${stockData.name}`);

                    const batchIndex = locationStock.batches.findIndex(b => b.id === itemData.batchId);
                    if (batchIndex === -1) throw new Error(`Batch not found for ${stockData.name}.`);
                    const batch = locationStock.batches[batchIndex];
    
                    if (batch.quantity < itemData.returnedQty) throw new Error(`Insufficient stock in batch ${batch.batchNumber} for ${stockData.name}. Available: ${batch.quantity}, Returning: ${itemData.returnedQty}`);
    
                    totalReturnValue += batch.costPrice * itemData.returnedQty;
    
                    returnItems.push({
                        stockItemId: itemData.stockItemId,
                        name: stockData.name,
                        sku: stockData.sku,
                        returnedQty: itemData.returnedQty,
                        costPriceAtReturn: batch.costPrice,
                        batchId: itemData.batchId,
                        batchNumber: batch.batchNumber
                    });
    
                    locationStock.batches[batchIndex].quantity -= itemData.returnedQty;
                    locationStock.totalStock -= itemData.returnedQty;

                    stockUpdates.push({ ref: stockDoc.ref, data: { [`locationStock.${freshOrderData.locationId}`]: locationStock }});
                    
                    const movementRef = stockDoc.ref.collection("movements").doc();
                    const movementData = {
                        date: serverTimestamp() as Timestamp,
                        type: 'return' as const,
                        quantityChange: -itemData.returnedQty,
                        notes: `Returned to vendor for order #${data.relatedOrderId}. Return ID: ${returnId}`,
                        relatedReturnId: newReturnRef.id,
                        batchNumber: batch.batchNumber,
                        locationId: freshOrderData.locationId,
                    };
                    movementWrites.push({ ref: movementRef, data: movementData });
                }
    
                const newOrderItems = freshOrderData.items.map(orderItem => {
                    const returnedItemsForThisStock = data.items.filter(ri => ri.stockItemId === orderItem.stockItemId);
                    if (returnedItemsForThisStock.length > 0) {
                        const totalReturnedNow = returnedItemsForThisStock.reduce((sum, ri) => sum + ri.returnedQty, 0);
                        return { ...orderItem, returnedQty: (orderItem.returnedQty || 0) + totalReturnedNow };
                    }
                    return orderItem;
                });
                const orderUpdateData = { items: newOrderItems };
    
                const newReturnData: Omit<StockReturn, 'id'> = {
                    returnId,
                    vendor: data.vendor,
                    createdAt: serverTimestamp() as Timestamp,
                    returnDate: firebase.firestore.Timestamp.fromDate(data.returnDate),
                    relatedOrderId: data.relatedOrderId,
                    items: returnItems,
                    totalReturnValue,
                    notes: data.notes,
                    hospitalId: user!.hospitalId!,
// FIX: Add locationId to new stock return
                    locationId: user.currentLocation.id,
                    createdBy: user!.name,
                };
    
                // --- STAGE 3: WRITES ---
                stockUpdates.forEach(update => t.update(update.ref, update.data));
                movementWrites.forEach(write => t.set(write.ref, write.data));
                t.update(orderRef, orderUpdateData);
                t.set(newReturnRef, newReturnData);
                t.update(locationRef, { lastStockReturnNumber: increment(1) });
            });
        } catch (e: any) {
            console.error("Stock return failed", e);
            throw new Error(e.message || "Could not process stock return.");
        }
    }, [user]);

    // Stock Category/Unit/Brand Management
    const addStockCategory = useCallback(async (category: string) => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('hospitals').doc(user.hospitalId).update({ stockCategories: firebase.firestore.FieldValue.arrayUnion(category) });
        setUser(prev => prev ? { ...prev, hospitalStockCategories: [...new Set([...(prev.hospitalStockCategories || []), category])] } : null);
    }, [user, setUser]);

    const deleteStockCategory = useCallback(async (category: string) => {
        if (!user) throw new Error("User not authenticated");
        const snapshot = await db.collection('stocks').where('hospitalId', '==', user.hospitalId).where('category', '==', category).limit(1).get();
        if (!snapshot.empty) throw new Error("Cannot delete category as it is in use by one or more stock items.");
        await db.collection('hospitals').doc(user.hospitalId).update({ stockCategories: firebase.firestore.FieldValue.arrayRemove(category) });
        setUser(prev => prev ? { ...prev, hospitalStockCategories: (prev.hospitalStockCategories || []).filter(c => c !== category) } : null);
    }, [user, setUser]);

    const addStockUnitType = useCallback(async (unitType: string) => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('hospitals').doc(user.hospitalId).update({ stockUnitTypes: firebase.firestore.FieldValue.arrayUnion(unitType) });
        setUser(prev => prev ? { ...prev, hospitalStockUnitTypes: [...new Set([...(prev.hospitalStockUnitTypes || []), unitType])] } : null);
    }, [user, setUser]);

    const deleteStockUnitType = useCallback(async (unitType: string) => {
        if (!user) throw new Error("User not authenticated");
        const snapshot = await db.collection('stocks').where('hospitalId', '==', user.hospitalId).where('unitType', '==', unitType).limit(1).get();
        if (!snapshot.empty) throw new Error("Cannot delete unit type as it is in use by one or more stock items.");
        await db.collection('hospitals').doc(user.hospitalId).update({ stockUnitTypes: firebase.firestore.FieldValue.arrayRemove(unitType) });
        setUser(prev => prev ? { ...prev, hospitalStockUnitTypes: (prev.hospitalStockUnitTypes || []).filter(u => u !== unitType) } : null);
    }, [user, setUser]);
    
    const addStockBrand = useCallback(async (brand: string) => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('hospitals').doc(user.hospitalId).update({ stockBrands: firebase.firestore.FieldValue.arrayUnion(brand) });
        setUser(prev => prev ? { ...prev, hospitalStockBrands: [...new Set([...(prev.hospitalStockBrands || []), brand])] } : null);
    }, [user, setUser]);

    const deleteStockBrand = useCallback(async (brand: string) => {
        if (!user) throw new Error("User not authenticated");
        const snapshot = await db.collection('stocks').where('hospitalId', '==', user.hospitalId).where('vendor', '==', brand).limit(1).get();
        if (!snapshot.empty) throw new Error("Cannot delete brand as it is in use by one or more stock items.");
        await db.collection('hospitals').doc(user.hospitalId).update({ stockBrands: firebase.firestore.FieldValue.arrayRemove(brand) });
        setUser(prev => prev ? { ...prev, hospitalStockBrands: (prev.hospitalStockBrands || []).filter(c => c !== brand) } : null);
    }, [user, setUser]);

    const addExpenseCategory = useCallback(async (category: string) => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('hospitals').doc(user.hospitalId).update({ expenseCategories: firebase.firestore.FieldValue.arrayUnion(category) });
        setUser(prev => prev ? { ...prev, hospitalExpenseCategories: [...new Set([...(prev.hospitalExpenseCategories || []), category])] } : null);
    }, [user, setUser]);

    const deleteExpenseCategory = useCallback(async (category: string) => {
        if (!user) throw new Error("User not authenticated");
        const snapshot = await db.collection('expenses').where('hospitalId', '==', user.hospitalId).where('category', '==', category).limit(1).get();
        if (!snapshot.empty) throw new Error("Cannot delete category as it is in use by one or more expenses.");
        await db.collection('hospitals').doc(user.hospitalId).update({ expenseCategories: firebase.firestore.FieldValue.arrayRemove(category) });
        setUser(prev => prev ? { ...prev, hospitalExpenseCategories: (prev.hospitalExpenseCategories || []).filter(c => c !== category) } : null);
    }, [user, setUser]);

    // Peripheral Management
    const getPeripherals = useCallback(async (): Promise<Peripheral[]> => {
        if (!user) return [];
        const q = db.collection("peripherals").where("hospitalId", "==", user.hospitalId);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Peripheral)).sort((a,b) => a.name.localeCompare(b.name));
    }, [user]);

    const getPeripheralById = useCallback(async (id: string): Promise<Peripheral | null> => {
        if (!user) return null;
        const doc = await db.collection('peripherals').doc(id).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) return { id: doc.id, ...doc.data() } as Peripheral;
        return null;
    }, [user]);

    const addPeripheral = useCallback(async (data: NewPeripheralData): Promise<string> => {
        if (!user || !user.hospitalId) throw new Error("User not authenticated");
        
        const { photo, newAttachments, purchaseDate, ...restData } = data;
        
        let photoUrl = '';
        if (photo) {
            let photoToUpload: Blob;
            if (typeof photo === 'string') photoToUpload = await (await fetch(photo)).blob();
            else photoToUpload = photo;
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            photoUrl = await uploadFile(photoToUpload, `peripherals/${user.hospitalId}/${photoName}`);
        }
        
        const peripheralRef = db.collection('peripherals').doc();
        const peripheralId = peripheralRef.id;
    
        const attachments: PeripheralAttachment[] = [];
        if (newAttachments && newAttachments.length > 0) {
            for (const file of newAttachments) {
                const fileName = `${Date.now()}-${file.name}`;
                const url = await uploadFile(file, `peripherals/${user.hospitalId}/${peripheralId}/attachments/${fileName}`);
                attachments.push({ id: db.collection('_').doc().id, name: file.name, url, uploadedAt: firebase.firestore.Timestamp.now() });
            }
        }
    
        // FIX: Explicitly build peripheralData to ensure all required fields are included.
        const peripheralData: Omit<Peripheral, 'id'> = {
            name: data.name,
            hospitalId: user.hospitalId,
            locationId: data.locationId,
            photoUrl: photoUrl,
            assignedTo: data.assignedTo,
            status: data.status,
            tags: data.tags,
            series: data.series,
            category: data.category,
            weight: data.weight,
            weightUnit: data.weightUnit,
            sku: data.sku,
            barcode: data.barcode,
            description: data.description,
            purchaseDate: firebase.firestore.Timestamp.fromDate(purchaseDate),
            purchasePrice: data.purchasePrice,
            vendor: data.vendor,
            invoiceNumber: data.invoiceNumber,
            attachments: attachments
        };
        
        await peripheralRef.set(peripheralData);
        return peripheralId;
    
    }, [user, uploadFile]);
    

    const updatePeripheral = useCallback(async (id: string, data: PeripheralUpdateData) => {
        if (!user) throw new Error("User not authenticated");
        const peripheralRef = db.collection('peripherals').doc(id);
        const docSnap = await peripheralRef.get();
        if (!docSnap.exists) throw new Error("Peripheral not found");
        const existingData = docSnap.data() as Peripheral;

        const { photo, newAttachments, removedAttachmentIds, purchaseDate, ...restData } = data;
        const updateData: { [key: string]: any } = { ...restData };
        
        if (purchaseDate) {
            updateData.purchaseDate = firebase.firestore.Timestamp.fromDate(purchaseDate);
        }
        
        if (photo === null) {
            if (existingData.photoUrl) await storage.refFromURL(existingData.photoUrl).delete().catch(console.error);
            updateData.photoUrl = '';
        } else if (photo) {
            if (existingData.photoUrl) await storage.refFromURL(existingData.photoUrl).delete().catch(console.error);
            let photoToUpload: Blob;
            if (typeof photo === 'string') photoToUpload = await (await fetch(photo)).blob();
            else photoToUpload = photo;
            const photoName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            updateData.photoUrl = await uploadFile(photoToUpload, `peripherals/${user.hospitalId}/${id}/${photoName}`);
        }
        
        let currentAttachments = existingData.attachments || [];
        if (removedAttachmentIds && removedAttachmentIds.length > 0) {
            for (const attachmentId of removedAttachmentIds) {
                const attachmentToRemove = currentAttachments.find(a => a.id === attachmentId);
                if (attachmentToRemove) await storage.refFromURL(attachmentToRemove.url).delete().catch(console.error);
            }
            currentAttachments = currentAttachments.filter(a => !removedAttachmentIds.includes(a.id));
        }
        if (newAttachments && newAttachments.length > 0) {
            for (const file of newAttachments) {
                const fileName = `${Date.now()}-${file.name}`;
                const url = await uploadFile(file, `peripherals/${user.hospitalId}/${id}/attachments/${fileName}`);
                currentAttachments.push({ id: db.collection('_').doc().id, name: file.name, url, uploadedAt: firebase.firestore.Timestamp.now() });
            }
        }
        updateData.attachments = currentAttachments;
        
        await peripheralRef.update(updateData);
    }, [user, uploadFile]);

    const deletePeripheral = useCallback(async (id: string) => {
        if (!user) throw new Error("User not authenticated");
        const peripheralRef = db.collection('peripherals').doc(id);
        const docSnap = await peripheralRef.get();
        if (!docSnap.exists) return;
        const data = docSnap.data() as Peripheral;

        if (data.photoUrl) await storage.refFromURL(data.photoUrl).delete().catch(console.error);
        if (data.attachments && data.attachments.length > 0) {
            for (const attachment of data.attachments) {
                await storage.refFromURL(attachment.url).delete().catch(console.error);
            }
        }
        await peripheralRef.delete();
    }, [user]);

    // Vendor Management
    const getVendors = useCallback(async (): Promise<Vendor[]> => {
        if (!user) return [];
        const q = db.collection("vendors").where("hospitalId", "==", user.hospitalId);
        const snapshot = await q.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)).sort((a, b) => a.name.localeCompare(b.name));
    }, [user]);

    const getVendorById = useCallback(async (vendorId: string): Promise<Vendor | null> => {
        if (!user) return null;
        const doc = await db.collection('vendors').doc(vendorId).get();
        if (doc.exists && doc.data()?.hospitalId === user.hospitalId) return { id: doc.id, ...doc.data() } as Vendor;
        return null;
    }, [user]);

    const addVendor = useCallback(async (data: NewVendorData) => {
        if (!user) throw new Error("User not authenticated");
        const hospitalRef = db.collection('hospitals').doc(user.hospitalId);
        const vendorRef = db.collection('vendors').doc();
        await db.runTransaction(async (t) => {
            const doc = await t.get(hospitalRef);
            if (!doc.exists) throw new Error("Hospital document not found!");
            const lastVendorNumber = doc.data()!.lastVendorNumber || 0;
            const vendorId = `VDR-${String(lastVendorNumber + 1).padStart(4, '0')}`;
            t.set(vendorRef, {
                ...data,
                vendorId,
                hospitalId: user.hospitalId,
                status: 'active'
            });
            t.update(hospitalRef, { lastVendorNumber: increment(1) });
        });
    }, [user]);

    const updateVendor = useCallback(async (vendorId: string, data: VendorUpdateData) => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('vendors').doc(vendorId).update(data);
    }, [user]);

    const deleteVendor = useCallback(async (vendorId: string) => {
        if (!user) throw new Error("User not authenticated");
        // Future check: ensure vendor is not linked to any stock orders
        await db.collection('vendors').doc(vendorId).delete();
    }, [user]);
    
    const updateVendorStatus = useCallback(async (vendorId: string, status: 'active' | 'inactive') => {
        if (!user) throw new Error("User not authenticated");
        await db.collection('vendors').doc(vendorId).update({ status });
    }, [user]);

    return {
        getStocks, getStockItemById, addStock, updateStock, deleteStock, getStockMovements, adjustStockQuantity,
        addStockTransfer, getStockTransfers,
        getStockTransferById, deleteStockTransfer,
        getStockOrders, getStockOrderById, addStockOrder, receiveStockOrderItems, cancelStockOrder, deleteStockOrder,
        addStockOrderComment, updateStockOrderComment, deleteStockOrderComment,
        updateStockOrderPayment, updateStockOrderPaymentDetails, deleteStockOrderPayment,
        getStockReturns, addStockReturn, getStockReturnById,
        addStockCategory, deleteStockCategory, addStockUnitType, deleteStockUnitType, addStockBrand, deleteStockBrand,
        addExpenseCategory, deleteExpenseCategory,
        getPeripherals, getPeripheralById, addPeripheral, updatePeripheral, deletePeripheral,
        getVendors, getVendorById, addVendor, updateVendor, deleteVendor, updateVendorStatus,
    };
}
