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

    // Find user
    const user = await WebUser.findOne({ email: email.toLowerCase() });

    // Always return success (don't reveal if user exists for security)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.',
      });
    }

    // Check rate limiting (don't send if recently sent - within 5 minutes)
    if (user.passwordResetExpires && user.passwordResetExpires > new Date()) {
      const waitTime = Math.ceil((user.passwordResetExpires.getTime() - Date.now()) / 1000 / 60);
      return NextResponse.json(
        {
          error: `Por favor espera ${waitTime} minuto(s) antes de solicitar otro correo`,
        },
        { status: 429 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now (rate limit)

    // Update user with reset token
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email (WAIT for it to see errors)
    console.log('📧 Attempting to send password reset email...', {
      to: user.email,
      firstName: user.profile.firstName,
      tokenLength: resetToken.length,
      smtpConfigured: process.env.SMTP_HOST ? 'YES' : 'NO'
    });

    try {
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.profile.firstName,
        resetToken
      );

      if (emailSent) {
        console.log(`✅ Password reset email sent to ${user.email}`);
        return NextResponse.json({
          success: true,
          message: '✅ Correo enviado. Revisa tu bandeja de entrada.',
        });
      } else {
        console.error(`❌ Failed to send password reset email to ${user.email}`);
        return NextResponse.json({
          success: false,
          error: 'No se pudo enviar el correo. El servicio de email no está configurado.',
        }, { status: 500 });
      }
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      return NextResponse.json({
        success: false,
        error: 'Error al enviar el correo. Por favor intenta más tarde.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
