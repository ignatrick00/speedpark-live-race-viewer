/**
 * Script to find all drivers and help identify which one belongs to user
 */

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
  linkingStatus: String,
  stats: Object,
  sessions: Array
}, { collection: 'driverracedatas' });

const DriverRaceData = mongoose.model('DriverRaceData', driverRaceDataSchema);

async function findDrivers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const drivers = await DriverRaceData.find({}).select('_id driverName webUserId linkingStatus stats').lean();

    console.log(`📊 Found ${drivers.length} drivers:\n`);
    console.log('='.repeat(80));

    drivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.driverName}`);
      console.log(`   ID: ${driver._id}`);
      console.log(`   webUserId: ${driver.webUserId || 'null'}`);
      console.log(`   linkingStatus: ${driver.linkingStatus || 'none'}`);
      console.log(`   totalRaces: ${driver.stats?.totalRaces || 0}`);
      console.log(`   allTimeBestLap: ${driver.stats?.allTimeBestLap || 0}`);
      console.log('');
    });

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

findDrivers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
