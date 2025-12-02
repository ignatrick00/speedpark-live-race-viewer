const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

/**
 * Test the kart-records API logic
 */
async function testKartRecords() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    const kartNumber = 18; // Test with Kart #18
    console.log(`=== TESTING KART RECORDS FOR KART #${kartNumber} ===\n`);

    // Get today's date filter
    const dateFilter = new Date();
    dateFilter.setHours(0, 0, 0, 0);

    console.log(`📅 Date filter: Today (${dateFilter.toISOString()})\n`);

    // Find drivers who used this kart today
    const drivers = await db.collection('driver_race_data')
      .find({
        'sessions.kartNumber': kartNumber,
        'sessions.sessionDate': { $gte: dateFilter }
      })
      .toArray();

    console.log(`👥 Found ${drivers.length} drivers who used Kart #${kartNumber} today\n`);

    const kartRecords = [];

    drivers.forEach((driver) => {
      // Filter sessions: must be this kart AND today
      const relevantSessions = driver.sessions.filter(session => {
        const isCorrectKart = session.kartNumber === kartNumber;
        const isToday = new Date(session.sessionDate) >= dateFilter;
        return isCorrectKart && isToday;
      });

      if (relevantSessions.length === 0) return;

      // Find driver's best time with this kart
      let driverBestTime = Infinity;
      let bestSession = null;

      relevantSessions.forEach(session => {
        if (session.bestTime > 0 && session.bestTime < driverBestTime) {
          driverBestTime = session.bestTime;
          bestSession = session;
        }
      });

      if (bestSession && driverBestTime !== Infinity) {
        kartRecords.push({
          driverName: driver.driverName,
          bestTime: driverBestTime,
          sessionName: bestSession.sessionName
        });
      }
    });

    // Sort by best time
    const sortedRecords = kartRecords
      .sort((a, b) => a.bestTime - b.bestTime)
      .slice(0, 10);

    console.log(`🏆 TOP 10 CORREDORES CON KART #${kartNumber} (HOY):\n`);
    sortedRecords.forEach((entry, idx) => {
      const minutes = Math.floor(entry.bestTime / 60000);
      const seconds = ((entry.bestTime % 60000) / 1000).toFixed(3);
      const time = `${minutes}:${seconds.padStart(6, '0')}`;

      console.log(`${idx + 1}. ${entry.driverName.padEnd(20)} - ${time} (${entry.sessionName})`);
    });

    if (sortedRecords.length === 0) {
      console.log('❌ No records found for this kart today');
    }

    console.log('\n✅ Kart records API simulation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testKartRecords();
