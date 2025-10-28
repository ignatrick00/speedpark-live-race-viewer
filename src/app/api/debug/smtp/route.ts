import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    smtp: {
      SMTP_HOST: process.env.SMTP_HOST ? '✅ SET' : '❌ MISSING',
      SMTP_PORT: process.env.SMTP_PORT ? '✅ SET' : '❌ MISSING',
      SMTP_USER: process.env.SMTP_USER ? '✅ SET' : '❌ MISSING',
      SMTP_PASS: process.env.SMTP_PASS ? '✅ SET' : '❌ MISSING',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '✅ SET' : '❌ MISSING',
      ENABLE_EMAIL_VALIDATION: process.env.ENABLE_EMAIL_VALIDATION || 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    },
    values: {
      SMTP_HOST: process.env.SMTP_HOST || null,
      SMTP_PORT: process.env.SMTP_PORT || null,
      SMTP_USER: process.env.SMTP_USER || null,
      // Don't expose password, just check length
      SMTP_PASS_LENGTH: process.env.SMTP_PASS?.length || 0,
    }
  });
}
