import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export async function GET(request: NextRequest) {
  try {
    console.log('🏎️ GET /api/best-karts - START');
    console.log('🔧 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      MONGODB_URI_LENGTH: process.env.MONGODB_URI?.length || 0
    });
    
    console.log('📦 Importing modules...');
    console.log('🔌 About to import connectDB...');
    const connectModule = await import('@/lib/mongodb');
    console.log('✅ connectDB imported successfully');
    
    console.log('📊 About to import DriverRaceData...');
    const modelModule = await import('@/models/DriverRaceData');
    console.log('✅ DriverRaceData imported successfully');
    
    console.log('🔗 Attempting to connect to MongoDB...');
    await connectModule.default();
    console.log('✅ MongoDB connection successful');
    
    // Obtener los mejores karts de la semana (últimos 7 días)
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log('🔍 About to query MongoDB for kart data...');
    console.log('📅 Date range:', { lastWeek: lastWeek.toISOString(), today: today.toISOString() });
    
    // Buscar drivers con sesiones de la última semana
    const driversWithRecentSessions = await modelModule.default.find({
      'sessions.sessionDate': { $gte: lastWeek }
    }).select('driverName sessions');
    
    console.log(`📊 MongoDB query successful! Found ${driversWithRecentSessions.length} drivers with recent sessions`);
    
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
    console.error('❌ CRITICAL ERROR in /api/best-karts:');
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching best karts from database',
        details: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}