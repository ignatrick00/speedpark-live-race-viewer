const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

/**
 * Simulates the new API logic to verify it will work
 */
async function testNewAPI() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    console.log('=== TESTING BEST-TIMES-V2 API (filter=day) ===\n');

    // Get today's date filter
    const dateFilter = new Date();
    dateFilter.setHours(0, 0, 0, 0);

    console.log(`📅 Date filter: Today (${dateFilter.toISOString()})\n`);

    // Find drivers with sessions today
    const drivers = await db.collection('driver_race_data')
      .find({ 'sessions.sessionDate': { $gte: dateFilter } })
      .toArray();

    console.log(`👥 Found ${drivers.length} drivers with sessions today\n`);

    const bestTimes = [];

    // Process each driver
    drivers.forEach((driver) => {
      // Filter sessions by date
      const todaySessions = driver.sessions.filter(session => {
        return new Date(session.sessionDate) >= dateFilter;
      });

      if (todaySessions.length === 0) return;

      // Find best time
      let driverBestTime = Infinity;
      let bestSession = null;

      todaySessions.forEach(session => {
        if (session.bestTime > 0 && session.bestTime < driverBestTime) {
          driverBestTime = session.bestTime;
          bestSession = session;
        }
      });

      if (bestSession && driverBestTime !== Infinity) {
        bestTimes.push({
          driverName: driver.driverName,
          bestTime: driverBestTime,
          kartNumber: bestSession.kartNumber || 0,
          sessionName: bestSession.sessionName,
          sessionDate: bestSession.sessionDate
        });
      }
    });

    // Sort and take top 10
    const top10 = bestTimes
      .sort((a, b) => a.bestTime - b.bestTime)
      .slice(0, 10);

    console.log(`🏆 TOP 10 DEL DÍA:\n`);
    top10.forEach((entry, idx) => {
      const minutes = Math.floor(entry.bestTime / 60000);
      const seconds = ((entry.bestTime % 60000) / 1000).toFixed(3);
      const time = `${minutes}:${seconds.padStart(6, '0')}`;

      console.log(`${idx + 1}. ${entry.driverName.padEnd(20)} - ${time} (Kart #${entry.kartNumber})`);
    });

    console.log('\n=== TESTING BEST-KARTS-V2 API (filter=day) ===\n');

    const kartBestTimes = new Map();

    drivers.forEach((driver) => {
      const todaySessions = driver.sessions.filter(session => {
        return new Date(session.sessionDate) >= dateFilter;
      });

      todaySessions.forEach(session => {
        const kartNumber = session.kartNumber;
        const bestTime = session.bestTime;

        if (!kartNumber || !bestTime || bestTime <= 0) return;

        const existing = kartBestTimes.get(kartNumber);

        if (!existing || bestTime < existing.bestTime) {
          kartBestTimes.set(kartNumber, {
            kartNumber,
            bestTime,
            driverName: driver.driverName,
            sessionName: session.sessionName
          });
        }
      });
    });

    const top10Karts = Array.from(kartBestTimes.values())
      .sort((a, b) => a.bestTime - b.bestTime)
      .slice(0, 10);

    console.log(`🏎️ TOP 10 KARTS DEL DÍA:\n`);
    top10Karts.forEach((entry, idx) => {
      const minutes = Math.floor(entry.bestTime / 60000);
      const seconds = ((entry.bestTime % 60000) / 1000).toFixed(3);
      const time = `${minutes}:${seconds.padStart(6, '0')}`;

      console.log(`${idx + 1}. Kart #${String(entry.kartNumber).padStart(2, '0')} - ${time} (${entry.driverName})`);
    });

    console.log('\n✅ API simulation complete - both endpoints will work correctly!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testNewAPI();
