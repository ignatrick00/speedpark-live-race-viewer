const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function checkSessionsData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('karteando');

    // Verificar DriverRaceData
    const totalDrivers = await db.collection('driverracedatas').countDocuments();
    console.log(`📊 Total drivers: ${totalDrivers}\n`);

    if (totalDrivers === 0) {
      console.log('⚠️  Aún no hay drivers. Los datos se guardan SOLO cuando detecta una vuelta nueva.\n');
      return;
    }

    // Buscar drivers específicos
    const drivers = ['Franco', 'Francisco', 'Vanessa', 'Rodrigo', 'Miguel', 'Elias'];

    for (const driverName of drivers) {
      console.log(`\n=== BUSCANDO: ${driverName} ===`);

      const driver = await db.collection('driverracedatas').findOne({
        driverName: new RegExp(`^${driverName}$`, 'i')
      });

      if (driver) {
        console.log(`✅ Encontrado: ${driver.driverName}`);
        console.log(`   Total sesiones: ${driver.sessions?.length || 0}`);
        console.log(`   Total vueltas: ${driver.stats?.totalLaps || 0}`);
        console.log(`   Mejor tiempo: ${driver.stats?.bestTime || 'N/A'}ms`);

        if (driver.sessions && driver.sessions.length > 0) {
          const lastSession = driver.sessions[driver.sessions.length - 1];
          console.log(`\n   📅 Última sesión: ${lastSession.sessionName}`);
          console.log(`   Fecha: ${new Date(lastSession.sessionDate).toLocaleString('es-CL')}`);
          console.log(`   Vueltas en sesión: ${lastSession.laps?.length || 0}`);

          if (lastSession.laps && lastSession.laps.length > 0) {
            console.log(`\n   🏁 Vueltas:`);
            lastSession.laps.forEach(lap => {
              console.log(`      Vuelta ${lap.lapNumber}: ${lap.lapTime}ms`);
            });
          }
        }
      } else {
        console.log(`❌ NO encontrado`);
      }
    }

    // Mostrar TODOS los drivers que existen
    console.log('\n\n=== TODOS LOS DRIVERS EN LA BD ===\n');
    const allDrivers = await db.collection('driverracedatas')
      .find({})
      .project({ driverName: 1, 'stats.totalLaps': 1, 'sessions': 1 })
      .toArray();

    allDrivers.forEach(driver => {
      console.log(`- ${driver.driverName}: ${driver.stats?.totalLaps || 0} vueltas, ${driver.sessions?.length || 0} sesiones`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Conexión cerrada');
  }
}

checkSessionsData();
