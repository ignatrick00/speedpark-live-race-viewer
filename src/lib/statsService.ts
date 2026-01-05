import connectDB from './mongodb';
import UserLinkingService from './userLinkingService';
import { getStatsTracker } from './stats-tracker';

interface DriverData {
  pos: number;
  name: string;
  kart: number;
  lap: number;
  bestTime: number;
  lastTime: number;
  avgTime: number;
  gap: string;
}

export class StatsService {
  
  /**
   * Record a new session ONLY in JSON (for billing/stats)
   * MongoDB saving is now handled by race_sessions_v0 via /api/lap-capture
   */
  static async recordSession(sessionName: string, drivers: string[], smsData?: any) {
    try {
      console.log(`📊 [STATS] Recording session for billing: ${sessionName} with ${drivers.length} drivers`);

      // Record in JSON system ONLY (for billing dashboard)
      const tracker = await getStatsTracker();
      const jsonSession = await tracker.recordSession(sessionName, drivers);
      if (jsonSession) {
        console.log(`✅ [STATS] JSON session recorded for billing: ${jsonSession.id}`);
      }

      // MongoDB is now handled by /api/lap-capture → race_sessions_v0
      // This prevents duplicate writes and version conflicts

      return {
        success: true,
        jsonSession,
        mongoSession: null, // No longer saving to MongoDB from here
        message: 'Session recorded in JSON for billing. MongoDB handled by /api/lap-capture'
      };
      
    } catch (error) {
      console.error('❌ Error recording session:', error);
      
      // Try to record in JSON at least
      try {
        const tracker = await getStatsTracker();
        const jsonSession = await tracker.recordSession(sessionName, drivers);
        console.log('⚠️ Fallback: Session recorded in JSON only');
        
        return {
          success: true,
          jsonSession,
          mongoSession: null,
          message: 'Session recorded in JSON only (MongoDB failed)',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      } catch (fallbackError) {
        console.error('❌ Complete failure recording session:', fallbackError);
        throw error;
      }
    }
  }
  
  /**
   * Process user linking in background
   */
  private static async processUserLinkingAsync(smsData: any, timestamp: Date) {
    try {
      console.log('🔗 Processing user linking in background...');
      await UserLinkingService.processRaceData(smsData, timestamp);
      console.log('✅ Background user linking completed');
    } catch (error) {
      console.error('❌ Background user linking error:', error);
      // Don't throw - this is background processing
    }
  }
  
  /**
   * Get combined stats from both systems
   */
  static async getCombinedStats() {
    try {
      // 1. Get JSON stats (existing system)
      const tracker = await getStatsTracker();
      const jsonStats = await tracker.getStats();
      
      // 2. Get MongoDB stats
      await connectDB();
      
      const mongoStats = await this.getMongoStats();
      
      return {
        json: jsonStats,
        mongo: mongoStats,
        combined: {
          totalRaces: jsonStats.totalRaces,
          totalDrivers: jsonStats.totalDrivers,
          revenueTotal: jsonStats.revenueTotal,
          lastUpdate: jsonStats.lastUpdate,
          // Add MongoDB-specific data
          mongoSessionsCount: mongoStats.totalSessions,
          linkedUsersCount: mongoStats.linkedUsers,
          avgDriversPerRace: mongoStats.avgDriversPerSession,
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting combined stats:', error);
      
      // Fallback to JSON stats only
      try {
        const tracker = await getStatsTracker();
        const jsonStats = await tracker.getStats();
        return {
          json: jsonStats,
          mongo: null,
          combined: jsonStats,
          error: 'MongoDB stats unavailable'
        };
      } catch (fallbackError) {
        throw new Error('Both JSON and MongoDB stats failed');
      }
    }
  }
  
  /**
   * Get MongoDB-specific statistics from RaceSessionV0
   */
  private static async getMongoStats() {
    try {
      await connectDB();
      const RaceSessionV0 = (await import('@/models/RaceSessionV0')).default;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sessions = await RaceSessionV0.find({
        sessionName: { $regex: /clasificacion/i }
      }).lean();

      const totalSessions = sessions.length;

      // Pilotos únicos totales
      const uniqueDriverNames = new Set<string>();
      sessions.forEach((s: any) => {
        s.drivers?.forEach((d: any) => {
          uniqueDriverNames.add(d.driverName);
        });
      });

      // Sesiones hoy
      const todaySessions = sessions.filter((s: any) => {
        const sessionDate = new Date(s.sessionDate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      }).length;

      // Calcular revenue total
      const totalDriverParticipations = sessions.reduce((acc: number, s: any) =>
        acc + (s.drivers?.length || 0), 0
      );
      const totalRevenue = totalDriverParticipations * 17000;

      return {
        totalSessions,
        uniqueDrivers: uniqueDriverNames.size,
        totalRevenue,
        linkedUsers: 0, // No tracking in V0
        todaySessions,
        avgDriversPerSession: totalSessions > 0 ? Math.round(totalDriverParticipations / totalSessions) : 0,
      };
    } catch (error) {
      console.error('❌ Error getting MongoDB stats:', error);
      return {
        totalSessions: 0,
        uniqueDrivers: 0,
        totalRevenue: 0,
        linkedUsers: 0,
        todaySessions: 0,
        avgDriversPerSession: 0,
      };
    }
  }
  
  /**
   * Get recent MongoDB sessions from race_sessions_v0 (NEW)
   */
  static async getRecentSessions(limit = 10) {
    try {
      await connectDB();

      // Importar modelo V0 dinámicamente para evitar problemas de importación circular
      const RaceSessionV0 = (await import('@/models/RaceSessionV0')).default;

      const sessions = await RaceSessionV0.find()
        .sort({ sessionDate: -1 })
        .limit(limit)
        .lean();

      return sessions.map((session: any) => ({
        id: session.sessionId,
        name: session.sessionName,
        driversCount: session.drivers?.length || 0,
        revenue: session.sessionName.toLowerCase().includes('clasificacion')
          ? (session.drivers?.length || 0) * 17000
          : 0,
        timestamp: session.sessionDate,
        processed: session.processed || false,
        // linkedUsersCount removed - no longer tracking linkedUserId in race_sessions_v0
      }));

    } catch (error) {
      console.error('❌ Error getting recent sessions from V0:', error);
      return [];
    }
  }

  /**
   * Get combined stats from race_sessions_v0 with optional date range
   */
  static async getCombinedStatsFromV0(startDate?: Date, endDate?: Date) {
    try {
      await connectDB();
      const RaceSessionV0 = (await import('@/models/RaceSessionV0')).default;

      // Construir query con filtro de fechas
      const query: any = {
        sessionName: { $regex: /clasificacion/i }
      };

      if (startDate || endDate) {
        query.sessionDate = {};
        if (startDate) query.sessionDate.$gte = startDate;
        if (endDate) query.sessionDate.$lte = endDate;
      }

      // Obtener todas las sesiones de clasificación en el rango
      const sessions = await RaceSessionV0.find(query).lean();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calcular estadísticas
      const totalRaces = sessions.length;
      const sessionsToday = sessions.filter((s: any) => {
        const sessionDate = new Date(s.sessionDate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });

      const driversToday = sessionsToday.reduce((acc: number, s: any) =>
        acc + (s.drivers?.length || 0), 0
      );

      const totalDrivers = sessions.reduce((acc: number, s: any) =>
        acc + (s.drivers?.length || 0), 0
      );

      const revenueToday = driversToday * 17000;
      const revenueTotal = totalDrivers * 17000;
      const averageDriversPerRace = totalRaces > 0 ? totalDrivers / totalRaces : 0;

      // Ganancias por hora (hoy)
      const hourlyRevenue = new Array(24).fill(0).map((_, hour) => ({
        hour,
        revenue: 0,
        sessions: 0
      }));

      sessionsToday.forEach((s: any) => {
        const sessionDate = new Date(s.sessionDate);
        const hour = sessionDate.getHours();
        const drivers = s.drivers?.length || 0;
        hourlyRevenue[hour].revenue += drivers * 17000;
        hourlyRevenue[hour].sessions += 1;
      });

      // Top drivers este mes
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const sessionsThisMonth = sessions.filter((s: any) =>
        new Date(s.sessionDate) >= thisMonth
      );

      const driverStats = new Map<string, {count: number, spent: number}>();

      sessionsThisMonth.forEach((s: any) => {
        s.drivers?.forEach((d: any) => {
          const current = driverStats.get(d.driverName) || {count: 0, spent: 0};
          current.count += 1;
          current.spent += 17000;
          driverStats.set(d.driverName, current);
        });
      });

      const topDriversThisMonth = Array.from(driverStats.entries())
        .map(([name, stats]) => ({
          driverName: name,
          classificationsCount: stats.count,
          totalSpent: stats.spent
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      return {
        totalRaces,
        totalDrivers,
        driversToday,
        revenueToday,
        revenueTotal,
        averageDriversPerRace,
        hourlyRevenue: hourlyRevenue.filter(h => h.revenue > 0 || h.sessions > 0),
        topDriversThisMonth,
        lastUpdate: new Date().toLocaleString('es-CL')
      };

    } catch (error) {
      console.error('❌ Error getting combined stats from V0:', error);
      throw error;
    }
  }

  /**
   * Get daily revenue breakdown for a date range
   */
  static async getDailyRevenue(startDate: Date, endDate: Date) {
    try {
      await connectDB();
      const RaceSessionV0 = (await import('@/models/RaceSessionV0')).default;

      const sessions = await RaceSessionV0.find({
        sessionName: { $regex: /clasificacion/i },
        sessionDate: { $gte: startDate, $lte: endDate }
      }).lean();

      // Agrupar por día
      const dailyMap = new Map<string, { revenue: number, sessions: number, drivers: number }>();

      sessions.forEach((s: any) => {
        const date = new Date(s.sessionDate);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

        const current = dailyMap.get(dateKey) || { revenue: 0, sessions: 0, drivers: 0 };
        const driversCount = s.drivers?.length || 0;

        current.revenue += driversCount * 17000;
        current.sessions += 1;
        current.drivers += driversCount;

        dailyMap.set(dateKey, current);
      });

      // Convertir a array y ordenar por fecha
      return Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          ...data
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
      console.error('❌ Error getting daily revenue:', error);
      return [];
    }
  }

  /**
   * Get low usage analysis (horarios con menos uso)
   */
  static async getLowUsageAnalysis(startDate: Date, endDate: Date) {
    try {
      await connectDB();
      const RaceSessionV0 = (await import('@/models/RaceSessionV0')).default;

      const sessions = await RaceSessionV0.find({
        sessionName: { $regex: /clasificacion/i },
        sessionDate: { $gte: startDate, $lte: endDate }
      }).lean();

      // Analizar uso por hora del día (0-23)
      const hourlyUsage = new Array(24).fill(0).map((_, hour) => ({
        hour,
        sessions: 0,
        drivers: 0,
        revenue: 0
      }));

      // Analizar uso por día de la semana (0=Domingo, 6=Sábado)
      const weekdayUsage = new Array(7).fill(0).map((_, day) => ({
        day,
        dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][day],
        sessions: 0,
        drivers: 0,
        revenue: 0
      }));

      sessions.forEach((s: any) => {
        const date = new Date(s.sessionDate);
        const hour = date.getHours();
        const weekday = date.getDay();
        const driversCount = s.drivers?.length || 0;
        const revenue = driversCount * 17000;

        hourlyUsage[hour].sessions += 1;
        hourlyUsage[hour].drivers += driversCount;
        hourlyUsage[hour].revenue += revenue;

        weekdayUsage[weekday].sessions += 1;
        weekdayUsage[weekday].drivers += driversCount;
        weekdayUsage[weekday].revenue += revenue;
      });

      // Encontrar horarios de bajo uso
      const avgSessionsPerHour = hourlyUsage.reduce((acc, h) => acc + h.sessions, 0) / 24;
      const lowUsageHours = hourlyUsage
        .filter(h => h.sessions < avgSessionsPerHour * 0.5) // Menos del 50% del promedio
        .sort((a, b) => a.sessions - b.sessions);

      // Encontrar días de bajo uso
      const avgSessionsPerDay = weekdayUsage.reduce((acc, d) => acc + d.sessions, 0) / 7;
      const lowUsageDays = weekdayUsage
        .filter(d => d.sessions < avgSessionsPerDay * 0.7) // Menos del 70% del promedio
        .sort((a, b) => a.sessions - b.sessions);

      return {
        hourlyUsage,
        weekdayUsage,
        lowUsageHours,
        lowUsageDays,
        avgSessionsPerHour,
        avgSessionsPerDay
      };

    } catch (error) {
      console.error('❌ Error getting low usage analysis:', error);
      return null;
    }
  }

  /**
   * Get usage heatmap (hour x weekday)
   */
  static async getUsageHeatmap(startDate: Date, endDate: Date) {
    try {
      await connectDB();
      const RaceSessionV0 = (await import('@/models/RaceSessionV0')).default;

      const sessions = await RaceSessionV0.find({
        sessionName: { $regex: /clasificacion/i },
        sessionDate: { $gte: startDate, $lte: endDate }
      }).lean();

      console.log(`📊 Heatmap: Found ${sessions.length} sessions between ${startDate.toISOString()} and ${endDate.toISOString()}`);

      // Crear matriz 7 días x 24 horas (0=Domingo, 6=Sábado)
      const heatmap = Array.from({ length: 7 }, () =>
        Array.from({ length: 24 }, () => ({ sessions: 0, drivers: 0, revenue: 0 }))
      );

      sessions.forEach((s: any) => {
        const date = new Date(s.sessionDate);
        const hour = date.getHours();
        const weekday = date.getDay();
        const driversCount = s.drivers?.length || 0;
        const revenue = driversCount * 17000;

        console.log(`  📅 Session: ${s.sessionName} - ${date.toISOString()} - Day: ${weekday} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][weekday]}) - Hour: ${hour}:00`);

        heatmap[weekday][hour].sessions += 1;
        heatmap[weekday][hour].drivers += driversCount;
        heatmap[weekday][hour].revenue += revenue;
      });

      // Contar celdas con datos
      const cellsWithData = heatmap.reduce((count, day) =>
        count + day.filter(cell => cell.sessions > 0).length, 0
      );
      console.log(`📊 Heatmap generated: ${cellsWithData} cells with data`);

      return heatmap;

    } catch (error) {
      console.error('❌ Error getting usage heatmap:', error);
      return null;
    }
  }
}

export default StatsService;