const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Leer .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
const env = {};

envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const MONGODB_URI = env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no encontrado');
  process.exit(1);
}

async function checkData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const RaceSessionV0 = mongoose.model('RaceSessionV0', new mongoose.Schema({}, {
      strict: false,
      collection: 'race_sessions_v0'
    }));

    // Contar sesiones de carrera
    const count = await RaceSessionV0.countDocuments({ sessionType: 'carrera' });
    console.log('📊 Total sesiones tipo "carrera":', count);

    // Verificar si hay drivers
    const withDrivers = await RaceSessionV0.countDocuments({
      sessionType: 'carrera',
      'drivers.0': { $exists: true }
    });
    console.log('👥 Sesiones con array de drivers:', withDrivers);

    // Ver una sesión de ejemplo
    const sample = await RaceSessionV0.findOne({
      sessionType: 'carrera',
      'drivers.0': { $exists: true }
    }).lean();

    if (sample) {
      console.log('\n📋 Ejemplo de sesión:');
      console.log('  - ID:', sample._id);
      console.log('  - Nombre:', sample.sessionName);
      console.log('  - Fecha:', sample.sessionDate);
      console.log('  - Cantidad de drivers:', sample.drivers?.length || 0);

      if (sample.drivers && sample.drivers[0]) {
        console.log('\n  👤 Primer driver:');
        console.log('    - Nombre:', sample.drivers[0].driverName);
        console.log('    - Kart:', sample.drivers[0].kartNumber);
        console.log('    - Mejor tiempo:', sample.drivers[0].bestTime, 'ms');
        console.log('    - Posición:', sample.drivers[0].position);
      }
    } else {
      console.log('\n⚠️  No se encontró ninguna sesión con drivers');
    }

    // Ejecutar el agregado del Top 10
    console.log('\n🏆 Ejecutando agregación Top 10...\n');

    const top10 = await RaceSessionV0.aggregate([
      { $match: { sessionType: 'carrera' } },
      { $unwind: '$drivers' },
      { $match: { 'drivers.bestTime': { $gt: 0 } } },
      { $sort: { 'drivers.bestTime': 1 } },
      {
        $group: {
          _id: '$drivers.driverName',
          bestTime: { $first: '$drivers.bestTime' },
          kartNumber: { $first: '$drivers.kartNumber' },
          sessionName: { $first: '$sessionName' },
          sessionDate: { $first: '$sessionDate' }
        }
      },
      { $sort: { bestTime: 1 } },
      { $limit: 10 }
    ]);

    console.log('✅ Top 10 resultados:', top10.length);

    if (top10.length > 0) {
      console.log('\n🥇 TOP 10 MEJORES TIEMPOS:\n');
      top10.forEach((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        const timeSeconds = (entry.bestTime / 1000).toFixed(3);
        console.log(`${medal} ${entry._id.padEnd(20)} - ${timeSeconds}s - Kart #${entry.kartNumber} - ${entry.sessionName}`);
      });
    } else {
      console.log('\n❌ NO SE ENCONTRARON RESULTADOS EN EL TOP 10');
    }

    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
