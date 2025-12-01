/**
 * Script de Diagnóstico: Verificar Captura de Carreras
 *
 * Este script analiza la base de datos para:
 * 1. Verificar que todas las sesiones se están capturando
 * 2. Verificar que todas las vueltas se están guardando
 * 3. Detectar duplicados o vueltas faltantes
 * 4. Comparar datos entre diferentes colecciones
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read MongoDB URI from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const mongoLine = envContent.split('\n').find(line => line.startsWith('MONGODB_URI='));
const MONGODB_URI = mongoLine?.substring('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Simple schemas for diagnosis
const DriverRaceDataSchema = new mongoose.Schema({
  driverName: String,
  sessions: [{
    sessionId: String,
    sessionName: String,
    sessionDate: Date,
    totalLaps: Number,
    laps: [{
      lapNumber: Number,
      time: Number,
      position: Number,
      timestamp: Date
    }]
  }]
}, { collection: 'driver_race_data' });

const RaceSessionSchema = new mongoose.Schema({
  sessionId: String,
  sessionName: String,
  timestamp: Date,
  drivers: [{
    name: String,
    lapCount: Number
  }]
}, { collection: 'racesessions' });

const LapRecordSchema = new mongoose.Schema({
  sessionId: String,
  sessionName: String,
  driverName: String,
  lapNumber: Number,
  timestamp: Date
}, { collection: 'lap_records' });

const DriverRaceData = mongoose.model('DriverRaceData', DriverRaceDataSchema);
const RaceSession = mongoose.model('RaceSession', RaceSessionSchema);
const LapRecord = mongoose.model('LapRecord', LapRecordSchema);

async function runDiagnostics() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ============================================
    // 1. ANÁLISIS DE COLECCIONES
    // ============================================
    console.log('📊 ========== ANÁLISIS DE COLECCIONES ==========\n');

    const driverRaceDataCount = await DriverRaceData.countDocuments();
    const raceSessionCount = await RaceSession.countDocuments();
    const lapRecordCount = await LapRecord.countDocuments();

    console.log('Total documentos por colección:');
    console.log(`  - DriverRaceData: ${driverRaceDataCount} pilotos`);
    console.log(`  - RaceSession: ${raceSessionCount} sesiones`);
    console.log(`  - LapRecord: ${lapRecordCount} registros de vueltas\n`);

    // ============================================
    // 2. ANÁLISIS DE SESIONES EN DRIVERRACEDATA
    // ============================================
    console.log('📊 ========== SESIONES EN DRIVERRACEDATA ==========\n');

    const allDrivers = await DriverRaceData.find({}).lean();

    let totalSessions = 0;
    let totalLapsRecorded = 0;
    const sessionSummary = {};

    allDrivers.forEach(driver => {
      totalSessions += driver.sessions?.length || 0;

      (driver.sessions || []).forEach(session => {
        const lapsCount = session.laps?.length || 0;
        totalLapsRecorded += lapsCount;

        if (!sessionSummary[session.sessionId]) {
          sessionSummary[session.sessionId] = {
            sessionName: session.sessionName,
            sessionDate: session.sessionDate,
            drivers: 0,
            totalLaps: 0,
            lapsPerDriver: {}
          };
        }

        sessionSummary[session.sessionId].drivers++;
        sessionSummary[session.sessionId].totalLaps += lapsCount;
        sessionSummary[session.sessionId].lapsPerDriver[driver.driverName] = lapsCount;
      });
    });

    console.log(`Total sesiones únicas: ${Object.keys(sessionSummary).length}`);
    console.log(`Total vueltas guardadas: ${totalLapsRecorded}\n`);

    // ============================================
    // 3. SESIONES RECIENTES (ÚLTIMAS 5)
    // ============================================
    console.log('📊 ========== ÚLTIMAS 5 SESIONES ==========\n');

    const recentSessions = Object.entries(sessionSummary)
      .sort((a, b) => new Date(b[1].sessionDate) - new Date(a[1].sessionDate))
      .slice(0, 5);

    recentSessions.forEach(([sessionId, data], index) => {
      console.log(`${index + 1}. ${data.sessionName}`);
      console.log(`   ID: ${sessionId}`);
      console.log(`   Fecha: ${new Date(data.sessionDate).toLocaleString('es-CL')}`);
      console.log(`   Pilotos: ${data.drivers}`);
      console.log(`   Total vueltas: ${data.totalLaps}`);
      console.log(`   Promedio vueltas/piloto: ${(data.totalLaps / data.drivers).toFixed(1)}`);

      // Mostrar detalle por piloto
      console.log('   Vueltas por piloto:');
      Object.entries(data.lapsPerDriver)
        .sort((a, b) => b[1] - a[1])
        .forEach(([driver, laps]) => {
          console.log(`     - ${driver}: ${laps} vueltas`);
        });
      console.log('');
    });

    // ============================================
    // 4. DETECCIÓN DE PROBLEMAS
    // ============================================
    console.log('🔍 ========== DETECCIÓN DE PROBLEMAS ==========\n');

    let problemsFound = 0;

    // Verificar sesiones sin vueltas
    const sessionsWithoutLaps = Object.entries(sessionSummary)
      .filter(([_, data]) => data.totalLaps === 0);

    if (sessionsWithoutLaps.length > 0) {
      console.log(`⚠️ PROBLEMA: ${sessionsWithoutLaps.length} sesiones SIN vueltas guardadas:`);
      sessionsWithoutLaps.forEach(([sessionId, data]) => {
        console.log(`   - ${data.sessionName} (${data.drivers} pilotos)`);
      });
      console.log('');
      problemsFound++;
    }

    // Verificar pilotos sin sesiones
    const driversWithoutSessions = allDrivers.filter(d => !d.sessions || d.sessions.length === 0);
    if (driversWithoutSessions.length > 0) {
      console.log(`⚠️ PROBLEMA: ${driversWithoutSessions.length} pilotos SIN sesiones:`);
      driversWithoutSessions.forEach(driver => {
        console.log(`   - ${driver.driverName}`);
      });
      console.log('');
      problemsFound++;
    }

    // Verificar vueltas faltantes (gaps en números de vuelta)
    console.log('🔍 Verificando gaps en números de vuelta...');
    let gapsFound = 0;

    Object.entries(sessionSummary).forEach(([sessionId, data]) => {
      Object.entries(data.lapsPerDriver).forEach(([driverName, lapsCount]) => {
        // Find the driver and session
        const driver = allDrivers.find(d => d.driverName === driverName);
        const session = driver?.sessions?.find(s => s.sessionId === sessionId);

        if (session && session.laps) {
          const lapNumbers = session.laps.map(l => l.lapNumber).sort((a, b) => a - b);

          // Check for gaps
          for (let i = 1; i < lapNumbers.length; i++) {
            if (lapNumbers[i] - lapNumbers[i-1] > 1) {
              console.log(`⚠️ GAP encontrado: ${driverName} - ${data.sessionName}`);
              console.log(`   Vueltas: ${lapNumbers[i-1]} → ${lapNumbers[i]} (falta vuelta ${lapNumbers[i-1] + 1})`);
              gapsFound++;
            }
          }

          // Check for duplicates
          const duplicates = lapNumbers.filter((num, idx) => lapNumbers.indexOf(num) !== idx);
          if (duplicates.length > 0) {
            console.log(`⚠️ DUPLICADOS encontrados: ${driverName} - ${data.sessionName}`);
            console.log(`   Vueltas duplicadas: ${[...new Set(duplicates)].join(', ')}`);
            gapsFound++;
          }
        }
      });
    });

    if (gapsFound === 0) {
      console.log('✅ No se encontraron gaps ni duplicados en las vueltas');
    }
    console.log('');

    // ============================================
    // 5. RESUMEN FINAL
    // ============================================
    console.log('📊 ========== RESUMEN FINAL ==========\n');

    if (problemsFound === 0) {
      console.log('✅ ¡SISTEMA FUNCIONANDO CORRECTAMENTE!');
      console.log('   - Todas las sesiones tienen vueltas');
      console.log('   - Todos los pilotos tienen sesiones');
      console.log('   - No hay gaps ni duplicados detectados');
    } else {
      console.log(`⚠️ Se encontraron ${problemsFound} tipos de problemas`);
      console.log('   Ver detalles arriba');
    }

    console.log('\nEstadísticas generales:');
    console.log(`  - ${driverRaceDataCount} pilotos registrados`);
    console.log(`  - ${Object.keys(sessionSummary).length} sesiones únicas`);
    console.log(`  - ${totalLapsRecorded} vueltas totales guardadas`);
    console.log(`  - ${(totalLapsRecorded / Object.keys(sessionSummary).length).toFixed(1)} vueltas promedio por sesión`);

    // ============================================
    // 6. COMPARACIÓN CON OTRAS COLECCIONES
    // ============================================
    console.log('\n📊 ========== COMPARACIÓN ENTRE COLECCIONES ==========\n');

    // Get unique sessions from RaceSession
    const raceSessions = await RaceSession.find({}).lean();
    const raceSessionIds = new Set(raceSessions.map(s => s.sessionId));
    const driverRaceDataSessionIds = new Set(Object.keys(sessionSummary));

    console.log(`Sesiones en RaceSession: ${raceSessionIds.size}`);
    console.log(`Sesiones en DriverRaceData: ${driverRaceDataSessionIds.size}`);

    // Find sessions in RaceSession but not in DriverRaceData
    const missingSessions = [...raceSessionIds].filter(id => !driverRaceDataSessionIds.has(id));
    if (missingSessions.length > 0) {
      console.log(`\n⚠️ ${missingSessions.length} sesiones en RaceSession pero NO en DriverRaceData:`);
      missingSessions.slice(0, 5).forEach(id => {
        const session = raceSessions.find(s => s.sessionId === id);
        console.log(`   - ${session.sessionName} (${new Date(session.timestamp).toLocaleString('es-CL')})`);
      });
      if (missingSessions.length > 5) {
        console.log(`   ... y ${missingSessions.length - 5} más`);
      }
    } else {
      console.log('\n✅ Todas las sesiones de RaceSession están en DriverRaceData');
    }

  } catch (error) {
    console.error('❌ Error running diagnostics:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run diagnostics
console.log('🚀 Iniciando diagnóstico del sistema de captura de carreras...\n');
runDiagnostics();
