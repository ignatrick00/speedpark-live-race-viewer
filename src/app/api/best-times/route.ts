import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export async function GET(request: NextRequest) {
  try {
    console.log('🏆 GET /api/best-times - Fetching best times from MongoDB');
    
    await connectDB();
    
    // Obtener los mejores tiempos de la semana (últimos 7 días)
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Buscar drivers con sesiones de la última semana
    const driversWithRecentSessions = await DriverRaceData.find({
      'sessions.sessionDate': { $gte: lastWeek }
    }).select('driverName sessions stats');
    
    console.log(`📊 Found ${driversWithRecentSessions.length} drivers with recent sessions`);
    
    // Extraer mejores tiempos de las sesiones recientes
    const bestTimes: Array<{
      pos: number;
      name: string;
      time: string;
      details: string;
    }> = [];
    
    driversWithRecentSessions.forEach(driver => {
      // Filtrar sesiones de la última semana
      const recentSessions = driver.sessions.filter((session: any) => 
        new Date(session.sessionDate) >= lastWeek
      );
      
      if (recentSessions.length > 0) {
        // Encontrar el mejor tiempo de las sesiones recientes
        const bestTime = Math.min(...recentSessions.map((s: any) => s.bestTime).filter((t: number) => t > 0));
        
        if (bestTime && bestTime !== Infinity) {
          // Encontrar la sesión con ese mejor tiempo
          const bestSession = recentSessions.find((s: any) => s.bestTime === bestTime);
          
          // Formatear tiempo de milisegundos a mm:ss.sss
          const minutes = Math.floor(bestTime / 60000);
          const seconds = Math.floor((bestTime % 60000) / 1000);
          const milliseconds = bestTime % 1000;
          const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
          
          // Formatear detalles
          const sessionTime = new Date(bestSession?.sessionDate).toLocaleTimeString('es-CL', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          bestTimes.push({
            pos: 0, // Se asignará después del ordenamiento
            name: driver.driverName,
            time: formattedTime,
            details: `Kart #${bestSession?.kartNumber || 'N/A'} • ${sessionTime}`
          });
        }
      }
    });
    
    // Ordenar por mejor tiempo y asignar posiciones
    bestTimes.sort((a, b) => {
      const timeA = parseFloat(a.time.replace(':', '').replace('.', ''));
      const timeB = parseFloat(b.time.replace(':', '').replace('.', ''));
      return timeA - timeB;
    });
    
    // Asignar posiciones
    bestTimes.forEach((item, index) => {
      item.pos = index + 1;
    });
    
    // Limitar a top 10
    const top10 = bestTimes.slice(0, 10);
    
    console.log(`🏁 Returning top ${top10.length} best times`);
    
    return NextResponse.json({
      success: true,
      bestTimes: top10,
      timestamp: new Date().toISOString(),
      totalDrivers: driversWithRecentSessions.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching best times:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching best times from database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}