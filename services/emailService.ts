import { AppUser, PatientDocument, Appointment, Treatment, POSSale, Invoice, StockOrder } from '../types';

interface EmailPlaceholders {
    patient?: Partial<PatientDocument> & { name: string; email?: string };
    // FIX: Use Omit to prevent type conflict on 'start' property between Appointment's Timestamp and the required Date for email formatting.
    appointment?: Omit<Partial<Appointment>, 'start'> & { start: Date, doctorName: string, treatmentName: string };
    user: AppUser;
    // FIX: Corrected invoice type to avoid 'never' type from incompatible intersection.
    // The previous type `Partial<Invoice & POSSale>` resulted in `never` because of conflicting `status` properties.
    // This new type defines only the properties needed for the email template.
    invoice?: {
        invoiceId?: string;
        saleId?: string;
        totalAmount?: number;
    };
    stockOrder?: StockOrder;
}

const formatCurrencyLocal = (amount: number, currencyCode: string = 'USD') => {
    const currencySymbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const symbol = currencySymbols[currencyCode] || '$';
    if (isNaN(amount)) amount = 0;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};


function replacePlaceholders(text: string, placeholders: EmailPlaceholders): string {
    let replacedText = text;
    if (placeholders.user) {
        replacedText = replacedText.replace(/{{hospitalName}}/g, placeholders.user.hospitalName || '');
    }
    if (placeholders.patient) {
        replacedText = replacedText.replace(/{{patientName}}/g, placeholders.patient.name);
    }
    if (placeholders.appointment) {
        const appt = placeholders.appointment;
        replacedText = replacedText.replace(/{{appointmentDate}}/g, appt.start.toLocaleDateString());
        replacedText = replacedText.replace(/{{appointmentTime}}/g, appt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        replacedText = replacedText.replace(/{{doctorName}}/g, appt.doctorName);
        replacedText = replacedText.replace(/{{treatmentName}}/g, appt.treatmentName);
    }
    if (placeholders.invoice) {
        const currencySymbol = placeholders.user.hospitalCurrency === 'INR' ? '₹' : '$';
        replacedText = replacedText.replace(/{{invoiceId}}/g, placeholders.invoice.invoiceId || placeholders.invoice.saleId || '');
        replacedText = replacedText.replace(/{{totalAmount}}/g, `${currencySymbol}${(placeholders.invoice.totalAmount || 0).toFixed(2)}`);
    }
    if (placeholders.stockOrder) {
        const order = placeholders.stockOrder;
        const itemsTable = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1rem;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Item</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">SKU</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Quantity</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Unit Price</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${item.name}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${item.sku}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${item.orderedQty}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrencyLocal(item.costPrice, placeholders.user.hospitalCurrency || 'USD')}</td>
                            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrencyLocal(item.costPrice * item.orderedQty, placeholders.user.hospitalCurrency || 'USD')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        replacedText = replacedText.replace(/{{orderId}}/g, order.orderId);
        replacedText = replacedText.replace(/{{vendorName}}/g, order.vendor);
        replacedText = replacedText.replace(/{{orderTotal}}/g, formatCurrencyLocal(order.totalValue, placeholders.user.hospitalCurrency || 'USD'));
        replacedText = replacedText.replace(/{{orderDate}}/g, order.orderDate.toDate().toLocaleDateString());
        replacedText = replacedText.replace(/{{paymentTerms}}/g, `${order.paymentTerms} days`);
        replacedText = replacedText.replace(/{{itemsTable}}/g, itemsTable);
    }
    return replacedText;
}

export const sendEmail = async (
    to: string, 
    subjectTemplate: string, 
    bodyTemplate: string, 
    placeholdersData: EmailPlaceholders
): Promise<{ success: boolean; message: string }> => {
    const finalSubject = replacePlaceholders(subjectTemplate, placeholdersData);
    const finalBody = replacePlaceholders(bodyTemplate, placeholdersData);
    
    const emailSettings = placeholdersData.user?.hospitalEmailSettings;

    // If no provider is set, or it's the default, log to console as a simulation.
    if (!emailSettings || emailSettings.provider === 'default') {
        console.log("--- SIMULATING EMAIL (DEFAULT PROVIDER) ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${finalSubject}`);
        console.log("Body:");
        console.log(finalBody);
        console.log("--- END SIMULATION ---");
        
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: `Simulated email sent to ${to}. Check console for details.` };
    }

    // If a real provider is configured, simulate the backend call.
    // In a real application, this block would be replaced with an API call to a backend service.
    console.log(`--- SENDING ACTUAL EMAIL VIA BACKEND ---`);
    console.log(`Provider: ${emailSettings.provider.toUpperCase()}`);
    console.log(`From: ${emailSettings.fromEmail}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${finalSubject}`);
    console.log("Body:");
    console.log(finalBody);
    console.log('NOTE: This is a frontend simulation. In a real application, an API call would be made to a backend service with these details to dispatch the email.');
    console.log(`--- END EMAIL DISPATCH ---`);

    // Simulate API call to a backend email service
    await new Promise(resolve => setTimeout(resolve, 1500)); // longer delay to simulate network

    // This part is crucial for the user's feedback. They will not get a real email,
    // so the success message needs to manage expectations.
    return { 
        success: true, 
        message: `An email has been dispatched to ${to} via your configured ${emailSettings.provider.toUpperCase()} service. (Note: No real email is sent in this environment.)` 
    };
};