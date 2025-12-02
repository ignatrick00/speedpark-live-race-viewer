const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';

async function dropIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    const db = mongoose.connection.db;
    const collection = db.collection('fairracingscores');

    // Listar índices actuales
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Eliminar índices problemáticos
    try {
      console.log('\n🗑️  Dropping recognitions.recognitionId_1...');
      await collection.dropIndex('recognitions.recognitionId_1');
      console.log('✅ Dropped recognitions.recognitionId_1');
    } catch (err) {
      console.log('⚠️  Index recognitions.recognitionId_1 not found (already dropped)');
    }

    try {
      console.log('\n🗑️  Dropping incidentsHistory.incidentId_1...');
      await collection.dropIndex('incidentsHistory.incidentId_1');
      console.log('✅ Dropped incidentsHistory.incidentId_1');
    } catch (err) {
      console.log('⚠️  Index incidentsHistory.incidentId_1 not found (already dropped)');
    }

    // Listar índices después
    console.log('\n📋 Indexes after cleanup:');
    const indexesAfter = await collection.indexes();
    indexesAfter.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropIndexes();
