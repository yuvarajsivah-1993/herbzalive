// FIX: Changed import to firebase-functions/v1 to use the v1 API with newer SDKs.
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

// =============================================================================
// INITIALIZATION
// =============================================================================
admin.initializeApp();
const db = admin.firestore();

// IMPORTANT: Set your SendGrid API key in your Firebase project configuration:
// firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
try {
  sgMail.setApiKey(functions.config().sendgrid.key);
} catch (error) {
  console.error(
    "Error setting SendGrid API key. Make sure to set it in your Firebase Functions config.",
    error
  );
}

// =============================================================================
// TYPES (Simplified from main app for clarity)
// =============================================================================
interface Hospital {
  id: string;
  name: string;
  notificationSettings?: any;
  emailSettings?: any;
}
interface Patient {
  id: string;
  name: string;
  email?: string;
  hospitalId: string;
  dateOfBirth: string; // "YYYY-MM-DD"
}
interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  start: admin.firestore.Timestamp;
  treatmentName: string;
}
interface Doctor {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  hospitalId: string;
  patientId: string;
  invoiceId: string;
  totalAmount: number;
}
interface POSSale {
  id: string;
  hospitalId: string;
  patientId?: string;
  saleId: string;
  totalAmount: number;
}
interface EmailPlaceholders {
  hospital: Partial<Hospital>;
  patient?: Partial<Patient>;
  appointment?: Partial<Appointment> & { doctor?: Doctor };
  invoice?: Partial<Invoice & POSSale>;
}

// =============================================================================
// CORE EMAIL HELPER
// =============================================================================

/**
 * Replaces placeholders in a template string with actual data.
 * @param {string} text The template string (e.g., subject or body).
 * @param {EmailPlaceholders} data The data object for replacements.
 * @return {string} The text with placeholders replaced.
 */
function replacePlaceholders(text: string, data: EmailPlaceholders): string {
  if (!text) return "";
  let replacedText = text;

  // Hospital placeholders
  replacedText = replacedText.replace(
    /{{hospitalName}}/g,
    data.hospital?.name || ""
  );

  // Patient placeholders
  if (data.patient) {
    replacedText = replacedText.replace(
      /{{patientName}}/g,
      data.patient.name || ""
    );
  }

  // Appointment placeholders
  if (data.appointment) {
    const {start, doctor, treatmentName} = data.appointment;
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric", month: "long", day: "numeric",
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit", minute: "2-digit",
    };

    replacedText = replacedText.replace(
      /{{appointmentDate}}/g,
      start ? start.toDate().toLocaleDateString(undefined, dateOptions) : ""
    );
    replacedText = replacedText.replace(
      /{{appointmentTime}}/g,
      start ? start.toDate().toLocaleTimeString(undefined, timeOptions) : ""
    );
    replacedText = replacedText.replace(
      /{{doctorName}}/g,
      doctor?.name || ""
    );
    replacedText = replacedText.replace(
      /{{treatmentName}}/g,
      treatmentName || ""
    );
  }

  // Invoice placeholders
  if (data.invoice) {
    replacedText = replacedText.replace(
      /{{invoiceId}}/g,
      data.invoice.invoiceId || data.invoice.saleId || ""
    );
    replacedText = replacedText.replace(
      /{{totalAmount}}/g,
      (data.invoice.totalAmount || 0).toFixed(2)
    );
  }

  return replacedText;
}

/**
 * Sends a templated email using SendGrid.
 * @param {string} toEmail The recipient's email address.
 * @param {string} subjectTemplate The subject line template.
 * @param {string} bodyTemplate The body content template.
 * @param {EmailPlaceholders} placeholderData The data for placeholder replacement.
 * @param {Hospital} hospital The hospital settings document.
 * @return {Promise<void>}
 */
async function sendTemplatedEmail(
  toEmail: string,
  subjectTemplate: string,
  bodyTemplate: string,
  placeholderData: EmailPlaceholders,
  hospital: Hospital
): Promise<void> {
  const fromEmail = hospital.emailSettings?.fromEmail;
  if (!fromEmail) {
    functions.logger.warn(
      `Hospital ${hospital.id} is missing 'fromEmail' in emailSettings. Cannot send email.`
    );
    return;
  }

  const subject = replacePlaceholders(subjectTemplate, placeholderData);
  const body = replacePlaceholders(bodyTemplate, placeholderData);

  const msg = {
    to: toEmail,
    from: fromEmail,
    subject: subject,
    text: body,
    html: body.replace(/\n/g, "<br>"),
  };

  try {
    await sgMail.send(msg);
    functions.logger.info(`Email sent to ${toEmail} for hospital ${hospital.id}. Subject: ${subject}`);
  } catch (error) {
    functions.logger.error(
      `Error sending email via SendGrid for hospital ${hospital.id}`,
      {error, toEmail, subject}
    );
  }
}

// =============================================================================
// HTTP-TRIGGERED FUNCTION (For "Test Mail" buttons)
// =============================================================================

/**
 * Creates mock placeholder data for a given template type.
 * @param {string} templateType The key of the template (e.g., 'welcomeMessage').
 * @param {Hospital} hospital The hospital data.
 * @return {EmailPlaceholders} Mock data for the template.
 */
function createMockDataForTemplate(
  templateType: string,
  hospital: Hospital
): EmailPlaceholders {
  const mockPatient = {name: "Jane Doe (Test Patient)"};
  // FIX: Added mock ID to satisfy the Doctor type definition.
  const mockDoctor = {id: "mock-doc-123", name: "Dr. Test"};
  const mockAppointment = {
    start: admin.firestore.Timestamp.now(),
    doctor: mockDoctor,
    treatmentName: "Sample Treatment",
  };
  const mockInvoice = {invoiceId: "INV-TEST-001", totalAmount: 123.45};

  const baseData: EmailPlaceholders = {hospital, patient: mockPatient};

  switch (templateType) {
  case "appointmentReminder":
    return {...baseData, appointment: mockAppointment};
  case "treatmentInvoice":
  case "posSaleInvoice":
    return {...baseData, invoice: mockInvoice};
  default:
    return baseData; // For welcomeMessage and birthdayWish
  }
}

export const sendTestEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {templateType} = data;
  const userEmail = context.auth.token.email;
  if (!userEmail) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Authenticated user must have an email."
    );
  }
  if (!templateType) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The 'templateType' must be provided."
    );
  }

  try {
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found.");
    }
    const hospitalId = userDoc.data()?.hospitalId;
    if (!hospitalId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "User is not associated with a hospital."
      );
    }

    const hospitalDoc = await db.collection("hospitals").doc(hospitalId).get();
    if (!hospitalDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Hospital not found.");
    }
    const hospital = {id: hospitalDoc.id, ...hospitalDoc.data()} as Hospital;

    const template = hospital.notificationSettings?.[templateType]?.template;
    if (!template) {
      throw new functions.https.HttpsError(
        "not-found",
        `Template for '${templateType}' not found in hospital settings.`
      );
    }

    const mockData = createMockDataForTemplate(templateType, hospital);

    await sendTemplatedEmail(
      userEmail,
      template.subject,
      template.body,
      mockData,
      hospital
    );

    return {success: true, message: `Test email sent to ${userEmail}`};
  } catch (error) {
    functions.logger.error("sendTestEmail function error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred."
    );
  }
});

// =============================================================================
// FIRESTORE ON-CREATE TRIGGERS
// =============================================================================

export const sendWelcomeEmail = functions.firestore
  .document("patients/{patientId}")
  .onCreate(async (snap) => {
    const patient = {id: snap.id, ...snap.data()} as Patient;
    if (!patient.email) {
      return null;
    }

    const hospitalDoc = await db.collection("hospitals")
      .doc(patient.hospitalId).get();
    if (!hospitalDoc.exists) return null;

    const hospital = {id: hospitalDoc.id, ...hospitalDoc.data()} as Hospital;
    const settings = hospital.notificationSettings?.welcomeMessage;

    if (settings?.enabled && settings.template) {
      await sendTemplatedEmail(
        patient.email,
        settings.template.subject,
        settings.template.body,
        {hospital, patient},
        hospital
      );
    }
    return null;
  });

export const sendTreatmentInvoiceEmail = functions.firestore
  .document("invoices/{invoiceId}")
  .onCreate(async (snap) => {
    const invoice = {id: snap.id, ...snap.data()} as Invoice;

    const hospitalDoc = await db.collection("hospitals")
      .doc(invoice.hospitalId).get();
    if (!hospitalDoc.exists) return null;

    const hospital = {id: hospitalDoc.id, ...hospitalDoc.data()} as Hospital;
    const settings = hospital.notificationSettings?.treatmentInvoice;

    if (settings?.enabled && settings.template) {
      const patientDoc = await db.collection("patients")
        .doc(invoice.patientId).get();
      if (!patientDoc.exists || !patientDoc.data()?.email) return null;

      const patient = {id: patientDoc.id, ...patientDoc.data()} as Patient;
      await sendTemplatedEmail(
        patient.email,
        settings.template.subject,
        settings.template.body,
        {hospital, patient, invoice},
        hospital
      );
    }
    return null;
  });

export const sendPOSSaleInvoiceEmail = functions.firestore
  .document("posSales/{saleId}")
  .onCreate(async (snap) => {
    const sale = {id: snap.id, ...snap.data()} as POSSale;
    if (!sale.patientId || sale.patientId === "walk-in") {
      return null;
    }

    const hospitalDoc = await db.collection("hospitals")
      .doc(sale.hospitalId).get();
    if (!hospitalDoc.exists) return null;

    const hospital = {id: hospitalDoc.id, ...hospitalDoc.data()} as Hospital;
    const settings = hospital.notificationSettings?.posSaleInvoice;

    if (settings?.enabled && settings.template) {
      const patientDoc = await db.collection("patients")
        .doc(sale.patientId).get();
      if (!patientDoc.exists || !patientDoc.data()?.email) return null;

      const patient = {id: patientDoc.id, ...patientDoc.data()} as Patient;
      await sendTemplatedEmail(
        patient.email,
        settings.template.subject,
        settings.template.body,
        {hospital, patient, invoice: sale},
        hospital
      );
    }
    return null;
  });

// =============================================================================
// SCHEDULED FUNCTIONS
// =============================================================================

export const scheduledAppointmentReminders = functions.pubsub
  .schedule("every day 08:00")
  .onRun(async () => {
    const hospitalsSnapshot = await db.collection("hospitals").get();
    const now = new Date();

    for (const hospitalDoc of hospitalsSnapshot.docs) {
      const hospital = {id: hospitalDoc.id, ...hospitalDoc.data()} as Hospital;
      const settings = hospital.notificationSettings?.appointmentReminder;

      if (!settings?.enabled || !settings.template) {
        continue;
      }

      const daysBefore = settings.daysBefore || 1;
      const reminderDate = new Date(now);
      reminderDate.setDate(now.getDate() + daysBefore);
      const startOfDay = new Date(
        reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

      const appointmentsSnapshot = await db
        .collection("appointments")
        .where("hospitalId", "==", hospital.id)
        .where("start", ">=", startOfDay)
        .where("start", "<=", endOfDay)
        .where("status", "==", "Registered")
        .get();

      for (const appDoc of appointmentsSnapshot.docs) {
        const appointment = {id: appDoc.id, ...appDoc.data()} as Appointment;
        const patientDoc = await db.collection("patients")
          .doc(appointment.patientId).get();
        const doctorDoc = await db.collection("doctors")
          .doc(appointment.doctorId).get();

        if (patientDoc.exists && patientDoc.data()?.email && doctorDoc.exists) {
          const patient = {id: patientDoc.id, ...patientDoc.data()} as Patient;
          const doctor = {id: doctorDoc.id, ...doctorDoc.data()} as Doctor;
          await sendTemplatedEmail(
            patient.email,
            settings.template.subject,
            settings.template.body,
            {hospital, patient, appointment: {...appointment, doctor}},
            hospital
          );
        }
      }
    }
    return null;
  });

export const scheduledBirthdayWishes = functions.pubsub
  .schedule("every day 07:00")
  .onRun(async () => {
    const hospitalsSnapshot = await db.collection("hospitals").get();
    const now = new Date();
    const todayMonth = now.getMonth() + 1; // 1-12
    const todayDay = now.getDate(); // 1-31

    for (const hospitalDoc of hospitalsSnapshot.docs) {
      const hospital = {id: hospitalDoc.id, ...hospitalDoc.data()} as Hospital;
      const settings = hospital.notificationSettings?.birthdayWish;

      if (!settings?.enabled || !settings.template) {
        continue;
      }

      // NOTE: This is an inefficient query that scans all patients.
      // For optimization at scale, add a 'birthDayMonth' field ("DD-MM")
      // to each patient document and create a Firestore index for it.
      const patientsSnapshot = await db
        .collection("patients")
        .where("hospitalId", "==", hospital.id)
        .where("status", "==", "active")
        .get();

      for (const patientDoc of patientsSnapshot.docs) {
        const patient = {id: patientDoc.id, ...patientDoc.data()} as Patient;
        if (patient.dateOfBirth && patient.email) {
          const [_, month, day] = patient.dateOfBirth.split("-").map(Number);
          if (month === todayMonth && day === todayDay) {
            await sendTemplatedEmail(
              patient.email,
              settings.template.subject,
              settings.template.body,
              {hospital, patient},
              hospital
            );
          }
        }
      }
    }
    return null;
  });