const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function testRaceBrowser() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    // Test 1: Get all races for today
    console.log('=== TEST 1: GET RACES FOR TODAY ===\n');

    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const drivers = await db.collection('driver_race_data')
      .find({
        'sessions.sessionDate': {
          $gte: startDate,
          $lte: endDate
        }
      })
      .toArray();

    console.log(`Found ${drivers.length} drivers with sessions today\n`);

    // Collect unique sessions
    const sessionMap = new Map();

    drivers.forEach(driver => {
      driver.sessions.forEach(session => {
        const sessionDate = new Date(session.sessionDate);
        if (sessionDate >= startDate && sessionDate <= endDate) {
          const sessionId = session.sessionId;

          if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, {
              sessionId: session.sessionId,
              sessionName: session.sessionName,
              sessionDate: session.sessionDate,
              sessionType: session.sessionType,
              driverCount: 1,
              totalLaps: session.laps?.length || 0
            });
          } else {
            const existing = sessionMap.get(sessionId);
            existing.driverCount++;
            existing.totalLaps += session.laps?.length || 0;
          }
        }
      });
    });

    const races = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));

    console.log(`🏁 Found ${races.length} unique races today:\n`);

    races.slice(0, 5).forEach((race, idx) => {
      const time = new Date(race.sessionDate).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`${idx + 1}. ${race.sessionName}`);
      console.log(`   Time: ${time} | Drivers: ${race.driverCount} | Laps: ${race.totalLaps}`);
      console.log(`   Type: ${race.sessionType}\n`);
    });

    // Test 2: Get results for first race
    if (races.length > 0) {
      console.log('\n=== TEST 2: GET RACE RESULTS ===\n');

      const firstRace = races[0];
      console.log(`Getting results for: ${firstRace.sessionName}\n`);

      const raceDrivers = await db.collection('driver_race_data')
        .find({ 'sessions.sessionId': firstRace.sessionId })
        .toArray();

      const results = [];

      raceDrivers.forEach(driver => {
        const session = driver.sessions.find(s => s.sessionId === firstRace.sessionId);
        if (session) {
          results.push({
            driverName: driver.driverName,
            position: session.finalPosition || session.bestPosition || 999,
            bestTime: session.bestTime || 0,
            lastTime: session.lastTime || 0,
            totalLaps: session.totalLaps || 0,
            kartNumber: session.kartNumber || 0,
            laps: session.laps || []
          });
        }
      });

      results.sort((a, b) => a.position - b.position);

      console.log(`📊 Final Classification (${results.length} drivers):\n`);

      results.slice(0, 10).forEach((driver, idx) => {
        const bestTime = driver.bestTime > 0 ?
          `${Math.floor(driver.bestTime / 60000)}:${((driver.bestTime % 60000) / 1000).toFixed(3)}` :
          '--:--';

        console.log(`P${driver.position.toString().padStart(2)} - ${driver.driverName.padEnd(20)} | Kart #${driver.kartNumber.toString().padStart(2)} | Best: ${bestTime} | Laps: ${driver.totalLaps}`);
      });

      // Test 3: Get lap details for first driver
      if (results.length > 0 && results[0].laps.length > 0) {
        console.log('\n=== TEST 3: GET DRIVER LAP DETAILS ===\n');

        const firstDriver = results[0];
        console.log(`Driver: ${firstDriver.driverName} (P${firstDriver.position})\n`);

        const sortedLaps = firstDriver.laps.sort((a, b) => a.lapNumber - b.lapNumber);

        console.log(`📊 Lap-by-lap analysis (${sortedLaps.length} laps):\n`);

        sortedLaps.slice(0, 10).forEach(lap => {
          const time = lap.time > 0 ?
            `${Math.floor(lap.time / 60000)}:${((lap.time % 60000) / 1000).toFixed(3)}` :
            '--:--';
          const star = lap.isPersonalBest ? ' ⭐' : '';

          console.log(`Lap ${lap.lapNumber.toString().padStart(2)}: ${time} | P${lap.position} | Gap: ${lap.gapToLeader || '-'}${star}`);
        });
      }
    }

    console.log('\n✅ Race browser test complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testRaceBrowser();
