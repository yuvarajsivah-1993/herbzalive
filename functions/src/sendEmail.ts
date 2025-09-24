import * as functions from 'firebase-functions';
import * as sgMail from '@sendgrid/mail';

// Set SendGrid API Key from Firebase Environment Configuration
// This should be set using `firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"`
const SENDGRID_API_KEY = functions.config().sendgrid?.key;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.error('SendGrid API Key not configured. Emails will not be sent.');
}

export const sendEmail = functions.https.onCall(async (data, context) => {
  // 1. Authentication and Authorization (Optional but Recommended)
  // if (!context.auth) {
  //   throw new functions.https.HttpsError(
  //     'unauthenticated',
  //     'The function must be called while authenticated.'
  //   );
  // }
  // You might also want to check context.auth.token.email or uid
  // to ensure only authorized users can send emails.

  const { to, subject, html, text, fromEmail, attachments } = data;

  if (!to || !subject || (!html && !text)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with "to", "subject", and either "html" or "text" arguments.'
    );
  }

  if (!SENDGRID_API_KEY) {
    throw new functions.https.HttpsError(
      'unavailable',
      'SendGrid API Key is not configured.'
    );
  }

  const msg = {
    to: to,
    from: fromEmail || 'noreply@yourhospital.com', // Use configured fromEmail or a default
    subject: subject,
    html: html,
    text: text,
    attachments: attachments, // Optional attachments
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error: any) {
    console.error('Error sending email:', error.response?.body || error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send email.',
      error.response?.body || error
    );
  }
});