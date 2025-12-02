const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function calculateCapacity() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    // Get sample document from lap_records to estimate size
    console.log('📏 Getting sample document from lap_records...\n');
    const sampleDoc = await db.collection('lap_records').findOne({});

    if (!sampleDoc) {
      console.log('⚠️  No documents in lap_records, using estimated size');
      var avgDocSize = 500; // bytes (conservative estimate)
    } else {
      // Calculate approximate size (JSON stringified)
      const docSize = JSON.stringify(sampleDoc).length;
      console.log(`📦 Sample document size: ~${docSize} bytes`);
      avgDocSize = docSize;
    }

    console.log('\n=== CURRENT STATE ===');
    const currentCount = await db.collection('lap_records').countDocuments();
    console.log(`Current lap_records: ${currentCount} documents`);
    console.log(`Estimated current size: ${(currentCount * avgDocSize / 1024 / 1024).toFixed(2)} MB\n`);

    console.log('=== DAILY PROJECTION (if legacy enabled) ===');
    const driversPerRace = 17;
    const lapsPerDriver = 15;
    const racesPerDay = 20;
    const recordsPerDay = driversPerRace * lapsPerDriver * racesPerDay;

    console.log(`Drivers per race: ${driversPerRace}`);
    console.log(`Laps per driver: ${lapsPerDriver}`);
    console.log(`Races per day: ${racesPerDay}`);
    console.log(`→ Records per day: ${recordsPerDay.toFixed(0)} documents\n`);

    const dailyMB = (recordsPerDay * avgDocSize) / 1024 / 1024;
    console.log(`Daily growth: ${dailyMB.toFixed(2)} MB/day\n`);

    console.log('=== MONTHLY PROJECTION ===');
    const monthlyRecords = recordsPerDay * 30;
    const monthlyMB = dailyMB * 30;
    console.log(`Monthly records: ${monthlyRecords.toFixed(0)} documents`);
    console.log(`Monthly growth: ${monthlyMB.toFixed(2)} MB/month\n`);

    console.log('=== 90-DAY PROJECTION ===');
    const ninetyDayMB = dailyMB * 90;
    console.log(`90-day growth: ${ninetyDayMB.toFixed(2)} MB (3 months)\n`);

    console.log('=== ANNUAL PROJECTION ===');
    const yearlyMB = dailyMB * 365;
    console.log(`Yearly growth: ${yearlyMB.toFixed(2)} MB/year\n`);

    console.log('=== MONGODB FLEX CAPACITY ===');
    const flexLimitMB = 5 * 1024; // 5 GB
    const currentUsageMB = 4.58; // From previous check
    const availableMB = flexLimitMB - currentUsageMB;

    console.log(`MongoDB Flex limit: ${flexLimitMB} MB (5 GB)`);
    console.log(`Current usage: ${currentUsageMB.toFixed(2)} MB`);
    console.log(`Available space: ${availableMB.toFixed(2)} MB\n`);

    console.log('=== TIME UNTIL FULL ===');
    const daysUntilFull = availableMB / dailyMB;
    console.log(`Days until 5GB limit: ${daysUntilFull.toFixed(0)} days (~${(daysUntilFull/30).toFixed(1)} months)\n`);

    console.log('=== RECOMMENDATION ===');
    if (monthlyMB < 100) {
      console.log('✅ SAFE TO ENABLE: Legacy system uses <100 MB/month');
      console.log(`✅ You have ${(availableMB / monthlyMB).toFixed(0)} months of runway with current usage patterns`);
    } else if (monthlyMB < 500) {
      console.log('⚠️  MODERATE: Legacy system uses ${monthlyMB.toFixed(0)} MB/month');
      console.log('⚠️  Monitor usage and consider cleanup strategy');
    } else {
      console.log('❌ HIGH USAGE: Legacy system uses ${monthlyMB.toFixed(0)} MB/month');
      console.log('❌ Consider alternative approach or data retention policy');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Calculation complete');
  }
}

calculateCapacity();
