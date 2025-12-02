const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function checkAllLaps() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('karteando');

    // Contar total de vueltas
    const totalLaps = await db.collection('laps').countDocuments();
    console.log(`📊 Total de vueltas en la base de datos: ${totalLaps}\n`);

    if (totalLaps === 0) {
      console.log('⚠️  NO HAY VUELTAS REGISTRADAS EN LA BASE DE DATOS\n');
      console.log('Esto significa que el sistema de captura NO está funcionando.\n');
      return;
    }

    // Mostrar las últimas 20 vueltas
    console.log('=== ÚLTIMAS 20 VUELTAS REGISTRADAS ===\n');
    const recentLaps = await db.collection('laps')
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    recentLaps.forEach((lap, idx) => {
      console.log(`${idx + 1}. Kart #${lap.kartNumber} - Vuelta #${lap.lapNumber}`);
      console.log(`   Tiempo: ${lap.lapTime}s`);
      console.log(`   Driver: ${lap.driverName || 'N/A'}`);
      console.log(`   Sesión: ${lap.sessionId}`);
      console.log(`   Fecha: ${new Date(lap.timestamp).toLocaleString('es-CL')}\n`);
    });

    // Listar todos los karts que han registrado vueltas
    console.log('\n=== KARTS QUE HAN REGISTRADO VUELTAS ===\n');
    const kartNumbers = await db.collection('laps').distinct('kartNumber');
    console.log(`Karts con vueltas: ${kartNumbers.sort((a, b) => a - b).join(', ')}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('✅ Conexión cerrada');
  }
}

checkAllLaps();
