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
            console.log('[EMAIL DISPATCH - SIMULATION MODE]');
            console.log(`To: ${toEmail}`);
            console.log(`Recipient Name: ${userName || 'Volunteer'}`);
            console.log(`Reset URL: ${resetUrl}`);
            console.log('[Notice] To send real emails via Gmail, configure EMAIL_USER and EMAIL_PASSWORD in .env');
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
            subject: 'Reset Your Sevalog Password',
            text: `Hello ${displayName},\n\nWe received a request to reset your password for your Sevalog account.\n\nPlease use the following link to reset your password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email. Your password will remain unchanged.\n\nBest regards,\nSevalog Team`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Sevalog Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(15, 23, 42, 0.04); overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 4px; background: #2563eb;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <div style="width: 36px; height: 36px; background-color: #eff6ff; border-radius: 6px; text-align: center; line-height: 36px;">
                            <!-- Minimal Community / Volunteer SVG Icon -->
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-top: 8px;">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 17px; font-weight: 700; letter-spacing: 0.5px; color: #0f172a;">SEVALOG</span>
                          <span style="display: block; font-size: 12px; color: #64748b; font-weight: 500;">Volunteer Management Portal</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <!-- Title with NO emoji or svg -->
              <h1 style="color: #0f172a; font-size: 19px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.4;">Password Reset Request</h1>
              
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                Hello ${displayName},
              </p>
              
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                We received a request to reset the password for your account associated with <strong>${toEmail}</strong>. Select the button below to proceed with setting a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td>
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; text-align: center;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Box with Minimal Clock SVG -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 12px 14px; margin: 24px 0 20px 0;">
                <tr>
                  <td style="vertical-align: top; width: 22px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#854d0e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </td>
                  <td style="vertical-align: top; padding-left: 8px;">
                    <p style="margin: 0; font-size: 13px; color: #854d0e; line-height: 1.5;">
                      <strong>Time limit:</strong> This link will expire in <strong>15 minutes</strong> and can only be used once.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Direct URL Fallback -->
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 6px 0;">
                If the button above does not work, copy and paste this link into your web browser:
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-family: Consolas, Monaco, monospace; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 24px;">
                <a href="${resetUrl}" target="_blank" style="color: #2563eb; text-decoration: none;">${resetUrl}</a>
              </div>

              <!-- Minimal Shield SVG for Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: top; width: 18px;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </td>
                  <td style="vertical-align: top; padding-left: 6px;">
                    <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                      If you did not request a password reset, you can safely disregard this email. Your current password remains secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 4px 0;">
                Sevalog &bull; Chembur Samithi
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                This is an automated system notification.
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
