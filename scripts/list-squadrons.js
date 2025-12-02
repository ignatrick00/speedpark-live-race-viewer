const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function listSquadrons() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    const squadrons = await db.collection('squadrons').find({}).toArray();

    console.log(`Found ${squadrons.length} squadrons:\n`);

    squadrons.forEach((sq, idx) => {
      console.log(`${idx + 1}. ${sq.name} (${sq.tag})`);
      console.log(`   ID: ${sq._id}`);
      console.log(`   Members: ${sq.members?.length || 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

listSquadrons();
