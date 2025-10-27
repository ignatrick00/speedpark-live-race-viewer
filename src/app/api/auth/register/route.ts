import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import { RealStatsLinker } from '@/lib/realStatsLinker';
import emailService from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, password, firstName, lastName, alias } = await request.json();
    
    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Correo, contraseña, nombre y apellido son requeridos' },
        { status: 400 }
      );
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await WebUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este correo ya está registrado' },
        { status: 400 }
      );
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationSentAt = new Date();

    // Check if email validation is enabled
    const emailValidationEnabled = process.env.ENABLE_EMAIL_VALIDATION === 'true';

    console.log('🔍 Email validation check:', {
      ENABLE_EMAIL_VALIDATION: process.env.ENABLE_EMAIL_VALIDATION,
      emailValidationEnabled,
      willCreateAsVerified: !emailValidationEnabled,
    });

    // Create user
    const user = await WebUser.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: !emailValidationEnabled, // If validation disabled, mark as verified
      emailVerificationToken: emailValidationEnabled ? verificationToken : undefined,
      emailVerificationSentAt: emailValidationEnabled ? verificationSentAt : undefined,
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        alias: alias?.trim() || null,
      },
      kartingLink: {
        personId: null,
        linkedAt: null,
        status: 'pending_first_race',
      },
      accountStatus: 'active',
    });
    
    // Send verification email if enabled (async - don't wait for it)
    if (emailValidationEnabled) {
      // Fire-and-forget email sending to avoid blocking response
      emailService.sendVerificationEmail(
        user.email,
        user.profile.firstName,
        verificationToken
      ).then((sent) => {
        if (sent) {
          console.log(`✅ Verification email sent to ${user.email}`);
        } else {
          console.warn(`⚠️ Failed to send verification email to ${user.email}`);
        }
      }).catch((error) => {
        console.error('Error sending verification email:', error);
      });
    }

    // Try to link with real racing data
    console.log(`🔗 Attempting to link ${firstName} with real race data...`);
    const isLinked = await RealStatsLinker.linkUserWithRealStats(
      user._id.toString(),
      firstName,
      lastName
    );

    // Generate JWT token ONLY if email validation is disabled or email is already verified
    let token = null;
    if (!emailValidationEnabled) {
      token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );
    }

    // Update user object if linked
    const updatedUser = isLinked
      ? await WebUser.findById(user._id)
      : user;

    // Different response based on email validation setting
    if (emailValidationEnabled) {
      return NextResponse.json({
        success: true,
        requiresEmailVerification: true,
        message: '✅ ¡Cuenta creada! Revisa tu correo para verificar tu cuenta.',
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          emailVerified: false,
        },
        linked: isLinked,
        note: '📧 Te enviamos un correo de verificación. Revisa tu bandeja de entrada y spam.',
      });
    } else {
      // Old behavior - return token immediately
      return NextResponse.json({
        success: true,
        requiresEmailVerification: false,
        message: isLinked
          ? '✅ ¡Cuenta creada y estadísticas vinculadas! Tus datos de carrera están listos.'
          : '✅ ¡Cuenta creada exitosamente! Ve a correr para activar tus estadísticas.',
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          profile: updatedUser.profile,
          kartingLink: updatedUser.kartingLink,
          accountStatus: updatedUser.accountStatus,
        },
        token,
        linked: isLinked,
        note: isLinked
          ? '🏁 Estadísticas encontradas y vinculadas automáticamente'
          : '🚧 Verificación de correo deshabilitada',
      });
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor durante el registro' },
      { status: 500 }
    );
  }
}