import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin"; // Import admin
import {FirestoreAdminClient} from "@google-cloud/firestore/build/src/v1";
import * as logger from "firebase-functions/logger";

const firestore = new FirestoreAdminClient();

export const firestoreBackup = onRequest(async (request, response) => {
  const projectId = process.env.GCP_PROJECT || process.env.FIREBASE_PROJECT || admin.instanceId().app.options.projectId;

  if (!projectId) {
    logger.error("Project ID not found. Ensure GCP_PROJECT or FIREBASE_PROJECT is set, or admin.instanceId().app.options.projectId is available.");
    response.status(500).send("Project ID not found.");
    return;
  }
  const databaseName = firestore.databasePath(projectId, "(default)");
  const bucketName = request.query.bucketName as string; // Get bucket name from query parameter

  if (!bucketName) {
    logger.error("Bucket name not provided. Please specify a bucketName query parameter.");
    response.status(400).send("Bucket name not provided.");
    return;
  }

  const outputUriPrefix = `gs://${bucketName}/firestore-backups/${Date.now()}`;

  try {
    logger.info(`Initiating Firestore export to ${outputUriPrefix}`);
    const [operation] = await firestore.exportDocuments({
      name: databaseName,
      outputUriPrefix,
      // Leave collectionIds empty to export all collections
      // collectionIds: ['collection1', 'collection2'],
    });

    logger.info(`Firestore export operation started: ${operation.name}`);
    response.status(200).send(`Firestore export operation started: ${operation.name}`);
  } catch (error) {
    logger.error("Firestore export failed:", error);
    response.status(500).send("Firestore export failed.");
  }
});
