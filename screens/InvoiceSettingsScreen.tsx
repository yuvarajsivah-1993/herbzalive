



import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { InvoiceSettingsData, NotificationTemplate, IndividualInvoiceSettings, PrinterType, A4Design, ThermalDesign, Hospital, PatientDocument, Invoice, POSSale, Payment, InvoiceTaxComponent, POSSaleItem } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { useToast } from '../hooks/useToast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faUndo, faPencilAlt, faExclamationTriangle, faFileInvoice, faCashRegister } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Timestamp } from 'firebase/firestore';

// --- START: INVOICE & RECEIPT COMPONENTS ---

// Helper to convert number to words
const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function toWords(num: number): string {
    if (num === 0) return 'zero';
    let str = '';
    const process = (n: number, unit: string) => {
        if (n > 0) {
            str += toWords(Math.floor(n)) + ' ' + unit + ' ';
        }
        return n % 1 > 0 ? n - Math.floor(n) : 0;
    };
    
    if (num >= 10000000) {
        str += toWords(Math.floor(num / 10000000)) + ' crore ';
        num %= 10000000;
    }
    if (num >= 100000) {
        str += toWords(Math.floor(num / 100000)) + ' lakh ';
        num %= 100000;
    }
    if (num >= 1000) {
        str += toWords(Math.floor(num / 1000)) + ' thousand ';
        num %= 1000;
    }
    if (num >= 100) {
        str += a[Math.floor(num / 100)] + ' hundred ';
        num %= 100;
    }
    if (num > 0) {
        if (str !== '' && !str.endsWith('and ')) str += 'and ';
        if (num < 20) {
            str += a[num];
        } else {
            str += b[Math.floor(num / 10)];
            if (num % 10 > 0) {
                str += '-' + a[num % 10];
            }
        }
    }
    return str.trim();
}

const amountToWords = (amount: number, currencyCode: string = 'INR') => {
    const number = Math.floor(amount);
    const decimals = Math.round((amount - number) * 100);
    const currencyInfo = {
        'INR': { major: 'Rupees', minor: 'Paise' },
        'USD': { major: 'Dollars', minor: 'Cents' },
        'EUR': { major: 'Euros', minor: 'Cents' },
        'GBP': { major: 'Pounds', minor: 'Pence' },
    };
    const { major, minor } = currencyInfo[currencyCode as keyof typeof currencyInfo] || currencyInfo.USD;

    if (number === 0 && decimals === 0) return 'Zero ' + major + ' only.';

    let words = '';
    if (number > 0) {
        words = toWords(number);
        words = words.charAt(0).toUpperCase() + words.slice(1);
        words += ' ' + major;
    }
    
    if (decimals > 0) {
        if (number > 0) words += ' and ';
        let decimalWords = toWords(decimals);
        decimalWords = decimalWords.charAt(0).toUpperCase() + decimalWords.slice(1);
        words += decimalWords + ' ' + minor;
    }
    return words + ' only.';
};


interface InvoiceForPreview {
  invoiceId?: string;
  saleId?: string;
  createdAt?: Timestamp;
  items?: ({
    description?: string;
    name?: string;
    quantity?: number;
    cost?: number;
    salePrice?: number;
    taxAmount?: number;
  } & Partial<POSSaleItem>)[];
  subtotal?: number;
  taxes?: InvoiceTaxComponent[];
  totalTax?: number;
  totalAmount?: number; // grand total
  grossTotal?: number;
  amountPaid?: number;
  paymentHistory?: Payment[];
  totalItemDiscount?: number;
  overallDiscount?: number;
}


interface InvoiceProps {
  hospital: Partial<Hospital>;
  patient: Partial<PatientDocument>;
  invoice: InvoiceForPreview;
  type: 'Treatment' | 'POS';
  footerText: string;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  formatCurrency: (amount: number) => string;
}



// A4 Designs (210mm x 297mm)
const A4Wrapper: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`w-[210mm] h-[297mm] bg-white text-black font-sans text-xs shadow-lg ${className}`}>
        {children}
    </div>
);

export const ModernInvoice: React.FC<InvoiceProps> = ({ hospital, patient, invoice, type, footerText, formatDate, formatTime, formatCurrency }) => {
    const grandTotal = invoice.totalAmount ?? 0;
    const paid = invoice.amountPaid ?? 0;
    const due = grandTotal - paid;
    const paymentMethods = invoice.paymentHistory?.map(p => `${p.method} (${formatCurrency(p.amount)})`).join(', ');
    const fullHospitalAddress = [ hospital.address?.street, hospital.address?.city, hospital.address?.state, hospital.address?.country ].filter(Boolean).join(', ') + (hospital.address?.pincode ? ` - ${hospital.address.pincode}` : '');


    return (
    <A4Wrapper>
        <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
                <tr>
                    <td>
                        <header className="bg-blue-600 text-white p-10 flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-bold uppercase tracking-widest">Invoice</h1>
                                <p className="text-blue-200 mt-1">Invoice #{invoice.invoiceId || invoice.saleId}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <h2 className="text-xl font-semibold">{hospital.name}</h2>
                                    <p className="text-sm text-blue-200">{fullHospitalAddress}</p>
                                </div>
                                {hospital.logoUrl && <img src={hospital.logoUrl} alt={`${hospital.name} logo`} className="h-14 w-14 object-contain bg-white p-1 rounded-md" />}
                            </div>
                        </header>
                    </td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="p-10 align-top">
                        <section className="grid grid-cols-2 gap-10 mb-10">
                            <div>
                                <h3 className="text-gray-700 font-semibold uppercase tracking-wider mb-2 print:text-black">Billed To</h3>
                                <p className="font-bold text-lg text-gray-900 print:text-black">{patient.name}</p>
                                <p className="text-gray-800 print:text-black">{patient.address}</p>
                                <p className="text-gray-800 print:text-black">{patient.phone}</p>
                            </div>
                            <div className="text-right text-gray-800 print:text-black">
                                <p><strong className="text-gray-800 print:text-black">Invoice Date:</strong> {invoice.createdAt?.toDate() ? formatDate(invoice.createdAt.toDate()) : 'N/A'}</p>
                                <p><strong className="text-gray-800 print:text-black">Due Date:</strong> {invoice.createdAt?.toDate() ? formatDate(invoice.createdAt.toDate()) : 'N/A'}</p>
                            </div>
                        </section>
                        <table className="w-full text-left">
                            {type === 'POS' ? (
                                <>
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 font-semibold uppercase text-gray-800 text-[10px]">#</th>
                                            <th className="p-2 font-semibold uppercase text-gray-800 text-[10px]">Item</th>
                                            <th className="p-2 font-semibold uppercase text-gray-800 text-[10px]">HSN</th>
                                            <th className="p-2 font-semibold uppercase text-gray-800 text-[10px]">Batch/Exp</th>
                                            <th className="p-2 font-semibold uppercase text-center text-gray-800 text-[10px]">Qty</th>
                                            <th className="p-2 font-semibold uppercase text-right text-gray-800 text-[10px]">MRP</th>
                                            <th className="p-2 font-semibold uppercase text-right text-gray-800 text-[10px]">Tax</th>
                                            <th className="p-2 font-semibold uppercase text-right text-gray-800 text-[10px]">Discount</th>
                                            <th className="p-2 font-semibold uppercase text-right text-gray-800 text-[10px]">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-900 print:text-black">
                                        {invoice.items?.map((item, i) => {
                                            const lineGross = (item.salePrice || 0) * (item.quantity || 1);
                                            const lineTax = (item.taxAmount || 0) * (item.quantity || 1);
                                            const lineDiscount = item.discountAmount || 0;
                                            const lineTotal = lineGross + lineTax - lineDiscount;
                                            return (
                                                <tr key={i} className="border-b">
                                                    <td className="p-2 text-[11px]">{i + 1}</td>
                                                    <td className="p-2 text-[11px]">{item.name}</td>
                                                    <td className="p-2 text-[11px]">{item.hsnCode}</td>
                                                    <td className="p-2 text-[11px]">{item.batchNumber}<br/>{item.expiryDate}</td>
                                                    <td className="p-2 text-center text-[11px]">{item.quantity}</td>
                                                    <td className="p-2 text-right text-[11px]">{formatCurrency(item.salePrice || 0)}</td>
                                                    <td className="p-2 text-right text-[11px]">{formatCurrency(lineTax)}<br/><span className="text-[9px] text-gray-500">{item.taxName}</span></td>
                                                    <td className="p-2 text-right text-[11px]">{formatCurrency(lineDiscount)}</td>
                                                    <td className="p-2 text-right font-semibold text-[11px]">{formatCurrency(lineTotal)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </>
                            ) : (
                                <>
                                    <thead className="bg-gray-100">
                                        <tr><th className="p-3 font-semibold uppercase text-gray-800 print:text-black">Description</th><th className="p-3 font-semibold uppercase text-center text-gray-800 print:text-black">Qty</th><th className="p-3 font-semibold uppercase text-right text-gray-800 print:text-black">Unit Price</th><th className="p-3 font-semibold uppercase text-right text-gray-800 print:text-black">Total</th></tr>
                                    </thead>
                                    <tbody className="text-gray-900 print:text-black">
                                        {invoice.items?.map((item, i) => (
                                            <tr key={i}><td className="p-3">{item.description || item.name}</td><td className="p-3 text-center">{item.quantity || 1}</td><td className="p-3 text-right">{formatCurrency(item.cost || item.salePrice || 0)}</td><td className="p-3 text-right">{formatCurrency(((item.cost || item.salePrice) || 0) * (item.quantity || 1))}</td></tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                        <section className="mt-8 grid grid-cols-2 gap-8 items-start">
                            <div className="text-gray-800 print:text-black">
                                <h4 className="font-semibold uppercase tracking-wider mb-2">Payment Details</h4>
                                <p className="text-sm"><strong>Payment Mode:</strong> {paymentMethods || 'N/A'}</p>
                                <p className="text-sm"><strong>Recorded By:</strong> {invoice.paymentHistory?.[0]?.recordedBy || 'N/A'}</p>
                                <div className="mt-4">
                                    <p className="font-bold">Amount in Words:</p>
                                    <p className="text-sm">{amountToWords(grandTotal, hospital.currency)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {type === 'POS' ? (
                                    <>
                                        <div className="flex justify-between text-gray-800 print:text-black"><p>Gross Total:</p><p className="text-gray-900 print:text-black">{formatCurrency(invoice.grossTotal || 0)}</p></div>
                                        <div className="flex justify-between mt-2 text-gray-800 print:text-black"><p>Total Tax:</p><p className="text-gray-900 print:text-black">{formatCurrency((invoice as POSSale).taxAmount || 0)}</p></div>
                                        <div className="flex justify-between mt-2 text-gray-800 font-semibold print:text-black"><p>Subtotal:</p><p className="text-gray-900 print:text-black">{formatCurrency((invoice.grossTotal || 0) + ((invoice as POSSale).taxAmount || 0))}</p></div>
                                        {(invoice.totalItemDiscount || 0) > 0 && <div className="flex justify-between mt-2 text-green-600"><p>Item Discounts:</p><p className="text-green-600">- {formatCurrency(invoice.totalItemDiscount || 0)}</p></div>}
                                        {(invoice.overallDiscount || 0) > 0 && <div className="flex justify-between mt-2 text-green-600"><p>Overall Discount:</p><p className="text-green-600">- {formatCurrency(invoice.overallDiscount || 0)}</p></div>}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-gray-800 print:text-black"><p>Subtotal:</p><p className="text-gray-900 print:text-black">{formatCurrency(invoice.subtotal || 0)}</p></div>
                                        {(invoice.taxes || []).map((t, i) => (
                                            <div key={i} className="flex justify-between mt-2 text-gray-800 print:text-black"><p>{t.name} ({t.rate}%):</p><p className="text-gray-900 print:text-black">{formatCurrency(t.amount)}</p></div>
                                        ))}
                                    </>
                                )}
                                <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t text-gray-900 print:text-black"><p>Grand Total:</p><p>{formatCurrency(grandTotal)}</p></div>
                                <div className="flex justify-between mt-2 text-gray-800 print:text-black"><p>Amount Paid:</p><p className="text-gray-900 print:text-black">{formatCurrency(paid)}</p></div>
                                <div className="flex justify-between font-bold text-xl mt-4 pt-4 border-t text-red-600"><p>Amount Due:</p><p>{formatCurrency(due)}</p></div>
                            </div>
                        </section>
                        <div className="pt-20">
                            <div className="w-1/3 ml-auto border-t border-gray-400 text-center pt-2 text-gray-800 print:text-black">
                                Authorized Signature
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td>
                        <footer className="p-10 text-center text-gray-800 print:text-black text-xs border-t">
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4 text-xs">
                                {hospital.email && <span><strong>Email:</strong> {hospital.email}</span>}
                                {hospital.telephone && <span><strong>Telephone:</strong> {hospital.telephone}</span>}
                                {hospital.website && <span><strong>Website:</strong> {hospital.website}</span>}
                                {hospital.gstin && <span><strong>GSTIN:</strong> {hospital.gstin}</span>}
                                {hospital.dlNo && <span><strong>DL No:</strong> {hospital.dlNo}</span>}
                                {hospital.cinNo && <span><strong>CIN No:</strong> {hospital.cinNo}</span>}
                                {hospital.fssaiNo && <span><strong>FSSAI No:</strong> {hospital.fssaiNo}</span>}
                            </div>
                            {footerText}
                        </footer>
                    </td>
                </tr>
            </tfoot>
        </table>
    </A4Wrapper>
    )
};

export const ClassicInvoice: React.FC<InvoiceProps> = ({ hospital, patient, invoice, type, footerText, formatDate, formatTime, formatCurrency }) => {
    const grandTotal = invoice.totalAmount ?? 0;
    const paid = invoice.amountPaid ?? 0;
    const due = grandTotal - paid;
    const paymentMethods = invoice.paymentHistory?.map(p => `${p.method}`).join(', ');
    const fullHospitalAddress = [ hospital.address?.street, hospital.address?.city, hospital.address?.state, ].filter(Boolean).join(', ') + (hospital.address?.pincode ? `, ${hospital.address?.country} - ${hospital.address.pincode}` : '');

    return (
     <A4Wrapper className="p-8 font-serif border-t-8 border-gray-700">
        <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
                <tr>
                    <td>
                        <header className="flex justify-between items-start mb-12">
                            <div className="flex items-center gap-4">
                                {hospital.logoUrl && <img src={hospital.logoUrl} alt={`${hospital.name} logo`} className="h-16 w-16 object-contain" />}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 print:text-black">{hospital.name}</h2>
                                    <p className="text-gray-700 print:text-black">{fullHospitalAddress}</p>
                                </div>
                            </div>
                            <h1 className="text-5xl font-light text-gray-600 uppercase tracking-widest print:text-black">Invoice</h1>
                        </header>
                    </td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="align-top">
                        <section className="grid grid-cols-2 gap-10 mb-12">
                            <div>
                                <h3 className="text-gray-800 mb-2 print:text-black">Billed To</h3>
                                <p className="font-semibold text-gray-800 print:text-black">{patient.name}</p>
                                <p className="text-gray-700 print:text-black">{patient.address}</p>
                            </div>
                            <div className="text-right">
                                <p><strong className="text-gray-800 print:text-black">Invoice #</strong> {invoice.invoiceId || invoice.saleId}</p>
                                <p><strong className="text-gray-800 print:text-black">Date:</strong> {invoice.createdAt?.toDate() ? formatDate(invoice.createdAt.toDate()) : 'N/A'}</p>
                            </div>
                        </section>
                        <table className="w-full text-left">
                            <thead><tr><th className="p-3 pb-4 font-semibold text-gray-900 print:text-black border-b-2 border-gray-700">Description</th><th className="p-3 pb-4 font-semibold text-gray-900 print:text-black border-b-2 border-gray-700 text-right">Total</th></tr></thead>
                            <tbody className="text-gray-900 print:text-black">{invoice.items?.map((item, i) => (<tr key={i}><td className="p-3 border-b border-gray-200">{item.description || item.name}</td><td className="p-3 border-b border-gray-200 text-right">{formatCurrency(((item.cost || item.salePrice) || 0) * (item.quantity || 1))}</td></tr>))}</tbody>
                            <tfoot className="text-gray-800 print:text-black">
                                {type === 'POS' ? (
                                    <>
                                        <tr><td className="p-3 pt-6 text-right">Gross Total</td><td className="p-3 pt-6 text-right">{formatCurrency(invoice.grossTotal || 0)}</td></tr>
                                        <tr><td className="p-3 text-right">Total Tax</td><td className="p-3 text-right">{formatCurrency((invoice as POSSale).taxAmount || 0)}</td></tr>
                                        <tr><td className="p-3 font-semibold text-right">Subtotal</td><td className="p-3 font-semibold text-right">{formatCurrency((invoice.grossTotal || 0) + ((invoice as POSSale).taxAmount || 0))}</td></tr>
                                        {(invoice.totalItemDiscount || 0) > 0 && <tr><td className="p-3 text-green-600 text-right">Item Discounts</td><td className="p-3 text-green-600 text-right">- {formatCurrency(invoice.totalItemDiscount || 0)}</td></tr>}
                                        {(invoice.overallDiscount || 0) > 0 && <tr><td className="p-3 text-green-600 text-right">Overall Discount</td><td className="p-3 text-green-600 text-right">- {formatCurrency(invoice.overallDiscount || 0)}</td></tr>}
                                    </>
                                ) : (
                                    <>
                                        <tr><td className="p-3 pt-6 text-right">Subtotal</td><td className="p-3 pt-6 text-right">{formatCurrency(invoice.subtotal || 0)}</td></tr>
                                        {(invoice.taxes || []).map((t, i) => (<tr key={i}><td className="p-3 text-right">{t.name} ({t.rate}%)</td><td className="p-3 text-right">{formatCurrency(t.amount)}</td></tr>))}
                                    </>
                                )}
                                <tr><td className="p-3 font-bold text-lg text-right border-t-2 border-gray-300">Grand Total</td><td className="p-3 font-bold text-lg text-right border-t-2 border-gray-300">{formatCurrency(grandTotal)}</td></tr>
                                <tr><td className="p-3 text-right">Amount Paid</td><td className="p-3 text-right">{formatCurrency(paid)}</td></tr>
                                <tr><td className="p-3 font-bold text-lg text-red-600 text-right border-t border-gray-300">Amount Due</td><td className="p-3 font-bold text-lg text-red-600 text-right border-t border-gray-300">{formatCurrency(due)}</td></tr>
                            </tfoot>
                        </table>
                        <div className="mt-8 grid grid-cols-2 gap-8 text-sm text-gray-800 print:text-black">
                            <div>
                                <h4 className="font-semibold uppercase mb-2">Payment Details</h4>
                                <p><strong>Payment Mode:</strong> {paymentMethods || 'N/A'}</p>
                                <p><strong>Recorded By:</strong> {invoice.paymentHistory?.[0]?.recordedBy || 'N/A'}</p>
                                <div className="mt-4">
                                    <p className="font-bold">Amount in Words:</p>
                                    <p>{amountToWords(grandTotal, hospital.currency)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="pt-20">
                            <div className="w-1/3 ml-auto border-t border-gray-400 text-center pt-2 text-gray-800 print:text-black">
                                Authorized Signature
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td>
                        <footer className="mt-12 pt-6 text-center text-gray-800 print:text-black text-xs border-t border-gray-200">
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4 text-xs">
                                {hospital.email && <span><strong>Email:</strong> {hospital.email}</span>}
                                {hospital.telephone && <span><strong>Telephone:</strong> {hospital.telephone}</span>}
                                {hospital.website && <span><strong>Website:</strong> {hospital.website}</span>}
                                {hospital.gstin && <span><strong>GSTIN:</strong> {hospital.gstin}</span>}
                                {hospital.dlNo && <span><strong>DL No:</strong> {hospital.dlNo}</span>}
                                {hospital.cinNo && <span><strong>CIN No:</strong> {hospital.cinNo}</span>}
                                {hospital.fssaiNo && <span><strong>FSSAI No:</strong> {hospital.fssaiNo}</span>}
                            </div>
                            {footerText}
                        </footer>
                    </td>
                </tr>
            </tfoot>
        </table>
    </A4Wrapper>
    )
};

export const SimpleInvoice: React.FC<InvoiceProps> = ({ hospital, patient, invoice, type, footerText, formatDate, formatTime, formatCurrency }) => {
    const grandTotal = invoice.totalAmount ?? 0;
    const paid = invoice.amountPaid ?? 0;
    const due = grandTotal - paid;
    const paymentMethods = invoice.paymentHistory?.map(p => `${p.method}`).join(', ');
    const fullHospitalAddress = [ hospital.address?.street, hospital.address?.city, hospital.address?.state, hospital.address?.country ].filter(Boolean).join(', ') + (hospital.address?.pincode ? ` - ${hospital.address.pincode}` : '');

    return (
    <A4Wrapper>
        <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
                <tr>
                    <td className="p-12 pb-0">
                        <header className="flex justify-between items-start mb-10">
                            <div className="flex items-center gap-4">
                                {hospital.logoUrl && <img src={hospital.logoUrl} alt={`${hospital.name} logo`} className="h-16 w-16 object-contain" />}
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 print:text-black">{hospital.name}</h2>
                                    <p className="text-xs text-gray-700 print:text-black">{fullHospitalAddress}</p>
                                    <p className="text-xs text-gray-700 print:text-black">Phone: {hospital.phone}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-3xl font-bold uppercase text-gray-900 print:text-black">Invoice</h1>
                                <p className="text-gray-800 print:text-black"># {invoice.invoiceId || invoice.saleId}</p>
                            </div>
                        </header>
                    </td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="p-12 pt-0 align-top">
                        <section className="text-sm mb-10 text-gray-800 print:text-black">
                            <p><strong>Billed To:</strong> {patient.name}</p>
                            <p className="text-gray-700 print:text-black">{patient.address}</p>
                            <p><strong>Date:</strong> {invoice.createdAt?.toDate() ? formatDate(invoice.createdAt.toDate()) : 'N/A'}</p>
                        </section>
                        <table className="w-full text-left text-sm">
                            <thead><tr><th className="p-2 bg-gray-100 font-bold text-gray-800 print:text-black">Description</th><th className="p-2 bg-gray-100 font-bold text-right text-gray-800 print:text-black">Amount</th></tr></thead>
                            <tbody className="text-gray-900 print:text-black">{invoice.items?.map((item, i) => (<tr key={i}><td className="p-2 border-b">{item.description || item.name}</td><td className="p-2 border-b text-right">{formatCurrency(((item.cost || item.salePrice) || 0) * (item.quantity || 1))}</td></tr>))}</tbody>
                        </table>
                        <section className="mt-8 ml-auto w-1/2 text-right text-sm">
                            {type === 'POS' ? (
                                <>
                                    <div className="flex justify-between text-gray-800 print:text-black"><p>Gross Total:</p><p>{formatCurrency(invoice.grossTotal || 0)}</p></div>
                                    <div className="flex justify-between mt-1 text-gray-800 print:text-black"><p>Total Tax:</p><p>{formatCurrency((invoice as POSSale).taxAmount || 0)}</p></div>
                                    <div className="flex justify-between mt-1 font-semibold text-gray-800 print:text-black"><p>Subtotal:</p><p>{formatCurrency((invoice.grossTotal || 0) + ((invoice as POSSale).taxAmount || 0))}</p></div>
                                    {(invoice.totalItemDiscount || 0) > 0 && <div className="flex justify-between mt-1 text-green-600"><p>Item Discounts:</p><p>- {formatCurrency(invoice.totalItemDiscount || 0)}</p></div>}
                                    {(invoice.overallDiscount || 0) > 0 && <div className="flex justify-between mt-1 text-green-600"><p>Overall Discount:</p><p>- {formatCurrency(invoice.overallDiscount || 0)}</p></div>}
                                </>
                            ) : (
                                <>
                                     <div className="flex justify-between text-gray-800 print:text-black"><p>Subtotal:</p><p>{formatCurrency(invoice.subtotal || 0)}</p></div>
                                     {(invoice.taxes || []).map((t, i) => (<div key={i} className="flex justify-between mt-1 text-gray-800 print:text-black"><p>{t.name} ({t.rate}%):</p><p>{formatCurrency(t.amount)}</p></div>))}
                                </>
                            )}
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t text-gray-900 print:text-black"><p>Grand Total:</p><p>{formatCurrency(grandTotal)}</p></div>
                            <div className="flex justify-between mt-1 text-gray-800 print:text-black"><p>Amount Paid:</p><p>{formatCurrency(paid)}</p></div>
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t text-red-600"><p>Amount Due:</p><p>{formatCurrency(due)}</p></div>
                        </section>
                        <section className="mt-8 text-sm text-gray-800 print:text-black">
                            <h4 className="font-semibold uppercase mb-2">Payment Details</h4>
                            <p><strong>Payment Mode:</strong> {paymentMethods || 'N/A'}</p>
                            <p><strong>Recorded By:</strong> {invoice.paymentHistory?.[0]?.recordedBy || 'N/A'}</p>
                            <div className="mt-4">
                                <p className="font-bold">Amount in Words:</p>
                                <p>{amountToWords(grandTotal, hospital.currency)}</p>
                            </div>
                        </section>
                        <div className="pt-20">
                            <div className="w-1/3 ml-auto border-t border-gray-400 text-center pt-2 text-gray-800 print:text-black">
                                Authorized Signature
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td className="p-12 pt-0">
                        <footer className="pt-10 text-center text-gray-800 print:text-black text-xs">
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4 text-xs">
                                {hospital.email && <span><strong>Email:</strong> {hospital.email}</span>}
                                {hospital.telephone && <span><strong>Telephone:</strong> {hospital.telephone}</span>}
                                {hospital.website && <span><strong>Website:</strong> {hospital.website}</span>}
                                {hospital.gstin && <span><strong>GSTIN:</strong> {hospital.gstin}</span>}
                                {hospital.dlNo && <span><strong>DL No:</strong> {hospital.dlNo}</span>}
                                {hospital.cinNo && <span><strong>CIN No:</strong> {hospital.cinNo}</span>}
                                {hospital.fssaiNo && <span><strong>FSSAI No:</strong> {hospital.fssaiNo}</span>}
                            </div>
                            {footerText}
                        </footer>
                    </td>
                </tr>
            </tfoot>
        </table>
    </A4Wrapper>
    )
};

export const ColorfulInvoice: React.FC<InvoiceProps> = ({ hospital, patient, invoice, type, footerText, formatDate, formatTime, formatCurrency }) => {
    const grandTotal = invoice.totalAmount ?? 0;
    const paid = invoice.amountPaid ?? 0;
    const due = grandTotal - paid;
    const paymentMethods = invoice.paymentHistory?.map(p => `${p.method}`).join(', ');
    const fullHospitalAddress = [ hospital.address?.street, hospital.address?.city, hospital.address?.state, hospital.address?.country ].filter(Boolean).join(', ') + (hospital.address?.pincode ? ` - ${hospital.address.pincode}` : '');

    return (
    <A4Wrapper>
        <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
             <thead>
                <tr>
                    <td>
                        <header className="flex">
                            <div className="w-1/4 bg-teal-500 text-white p-8 flex flex-col">
                                {hospital.logoUrl && <img src={hospital.logoUrl} alt={`${hospital.name} logo`} className="h-16 w-16 object-contain bg-white p-1 rounded-md mb-4" />}
                                <h2 className="text-2xl font-bold">{hospital.name}</h2>
                                <p className="text-sm mt-1">{fullHospitalAddress}</p>
                                <p className="text-sm">{hospital.phone}</p>
                            </div>
                            <div className="w-3/4 p-10 flex flex-col items-end">
                                <h1 className="text-5xl font-bold text-teal-500 uppercase">Invoice</h1>
                            </div>
                        </header>
                    </td>
                </tr>
            </thead>
            <tbody>
                <tr className="h-full">
                    <td className="align-top h-full">
                        <div className="flex h-full">
                             <div className="w-1/4 p-8 pt-0 bg-teal-500 text-white flex flex-col">
                                <div className="mt-auto">
                                    <p className="font-semibold">Billed To:</p>
                                    <p>{patient.name}</p>
                                    <p className="text-xs">{patient.address}</p>
                                    <p className="mt-4 font-semibold">Date:</p>
                                    <p>{invoice.createdAt?.toDate() ? formatDate(invoice.createdAt.toDate()) : 'N/A'}</p>
                                    <p className="mt-4 font-semibold">Invoice #:</p>
                                    <p>{invoice.invoiceId || invoice.saleId}</p>
                                </div>
                            </div>
                            <div className="w-3/4 p-10 pt-0 flex flex-col">
                                <table className="w-full text-left">
                                    <thead><tr><th className="p-3 text-teal-600 print:text-black border-b-2 border-teal-500">Description</th><th className="p-3 text-teal-600 print:text-black border-b-2 border-teal-500 text-right">Amount</th></tr></thead>
                                    <tbody className="text-gray-900 print:text-black">{invoice.items?.map((item, i) => (<tr key={i}><td className="p-3 border-b">{item.description || item.name}</td><td className="p-3 border-b text-right">{formatCurrency(((item.cost || item.salePrice) || 0) * (item.quantity || 1))}</td></tr>))}</tbody>
                                </table>
                                <div className="mt-auto ml-auto text-right w-2/3 space-y-2 pt-8 text-gray-800 print:text-black">
                                    {type === 'POS' ? (
                                        <>
                                            <div className="flex justify-between"><p>Gross Total:</p><p>{formatCurrency(invoice.grossTotal || 0)}</p></div>
                                            <div className="flex justify-between"><p>Total Tax:</p><p>{formatCurrency((invoice as POSSale).taxAmount || 0)}</p></div>
                                            <div className="flex justify-between font-semibold"><p>Subtotal:</p><p>{formatCurrency((invoice.grossTotal || 0) + ((invoice as POSSale).taxAmount || 0))}</p></div>
                                            {(invoice.totalItemDiscount || 0) > 0 && <div className="flex justify-between text-green-600"><p>Item Discounts:</p><p>- {formatCurrency(invoice.totalItemDiscount || 0)}</p></div>}
                                            {(invoice.overallDiscount || 0) > 0 && <div className="flex justify-between text-green-600"><p>Overall Discount:</p><p>- {formatCurrency(invoice.overallDiscount || 0)}</p></div>}
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between"><p>Subtotal:</p><p>{formatCurrency(invoice.subtotal || 0)}</p></div>
                                            {(invoice.taxes || []).map((t, i) => (
                                                <div key={i} className="flex justify-between"><p>{t.name} ({t.rate}%):</p><p>{formatCurrency(t.amount)}</p></div>
                                            ))}
                                        </>
                                    )}
                                    <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2"><p>Grand Total:</p><p>{formatCurrency(grandTotal)}</p></div>
                                    <div className="flex justify-between"><p>Amount Paid:</p><p>{formatCurrency(paid)}</p></div>
                                    <div className="flex justify-between text-xl font-bold text-red-600"><p>Amount Due:</p><p>{formatCurrency(due)}</p></div>
                                </div>
                                <div className="mt-8 text-sm text-gray-800 print:text-black">
                                    <p><strong>Payment Mode:</strong> {paymentMethods || 'N/A'}</p>
                                    <p><strong>Amount in Words:</strong> {amountToWords(grandTotal, hospital.currency)}</p>
                                </div>
                                <div className="pt-20">
                                    <div className="w-1/2 ml-auto border-t border-gray-400 text-center pt-2 text-gray-800 print:text-black">
                                        Authorized Signature
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td>
                        <footer className="p-4 text-center text-gray-700 print:text-black text-[10px] border-t">
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4 text-xs">
                                {hospital.email && <span><strong>Email:</strong> {hospital.email}</span>}
                                {hospital.telephone && <span><strong>Telephone:</strong> {hospital.telephone}</span>}
                                {hospital.website && <span><strong>Website:</strong> {hospital.website}</span>}
                                {hospital.gstin && <span><strong>GSTIN:</strong> {hospital.gstin}</span>}
                                {hospital.dlNo && <span><strong>DL No:</strong> {hospital.dlNo}</span>}
                                {hospital.cinNo && <span><strong>CIN No:</strong> {hospital.cinNo}</span>}
                                {hospital.fssaiNo && <span><strong>FSSAI No:</strong> {hospital.fssaiNo}</span>}
                            </div>
                            {footerText}
                        </footer>
                    </td>
                </tr>
            </tfoot>
        </table>
    </A4Wrapper>
    )
};

export const MinimalInvoice: React.FC<InvoiceProps> = ({ hospital, patient, invoice, type, footerText, formatDate, formatTime, formatCurrency }) => {
    const grandTotal = invoice.totalAmount ?? 0;
    const paid = invoice.amountPaid ?? 0;
    const due = grandTotal - paid;
    const paymentMethods = invoice.paymentHistory?.map(p => `${p.method}`).join(', ');
    const fullHospitalAddress = [ hospital.address?.street, hospital.address?.city, hospital.address?.state, hospital.address?.country ].filter(Boolean).join(', ') + (hospital.address?.pincode ? ` - ${hospital.address.pincode}` : '');
    
    return (
    <A4Wrapper className="text-gray-800 print:text-black font-light">
        <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
                 <tr>
                    <td className="p-16 pb-0">
                        <header className="flex justify-between items-start mb-16">
                            <h1 className="text-2xl font-normal text-gray-800 print:text-black">Invoice</h1>
                            {hospital.logoUrl && <img src={hospital.logoUrl} alt={`${hospital.name} logo`} className="h-16 w-16 object-contain" />}
                        </header>
                    </td>
                </tr>
            </thead>
            <tbody>
                 <tr>
                    <td className="p-16 pt-0 align-top">
                        <section className="grid grid-cols-3 gap-8 text-sm mb-16">
                            <div>
                                <p className="uppercase text-xs tracking-widest mb-1 text-gray-700 print:text-black">From</p>
                                <p className="font-normal text-gray-800 print:text-black">{hospital.name}</p>
                                <p className="text-xs text-gray-700 print:text-black">{fullHospitalAddress}</p>
                                <p className="text-xs text-gray-700 print:text-black">Phone: {hospital.phone}</p>
                                {hospital.email && <p className="text-xs text-gray-700 print:text-black">Email: {hospital.email}</p>}
                            </div>
                            <div><p className="uppercase text-xs tracking-widest mb-1 text-gray-700 print:text-black">For</p><p className="font-normal text-gray-800 print:text-black">{patient.name}</p><p className="text-xs text-gray-700 print:text-black">{patient.address}</p></div>
                            <div><p className="uppercase text-xs tracking-widest mb-1 text-gray-700 print:text-black">Invoice No.</p><p className="font-normal text-gray-800 print:text-black">{invoice.invoiceId || invoice.saleId}</p></div>
                        </section>
                        <table className="w-full text-left text-sm">
                            <tbody className="text-gray-800 print:text-black">{invoice.items?.map((item, i) => (<tr key={i}><td className="py-3 border-b border-gray-100 text-gray-900 print:text-black">{item.description || item.name}</td><td className="py-3 border-b border-gray-100 text-right text-gray-900 print:text-black">{formatCurrency(((item.cost || item.salePrice) || 0) * (item.quantity || 1))}</td></tr>))}</tbody>
                            <tfoot className="text-gray-800 print:text-black">
                                {type === 'POS' ? (
                                    <>
                                        <tr><td className="py-2 pt-6 text-right">Gross Total</td><td className="py-2 pt-6 text-right">{formatCurrency(invoice.grossTotal || 0)}</td></tr>
                                        <tr><td className="py-2 text-right">Total Tax</td><td className="py-2 text-right">{formatCurrency((invoice as POSSale).taxAmount || 0)}</td></tr>
                                        <tr><td className="py-2 font-semibold text-right">Subtotal</td><td className="py-2 font-semibold text-right">{formatCurrency((invoice.grossTotal || 0) + ((invoice as POSSale).taxAmount || 0))}</td></tr>
                                        {(invoice.totalItemDiscount || 0) > 0 && <tr><td className="py-2 text-green-600 text-right">Item Discounts</td><td className="py-2 text-green-600 text-right">- {formatCurrency(invoice.totalItemDiscount || 0)}</td></tr>}
                                        {(invoice.overallDiscount || 0) > 0 && <tr><td className="py-2 text-green-600 text-right">Overall Discount</td><td className="py-2 text-green-600 text-right">- {formatCurrency(invoice.overallDiscount || 0)}</td></tr>}
                                    </>
                                ) : (
                                    <>
                                        <tr><td className="py-2 pt-6 text-right">Subtotal</td><td className="py-2 pt-6 text-right">{formatCurrency(invoice.subtotal || 0)}</td></tr>
                                        {(invoice.taxes || []).map((t, i) => (<tr key={i}><td className="py-2 text-right">{t.name} ({t.rate}%)</td><td className="py-2 text-right">{formatCurrency(t.amount)}</td></tr>))}
                                    </>
                                )}
                                <tr><td className="py-2 font-normal text-lg text-gray-900 print:text-black text-right">Grand Total</td><td className="py-2 font-normal text-lg text-gray-900 print:text-black text-right">{formatCurrency(grandTotal)}</td></tr>
                                <tr><td className="py-2 text-right">Amount Paid</td><td className="py-2 text-right">{formatCurrency(paid)}</td></tr>
                                <tr><td className="py-2 font-normal text-lg text-red-600 text-right">Amount Due</td><td className="py-2 font-normal text-lg text-red-600 text-right">{formatCurrency(due)}</td></tr>
                            </tfoot>
                        </table>
                        <section className="mt-8 text-sm text-gray-800 print:text-black">
                            <p><strong>Payment Mode:</strong> {paymentMethods || 'N/A'}</p>
                            <p><strong>Amount in Words:</strong> {amountToWords(grandTotal, hospital.currency)}</p>
                        </section>
                         <div className="pt-20">
                            <div className="w-1/3 ml-auto border-t border-gray-400 text-center pt-2 text-gray-800 print:text-black">
                                Authorized Signature
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
            <tfoot>
                 <tr>
                    <td className="p-16 pt-0">
                         <footer className="pt-10 text-center text-xs text-gray-700 print:text-black">
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4 text-xs">
                                {hospital.email && <span><strong>Email:</strong> {hospital.email}</span>}
                                {hospital.telephone && <span><strong>Telephone:</strong> {hospital.telephone}</span>}
                                {hospital.website && <span><strong>Website:</strong> {hospital.website}</span>}
                                {hospital.gstin && <span><strong>GSTIN:</strong> {hospital.gstin}</span>}
                                {hospital.dlNo && <span><strong>DL No:</strong> {hospital.dlNo}</span>}
                                {hospital.cinNo && <span><strong>CIN No:</strong> {hospital.cinNo}</span>}
                                {hospital.fssaiNo && <span><strong>FSSAI No:</strong> {hospital.fssaiNo}</span>}
                            </div>
                            {footerText}
                        </footer>
                    </td>
                </tr>
            </tfoot>
        </table>
    </A4Wrapper>
    )
};

// Thermal Receipt (80mm width)
export const ThermalReceipt: React.FC<InvoiceProps> = ({ hospital, patient, invoice, type, footerText, formatDate, formatTime, formatCurrency }) => {
    const isPosSale = type === 'POS';
    const grandTotal = invoice.totalAmount ?? 0;
    const paid = invoice.amountPaid ?? 0;
    const due = grandTotal - paid;
    const fullHospitalAddress = [ hospital.address?.street, hospital.address?.city, hospital.address?.state, ].filter(Boolean).join(', ') + (hospital.address?.pincode ? `, ${hospital.address?.country} - ${hospital.address.pincode}` : '');

    return (
    <div className="w-[80mm] bg-white font-mono p-3 shadow-lg text-black">
        <div className="text-center text-black">
            <h1 className="font-bold text-sm text-black">{hospital.name}</h1>
            <p className="text-xs text-black">{fullHospitalAddress}</p>
            <p className="text-xs text-black">Ph: {hospital.phone}</p>
            {hospital.email && <p className="text-xs text-black">Email: {hospital.email}</p>}
        </div>
        <div className="border-t border-b border-dashed border-black my-2 py-1 text-xs text-black">
            <div className="flex justify-between"><span className="text-black">Date:</span><span className="text-black">{invoice.createdAt?.toDate() ? formatDate(invoice.createdAt.toDate()) : 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-black">Time:</span><span className="text-black">{invoice.createdAt?.toDate() ? formatTime(invoice.createdAt.toDate()) : 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-black">Bill No:</span><span className="text-black">{invoice.invoiceId || invoice.saleId}</span></div>
        </div>
        <table className="w-full text-xs text-black">
             <thead>
                <tr className="border-b border-dashed border-black">
                    <th className="text-left font-normal py-1 text-black">Item</th>
                    <th className="text-center font-normal py-1 text-black">Qty</th>
                    <th className="text-right font-normal py-1 text-black">Total</th>
                </tr>
            </thead>
            <tbody className="border-b border-dashed border-black text-black">
                {invoice.items?.map((item, i) => (
                    isPosSale ? (
                        <tr key={i}>
                            <td colSpan={3} className="py-1">
                                <div className="font-bold">{i+1}. {item.name}</div>
                                <div className="text-[10px]">HSN: {item.hsnCode}, Batch: {item.batchNumber}, Exp: {item.expiryDate}</div>
                                <div className="flex justify-between">
                                    <span>{item.quantity} x {formatCurrency(item.salePrice || 0)}</span>
                                    <span>{formatCurrency((item.salePrice || 0) * (item.quantity || 1))}</span>
                                </div>
                                {item.taxAmount && item.taxAmount > 0 && 
                                    <div className="flex justify-between text-[10px]">
                                        <span>Tax ({item.taxName})</span>
                                        <span>+ {formatCurrency(item.taxAmount * (item.quantity || 1))}</span>
                                    </div>
                                }
                                {item.discountAmount && item.discountAmount > 0 && 
                                    <div className="flex justify-between text-[10px]">
                                        <span>Discount</span>
                                        <span>- {formatCurrency(item.discountAmount)}</span>
                                    </div>
                                }
                            </td>
                        </tr>
                    ) : (
                         <tr key={i}>
                            <td className="py-1 align-top text-left text-black">{item.description || item.name}</td>
                            <td className="text-center py-1 align-top text-black">{item.quantity || 1}</td>
                            <td className="text-right py-1 align-top text-black">{formatCurrency(((item.cost || item.salePrice) || 0))}</td>
                        </tr>
                    )
                ))}
            </tbody>
        </table>
        {isPosSale ? (
            <>
                <div className="border-t border-dashed border-black my-2 py-1 text-xs text-black">
                    <div className="flex justify-between"><span className="text-black">Gross Total:</span><span className="text-black">{formatCurrency(invoice.grossTotal || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-black">Total Tax:</span><span className="text-black">{formatCurrency((invoice as POSSale).taxAmount || 0)}</span></div>
                    <div className="flex justify-between font-bold"><span className="text-black">Subtotal:</span><span className="text-black">{formatCurrency((invoice.grossTotal || 0) + ((invoice as POSSale).taxAmount || 0))}</span></div>
                    {(invoice.totalItemDiscount || 0) > 0 && <div className="flex justify-between"><span className="text-black">Item Discounts:</span><span className="text-black">- {formatCurrency(invoice.totalItemDiscount || 0)}</span></div>}
                    {(invoice.overallDiscount || 0) > 0 && <div className="flex justify-between"><span className="text-black">Overall Discount:</span><span className="text-black">- {formatCurrency(invoice.overallDiscount || 0)}</span></div>}
                </div>
                <div className="border-t border-dashed border-black my-2 py-1 text-xs text-black">
                    <div className="flex justify-between font-bold text-black"><span className="text-black">Grand Total:</span><span className="text-black">{formatCurrency(grandTotal)}</span></div>
                    <div className="flex justify-between text-black"><span className="text-black">Amount Paid:</span><span className="text-black">{formatCurrency(paid)}</span></div>
                    <div className="flex justify-between font-bold text-red-600"><span className="text-red-600">Amount Due:</span><span className="text-red-600">{formatCurrency(due)}</span></div>
                </div>
            </>
        ) : (
            <>
                <div className="border-t border-dashed border-black my-2 py-1 text-xs text-black">
                    <div className="flex justify-between"><span className="text-black">Subtotal:</span><span className="text-black">{formatCurrency(invoice.subtotal || 0)}</span></div>
                    {(invoice.taxes || []).map((t, i) => (
                        <div key={i} className="flex justify-between"><span className="text-black">{t.name} ({t.rate}%):</span><span className="text-black">{formatCurrency(t.amount)}</span></div>
                    ))}
                </div>
                <div className="border-t border-dashed border-black my-2 py-1 text-xs text-black">
                    <div className="flex justify-between font-bold text-black"><span className="text-black">Grand Total:</span><span className="text-black">{formatCurrency(grandTotal)}</span></div>
                    <div className="flex justify-between text-black"><span className="text-black">Amount Paid:</span><span className="text-black">{formatCurrency(paid)}</span></div>
                    <div className="flex justify-between font-bold text-red-600"><span className="text-red-600">Amount Due:</span><span className="text-red-600">{formatCurrency(due)}</span></div>
                </div>
            </>
        )}
        <div className="text-center text-[10px] mt-4 text-black">{footerText}</div>
    </div>
    )
};


// --- END: INVOICE & RECEIPT COMPONENTS ---

// Default settings for reset functionality
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

const placeholders = [
    { key: '{{patientName}}', description: 'Patient\'s name' },
    { key: '{{hospitalName}}', description: 'Your hospital\'s name' },
    { key: '{{invoiceId}}', description: 'The invoice ID' },
    { key: '{{totalAmount}}', description: 'Total amount of the invoice' },
];

const EditTemplateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: NotificationTemplate) => void;
    template: NotificationTemplate;
    onReset: () => void;
}> = ({ isOpen, onClose, onSave, template, onReset }) => {
    const [currentTemplate, setCurrentTemplate] = useState(template);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setCurrentTemplate(template); }, [template]);
    
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl m-4">
                <div className="p-6 border-b"><h2 className="text-xl font-bold">Edit Invoice Email Template</h2></div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto">
                    <div className="md:col-span-2 space-y-4">
                        <Input label="Email Subject" value={currentTemplate.subject} onChange={e => setCurrentTemplate(t => ({...t, subject: e.target.value}))}/>
                        <Textarea label="Email Body" value={currentTemplate.body} onChange={e => setCurrentTemplate(t => ({...t, body: e.target.value}))} rows={12} />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Available Placeholders</h4>
                        <div className="space-y-2 text-sm">
                            {placeholders.map(p => (
                                <div key={p.key} className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                    <code className="font-mono text-blue-600 dark:text-blue-400">{p.key}</code>
                                    <p className="text-xs text-slate-500">{p.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-950/50 border-t">
                    <Button type="button" variant="light" onClick={onReset}><FontAwesomeIcon icon={faUndo} className="mr-2"/>Reset to Default</Button>
                    <div className="flex gap-2">
                        <Button type="button" variant="light" onClick={onClose}><FontAwesomeIcon icon={faTimes} className="mr-2"/>Cancel</Button>
                        <Button type="button" variant="primary" onClick={() => onSave(currentTemplate)}><FontAwesomeIcon icon={faSave} className="mr-2"/>Save Template</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const a4Designs = [
    { name: 'Modern', value: 'modern' as A4Design, Component: ModernInvoice },
    { name: 'Classic', value: 'classic' as A4Design, Component: ClassicInvoice },
    { name: 'Simple', value: 'simple' as A4Design, Component: SimpleInvoice },
    { name: 'Colorful', value: 'colorful' as A4Design, Component: ColorfulInvoice },
    { name: 'Minimal', value: 'minimal' as A4Design, Component: MinimalInvoice },
];

const thermalDesigns = [
    { name: 'Receipt', value: 'receipt' as ThermalDesign, Component: ThermalReceipt }
]

const InvoiceSettingsTabContent: React.FC<{
    settings: IndividualInvoiceSettings;
    onSettingsChange: (newSettings: IndividualInvoiceSettings) => void;
    onSave: () => Promise<void>;
    mockData: { hospital: Partial<Hospital>, patient: Partial<PatientDocument>, invoice: InvoiceForPreview, type: 'Treatment' | 'POS' };
    onPreview: (design: A4Design | ThermalDesign) => void;
    formatDate: (date: Date) => string;
    formatTime: (date: Date) => string;
    formatCurrency: (amount: number) => string;
}> = ({ settings, onSettingsChange, onSave, mockData, onPreview, formatDate, formatTime, formatCurrency }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const originalSettings = useRef(settings);

    useEffect(() => {
        originalSettings.current = settings;
    }, [settings]);
    
    const handleChange = (field: keyof IndividualInvoiceSettings, value: any) => {
        onSettingsChange({ ...settings, [field]: value });
    };

    const handlePrinterTypeChange = (type: PrinterType) => {
        const newDesign = type === 'A4' ? 'modern' : 'receipt';
        onSettingsChange({ ...settings, printerType: type, design: newDesign });
    };

    const handleSave = async () => {
        setLoading(true);
        await onSave();
        setLoading(false);
        setIsEditing(false);
    };

    const handleCancel = () => {
        onSettingsChange(originalSettings.current);
        setIsEditing(false);
    };

    const handleSaveTemplate = (template: NotificationTemplate) => {
        handleChange('emailTemplate', template);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <EditTemplateModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTemplate}
                template={settings.emailTemplate}
                onReset={() => handleSaveTemplate(defaultIndividualSettings.emailTemplate)}
            />
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Invoice Prefix" value={settings.prefix} onChange={e => handleChange('prefix', e.target.value)} disabled={!isEditing} />
                    <Input label="Next Invoice Number" type="number" value={settings.nextNumber} onChange={e => handleChange('nextNumber', Number(e.target.value))} disabled={!isEditing} />
                    <div className="md:col-span-2">
                        <Textarea label="Invoice Footer / Terms & Conditions" value={settings.footerText} onChange={e => handleChange('footerText', e.target.value)} disabled={!isEditing} rows={4} />
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Template</h4>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="font-semibold">Subject: <span className="font-normal">{settings.emailTemplate.subject}</span></p>
                            <Button variant="light" size="sm" className="mt-2" onClick={() => setIsModalOpen(true)} disabled={!isEditing}>Edit Email Template</Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Print Template</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Printer Type</label>
                        <div className="flex gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 max-w-sm">
                            <Button type="button" onClick={() => handlePrinterTypeChange('A4')} className={`w-full ${settings.printerType === 'A4' ? '' : '!bg-transparent'}`} variant={settings.printerType === 'A4' ? 'light' : 'ghost'} disabled={!isEditing}>A4 Printer</Button>
                            <Button type="button" onClick={() => handlePrinterTypeChange('thermal')} className={`w-full ${settings.printerType === 'thermal' ? '' : '!bg-transparent'}`} variant={settings.printerType === 'thermal' ? 'light' : 'ghost'} disabled={!isEditing}>Thermal Printer</Button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Design</label>
                        {settings.printerType === 'A4' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                               {a4Designs.map(design => (
                                    <div key={design.value} className="text-center">
                                        <div onClick={() => isEditing && handleChange('design', design.value)} 
                                            className={`relative group border-2 rounded-lg p-1 transition-all ${settings.design === design.value ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-300 dark:border-slate-700'} ${isEditing ? 'cursor-pointer hover:border-blue-400' : 'cursor-not-allowed'}`}>
                                            <div className="bg-slate-100 dark:bg-slate-800 rounded h-48 overflow-hidden flex items-center justify-center">
                                                <div className="transform scale-[0.23] origin-center">
                                                    <design.Component {...mockData} footerText={settings.footerText} formatDate={formatDate} formatTime={formatTime} formatCurrency={formatCurrency} />
                                                </div>
                                            </div>
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                                                <Button variant="light" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onPreview(design.value); }}>
                                                    Preview
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{design.name}</p>
                                    </div>
                               ))}
                            </div>
                        ) : (
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {thermalDesigns.map(design => (
                                    <div key={design.value} className="text-center">
                                        <div onClick={() => isEditing && handleChange('design', design.value)}
                                            className={`relative group border-2 rounded-lg p-1 transition-all ${settings.design === design.value ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-300 dark:border-slate-700'} ${isEditing ? 'cursor-pointer hover:border-blue-400' : 'cursor-not-allowed'}`}>
                                            <div className="bg-slate-100 dark:bg-slate-800 rounded h-48 overflow-hidden flex justify-center items-center">
                                                <div className="transform scale-50 origin-center">
                                                    <design.Component {...mockData} footerText={settings.footerText} formatDate={formatDate} formatTime={formatTime} formatCurrency={formatCurrency} />
                                                </div>
                                            </div>
                                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                                                <Button variant="light" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onPreview(design.value); }}>
                                                    Preview
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{design.name}</p>
                                    </div>
                                ))}
                             </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-lg text-right">
                    {isEditing ? (
                        <div className="flex justify-end gap-2">
                            <Button variant="light" onClick={handleCancel} disabled={loading}><FontAwesomeIcon icon={faTimes} className="mr-2"/>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} disabled={loading}><FontAwesomeIcon icon={faSave} className="mr-2"/>{loading ? 'Saving...' : 'Save Changes'}</Button>
                        </div>
                    ) : (
                        <Button variant="primary" onClick={() => setIsEditing(true)}><FontAwesomeIcon icon={faPencilAlt} className="mr-2"/>Edit Settings</Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const PreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    design: A4Design | ThermalDesign | null;
    mockData: { hospital: Partial<Hospital>, patient: Partial<PatientDocument>, invoice: InvoiceForPreview, type: 'Treatment' | 'POS' };
    footerText: string;
    formatDate: (date: Date) => string;
    formatTime: (date: Date) => string;
    formatCurrency: (amount: number) => string;
}> = ({ isOpen, onClose, design, mockData, footerText, formatDate, formatTime, formatCurrency }) => {
    if (!isOpen || !design) return null;

    const allDesigns = [...a4Designs, ...thermalDesigns];
    const designDetails = allDesigns.find(d => d.value === design);

    if (!designDetails) return null;
    const InvoiceComponent = designDetails.Component;
    const isThermal = thermalDesigns.some(d => d.value === design);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[998] flex justify-center items-center p-4">
            <div className="bg-slate-200 dark:bg-slate-800 rounded-lg shadow-xl w-auto h-full max-h-[95vh] flex flex-col">
                <div className="p-4 bg-white dark:bg-slate-900 flex justify-between items-center rounded-t-lg">
                    <h3 className="text-lg font-bold">Template Preview: {designDetails.name}</h3>
                    <Button variant="light" onClick={onClose}>Close</Button>
                </div>
                <div className="p-4 overflow-auto">
                    <div className="mx-auto" style={{ zoom: isThermal ? 1 : 0.8 }}>
                       <InvoiceComponent 
                            {...mockData}
                            footerText={footerText} 
                            formatDate={formatDate}
                            formatTime={formatTime}
                            formatCurrency={formatCurrency}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

import { useFormatting } from '@/utils/formatting';

export const InvoiceSettingsScreen: React.FC = () => {
    const { user, updateInvoiceSettings } = useAuth();
    const { addToast } = useToast();
    const { formatDate, formatTime, formatCurrency } = useFormatting();
    const [activeTab, setActiveTab] = useState<'treatmentInvoice' | 'posInvoice'>('treatmentInvoice');
    const [settings, setSettings] = useState<InvoiceSettingsData | null>(user?.hospitalInvoiceSettings || null);
    const [previewingDesign, setPreviewingDesign] = useState<A4Design | ThermalDesign | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.hospitalInvoiceSettings) {
            setSettings(user.hospitalInvoiceSettings);
        }
    }, [user?.hospitalInvoiceSettings]);

    const mockData = useMemo(() => {
        const currentSettings = settings ? settings[activeTab] : defaultIndividualSettings;
        const mockPOSSale: POSSale = {
            id: 'pos-123',
            saleId: `${currentSettings.prefix}00${currentSettings.nextNumber}`,
            patientName: "Priya Sharma",
            createdAt: Timestamp.now(),
            items: [
                { stockItemId: '1', batchId: 'b1', batchNumber: 'B123', name: "Pain Reliever", sku: 'PNR-01', quantity: 2, unitType: 'pcs', salePrice: 211.86, discountAmount: 20, taxRate: 9, taxAmount: 19.07, expiryDate: '31/12/2025', hsnCode: '300490', taxName: 'GST (9%)' },
                { stockItemId: '2', batchId: 'b2', batchNumber: 'A456', name: "Antiseptic Liquid", sku: 'ANT-02', quantity: 1, unitType: 'pcs', salePrice: 101.69, discountAmount: 0, taxRate: 9, taxAmount: 9.15, expiryDate: '06/11/2024', hsnCode: '300491', taxName: 'GST (9%)' },
            ],
            grossTotal: 525.41,
            totalItemDiscount: 20,
            subtotal: 525.41,
            taxAmount: 47.29,
            overallDiscount: 10,
            totalAmount: 542.70,
            amountPaid: 500,
            paymentMethod: 'Cash',
            status: 'Completed',
            paymentStatus: 'Partially Paid',
            hospitalId: user?.hospitalId || '',
// FIX: Added missing 'locationId' property to mock POSSale object to satisfy the POSSale type.
            locationId: 'mock-location-id-1',
            createdBy: user?.name || '',
            paymentHistory: [{ id: '1', amount: 500, method: 'Cash', date: Timestamp.now(), recordedBy: 'Admin' }]
        };
        const mockTreatmentInvoice: Invoice = {
            id: 'inv-123',
            invoiceId: `${currentSettings.prefix}00${currentSettings.nextNumber}`,
            appointmentId: 'apt-123',
            patientId: 'pat-123',
            patientName: "Priya Sharma",
// FIX: Add missing 'doctorId' to mockTreatmentInvoice object to satisfy the Invoice type.
            doctorId: 'doc-123',
            doctorName: "Dr. Arun Kumar",
            hospitalId: user?.hospitalId || '',
// FIX: Added missing 'locationId' property to mockTreatmentInvoice object to satisfy the Invoice type.
            locationId: 'mock-location-id-2',
            createdAt: Timestamp.now(),
            appointmentDate: Timestamp.now(),
            items: [
                { description: "Routine Checkup", cost: 1500 },
                { description: "X-Ray", cost: 500 },
            ],
            subtotal: 2000,
            taxes: [{ name: 'GST', rate: 18, amount: 360 }],
            totalTax: 360,
            totalAmount: 2360,
            status: 'Partially Paid',
            amountPaid: 1000,
            paymentHistory: [{ id: '1', amount: 1000, method: 'Cash', date: Timestamp.now(), recordedBy: 'Admin' }]
        };

        return {
            hospital: {
                name: user?.hospitalName || "AetherHealth Hospital",
                address: user?.hospitalAddress || { street: "123 Health St", city: "Medville", country: "IN", pincode: "110001"},
                phone: user?.hospitalPhone || "+91 98765 43210",
                email: user?.hospitalEmail || 'contact@aether.health',
                currency: user?.hospitalCurrency || 'INR',
                logoUrl: user?.hospitalLogoUrl || 'https://i.imgur.com/SH4012A.png',
                gstin: user?.hospitalGstin || 'GSTIN12345',
                dlNo: user?.hospitalDlNo || 'DL12345',
                cinNo: user?.hospitalCinNo || 'CIN12345',
                fssaiNo: user?.hospitalFssaiNo || 'FSSAI12345',
                website: user?.hospitalWebsite || 'aether.health',
                telephone: user?.hospitalTelephone || '044-12345678',
            },
            patient: {
                name: "Priya Sharma",
                address: "456 Wellness Ave, Medville, IN - 110001",
                phone: "+91 87654 32109",
            },
            invoice: activeTab === 'posInvoice' ? mockPOSSale : mockTreatmentInvoice,
            type: (activeTab === 'treatmentInvoice' ? 'Treatment' : 'POS') as 'Treatment' | 'POS',
        };
    }, [user, settings, activeTab]);

    const handleSettingsChange = (type: 'treatmentInvoice' | 'posInvoice', newSettings: IndividualInvoiceSettings) => {
        setSettings(prev => prev ? { ...prev, [type]: newSettings } : null);
    };

    const handleSave = async (
        type: 'treatmentInvoice' | 'posInvoice',
        settingsToSave: IndividualInvoiceSettings
    ) => {
        setLoading(true);
        try {
            await updateInvoiceSettings({ [type]: settingsToSave });
            addToast("Invoice settings saved!", "success");
        } catch (error) {
            addToast("Failed to save settings.", "error");
        } finally {
            setLoading(false);
        }
    };
    
    const TabButton: React.FC<{ tabId: 'treatmentInvoice' | 'posInvoice'; title: string; icon: IconDefinition }> = ({ tabId, title, icon }) => (
        <button onClick={() => setActiveTab(tabId)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 font-medium text-sm rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <FontAwesomeIcon icon={icon} /> {title}
        </button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <PreviewModal isOpen={!!previewingDesign} onClose={() => setPreviewingDesign(null)} design={previewingDesign} mockData={mockData} footerText={settings ? settings[activeTab].footerText : ''} formatDate={formatDate} formatTime={formatTime} formatCurrency={formatCurrency} />
            <div className="mb-6">
                <nav className="flex space-x-2 border-b border-slate-200 dark:border-slate-800" aria-label="Tabs">
                    <TabButton tabId="treatmentInvoice" title="Treatment Invoice" icon={faFileInvoice} />
                    <TabButton tabId="posInvoice" title="POS Invoice" icon={faCashRegister} />
                </nav>
            </div>
            
            {settings && activeTab === 'treatmentInvoice' && (
                <InvoiceSettingsTabContent
                    settings={settings.treatmentInvoice}
                    onSettingsChange={(newSettings) => handleSettingsChange('treatmentInvoice', newSettings)}
                    onSave={() => handleSave('treatmentInvoice', settings.treatmentInvoice)}
                    mockData={mockData}
                    onPreview={setPreviewingDesign}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    formatCurrency={formatCurrency}
                />
            )}
            
            {settings && activeTab === 'posInvoice' && (
                <InvoiceSettingsTabContent
                    settings={settings.posInvoice}
                    onSettingsChange={(newSettings) => handleSettingsChange('posInvoice', newSettings)}
                    onSave={() => handleSave('posInvoice', settings.posInvoice)}
                    mockData={mockData}
                    onPreview={setPreviewingDesign}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
};
