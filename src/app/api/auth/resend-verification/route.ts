import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import emailService from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email } = await request.json();

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'El correo es requerido' },
        { status: 400 }
      );
    }

    // Check if email validation is enabled
    const emailValidationEnabled = process.env.ENABLE_EMAIL_VALIDATION === 'true';
    if (!emailValidationEnabled) {
      return NextResponse.json(
        { error: 'La validación de correo no está habilitada' },
        { status: 400 }
      );
    }

    // Find user
    const user = await WebUser.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe, recibirás un email de verificación.',
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Este correo ya está verificado' },
        { status: 400 }
      );
    }

    // Check rate limiting (don't send if recently sent - within 2 minutes)
    if (user.emailVerificationSentAt) {
      const timeSinceLastEmail = Date.now() - new Date(user.emailVerificationSentAt).getTime();
      const twoMinutes = 2 * 60 * 1000;

      if (timeSinceLastEmail < twoMinutes) {
        const waitTime = Math.ceil((twoMinutes - timeSinceLastEmail) / 1000);
        return NextResponse.json(
          {
            error: 'Por favor espera antes de solicitar otro correo',
            waitTime,
          },
          { status: 429 }
        );
      }
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update user with new token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationSentAt = new Date();
    await user.save();

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(
      user.email,
      user.profile.firstName,
      verificationToken
    );

    if (emailSent) {
      console.log(`✅ Verification email resent to ${user.email}`);
      return NextResponse.json({
        success: true,
        message: '✅ Correo de verificación enviado. Revisa tu bandeja de entrada.',
      });
    } else {
      console.error(`❌ Failed to resend verification email to ${user.email}`);
      return NextResponse.json(
        {
          error: 'No se pudo enviar el correo. Intenta más tarde o contacta soporte.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
