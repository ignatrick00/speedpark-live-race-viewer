const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function checkEvents() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    console.log('📊 Checking squadron events...\n');

    const events = await db.collection('squadronevents')
      .find({})
      .toArray();

    console.log(`Found ${events.length} events:\n`);

    events.forEach((event, idx) => {
      console.log(`\n=== EVENT ${idx + 1} ===`);
      console.log(`ID: ${event._id}`);
      console.log(`Name: ${event.name}`);
      console.log(`Status: ${event.status}`);
      console.log(`Category: ${event.category}`);
      console.log(`Date: ${event.eventDate}`);
      console.log(`Created By: ${event.createdBy}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkEvents();
