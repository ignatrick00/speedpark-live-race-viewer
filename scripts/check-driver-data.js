const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function checkDriverData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    // Get a recent driver record
    console.log('📊 Checking recent driver_race_data records...\n');

    const recentDrivers = await db.collection('driver_race_data')
      .find({})
      .sort({ updatedAt: -1 })
      .limit(3)
      .toArray();

    console.log(`Found ${recentDrivers.length} recent drivers:\n`);

    recentDrivers.forEach((driver, idx) => {
      console.log(`\n=== DRIVER ${idx + 1}: ${driver.driverName} ===`);
      console.log(`Sessions: ${driver.sessions?.length || 0}`);
      console.log(`Stats - Total Laps: ${driver.stats?.totalLaps || 0}`);
      console.log(`Stats - Total Races: ${driver.stats?.totalRaces || 0}`);
      console.log(`Last updated: ${driver.updatedAt}`);

      if (driver.sessions && driver.sessions.length > 0) {
        console.log(`\nLast Session:`);
        const lastSession = driver.sessions[driver.sessions.length - 1];
        console.log(`  - Session Name: ${lastSession.sessionName}`);
        console.log(`  - Session Date: ${lastSession.sessionDate}`);
        console.log(`  - Total Laps in session: ${lastSession.totalLaps}`);
        console.log(`  - Laps array length: ${lastSession.laps?.length || 0}`);
        console.log(`  - Best Time: ${lastSession.bestTime}ms`);
        console.log(`  - Kart: ${lastSession.kartNumber}`);

        if (lastSession.laps && lastSession.laps.length > 0) {
          console.log(`\n  First 3 laps in laps array:`);
          lastSession.laps.slice(0, 3).forEach(lap => {
            console.log(`    Lap ${lap.lapNumber}: ${lap.time}ms, P${lap.position}, Kart ${lap.kartNumber}`);
          });
        } else {
          console.log(`  ❌ NO LAPS IN LAPS ARRAY!`);
        }
      }
    });

    // Check if there are ANY drivers with laps
    console.log('\n\n=== CHECKING FOR DRIVERS WITH ACTUAL LAPS ===\n');

    const driversWithLaps = await db.collection('driver_race_data')
      .find({ 'sessions.laps.0': { $exists: true } })
      .limit(5)
      .toArray();

    console.log(`Found ${driversWithLaps.length} drivers with laps in their sessions`);

    if (driversWithLaps.length > 0) {
      const sample = driversWithLaps[0];
      console.log(`\nSample: ${sample.driverName}`);
      const sessionWithLaps = sample.sessions.find(s => s.laps && s.laps.length > 0);
      if (sessionWithLaps) {
        console.log(`  Session: ${sessionWithLaps.sessionName}`);
        console.log(`  Laps recorded: ${sessionWithLaps.laps.length}`);
        console.log(`  First lap: Lap ${sessionWithLaps.laps[0].lapNumber}, ${sessionWithLaps.laps[0].time}ms`);
      }
    }

    // Check total counts
    console.log('\n\n=== OVERALL STATISTICS ===\n');
    const totalDrivers = await db.collection('driver_race_data').countDocuments();
    const driversWithNonEmptySessions = await db.collection('driver_race_data').countDocuments({
      'sessions.0': { $exists: true }
    });
    const driversWithLapsCount = await db.collection('driver_race_data').countDocuments({
      'sessions.laps.0': { $exists: true }
    });

    console.log(`Total drivers: ${totalDrivers}`);
    console.log(`Drivers with sessions: ${driversWithNonEmptySessions}`);
    console.log(`Drivers with laps data: ${driversWithLapsCount}`);
    console.log(`\n❌ Drivers WITHOUT lap data: ${totalDrivers - driversWithLapsCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkDriverData();
