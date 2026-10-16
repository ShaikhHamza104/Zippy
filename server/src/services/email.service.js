// server/src/services/email.service.js
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter = null;

if (env.NODE_ENV === 'production' && env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

/**
 * Sends an email using nodemailer in production, or logs to console/pino in development/testing.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plaintext body
 * @returns {Promise<{ messageId?: string, isDevLogged?: boolean }>}
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
        text,
      });
      logger.info({ messageId: info.messageId, to, subject }, 'Email sent successfully via SMTP');
      return { messageId: info.messageId };
    } catch (err) {
      logger.error({ err, to, subject }, 'Failed to send email via SMTP');
      throw err;
    }
  }

  // Development & Test fallback: Log to server logger
  logger.info({ to, subject, preview: text || html }, '[DEV / TEST EMAIL] Notification generated');
  return { isDevLogged: true };
};

/**
 * Sends a password reset email containing a reset link and optional OTP.
 *
 * @param {string} to
 * @param {object} params
 * @param {string} params.resetToken
 * @param {string} [params.otp]
 * @param {string} [params.name]
 * @returns {Promise<any>}
 */
export const sendPasswordResetEmail = async (to, { resetToken, otp, name = 'Customer' }) => {
  const resetLink = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const subject = 'Reset Your Zippy Password';
  const text = `Hello ${name},

We received a request to reset the password for your Zippy account.
Click the link below or paste it into your browser to choose a new password:
${resetLink}

${otp ? `Alternatively, enter this one-time code: ${otp}\n\n` : ''}This link will expire in 15 minutes.
If you did not request this password reset, please ignore this email.

Best regards,
The Zippy Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #16a34a;">Zippy Password Reset</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Click the button below to proceed:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      ${otp ? `<p>Or enter this OTP: <strong style="font-size: 18px; letter-spacing: 2px;">${otp}</strong></p>` : ''}
      <p style="font-size: 13px; color: #64748b;">This link is valid for 15 minutes. If you did not make this request, no further action is required.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

/**
 * Sends an email verification email.
 *
 * @param {string} to
 * @param {object} params
 * @param {string} params.verificationToken
 * @param {string} [params.name]
 * @returns {Promise<any>}
 */
export const sendVerificationEmail = async (to, { verificationToken, name = 'Customer' }) => {
  const verificationLink = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const subject = 'Verify Your Email Address - Zippy';
  const text = `Hello ${name},

Thank you for signing up with Zippy!
Please verify your email address by clicking the link below:
${verificationLink}

This link is valid for 24 hours.

Best regards,
The Zippy Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #16a34a;">Welcome to Zippy!</h2>
      <p>Hello ${name},</p>
      <p>Please click the button below to confirm and verify your email address:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verificationLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b;">This verification link will expire in 24 hours.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};
