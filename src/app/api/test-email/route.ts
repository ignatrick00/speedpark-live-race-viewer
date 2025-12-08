import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/lib/emailService';

export async function GET(request: NextRequest) {
  // ❌ DISABLED IN PRODUCTION - Security measure to prevent spam
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      success: false,
      error: 'Test endpoint disabled in production for security'
    }, { status: 403 });
  }

  try {
    // Check if email service is configured
    const isReady = emailService.isReady();

    if (!isReady) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured',
        config: {
          SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
          SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
          SMTP_USER: process.env.SMTP_USER || 'NOT SET',
          SMTP_PASS: process.env.SMTP_PASS ? '***SET***' : 'NOT SET',
          SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET',
          ENABLE_EMAIL_VALIDATION: process.env.ENABLE_EMAIL_VALIDATION || 'NOT SET',
        },
      });
    }

    // Send test email
    console.log('🧪 Attempting to send test email to ircabrera@uc.cl');

    const sent = await emailService.sendVerificationEmail(
      'ircabrera@uc.cl',
      'Ignacio',
      'test-token-12345'
    );

    if (sent) {
      return NextResponse.json({
        success: true,
        message: '✅ Email sent successfully to ircabrera@uc.cl',
        config: {
          SMTP_HOST: process.env.SMTP_HOST,
          SMTP_PORT: process.env.SMTP_PORT,
          SMTP_USER: process.env.SMTP_USER,
          ENABLE_EMAIL_VALIDATION: process.env.ENABLE_EMAIL_VALIDATION,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Email sending failed - check server logs',
        config: {
          SMTP_HOST: process.env.SMTP_HOST,
          SMTP_PORT: process.env.SMTP_PORT,
          SMTP_USER: process.env.SMTP_USER,
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
      config: {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
      },
    }, { status: 500 });
  }
}
