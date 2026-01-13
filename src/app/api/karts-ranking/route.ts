import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KartRanking from '@/models/KartRanking';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    // Obtener el snapshot más reciente
    const latestSnapshot = await KartRanking.findOne({ period: '14days' })
      .sort({ generatedAt: -1 })
      .lean();

    if (!latestSnapshot) {
      return NextResponse.json({
        success: false,
        error: 'No hay datos de ranking disponibles. Ejecuta el script de cálculo primero.',
      }, { status: 404 });
    }

    // Calcular antigüedad del snapshot
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - new Date(latestSnapshot.generatedAt).getTime()) / 60000);

    console.log(`📊 [KARTS-RANKING] Retornando snapshot de hace ${ageMinutes} minutos`);

    return NextResponse.json({
      success: true,
      ranking: latestSnapshot.rankings,
      metadata: {
        generatedAt: latestSnapshot.generatedAt,
        ageMinutes,
        period: latestSnapshot.period,
        totalKartsAnalyzed: latestSnapshot.totalKartsAnalyzed,
        dateRange: latestSnapshot.dateRange
      }
    });

  } catch (error) {
    console.error('❌ [KARTS-RANKING] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener ranking de karts',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
