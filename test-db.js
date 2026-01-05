const mongoose = require('mongoose');
const fs = require('fs');

async function testDB() {
  try {
    // Read .env.local file
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const mongoUri = envContent.match(/MONGODB_URI=(.+)/)?.[1]?.trim();

    console.log('🔌 Conectando a MongoDB...');
    console.log('📍 URI:', mongoUri?.substring(0, 50) + '...');

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📂 Colecciones disponibles:');
    collections.forEach(col => console.log('  -', col.name));

    // Check race_sessions_v0 collection
    const raceSessionsCount = await mongoose.connection.db.collection('race_sessions_v0').countDocuments();
    console.log('\n🏁 Race Sessions V0 en DB:', raceSessionsCount);

    if (raceSessionsCount > 0) {
      const sampleRaces = await mongoose.connection.db.collection('race_sessions_v0')
        .find({})
        .sort({ sessionDate: -1 })
        .limit(3)
        .toArray();

      console.log('\n📋 Últimas 3 carreras:');
      sampleRaces.forEach((race, idx) => {
        console.log(`\n${idx + 1}. ${race.sessionName}`);
        console.log(`   Fecha: ${race.sessionDate}`);
        console.log(`   ID: ${race.sessionId}`);
        console.log(`   Pilotos: ${race.totalDrivers}`);
      });
    } else {
      console.log('\n⚠️ No hay carreras en race_sessions_v0');
    }

    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDB();
