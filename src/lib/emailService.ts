import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    // Support both SMTP_PASS and SMTP_PASSWORD for compatibility
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    // Check if all required SMTP credentials are provided
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn('⚠️ SMTP credentials not configured. Email sending disabled.');
      console.warn('SMTP Config Status:', {
        SMTP_HOST: smtpHost ? '✅ SET' : '❌ MISSING',
        SMTP_PORT: smtpPort ? '✅ SET' : '❌ MISSING',
        SMTP_USER: smtpUser ? '✅ SET' : '❌ MISSING',
        SMTP_PASS: smtpPass ? '✅ SET' : '❌ MISSING',
      });
      this.isConfigured = false;
      return;
    }

    console.log('📧 Initializing email service with:', {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      secure: parseInt(smtpPort) === 465,
    });

    try {
      // Configure Zoho Mail SMTP
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465, // true for 465 (SSL), false for other ports (TLS)
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        // Additional Zoho-specific settings
        tls: {
          rejectUnauthorized: true,
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service configured successfully with Zoho Mail');
    } catch (error) {
      console.error('❌ Failed to configure email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send an email
   */
  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('⚠️ Email service not configured. Skipping email send.');
      console.warn('Configuration status:', {
        isConfigured: this.isConfigured,
        hasTransporter: !!this.transporter,
      });
      return false;
    }

    try {
      console.log('📤 Attempting to send email:', {
        to,
        subject,
        from: `"Karteando.cl" <${process.env.SMTP_USER}>`,
      });

      const info = await this.transporter.sendMail({
        from: `"Karteando.cl" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: text || '', // Plain text fallback
        html,
      });

      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        to,
        subject,
        accepted: info.accepted,
        rejected: info.rejected,
      });
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email:', {
        error: error.message,
        code: error.code,
        to,
        subject,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    to: string,
    firstName: string,
    verificationToken: string
  ): Promise<boolean> {
    // Clean URL - remove any whitespace/newlines from env var
    const baseUrl = (process.env.NEXTAUTH_URL || 'https://karteando.cl').trim();
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

    console.log('📧 Sending verification email:', {
      to,
      firstName,
      baseUrl,
      tokenLength: verificationToken.length,
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #0a0e27;
              color: #e0e7ff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: linear-gradient(135deg, #1a1f3a 0%, #0a0e27 100%);
              border: 2px solid #00d9ff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 0 30px rgba(0, 217, 255, 0.3);
            }
            .header {
              background: linear-gradient(90deg, #00d9ff 0%, #7dd3fc 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #0a0e27;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #00d9ff;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content p {
              line-height: 1.8;
              margin-bottom: 20px;
              color: #cbd5e1;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(90deg, #00d9ff 0%, #7dd3fc 100%);
              color: #0a0e27;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 18px;
              text-align: center;
              margin: 20px 0;
              letter-spacing: 1px;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: scale(1.05);
            }
            .footer {
              background-color: #0a0e27;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #1e293b;
            }
            .racing-stripe {
              height: 4px;
              background: repeating-linear-gradient(
                90deg,
                #00d9ff 0px,
                #00d9ff 20px,
                #0a0e27 20px,
                #0a0e27 40px
              );
            }
            .warning {
              background-color: rgba(251, 191, 36, 0.1);
              border-left: 4px solid #fbbf24;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="racing-stripe"></div>
            <div class="header">
              <h1>🏁 KARTEANDO.CL</h1>
            </div>
            <div class="content">
              <h2>¡Bienvenido al circuito, ${firstName}! 🏎️</h2>
              <p>
                Estás a solo un clic de acceder a tu cuenta en <strong>Karteando.cl</strong>,
                la plataforma definitiva de karting competitivo.
              </p>
              <p>
                Para verificar tu correo electrónico y activar tu cuenta, haz clic en el botón de abajo:
              </p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                  VERIFICAR MI CORREO
                </a>
              </div>
              <div class="warning">
                <p style="margin: 0;">
                  <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por seguridad.
                </p>
              </div>
              <p style="font-size: 14px; color: #94a3b8;">
                Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
              </p>
              <p style="font-size: 14px; color: #94a3b8;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${verificationUrl}" style="color: #00d9ff; word-break: break-all;">
                  ${verificationUrl}
                </a>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 Karteando.cl - Plataforma de Karting Competitivo</p>
              <p>¡Nos vemos en la pista! 🏁</p>
            </div>
            <div class="racing-stripe"></div>
          </div>
        </body>
      </html>
    `;

    const text = `
¡Bienvenido al circuito, ${firstName}! 🏎️

Estás a solo un paso de acceder a tu cuenta en Karteando.cl.

Para verificar tu correo electrónico, visita este enlace:
${verificationUrl}

Este enlace expirará en 24 horas por seguridad.

Si no creaste esta cuenta, puedes ignorar este correo.

¡Nos vemos en la pista! 🏁
Karteando.cl
    `;

    return this.sendEmail({
      to,
      subject: '🏁 Verifica tu correo - Karteando.cl',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    // Clean URL - remove any whitespace/newlines from env var
    const baseUrl = (process.env.NEXTAUTH_URL || 'https://karteando.cl').trim();
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    console.log('🔑 Sending password reset email:', {
      to,
      firstName,
      baseUrl,
      tokenLength: resetToken.length,
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #0a0e27;
              color: #e0e7ff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: linear-gradient(135deg, #1a1f3a 0%, #0a0e27 100%);
              border: 2px solid #fbbf24;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 0 30px rgba(251, 191, 36, 0.3);
            }
            .header {
              background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #0a0e27;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #fbbf24;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content p {
              line-height: 1.8;
              margin-bottom: 20px;
              color: #cbd5e1;
            }
            .button {
              display: inline-block;
              padding: 15px 40px;
              background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
              color: #0a0e27;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 18px;
              text-align: center;
              margin: 20px 0;
              letter-spacing: 1px;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: scale(1.05);
            }
            .footer {
              background-color: #0a0e27;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #1e293b;
            }
            .racing-stripe {
              height: 4px;
              background: repeating-linear-gradient(
                90deg,
                #fbbf24 0px,
                #fbbf24 20px,
                #0a0e27 20px,
                #0a0e27 40px
              );
            }
            .warning {
              background-color: rgba(239, 68, 68, 0.1);
              border-left: 4px solid #ef4444;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="racing-stripe"></div>
            <div class="header">
              <h1>🔑 KARTEANDO.CL</h1>
            </div>
            <div class="content">
              <h2>Recuperación de Contraseña</h2>
              <p>
                Hola <strong>${firstName}</strong>,
              </p>
              <p>
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Karteando.cl</strong>.
              </p>
              <p>
                Para crear una nueva contraseña, haz clic en el botón de abajo:
              </p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">
                  RESTABLECER CONTRASEÑA
                </a>
              </div>
              <div class="warning">
                <p style="margin: 0;">
                  <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad.
                </p>
              </div>
              <p style="font-size: 14px; color: #94a3b8;">
                Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.
                Tu contraseña no cambiará a menos que hagas clic en el enlace de arriba.
              </p>
              <p style="font-size: 14px; color: #94a3b8;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${resetUrl}" style="color: #fbbf24; word-break: break-all;">
                  ${resetUrl}
                </a>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 Karteando.cl - Plataforma de Karting Competitivo</p>
              <p>¡Nos vemos en la pista! 🏁</p>
            </div>
            <div class="racing-stripe"></div>
          </div>
        </body>
      </html>
    `;

    const text = `
Recuperación de Contraseña - Karteando.cl

Hola ${firstName},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Karteando.cl.

Para crear una nueva contraseña, visita este enlace:
${resetUrl}

Este enlace expirará en 1 hora por seguridad.

Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña no cambiará a menos que hagas clic en el enlace de arriba.

¡Nos vemos en la pista! 🏁
Karteando.cl
    `;

    return this.sendEmail({
      to,
      subject: '🔑 Recupera tu contraseña - Karteando.cl',
      html,
      text,
    });
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
