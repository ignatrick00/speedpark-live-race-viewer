const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const MONGODB_URI = envVars.MONGODB_URI;

const driverRaceDataSchema = new mongoose.Schema({
  driverName: String,
  webUserId: String,
  stats: Object
}, { collection: 'driver_race_data' });

const DriverRaceData = mongoose.model('DriverRaceData', driverRaceDataSchema);

async function testLeaderboard() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const limit = 10;

    // Get top drivers sorted by allTimeBestLap - EXACT query from API
    const topDrivers = await DriverRaceData.find({
      'stats.allTimeBestLap': { $gt: 0 } // Only drivers with valid lap times
    })
      .sort({ 'stats.allTimeBestLap': 1 }) // Ascending (fastest first)
      .limit(limit)
      .select('_id driverName webUserId stats.allTimeBestLap stats.totalRaces stats.podiumFinishes stats.bestPosition')
      .lean();

    console.log(`📊 Found ${topDrivers.length} drivers:\n`);

    topDrivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.driverName}`);
      console.log(`   webUserId: ${driver.webUserId || 'NULL'}`);
      console.log(`   bestLap: ${driver.stats?.allTimeBestLap || 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testLeaderboard()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
