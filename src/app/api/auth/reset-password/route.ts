import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { token, password } = await request.json();

    // Validation
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y nueva contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Find user with this reset token
    const user = await WebUser.findOne({
      passwordResetToken: token,
    }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return NextResponse.json(
        { error: 'Token expirado. Solicita un nuevo correo de recuperación.' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for user: ${user.email}`);

    // Generate JWT token for auto-login after password reset
    const authToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      message: '✅ Contraseña actualizada exitosamente',
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        kartingLink: user.kartingLink,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
