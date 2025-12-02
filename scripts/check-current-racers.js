const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function checkCurrentRacers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    console.log('Buscando Break Pitt, Don PePa, Santi en driver_race_data...\n');

    const racers = ['Break Pitt', 'Don PePa', 'Santi', 'Ignacio', 'Paloma'];
    
    for (const name of racers) {
      const records = await db.collection('driver_race_data')
        .find({ driverName: { $regex: name, $options: 'i' } })
        .sort({ lastUpdate: -1 })
        .limit(1)
        .toArray();

      if (records.length > 0) {
        const r = records[0];
        console.log(`✅ ${r.driverName}:`);
        console.log(`   Total vueltas: ${r.laps?.length || 0}`);
        console.log(`   Mejor tiempo: ${r.bestTime}ms`);
        console.log(`   Última actualización: ${r.lastUpdate || 'N/A'}`);
        console.log('');
      } else {
        console.log(`❌ ${name}: NO encontrado\n`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCurrentRacers();
