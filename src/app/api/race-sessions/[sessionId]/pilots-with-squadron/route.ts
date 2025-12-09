import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';
import Squadron from '@/models/Squadron';

// GET - Obtener pilotos de una carrera que están vinculados a escuderías
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    await connectDB();

    // Buscar la sesión de carrera
    const raceSession = await RaceSessionV0.findOne({ sessionId: params.sessionId });
    if (!raceSession) {
      return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 });
    }

    // Obtener todos los pilotos de la carrera
    const drivers = raceSession.drivers || [];

    const pilotsWithSquadron = [];

    // Para cada piloto, verificar si está vinculado a un WebUser y a una escudería
    for (const driver of drivers) {
      // Buscar el WebUser vinculado
      const webUser = await WebUser.findOne({
        'kartingLink.status': 'linked',
        'kartingLink.driverName': { $regex: new RegExp(`^${driver.driverName}$`, 'i') }
      }).select('_id');

      if (!webUser) continue; // Skip si no está vinculado

      // Buscar la escudería del piloto
      const squadron = await Squadron.findOne({
        $or: [
          { captain: webUser._id },
          { members: webUser._id }
        ],
        isActive: true
      }).select('name tag');

      if (!squadron) continue; // Skip si no está en una escudería

      pilotsWithSquadron.push({
        driverName: driver.driverName,
        position: driver.position,
        bestLap: driver.bestLap,
        totalTime: driver.totalTime,
        webUserId: webUser._id.toString(),
        squadronName: squadron.name,
        squadronTag: squadron.tag || squadron.name.substring(0, 3).toUpperCase()
      });
    }

    // Ordenar por posición
    pilotsWithSquadron.sort((a, b) => a.position - b.position);

    console.log(`👥 [PILOTS-WITH-SQUADRON] Carrera: ${raceSession.sessionName} - Encontrados ${pilotsWithSquadron.length} pilotos con escudería`);

    return NextResponse.json({
      success: true,
      pilots: pilotsWithSquadron
    });

  } catch (error: any) {
    console.error('Error fetching pilots with squadron:', error);
    return NextResponse.json(
      { error: 'Error al obtener pilotos', details: error.message },
      { status: 500 }
    );
  }
}
