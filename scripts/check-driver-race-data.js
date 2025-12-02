const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function checkDriverRaceData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    // Extract DB name from URI
    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    console.log(`📁 Using database: ${dbName}\n`);

    const db = client.db(dbName);

    // Verificar colección driver_race_data
    console.log('=== VERIFICANDO COLECCIÓN driver_race_data ===\n');

    const totalDrivers = await db.collection('driver_race_data').countDocuments();
    console.log(`📊 Total de registros en driver_race_data: ${totalDrivers}\n`);

    if (totalDrivers === 0) {
      console.log('⚠️  NO HAY DATOS EN driver_race_data\n');
      return;
    }

    // Mostrar últimos 10 registros por fecha de actualización
    console.log('=== ÚLTIMOS 10 REGISTROS (por fecha de actualización) ===\n');
    const latest = await db.collection('driver_race_data')
      .find({})
      .sort({ lastUpdate: -1 })
      .limit(10)
      .toArray();

    latest.forEach((record, i) => {
      console.log(`${i + 1}. ${record.driverName}`);
      console.log(`   Sesión: ${record.sessionName}`);
      console.log(`   Última actualización: ${new Date(record.lastUpdate).toLocaleString('es-CL')}`);
      console.log(`   Total vueltas guardadas: ${record.laps?.length || 0}`);
      console.log(`   Mejor tiempo: ${record.bestTime}ms`);
      console.log(`   Kart: #${record.kartNumber}`);
      console.log('');
    });

    // Buscar Ignacio en driver_race_data
    console.log('\n=== BUSCANDO A IGNACIO ===\n');
    const ignacio = await db.collection('driver_race_data').findOne({
      driverName: /ignacio/i
    });

    if (ignacio) {
      console.log('✅ IGNACIO ENCONTRADO:');
      console.log(`   ID: ${ignacio._id}`);
      console.log(`   Nombre: ${ignacio.driverName}`);
      console.log(`   Sesión: ${ignacio.sessionName}`);
      console.log(`   Última actualización: ${new Date(ignacio.lastUpdate).toLocaleString('es-CL')}`);
      console.log(`   Total vueltas: ${ignacio.laps?.length || 0}`);
      console.log(`   Mejor tiempo: ${ignacio.bestTime}ms`);
      console.log(`   Kart: #${ignacio.kartNumber}`);

      if (ignacio.laps && ignacio.laps.length > 0) {
        console.log(`\n   🏁 Últimas 10 vueltas de esta sesión:`);
        ignacio.laps.slice(-10).forEach((lap, idx) => {
          console.log(`      ${idx + 1}. Vuelta #${lap.lapNumber}: ${lap.time}ms - Kart #${lap.kartNumber}`);
        });
      }
    } else {
      console.log('❌ Ignacio NO encontrado en DriverRaceData');
    }

    // Buscar Paloma
    console.log('\n\n=== BUSCANDO A PALOMA ===\n');
    const paloma = await db.collection('driver_race_data').findOne({
      driverName: /paloma/i
    });

    if (paloma) {
      console.log('✅ PALOMA ENCONTRADA:');
      console.log(`   ID: ${paloma._id}`);
      console.log(`   Nombre: ${paloma.driverName}`);
      console.log(`   Sesión: ${paloma.sessionName}`);
      console.log(`   Última actualización: ${new Date(paloma.lastUpdate).toLocaleString('es-CL')}`);
      console.log(`   Total vueltas: ${paloma.laps?.length || 0}`);
      console.log(`   Mejor tiempo: ${paloma.bestTime}ms`);
      console.log(`   Kart: #${paloma.kartNumber}`);

      if (paloma.laps && paloma.laps.length > 0) {
        console.log(`\n   🏁 Últimas 10 vueltas de esta sesión:`);
        paloma.laps.slice(-10).forEach((lap, idx) => {
          console.log(`      ${idx + 1}. Vuelta #${lap.lapNumber}: ${lap.time}ms - Kart #${lap.kartNumber}`);
        });
      }
    } else {
      console.log('❌ Paloma NO encontrada en driver_race_data');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Conexión cerrada');
  }
}

checkDriverRaceData();
