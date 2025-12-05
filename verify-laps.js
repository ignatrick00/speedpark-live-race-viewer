/**
 * Script para verificar que las vueltas se están guardando correctamente
 */

const mongoose = require('mongoose');

async function verifyLaps() {
  try {
    // Connection string directa
    const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const RaceSessionV0 = mongoose.connection.collection('race_sessions_v0');

    // Obtener sesiones más recientes (últimas 5)
    const recentSessions = await RaceSessionV0.find({})
      .sort({ sessionDate: -1 })
      .limit(5)
      .toArray();

    console.log(`\n📊 ÚLTIMAS ${recentSessions.length} SESIONES:\n`);

    for (const session of recentSessions) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🏁 ${session.sessionName}`);
      console.log(`📅 ${session.sessionDate.toLocaleString('es-CL')}`);
      console.log(`👥 Drivers: ${session.drivers.length}`);
      console.log(`🔢 Total laps: ${session.totalLaps}`);
      console.log();

      // Analizar cada piloto
      for (const driver of session.drivers) {
        console.log(`  👤 ${driver.driverName.padEnd(20)} | Kart #${driver.kartNumber}`);
        console.log(`     Total Laps Field: ${driver.totalLaps}`);
        console.log(`     Laps Array Length: ${driver.laps ? driver.laps.length : 0}`);
        console.log(`     Best Time: ${driver.bestTime}ms`);
        console.log(`     Position: ${driver.finalPosition}`);

        // Mostrar primeras 5 vueltas
        if (driver.laps && driver.laps.length > 0) {
          console.log(`     First 5 laps:`);
          driver.laps.slice(0, 5).forEach(lap => {
            const pb = lap.isPersonalBest ? ' 🏆 PB' : '';
            console.log(`       Lap ${lap.lapNumber}: ${lap.time}ms, P${lap.position}${pb}`);
          });

          if (driver.laps.length > 5) {
            console.log(`       ... (${driver.laps.length - 5} more laps)`);
          }

          // Verificar consistencia
          if (driver.totalLaps !== driver.laps.length) {
            console.log(`     ⚠️  INCONSISTENCIA: totalLaps (${driver.totalLaps}) !== laps.length (${driver.laps.length})`);
          }
        } else {
          console.log(`     ❌ NO LAPS SAVED!`);
        }
        console.log();
      }
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyLaps();
