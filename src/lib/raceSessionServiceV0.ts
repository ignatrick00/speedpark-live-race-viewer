import connectDB from './mongodb';
import RaceSessionV0, { IDriverInRace, ILapV0 } from '@/models/RaceSessionV0';

/**
 * SERVICIO V0 - Centrado en CARRERAS (no pilotos)
 * Procesa datos del WebSocket y guarda en estructura race_sessions_v0
 */

// Tipos para datos SMS
interface SMSDriverData {
  N: string;  // Nombre del piloto
  P: number;  // Posición
  K: number;  // Número de kart
  L: number;  // Número de vuelta actual
  B: number;  // Mejor tiempo (ms)
  T: number;  // Último tiempo (ms)
  A: number;  // Tiempo promedio (ms)
  G: string;  // Gap al líder
}

interface SMSData {
  N: string;  // Nombre de la sesión
  D: SMSDriverData[];  // Array de pilotos
}

export class RaceSessionServiceV0 {
  // Mapa para guardar el último estado de cada piloto (detectar cambios)
  private static lastDriverStates: Map<string, Map<string, SMSDriverData>> = new Map();

  /**
   * Función principal: Procesar datos de carrera desde WebSocket
   * Con retry logic para manejar conflictos de versión
   */
  static async processRaceData(smsData: SMSData, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 3;
    try {
      // Pequeño delay aleatorio para reducir colisiones en requests concurrentes
      if (retryCount === 0) {
        const randomDelay = Math.random() * 50; // 0-50ms
        await new Promise(resolve => setTimeout(resolve, randomDelay));
      }

      console.log(`🏁 [V0-SERVICE] Processing race: ${smsData.N}, Drivers: ${smsData.D.length}`);

      await connectDB();

      // 1. Generar sessionId único (nombre + fecha) - usando timezone de Chile
      const now = new Date();
      // Convertir a timezone de Chile (America/Santiago)
      const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
      const sessionDate = chileTime;
      const sessionId = this.generateSessionId(smsData.N, sessionDate);

      console.log(`📝 [V0-SERVICE] SessionId: ${sessionId}, Chile time: ${sessionDate.toString()}`);

      // 2. Determinar tipo de sesión
      const sessionType = this.determineSessionType(smsData.N);

      // 3. Buscar o crear documento de carrera
      let raceSession = await RaceSessionV0.findOne({ sessionId });

      if (!raceSession) {
        console.log(`🆕 [V0-SERVICE] Creating NEW race session: ${sessionId}`);
        raceSession = new RaceSessionV0({
          sessionId,
          sessionName: smsData.N,
          sessionDate,
          sessionType,
          drivers: [],
          totalDrivers: 0,
          totalLaps: 0,
          processed: false
        });
      }

      // 4. Obtener estado previo de pilotos en esta sesión
      if (!this.lastDriverStates.has(sessionId)) {
        this.lastDriverStates.set(sessionId, new Map());
      }
      const sessionStates = this.lastDriverStates.get(sessionId)!;

      // 5. Procesar cada piloto
      for (const driverData of smsData.D) {
        await this.processDriver(raceSession, driverData, sessionStates);
      }

      // 6. Recalcular totales
      raceSession.recalculateTotals();

      // 7. Guardar documento
      await raceSession.save();

      console.log(`✅ [V0-SERVICE] Race saved: ${sessionId}, Total laps: ${raceSession.totalLaps}`);

    } catch (error: any) {
      // Retry en caso de VersionError (concurrencia)
      if (error.name === 'VersionError' && retryCount < MAX_RETRIES) {
        const waitTime = (retryCount + 1) * 100; // 100ms, 200ms, 300ms
        console.log(`⚠️ [V0-SERVICE] Version conflict detected, retrying in ${waitTime}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.processRaceData(smsData, retryCount + 1);
      }

      // Si es un error de duplicado de sessionId, ignorar (ya existe)
      if (error.code === 11000 && error.message.includes('sessionId')) {
        console.log(`⚠️ [V0-SERVICE] Session ${smsData.N} already exists, continuing...`);
        return; // No lanzar error, simplemente continuar
      }

      console.error('❌ [V0-SERVICE] Error processing race data:', error);
      throw error;
    }
  }

  /**
   * Procesar un piloto individual
   */
  private static async processDriver(
    raceSession: any,
    driverData: SMSDriverData,
    sessionStates: Map<string, SMSDriverData>
  ): Promise<void> {
    const driverName = driverData.N;

    // Obtener estado previo de este piloto
    const previousState = sessionStates.get(driverName);

    // Detectar si completó una nueva vuelta
    const isNewLap = this.isNewLap(driverData, previousState);

    if (isNewLap) {
      console.log(`🆕 [V0-LAP] ${driverName} completed lap ${driverData.L}`);

      // Buscar o crear piloto en el documento
      let driver = raceSession.drivers.find((d: IDriverInRace) => d.driverName === driverName);

      if (!driver) {
        // Nuevo piloto - agregarlo
        driver = {
          driverName,
          finalPosition: driverData.P,
          kartNumber: driverData.K,
          totalLaps: 0,
          bestTime: 0,
          lastTime: 0,
          averageTime: 0,
          gapToLeader: driverData.G,
          laps: []
        };
        raceSession.drivers.push(driver);
        console.log(`👤 [V0-DRIVER] Added new driver: ${driverName}`);
      }

      // Agregar la nueva vuelta
      this.addLapToDriver(driver, driverData);

      // Actualizar estadísticas del piloto
      this.updateDriverStats(driver, driverData);
    } else {
      // No es nueva vuelta, solo actualizar posición/stats actuales
      const driver = raceSession.drivers.find((d: IDriverInRace) => d.driverName === driverName);
      if (driver) {
        driver.finalPosition = driverData.P;
        driver.gapToLeader = driverData.G;
      }
    }

    // Guardar estado actual para próxima comparación
    sessionStates.set(driverName, { ...driverData });
  }

  /**
   * Detectar si el piloto completó una nueva vuelta
   * SOLO retorna true si L aumentó
   */
  private static isNewLap(current: SMSDriverData, previous?: SMSDriverData): boolean {
    if (!previous) {
      console.log(`🆕 [LAP-DETECTION] First time seeing ${current.N} - WILL SAVE lap ${current.L}`);
      return true; // Primera vez que vemos este piloto
    }

    // SOLO guardar cuando el número de vuelta aumenta
    const lapIncreased = current.L > (previous.L || 0);

    console.log(`🔍 [LAP-DETECTION] ${current.N}:`, {
      currentLap: current.L,
      previousLap: previous.L,
      lapIncreased,
      currentTime: current.T,
      WILL_SAVE: lapIncreased ? '✅ YES' : '❌ NO',
      reason: lapIncreased ? 'LAP_COUNT_INCREASED' : 'NO_NEW_LAP'
    });

    return lapIncreased;
  }

  /**
   * Agregar vuelta al array de laps del piloto
   */
  private static addLapToDriver(driver: IDriverInRace, driverData: SMSDriverData): void {
    const lapNumber = driverData.L;

    // Verificar que no exista (anti-duplicados)
    const existingLapIndex = driver.laps.findIndex(lap => lap.lapNumber === lapNumber);

    if (existingLapIndex !== -1) {
      console.log(`⚠️ [DUPLICATE LAP] ${driver.driverName} - Lap ${lapNumber} already exists! SKIPPING.`);
      return;
    }

    // Determinar si es personal best
    const isPersonalBest = (driverData.B === driverData.T) && driverData.T > 0;

    // Crear nueva vuelta con timestamp en hora de Chile
    const now = new Date();
    const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));

    const newLap: ILapV0 = {
      lapNumber,
      time: driverData.T,
      position: driverData.P,
      timestamp: chileTime,
      gapToLeader: driverData.G,
      isPersonalBest
    };

    // Agregar y ordenar
    driver.laps.push(newLap);
    driver.laps.sort((a, b) => a.lapNumber - b.lapNumber);

    console.log(`✅ [LAP-ADDED] ${driver.driverName} - Lap ${lapNumber}: ${driverData.T}ms, Total laps: ${driver.laps.length}`);
  }

  /**
   * Actualizar estadísticas del piloto
   */
  private static updateDriverStats(driver: IDriverInRace, driverData: SMSDriverData): void {
    driver.finalPosition = driverData.P;
    driver.kartNumber = driverData.K;
    driver.totalLaps = driver.laps.length;
    driver.bestTime = driverData.B;
    driver.lastTime = driverData.T;
    driver.averageTime = driverData.A;
    driver.gapToLeader = driverData.G;
  }

  /**
   * Generar sessionId único
   */
  private static generateSessionId(sessionName: string, date: Date): string {
    const dateStr = date.toDateString(); // e.g., "Wed Dec 04 2024"
    return `${sessionName}_${dateStr}`;
  }

  /**
   * Determinar tipo de sesión basado en el nombre
   */
  private static determineSessionType(sessionName: string): 'clasificacion' | 'carrera' | 'practica' | 'otro' {
    const nameLower = sessionName.toLowerCase();

    if (nameLower.includes('clasificacion') || nameLower.includes('qualifying')) {
      return 'clasificacion';
    }

    // 🏁 VALIDACIÓN ESTRICTA DE CARRERAS
    // Solo aceptar "Carrera" o "Carrera Premium" - NO otras pistas/categorías
    if (nameLower.includes('carrera') || nameLower.includes('race')) {
      // Excluir carreras de otras pistas/configuraciones/categorías
      const invalidKeywords = [
        'f1', 'k 1', 'k 2', 'k 3', 'k1', 'k2', 'k3',
        'gt', 'mujeres', 'women', 'junior'
      ];
      const hasInvalidKeyword = invalidKeywords.some(keyword => nameLower.includes(keyword));

      if (hasInvalidKeyword) {
        return 'otro'; // No es carrera válida para ranking principal
      }

      return 'carrera'; // ✅ Carrera válida (normal o premium)
    }

    if (nameLower.includes('practica') || nameLower.includes('practice')) {
      return 'practica';
    }

    return 'otro';
  }

  /**
   * Limpiar estados antiguos (llamar periódicamente para liberar memoria)
   */
  static clearOldStates(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

    // Por ahora solo limpiamos todo el mapa
    // En producción, podrías guardar timestamps y limpiar selectivamente
    this.lastDriverStates.clear();
    console.log(`🧹 [V0-SERVICE] Cleared old driver states`);
  }
}
