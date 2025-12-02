const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envContent.match(/MONGODB_URI="?([^"\n]+)"?/)[1];

async function checkUserSquadron() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = MONGODB_URI.match(/\.net\/([^?]+)/)?.[1] || 'karteando-cl';
    const db = client.db(dbName);

    const user = await db.collection('webusers').findOne({
      email: 'icabreraquezada@gmail.com'
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User found:', user.email);
    console.log('🆔 User ID:', user._id);
    console.log('🏁 Current Squadron:', user.currentSquadron);
    console.log('');

    if (user.currentSquadron) {
      const squadron = await db.collection('squadrons').findOne({
        _id: user.currentSquadron
      });

      if (squadron) {
        console.log('✅ Squadron found:');
        console.log('   Name:', squadron.name);
        console.log('   Tag:', squadron.tag);
      } else {
        console.log('❌ Squadron not found');
      }
    } else {
      console.log('❌ No squadron assigned');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkUserSquadron();
