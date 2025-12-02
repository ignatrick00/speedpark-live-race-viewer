const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

async function fixSchema() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(envVars.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get current collection info
    console.log('\n📋 Current collection validation:');
    const collections = await db.listCollections({ name: 'squadronevents' }).toArray();
    if (collections.length > 0) {
      console.log(JSON.stringify(collections[0].options, null, 2));
    }

    // Drop the validator
    console.log('\n🔧 Removing schema validator...');
    await db.command({
      collMod: 'squadronevents',
      validator: {},
      validationLevel: 'off'
    });
    console.log('✅ Schema validator removed');

    // Verify
    console.log('\n✅ Verification:');
    const updatedCollections = await db.listCollections({ name: 'squadronevents' }).toArray();
    if (updatedCollections.length > 0) {
      console.log(JSON.stringify(updatedCollections[0].options, null, 2));
    }

    console.log('\n✅ Schema fix complete! Restart your Next.js server.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixSchema();
