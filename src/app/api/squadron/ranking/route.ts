import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';

// GET - Obtener ranking de escuadrones
export async function GET() {
  try {
    await connectDB();

    // Obtener todas las escuaderías activas ordenadas por puntos
    const squadrons = await Squadron.find({ isActive: true })
      .sort({ totalPoints: -1 })
      .populate('captain', 'name email')
      .populate('members', 'name email')
      .lean();

    console.log(`🏆 [SQUADRON-RANKING] Found ${squadrons.length} active squadrons`);

    return NextResponse.json({
      success: true,
      squadrons: squadrons.map((squadron, index) => ({
        _id: squadron._id,
        name: squadron.name,
        tag: squadron.tag,
        logo: squadron.logo,
        totalPoints: squadron.totalPoints || 0,
        position: index + 1,
        memberCount: squadron.members?.length || 0,
        captain: squadron.captain ? {
          _id: squadron.captain._id,
          name: squadron.captain.name,
          email: squadron.captain.email
        } : null
      }))
    });

  } catch (error) {
    console.error('Error fetching squadron ranking:', error);
    return NextResponse.json(
      { error: 'Error al obtener ranking de escuadrones' },
      { status: 500 }
    );
  }
}
