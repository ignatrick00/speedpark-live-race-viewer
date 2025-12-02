const { MongoClient } = require('mongodb');
const fs = require('fs');

// Leer la URI de MongoDB desde .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function verifyLaps() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('karteando');

    // Tiempos específicos que buscamos
    const ignacioTimes = [39.501, 40.170, 42.026];
    const palomaTimes = [45.862, 47.220, 49.484];

    console.log('=== VERIFICANDO VUELTAS DE IGNACIO (Kart #19) ===\n');

    for (const time of ignacioTimes) {
      const lap = await db.collection('laps').findOne({
        kartNumber: 19,
        lapTime: time
      });

      if (lap) {
        console.log(`✅ ENCONTRADO: ${time}s`);
        console.log(`   Vuelta #${lap.lapNumber}`);
        console.log(`   Sesión: ${lap.sessionId}`);
        console.log(`   Driver: ${lap.driverName || 'N/A'}`);
        console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}`);
        console.log(`   ID: ${lap._id}\n`);
      } else {
        console.log(`❌ NO ENCONTRADO: ${time}s\n`);
      }
    }

    console.log('\n=== VERIFICANDO VUELTAS DE PALOMA (Kart #14) ===\n');

    for (const time of palomaTimes) {
      const lap = await db.collection('laps').findOne({
        kartNumber: 14,
        lapTime: time
      });

      if (lap) {
        console.log(`✅ ENCONTRADO: ${time}s`);
        console.log(`   Vuelta #${lap.lapNumber}`);
        console.log(`   Sesión: ${lap.sessionId}`);
        console.log(`   Driver: ${lap.driverName || 'N/A'}`);
        console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}`);
        console.log(`   ID: ${lap._id}\n`);
      } else {
        console.log(`❌ NO ENCONTRADO: ${time}s\n`);
      }
    }

    // Mostrar TODAS las vueltas del kart #19
    console.log('\n=== TODAS LAS VUELTAS DEL KART #19 (ÚLTIMAS 10) ===\n');
    const allIgnacioLaps = await db.collection('laps')
      .find({ kartNumber: 19 })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    if (allIgnacioLaps.length > 0) {
      console.log(`Encontradas ${allIgnacioLaps.length} vueltas:\n`);
      allIgnacioLaps.forEach((lap, idx) => {
        console.log(`${idx + 1}. Vuelta #${lap.lapNumber} - ${lap.lapTime}s`);
        console.log(`   Sesión: ${lap.sessionId}`);
        console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}\n`);
      });
    } else {
      console.log('❌ No hay vueltas registradas para kart #19\n');
    }

    // Mostrar TODAS las vueltas del kart #14
    console.log('\n=== TODAS LAS VUELTAS DEL KART #14 (ÚLTIMAS 10) ===\n');
    const allPalomaLaps = await db.collection('laps')
      .find({ kartNumber: 14 })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    if (allPalomaLaps.length > 0) {
      console.log(`Encontradas ${allPalomaLaps.length} vueltas:\n`);
      allPalomaLaps.forEach((lap, idx) => {
        console.log(`${idx + 1}. Vuelta #${lap.lapNumber} - ${lap.lapTime}s`);
        console.log(`   Sesión: ${lap.sessionId}`);
        console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}\n`);
      });
    } else {
      console.log('❌ No hay vueltas registradas para kart #14\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('✅ Conexión cerrada');
  }
}

verifyLaps();
