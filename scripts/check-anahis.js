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

async function checkAnahis() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const collection = mongoose.connection.db.collection('driver_race_data');

    const anahis = await collection.findOne({ driverName: 'Anahis' });

    if (!anahis) {
      console.log('❌ Anahis not found');
    } else {
      console.log('✅ Found Anahis:');
      console.log(JSON.stringify(anahis, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkAnahis()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
