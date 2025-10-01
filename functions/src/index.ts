import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {RtcTokenBuilder, RtcRole} from "agora-token";

admin.initializeApp();

export {firestoreBackup} from "./backup";

// --- START: Agora Video Call Functions ---

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

export const generateAgoraToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const {channelName, uid} = data; // Accept uid from frontend

  if (!channelName || uid === undefined || uid === null) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a \"channelName\" and \"uid\".");
  }

  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    functions.logger.error("Agora credentials are not configured in Firebase environment.");
    throw new functions.https.HttpsError("failed-precondition", "Video call feature is not configured.");
  }

  const role = RtcRole.PUBLISHER;
  const tokenExpirationInSeconds = 3600; // 1 hour
  const privilegeExpirationInSeconds = 3600; // Privileges last for the full token duration

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid, // Use the uid passed from the frontend
      role,
      tokenExpirationInSeconds,
      privilegeExpirationInSeconds,
    );
    functions.logger.log(`Generated Agora token for channel: ${channelName} for uid: ${uid}`);
    return {token};
  } catch (error) {
    functions.logger.error("Error generating Agora token:", error);
    throw new functions.https.HttpsError("internal", "Could not generate Agora token.");
  }
});

export const startVideoCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const callerUid = context.auth.uid;
  const {appointmentId} = data;
  if (!appointmentId) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with an \"appointmentId\".");
  }

  try {
    const appointmentRef = admin.firestore().collection("appointments").doc(appointmentId);
    const appointmentDoc = await appointmentRef.get();

    if (!appointmentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Appointment not found.");
    }
    const appointmentData = appointmentDoc.data() as any;

    // Fetch doctor's profile photo URL
    const doctorDoc = await admin.firestore().collection("doctors").doc(appointmentData.doctorId).get();
    const doctorPhotoUrl = doctorDoc.exists ? (doctorDoc.data() as any).profilePhotoUrl : null;

    // Fetch patient's profile photo URL
    const patientDoc = await admin.firestore().collection("patients").doc(appointmentData.patientId).get();
    const patientPhotoUrl = patientDoc.exists ? (patientDoc.data() as any).profilePhotoUrl : null;

    await appointmentRef.update({
      videoCallStartedByDoctor: true,
      videoCallActive: true,
      videoCallChannel: appointmentId, // Use appointmentId as a unique channel name
      callStartTime: admin.firestore.FieldValue.serverTimestamp(),
      doctorPhotoUrl: doctorPhotoUrl,
      patientPhotoUrl: patientPhotoUrl,
    });
    functions.logger.log(`Video call started for appointment: ${appointmentId} by ${callerUid}`);
    return {success: true, message: "Video call started."};
  } catch (error) {
    functions.logger.error("Error starting video call:", error, {appointmentId, callerUid});
    throw new functions.https.HttpsError("internal", "Could not start video call.");
  }
});

export const endVideoCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const {appointmentId} = data;
  if (!appointmentId) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with an \"appointmentId\".");
  }

  try {
    const appointmentRef = admin.firestore().collection("appointments").doc(appointmentId);
    await appointmentRef.update({
      videoCallActive: false,
      videoCallStartedByDoctor: false,
    });
    functions.logger.log(`Video call ended for appointment: ${appointmentId}. Resetting all flags.`);
    return {success: true, message: "Video call ended."};
  } catch (error) {
    functions.logger.error("Error ending video call:", error, {appointmentId});
    throw new functions.https.HttpsError("internal", "Could not end video call.");
  }
});

// --- END: Agora Video Call Functions ---
