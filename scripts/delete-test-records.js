const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function deleteTestRecords() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('karteando');

    // Eliminar Ignacio del test
    console.log('🗑️  Eliminando registro de Ignacio (39.501s)...');
    const ignacioResult = await db.collection('bestdrivertimes').deleteOne({
      driverName: 'Ignacio',
      bestTime: 39501
    });
    console.log(`   Eliminados: ${ignacioResult.deletedCount} registros\n`);

    // Eliminar Paloma del test
    console.log('🗑️  Eliminando registro de Paloma (45.862s)...');
    const palomaResult = await db.collection('bestdrivertimes').deleteOne({
      driverName: 'Paloma',
      bestTime: 45862
    });
    console.log(`   Eliminados: ${palomaResult.deletedCount} registros\n`);

    // Eliminar de BestKartTimes también
    console.log('🗑️  Eliminando Kart #19 (Ignacio)...');
    const kart19Result = await db.collection('bestkarttimes').deleteOne({
      kartNumber: 19,
      bestTime: 39501
    });
    console.log(`   Eliminados: ${kart19Result.deletedCount} registros\n`);

    console.log('🗑️  Eliminando Kart #14 (Paloma)...');
    const kart14Result = await db.collection('bestkarttimes').deleteOne({
      kartNumber: 14,
      bestTime: 45862
    });
    console.log(`   Eliminados: ${kart14Result.deletedCount} registros\n`);

    // Recalcular posiciones
    console.log('🔄 Recalculando posiciones...\n');

    // Best Drivers
    const drivers = await db.collection('bestdrivertimes')
      .find({})
      .sort({ bestTime: 1 })
      .toArray();

    for (let i = 0; i < drivers.length; i++) {
      await db.collection('bestdrivertimes').updateOne(
        { _id: drivers[i]._id },
        { $set: { position: i + 1 } }
      );
    }
    console.log(`✅ Recalculadas ${drivers.length} posiciones de pilotos\n`);

    // Best Karts
    const karts = await db.collection('bestkarttimes')
      .find({})
      .sort({ bestTime: 1 })
      .toArray();

    for (let i = 0; i < karts.length; i++) {
      await db.collection('bestkarttimes').updateOne(
        { _id: karts[i]._id },
        { $set: { position: i + 1 } }
      );
    }
    console.log(`✅ Recalculadas ${karts.length} posiciones de karts\n`);

    console.log('✅ Registros de prueba eliminados correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Conexión cerrada');
  }
}

deleteTestRecords();
