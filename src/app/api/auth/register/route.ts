import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import { RealStatsLinker } from '@/lib/realStatsLinker';

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
    
    // Create user
    const user = await WebUser.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false, // For future implementation
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
      accountStatus: 'active', // Active immediately without email verification
    });
    
    // Try to link with real racing data
    console.log(`🔗 Attempting to link ${firstName} with real race data...`);
    const isLinked = await RealStatsLinker.linkUserWithRealStats(
      user._id.toString(), 
      firstName, 
      lastName
    );
    
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
    // Update user object if linked
    const updatedUser = isLinked 
      ? await WebUser.findById(user._id)
      : user;

    return NextResponse.json({
      success: true,
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
        : '🚧 Verificación de correo se implementará en una futura actualización',
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor durante el registro' },
      { status: 500 }
    );
  }
}