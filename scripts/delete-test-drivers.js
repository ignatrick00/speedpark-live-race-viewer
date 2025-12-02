const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function deleteTestDrivers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    console.log('🔍 Looking for Ignacio and Paloma in driver_race_data...\n');

    // Find the drivers
    const ignacio = await db.collection('driver_race_data').findOne({ driverName: 'Ignacio' });
    const paloma = await db.collection('driver_race_data').findOne({ driverName: 'Paloma' });

    if (ignacio) {
      console.log('Found Ignacio:');
      console.log(`  - Sessions: ${ignacio.sessions?.length || 0}`);
      console.log(`  - Total Laps: ${ignacio.stats?.totalLaps || 0}`);
      console.log(`  - Best Lap: ${ignacio.stats?.allTimeBestLap}ms`);

      if (ignacio.stats?.allTimeBestLap < 1000) {
        console.log('  ⚠️  Suspicious best lap (< 1 second) - this is test data');
      }
    }

    if (paloma) {
      console.log('\nFound Paloma:');
      console.log(`  - Sessions: ${paloma.sessions?.length || 0}`);
      console.log(`  - Total Laps: ${paloma.stats?.totalLaps || 0}`);
      console.log(`  - Best Lap: ${paloma.stats?.allTimeBestLap}ms`);

      if (paloma.stats?.allTimeBestLap < 1000) {
        console.log('  ⚠️  Suspicious best lap (< 1 second) - this is test data');
      }
    }

    console.log('\n❓ Delete these drivers? (showing what would be deleted)\n');

    // Show sessions that would be deleted
    if (ignacio) {
      console.log('Ignacio sessions:');
      ignacio.sessions?.forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.sessionName} - ${s.bestTime}ms (${s.totalLaps} laps)`);
      });
    }

    if (paloma) {
      console.log('\nPaloma sessions:');
      paloma.sessions?.forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.sessionName} - ${s.bestTime}ms (${s.totalLaps} laps)`);
      });
    }

    console.log('\n🗑️  Deleting...\n');

    // Delete both drivers
    const result = await db.collection('driver_race_data').deleteMany({
      driverName: { $in: ['Ignacio', 'Paloma'] }
    });

    console.log(`✅ Deleted ${result.deletedCount} test drivers`);

    // Verify they're gone
    const remaining = await db.collection('driver_race_data').countDocuments({
      driverName: { $in: ['Ignacio', 'Paloma'] }
    });

    console.log(`✅ Verification: ${remaining} drivers named Ignacio/Paloma remaining (should be 0)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

deleteTestDrivers();
