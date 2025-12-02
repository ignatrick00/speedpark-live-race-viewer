const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://ignaciocabrera:8mXiom4fzRWiXvxk@cluster0.vccmg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkRecentLaps() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db('karteando');

    // Buscar las últimas vueltas de Ignacio (kart #19)
    console.log('\n=== BUSCANDO VUELTAS DE IGNACIO (Kart #19) ===');
    const ignacioLaps = await db.collection('laps').find({
      kartNumber: 19
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    if (ignacioLaps.length > 0) {
      console.log(`\n✅ Encontradas ${ignacioLaps.length} vueltas de Ignacio:`);
      ignacioLaps.forEach((lap, idx) => {
        console.log(`\n${idx + 1}. Vuelta #${lap.lapNumber}`);
        console.log(`   Tiempo: ${lap.lapTime}s`);
        console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}`);
        console.log(`   Sesión: ${lap.sessionId || 'N/A'}`);
        console.log(`   Driver: ${lap.driverName || 'N/A'}`);
      });
    } else {
      console.log('❌ No se encontraron vueltas para kart #19');
    }

    // Buscar las últimas vueltas de Paloma (kart #14)
    console.log('\n\n=== BUSCANDO VUELTAS DE PALOMA (Kart #14) ===');
    const palomaLaps = await db.collection('laps').find({
      kartNumber: 14
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    if (palomaLaps.length > 0) {
      console.log(`\n✅ Encontradas ${palomaLaps.length} vueltas de Paloma:`);
      palomaLaps.forEach((lap, idx) => {
        console.log(`\n${idx + 1}. Vuelta #${lap.lapNumber}`);
        console.log(`   Tiempo: ${lap.lapTime}s`);
        console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}`);
        console.log(`   Sesión: ${lap.sessionId || 'N/A'}`);
        console.log(`   Driver: ${lap.driverName || 'N/A'}`);
      });
    } else {
      console.log('❌ No se encontraron vueltas para kart #14');
    }

    // Buscar vueltas con esos tiempos específicos
    console.log('\n\n=== BUSCANDO POR TIEMPOS ESPECÍFICOS ===');
    const specificTimes = [39.501, 40.170, 42.026, 45.862, 47.220, 49.484];

    for (const time of specificTimes) {
      const lap = await db.collection('laps').findOne({
        lapTime: time
      });

      if (lap) {
        console.log(`\n✅ Tiempo ${time}s encontrado:`);
        console.log(`   Kart: #${lap.kartNumber}`);
        console.log(`   Driver: ${lap.driverName || 'N/A'}`);
        console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}`);
      } else {
        console.log(`❌ Tiempo ${time}s NO encontrado`);
      }
    }

    // Mostrar las últimas 10 vueltas en general
    console.log('\n\n=== ÚLTIMAS 10 VUELTAS EN GENERAL ===');
    const recentLaps = await db.collection('laps').find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    recentLaps.forEach((lap, idx) => {
      console.log(`\n${idx + 1}. Kart #${lap.kartNumber} - ${lap.driverName || 'Sin nombre'}`);
      console.log(`   Tiempo: ${lap.lapTime}s`);
      console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Conexión cerrada');
  }
}

checkRecentLaps();
