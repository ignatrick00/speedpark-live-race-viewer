import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import KartRanking from '@/models/KartRanking';

export const dynamic = 'force-dynamic';

// Secret key para proteger endpoint (opcional pero recomendado)
const REFRESH_SECRET = process.env.KART_RANKING_REFRESH_SECRET || 'change-me-in-production';

export async function POST(req: NextRequest) {
  try {
    // Validar secret (comentado para facilitar testing inicial)
    // En producción, descomentar esto
    /*
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${REFRESH_SECRET}`) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 });
    }
    */

    await connectDB();

    // Calcular fecha límite (14 días atrás en timezone Chile)
    const nowChileStr = new Date().toLocaleString('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    const nowChile = new Date(nowChileStr);
    const fourteenDaysAgo = new Date(nowChile);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    console.log(`📊 [KART-RANKING-REFRESH] Calculando desde ${fourteenDaysAgo.toISOString()}`);

    // Aggregation Pipeline con filtro igual al de /ranking
    const kartData = await RaceSessionV0.aggregate([
      { $match: {
        sessionDate: { $gte: fourteenDaysAgo },
        sessionType: { $in: ['carrera', 'clasificacion'] }, // Carreras y clasificaciones HEAT
        sessionName: {
          $not: {
            $regex: /f\s?1|f\s?2|f\s?3|k\s?1|k\s?2|k\s?3|gt|mujeres|women|junior| m(?!\w)/i
          }
        }
      }},
      { $unwind: '$drivers' },
      { $unwind: '$drivers.laps' },
      { $match: { 'drivers.laps.time': { $gt: 0, $lt: 120000 } }},
      { $group: { _id: '$drivers.kartNumber', allTimes: { $push: '$drivers.laps.time' } }},
      { $project: {
        kartNumber: '$_id',
        allTimesSorted: { $sortArray: { input: '$allTimes', sortBy: 1 } },
        totalLaps: { $size: '$allTimes' }
      }},
      { $project: {
        kartNumber: 1,
        totalLaps: 1,
        top10Times: {
          $cond: {
            if: { $gte: ['$totalLaps', 10] },
            then: { $slice: ['$allTimesSorted', 10] },
            else: '$allTimesSorted'
          }
        }
      }},
      { $project: {
        kartNumber: 1,
        totalLaps: 1,
        top10Times: 1,
        avgTop10Time: { $avg: '$top10Times' },
        bestTime: { $first: '$top10Times' }
      }},
      { $sort: { avgTop10Time: 1 } }
    ]);

    if (kartData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay datos suficientes para generar ranking'
      }, { status: 404 });
    }

    const rankings = kartData.map((kart, index) => ({
      position: index + 1,
      kartNumber: kart.kartNumber,
      avgTop10Time: Math.round(kart.avgTop10Time),
      bestTime: kart.bestTime,
      totalLaps: kart.totalLaps,
      top10Times: kart.top10Times
    }));

    // Crear y guardar snapshot
    const snapshot = await KartRanking.create({
      generatedAt: new Date(),
      period: '14days',
      rankings: rankings,
      totalKartsAnalyzed: kartData.length,
      dateRange: { from: fourteenDaysAgo, to: nowChile }
    });

    console.log(`✅ [KART-RANKING-REFRESH] Snapshot creado: ${snapshot._id}`);
    console.log(`🏆 Top 3: Kart ${rankings[0].kartNumber}, Kart ${rankings[1]?.kartNumber}, Kart ${rankings[2]?.kartNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Ranking actualizado exitosamente',
      snapshotId: snapshot._id,
      totalKartsAnalyzed: kartData.length,
      top3: rankings.slice(0, 3)
    });

  } catch (error) {
    console.error('❌ [KART-RANKING-REFRESH] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar ranking',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
