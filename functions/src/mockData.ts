import * as admin from "firebase-admin";
import {Hospital, EmailPlaceholders, Doctor} from "./types";

export function createMockDataForTemplate(templateType: string, hospital: Hospital): EmailPlaceholders {
  const mockPatient = {name: "Jane Doe (Test Patient)"};
  const mockDoctor: Doctor = {id: "mock-doc-123", name: "Dr. Test"};
  const mockAppointment = {start: admin.firestore.Timestamp.now(), doctor: mockDoctor, treatmentName: "Sample Treatment"};
  const mockInvoice = {invoiceId: "INV-TEST-001", totalAmount: 123.45};

  const baseData: EmailPlaceholders = {hospital, patient: mockPatient};

  switch (templateType) {
  case "appointmentReminder":
    return {...baseData, appointment: mockAppointment};
  case "treatmentInvoice":
  case "posSaleInvoice":
    return {...baseData, invoice: mockInvoice};
  default:
    return baseData;
  }
}
