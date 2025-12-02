const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';

async function checkUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    const db = mongoose.connection.db;
    const webusers = db.collection('webusers');

    // Buscar usuarios con escuadería
    console.log('\n📋 Users with squadrons:');
    const usersWithSquadron = await webusers.find({
      'squadron.squadronId': { $exists: true }
    }).toArray();

    console.log(`Found ${usersWithSquadron.length} users with squadrons`);

    usersWithSquadron.forEach(user => {
      console.log(`\n  User: ${user.email}`);
      console.log(`    Squadron ID: ${user.squadron?.squadronId}`);
      console.log(`    Role: ${user.squadron?.role}`);
      console.log(`    Joined At: ${user.squadron?.joinedAt}`);
    });

    // Buscar usuarios sin escuadería
    console.log('\n\n📋 Users WITHOUT squadrons:');
    const usersWithoutSquadron = await webusers.find({
      'squadron.squadronId': { $exists: false }
    }).limit(5).toArray();

    console.log(`Found ${usersWithoutSquadron.length} users without squadrons (showing first 5)`);

    usersWithoutSquadron.forEach(user => {
      console.log(`\n  User: ${user.email}`);
      console.log(`    Squadron object: ${JSON.stringify(user.squadron)}`);
    });

    // Ver estructura completa de squadron de un usuario
    console.log('\n\n📋 Sample squadron structure:');
    const sampleUser = await webusers.findOne({});
    console.log(JSON.stringify(sampleUser.squadron, null, 2));

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();
