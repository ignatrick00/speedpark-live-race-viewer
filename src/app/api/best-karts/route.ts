import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export async function GET(request: NextRequest) {
  try {
    console.log('🏎️ GET /api/best-karts - Fetching best karts from MongoDB');
    
    await connectDB();
    
    // Obtener los mejores karts de la semana (últimos 7 días)
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Buscar drivers con sesiones de la última semana
    const driversWithRecentSessions = await DriverRaceData.find({
      'sessions.sessionDate': { $gte: lastWeek }
    }).select('driverName sessions');
    
    console.log(`📊 Found ${driversWithRecentSessions.length} drivers with recent sessions`);
    
    // Map para almacenar el mejor tiempo por kart
    const kartBestTimes = new Map<number, {
      kart: number;
      time: number;
      driver: string;
      sessionDate: Date;
      sessionName: string;
    }>();
    
    driversWithRecentSessions.forEach(driver => {
      // Filtrar sesiones de la última semana
      const recentSessions = driver.sessions.filter((session: any) => 
        new Date(session.sessionDate) >= lastWeek && session.kartNumber
      );
      
      recentSessions.forEach((session: any) => {
        const kartNumber = session.kartNumber;
        const bestTime = session.bestTime;
        
        if (kartNumber && bestTime && bestTime > 0) {
          // Si no tenemos registro del kart o este tiempo es mejor
          if (!kartBestTimes.has(kartNumber) || bestTime < kartBestTimes.get(kartNumber)!.time) {
            kartBestTimes.set(kartNumber, {
              kart: kartNumber,
              time: bestTime,
              driver: driver.driverName,
              sessionDate: new Date(session.sessionDate),
              sessionName: session.sessionName
            });
          }
        }
      });
    });
    
    // Convertir Map a Array y ordenar por mejor tiempo
    const kartRanking = Array.from(kartBestTimes.values()).map(kartData => {
      // Formatear tiempo de milisegundos a mm:ss.sss
      const minutes = Math.floor(kartData.time / 60000);
      const seconds = Math.floor((kartData.time % 60000) / 1000);
      const milliseconds = kartData.time % 1000;
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
      
      return {
        kart: kartData.kart,
        time: formattedTime,
        driver: kartData.driver,
        rawTime: kartData.time // Para ordenamiento
      };
    });
    
    // Ordenar por mejor tiempo (menor tiempo = mejor)
    kartRanking.sort((a, b) => a.rawTime - b.rawTime);
    
    // Remover rawTime del resultado final
    const finalRanking = kartRanking.map(({ rawTime, ...kart }) => kart);
    
    // Limitar a top 10
    const top10Karts = finalRanking.slice(0, 10);
    
    console.log(`🏁 Returning top ${top10Karts.length} best karts`);
    
    return NextResponse.json({
      success: true,
      bestKarts: top10Karts,
      timestamp: new Date().toISOString(),
      totalKarts: kartBestTimes.size
    });
    
  } catch (error) {
    console.error('❌ Error fetching best karts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching best karts from database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}