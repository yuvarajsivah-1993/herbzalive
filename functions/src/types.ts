import * as admin from "firebase-admin";

export interface Hospital {
  id: string;
  name: string;
  notificationSettings?: Record<string, unknown>;
  dateFormat?: string;
  timeFormat?: string;
  emailSettings?: {
    fromEmail: string;
    apiKey: string;
  };
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  hospitalId: string;
  dateOfBirth: string; // "YYYY-MM-DD"
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  start: admin.firestore.Timestamp;
  treatmentName: string;
}

export interface Doctor {
  id: string;
  name: string;
}

export interface Invoice {
  id: string;
  hospitalId: string;
  patientId: string;
  invoiceId: string;
  totalAmount: number;
}

export interface POSSale {
  id: string;
  hospitalId: string;
  patientId?: string;
  saleId: string;
  totalAmount: number;
}

export interface EmailPlaceholders {
  hospital: Partial<Hospital>;
  patient?: Partial<Patient>;
  appointment?: Partial<Appointment> & { doctor?: Doctor };
  invoice?: Partial<Invoice & POSSale>;
}
