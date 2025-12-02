const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function listAndDelete() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('karteando');

    // Listar TODOS los registros de pilotos
    console.log('=== TODOS LOS REGISTROS DE PILOTOS ===\n');
    const allDrivers = await db.collection('bestdrivertimes').find({}).toArray();

    console.log(`Total: ${allDrivers.length} registros\n`);

    allDrivers.forEach((driver, idx) => {
      console.log(`${idx + 1}. ${driver.driverName} - ${driver.bestTime}ms (${driver.bestTime / 1000}s)`);
      console.log(`   Kart #${driver.kartNumber}`);
      console.log(`   Sesión: ${driver.sessionName || 'N/A'}`);
      console.log(`   ID: ${driver._id}\n`);
    });

    // Buscar específicamente Ignacio y Paloma
    console.log('\n=== BUSCANDO IGNACIO Y PALOMA ===\n');

    const ignacio = await db.collection('bestdrivertimes').findOne({ driverName: 'Ignacio' });
    if (ignacio) {
      console.log('✅ Ignacio encontrado:');
      console.log(`   Tiempo: ${ignacio.bestTime}ms`);
      console.log(`   ID: ${ignacio._id}\n`);

      // Eliminar
      console.log('🗑️  Eliminando...');
      const result = await db.collection('bestdrivertimes').deleteOne({ _id: ignacio._id });
      console.log(`   ✅ Eliminado: ${result.deletedCount}\n`);
    } else {
      console.log('❌ Ignacio NO encontrado\n');
    }

    const paloma = await db.collection('bestdrivertimes').findOne({ driverName: 'Paloma' });
    if (paloma) {
      console.log('✅ Paloma encontrada:');
      console.log(`   Tiempo: ${paloma.bestTime}ms`);
      console.log(`   ID: ${paloma._id}\n`);

      // Eliminar
      console.log('🗑️  Eliminando...');
      const result = await db.collection('bestdrivertimes').deleteOne({ _id: paloma._id });
      console.log(`   ✅ Eliminado: ${result.deletedCount}\n`);
    } else {
      console.log('❌ Paloma NO encontrada\n');
    }

    // Eliminar de karts
    console.log('\n=== KARTS ===\n');

    const kart19 = await db.collection('bestkarttimes').findOne({
      kartNumber: 19,
      driverName: 'Ignacio'
    });

    if (kart19) {
      console.log('🗑️  Eliminando Kart #19 (Ignacio)...');
      const result = await db.collection('bestkarttimes').deleteOne({ _id: kart19._id });
      console.log(`   ✅ Eliminado: ${result.deletedCount}\n`);
    }

    const kart14 = await db.collection('bestkarttimes').findOne({
      kartNumber: 14,
      driverName: 'Paloma'
    });

    if (kart14) {
      console.log('🗑️  Eliminando Kart #14 (Paloma)...');
      const result = await db.collection('bestkarttimes').deleteOne({ _id: kart14._id });
      console.log(`   ✅ Eliminado: ${result.deletedCount}\n`);
    }

    // Recalcular posiciones
    console.log('🔄 Recalculando posiciones...\n');

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

    console.log(`✅ ${drivers.length} posiciones recalculadas`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Conexión cerrada');
  }
}

listAndDelete();
