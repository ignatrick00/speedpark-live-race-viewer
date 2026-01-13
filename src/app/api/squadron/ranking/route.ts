import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import SquadronPointsHistory from '@/models/SquadronPointsHistory';

// GET - Obtener ranking de escuadrones calculado desde historial
export async function GET() {
  try {
    await connectDB();

    // Obtener todas las escuaderías activas
    const squadrons = await Squadron.find({ isActive: true })
      .populate('captain', 'name email profile.alias profile.photoUrl')
      .populate('members', 'name email profile.alias profile.photoUrl kartingLink')
      .lean();

    console.log(`🏆 [SQUADRON-RANKING] Found ${squadrons.length} active squadrons`);

    // Calcular puntos totales desde el historial para cada escuadría
    const squadronsWithPoints = await Promise.all(
      squadrons.map(async (squadron) => {
        // Sumar todos los cambios de puntos del historial
        const pointsHistory = await SquadronPointsHistory.aggregate([
          { $match: { squadronId: squadron._id } },
          { $group: { _id: null, totalPoints: { $sum: '$pointsChange' } } }
        ]);

        const totalPoints = pointsHistory.length > 0 ? pointsHistory[0].totalPoints : 0;

        return {
          _id: squadron._id,
          name: squadron.name,
          tag: squadron.tag,
          logo: squadron.logo,
          totalPoints: totalPoints,
          memberCount: squadron.members?.length || 0,
          captain: squadron.captain ? {
            _id: squadron.captain._id,
            name: squadron.captain.name,
            email: squadron.captain.email,
            alias: squadron.captain.profile?.alias || null,
            photoUrl: squadron.captain.profile?.photoUrl || null
          } : null,
          members: squadron.members ? squadron.members.map((member: any) => ({
            _id: member._id,
            name: member.name,
            email: member.email,
            alias: member.profile?.alias || null,
            photoUrl: member.profile?.photoUrl || null,
            kartingLink: member.kartingLink || null
          })) : []
        };
      })
    );

    // Ordenar por puntos de mayor a menor
    squadronsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);

    // Asignar posiciones
    const ranking = squadronsWithPoints.map((squadron, index) => ({
      ...squadron,
      position: index + 1
    }));

    console.log(`🏆 [SQUADRON-RANKING] Ranking calculated from history`);

    return NextResponse.json({
      success: true,
      squadrons: ranking
    });

  } catch (error) {
    console.error('Error fetching squadron ranking:', error);
    return NextResponse.json(
      { error: 'Error al obtener ranking de escuadrones' },
      { status: 500 }
    );
  }
}
