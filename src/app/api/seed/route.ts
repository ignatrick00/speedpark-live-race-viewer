import { NextResponse } from 'next/server';
import { seedTestUsers } from '@/lib/seedTestUsers';

export async function GET() {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Seed solo disponible en desarrollo' },
        { status: 403 }
      );
    }

    await seedTestUsers();

    return NextResponse.json({
      success: true,
      message: 'Usuarios de prueba verificados/creados',
      credentials: {
        email: 'ignacio@karteando.cl',
        password: 'test1234',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al crear usuarios', details: error.message },
      { status: 500 }
    );
  }
}
