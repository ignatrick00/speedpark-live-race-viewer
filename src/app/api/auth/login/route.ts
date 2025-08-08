import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, password } = await request.json();
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    // Find user (include password for validation)
    const user = await WebUser.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos' },
        { status: 401 }
      );
    }
    
    // Check if account is active
    if (user.accountStatus !== 'active') {
      return NextResponse.json(
        { error: 'La cuenta está suspendida o eliminada' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos' },
        { status: 401 }
      );
    }
    
    // Note: We're not checking email verification for now
    // This will be implemented in a future update
    
    // Update last login
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
        kartingLink: user.kartingLink,
        accountStatus: user.accountStatus,
        lastLoginAt: user.lastLoginAt,
      },
      token,
      note: user.kartingLink.status === 'pending_first_race' 
        ? '¡Ve a correr para activar tus estadísticas!' 
        : '¡Bienvenido de vuelta!',
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}