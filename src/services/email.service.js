import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: #1a1a1a;
`;

const buildEmailTemplate = ({ title, preheader, bodyHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;${BASE_STYLES}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f0f0f;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                ⚖ Case Ledger
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:12px;color:#888888;">
                This is an automated notification from <strong>Case Ledger</strong> — Human Rights Case Management Platform.
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const sendMail = async ({ to, subject, html }) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn('[Email] Credentials not configured (EMAIL_USER/EMAIL_PASS missing). Skipping send.', {
            to,
            subject,
        });
        return;
    }

    logger.info('[Email] Attempting to send email', {
        to,
        subject,
        from: process.env.EMAIL_USER,
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
    });

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: `"Case Ledger" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        logger.info('[Email] Email sent successfully', {
            to,
            subject,
            messageId: info.messageId,
            response: info.response,
        });
    } catch (error) {
        logger.error('[Email] Failed to send email', {
            to,
            subject,
            error: error.message,
            stack: error.stack,
            code: error.code,
        });
    }
};

/**
 * Send notification to investigator when assigned to a case
 */
export const sendInvestigatorAssignmentEmail = async ({ investigatorEmail, investigatorName, caseTitle, caseNumber, caseId }) => {
    const html = buildEmailTemplate({
        title: 'Case Assignment Notification',
        bodyHtml: `
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;">You have been assigned a case</h2>
          <p style="margin:0 0 24px;color:#444;line-height:1.6;">
            Hi <strong>${investigatorName}</strong>, you have been assigned as the lead investigator for the following case.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:20px;margin-bottom:24px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Case Number</p>
                <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f0f0f;">${caseNumber}</p>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Case Title</p>
                <p style="margin:0;font-size:15px;color:#1a1a1a;">${caseTitle}</p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 24px;color:#444;line-height:1.6;">
            Please log in to the platform to review the case details and begin your investigation.
          </p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/cases/${caseId}"
             style="display:inline-block;background:#0f0f0f;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            View Case
          </a>
        `,
    });

    await sendMail({
        to: investigatorEmail,
        subject: `[Case Ledger] Case Assignment: ${caseNumber}`,
        html,
    });
};

/**
 * Send notification to victim when their case progress is updated
 */
export const sendVictimProgressUpdateEmail = async ({ victimEmail, victimName, caseTitle, caseNumber, caseId, progressMessage, newStatus }) => {
    const html = buildEmailTemplate({
        title: 'Case Progress Update',
        bodyHtml: `
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;">Update on your case</h2>
          <p style="margin:0 0 24px;color:#444;line-height:1.6;">
            Hi <strong>${victimName}</strong>, there has been a progress update on the case you are associated with.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:20px;margin-bottom:24px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Case</p>
                <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0f0f0f;">${caseNumber} — ${caseTitle}</p>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
                <p style="margin:0 0 16px;font-size:14px;color:#1a1a1a;">${newStatus.replace(/_/g, ' ')}</p>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Update</p>
                <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.5;">${progressMessage}</p>
              </td>
            </tr>
          </table>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/cases/${caseId}"
             style="display:inline-block;background:#0f0f0f;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            View Case Details
          </a>
        `,
    });

    await sendMail({
        to: victimEmail,
        subject: `[Case Ledger] Progress Update: ${caseNumber}`,
        html,
    });
};

/**
 * Send notification to victim when they are assigned to a case
 */
export const sendVictimAssignmentEmail = async ({ victimEmail, victimName, caseTitle, caseNumber, caseId }) => {
    const html = buildEmailTemplate({
        title: 'Case Assignment Notification',
        bodyHtml: `
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;">You have been assigned to a case</h2>
          <p style="margin:0 0 24px;color:#444;line-height:1.6;">
            Hi <strong>${victimName}</strong>, you have been associated with the following case on the Case Ledger platform.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:20px;margin-bottom:24px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Case Number</p>
                <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f0f0f;">${caseNumber}</p>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Case Title</p>
                <p style="margin:0;font-size:15px;color:#1a1a1a;">${caseTitle}</p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 24px;color:#444;line-height:1.6;">
            Please log in to the platform to view case details and any updates from the investigation team.
          </p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/cases/${caseId}"
             style="display:inline-block;background:#0f0f0f;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            View Case
          </a>
        `,
    });

    await sendMail({
        to: victimEmail,
        subject: `[Case Ledger] Case Assignment: ${caseNumber}`,
        html,
    });
};

/**
 * Send invitation email to a potential victim not yet registered in the system
 */
export const sendVictimInvitationEmail = async ({ email, caseTitle, caseNumber, inviterName }) => {
    const registerUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register`;

    const html = buildEmailTemplate({
        title: 'Invitation to Case Ledger',
        bodyHtml: `
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;">You have been invited to Case Ledger</h2>
          <p style="margin:0 0 24px;color:#444;line-height:1.6;">
            <strong>${inviterName}</strong> has requested your involvement in a human rights case being managed through the Case Ledger platform.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:6px;padding:20px;margin-bottom:24px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Case Number</p>
                <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f0f0f;">${caseNumber}</p>
                <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Case Title</p>
                <p style="margin:0;font-size:15px;color:#1a1a1a;">${caseTitle}</p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 24px;color:#444;line-height:1.6;">
            To access case updates and communicate with the investigation team, please create an account using your email address.
          </p>
          <a href="${registerUrl}"
             style="display:inline-block;background:#0f0f0f;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            Create Your Account
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#888;">
            If you received this in error, you may safely ignore this email.
          </p>
        `,
    });

    await sendMail({
        to: email,
        subject: `[Case Ledger] Invitation — ${caseNumber}`,
        html,
    });
};
