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

async function findAnahisPosition() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get ALL drivers sorted by allTimeBestLap
    const allDrivers = await DriverRaceData.find({
      'stats.allTimeBestLap': { $gt: 0 } // Only drivers with valid lap times
    })
      .sort({ 'stats.allTimeBestLap': 1 }) // Ascending (fastest first)
      .select('_id driverName webUserId stats.allTimeBestLap')
      .lean();

    console.log(`📊 Total drivers with lap times: ${allDrivers.length}\n`);

    // Find Anahis
    const anahisIndex = allDrivers.findIndex(d => d.driverName === 'Anahis');

    if (anahisIndex === -1) {
      console.log('❌ Anahis not found in rankings');
    } else {
      const anahis = allDrivers[anahisIndex];
      console.log(`✅ Found Anahis at position ${anahisIndex + 1}:`);
      console.log(`   Best lap: ${anahis.stats?.allTimeBestLap || 0}ms (${(anahis.stats?.allTimeBestLap / 1000).toFixed(3)}s)`);
      console.log(`   webUserId: ${anahis.webUserId || 'NULL'}\n`);

      console.log('Top 5 drivers:');
      allDrivers.slice(0, 5).forEach((driver, index) => {
        console.log(`  ${index + 1}. ${driver.driverName} - ${(driver.stats?.allTimeBestLap / 1000).toFixed(3)}s`);
      });

      console.log('\n... \n');

      console.log(`Drivers around Anahis (position ${anahisIndex + 1}):`);
      const start = Math.max(0, anahisIndex - 2);
      const end = Math.min(allDrivers.length, anahisIndex + 3);

      allDrivers.slice(start, end).forEach((driver, index) => {
        const pos = start + index + 1;
        const marker = driver.driverName === 'Anahis' ? ' 👈 TÚ' : '';
        console.log(`  ${pos}. ${driver.driverName} - ${(driver.stats?.allTimeBestLap / 1000).toFixed(3)}s${marker}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

findAnahisPosition()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
