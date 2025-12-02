/**
 * Migration script to fix missing webUserId in DriverRaceData records
 * Run with: node scripts/fix-webUserId.js
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

// Define schemas inline
const webUserSchema = new mongoose.Schema({
  email: String,
  kartingLink: {
    personId: String,
    status: String,
    linkedAt: Date,
    speedParkProfile: {
      driverName: String,
      totalRaces: Number
    }
  }
}, { collection: 'webusers' });

const driverRaceDataSchema = new mongoose.Schema({
  driverName: String,
  webUserId: String,
  linkingStatus: String,
  linkingMethod: String,
  linkingConfidence: String,
  stats: Object,
  sessions: Array
}, { collection: 'driver_race_data' });

const WebUser = mongoose.model('WebUser', webUserSchema);
const DriverRaceData = mongoose.model('DriverRaceData', driverRaceDataSchema);

async function fixWebUserIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users who have a linked kartingLink
    const linkedUsers = await WebUser.find({
      'kartingLink.status': 'linked',
      'kartingLink.personId': { $exists: true }
    }).lean();

    console.log(`\n📊 Found ${linkedUsers.length} linked users`);

    let updatedCount = 0;
    let alreadyLinkedCount = 0;
    let notFoundCount = 0;

    for (const user of linkedUsers) {
      const personId = user.kartingLink.personId;
      const userId = user._id.toString();

      console.log(`\n🔍 Checking user: ${user.email} (${userId})`);
      console.log(`   → Linked to personId: ${personId}`);

      // Find the corresponding DriverRaceData
      const driver = await DriverRaceData.findById(personId);

      if (!driver) {
        console.log(`   ❌ Driver not found for personId: ${personId}`);
        notFoundCount++;
        continue;
      }

      console.log(`   ✅ Found driver: ${driver.driverName}`);

      if (driver.webUserId === userId) {
        console.log(`   ℹ️  Already linked correctly`);
        alreadyLinkedCount++;
        continue;
      }

      // Update the driver
      console.log(`   🔧 Updating driver.webUserId from "${driver.webUserId}" to "${userId}"`);
      driver.webUserId = userId;
      driver.linkingStatus = 'linked';
      driver.linkingMethod = driver.linkingMethod || 'manual_link';
      driver.linkingConfidence = driver.linkingConfidence || 'high';

      await driver.save();
      console.log(`   ✅ Updated successfully`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`ℹ️  Already linked: ${alreadyLinkedCount}`);
    console.log(`❌ Not found: ${notFoundCount}`);
    console.log(`📊 Total processed: ${linkedUsers.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixWebUserIds()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
