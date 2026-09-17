const nodemailer = require('nodemailer');

/**
 * Creates and configures the Nodemailer SMTP transporter.
 * Pre-configured for Gmail SMTP with fallback and error resilience.
 */
function createTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 465;
    const isSecure = port === 465; // true for 465, false for 587 or 25

    return nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: {
            user,
            pass
        },
        tls: {
            rejectUnauthorized: false // Avoid TLS rejection in containerized / proxy environments
        }
    });
}

const emailService = {
    /**
     * Check if email credentials are configured
     */
    isConfigured: () => {
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;
        return Boolean(user && pass);
    },

    /**
     * Sends a rich HTML password reset email to the user
     * @param {string} toEmail - Recipient email address
     * @param {string} userName - Volunteer's first name
     * @param {string} resetUrl - Complete clickable reset password URL
     */
    sendPasswordResetEmail: async (toEmail, userName, resetUrl) => {
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD;

        // Fallback: If credentials are not yet added to .env, log cleanly without failing
        if (!user || !pass) {
            console.log('\n=============================================================');
            console.log('📬 [EMAIL DISPATCH - SIMULATION MODE]');
            console.log(`To: ${toEmail}`);
            console.log(`Recipient Name: ${userName || 'Volunteer'}`);
            console.log(`Reset URL: ${resetUrl}`);
            console.log('ℹ️  To send real emails via Gmail, configure EMAIL_USER and EMAIL_PASSWORD in .env');
            console.log('=============================================================\n');
            return {
                sent: false,
                simulated: true,
                message: 'Email credentials not configured. Reset link logged to console.'
            };
        }

        const transporter = createTransporter();
        if (!transporter) {
            throw new Error('Failed to initialize mail transporter.');
        }

        const senderFrom = process.env.EMAIL_FROM || `"Sevalog Team" <${user}>`;
        const displayName = userName ? `${userName}` : 'Volunteer';

        const mailOptions = {
            from: senderFrom,
            to: toEmail,
            subject: '🔐 Reset Your Sevalog Password',
            text: `Hello ${displayName},\n\nWe received a request to reset your password for your Sevalog account.\n\nPlease use the following link to reset your password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nBest regards,\nSevalog Team`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Sevalog Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border-radius: 50%; padding: 12px; margin-bottom: 12px;">
                      <span style="font-size: 28px; line-height: 1;">🤝</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">SEVALOG</h1>
                    <p style="color: #bfdbfe; font-size: 13px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Volunteer & Social Impact Portal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Password Reset Request</h2>
              
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                Hello <strong>${displayName}</strong>,
              </p>
              
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                We received a request to reset the password for your Sevalog account associated with <strong style="color: #1e3a8a;">${toEmail}</strong>. Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25); text-align: center;">
                      Reset My Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 16px; margin: 24px 0 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
                      ⏱️ <strong>Time Sensitive:</strong> This reset link will expire in <strong>15 minutes</strong>. It can only be used once.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Direct URL Fallback -->
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 8px 0;">
                If the button above does not work, copy and paste this link into your web browser:
              </p>
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; font-family: Consolas, Monaco, monospace; font-size: 12px; color: #1e293b; word-break: break-all; margin-bottom: 24px;">
                <a href="${resetUrl}" target="_blank" style="color: #2563eb; text-decoration: none;">${resetUrl}</a>
              </div>

              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                🛡️ If you did not request a password reset, you can safely disregard this email. Your current password remains secure and active.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0;">
                Chembur Samithi Sevalog System &bull; Dedicated to Community Service
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                This is an automated system message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`[Email Sent] MessageId: ${info.messageId} to ${toEmail}`);
            return {
                sent: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('[Email Delivery Error]:', error.message);
            // Log fallback so user/dev still has the link even if SMTP rejected it
            console.log(`[Email Fallback Link for ${toEmail}]: ${resetUrl}`);
            return {
                sent: false,
                error: error.message,
                simulated: false
            };
        }
    }
};

module.exports = emailService;
