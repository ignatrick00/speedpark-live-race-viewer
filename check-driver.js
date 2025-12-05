const mongoose = require('mongoose');
const fs = require('fs');

// Leer MongoDB URI del .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const mongoUri = envContent.match(/MONGODB_URI=(.+)/)[1].trim();

async function checkDriver() {
  await mongoose.connect(mongoUri);

  const RaceSessionV0 = mongoose.connection.collection('race_sessions_v0');

  const sessions = await RaceSessionV0.find({
    'drivers.driverName': 'kitt🏎️KARTSHOKS'
  }).sort({ sessionDate: -1 }).toArray();

  console.log('\n📊 Total sesiones encontradas:', sessions.length, '\n');

  sessions.forEach((session, i) => {
    const driver = session.drivers.find(d => d.driverName === 'kitt🏎️KARTSHOKS');
    console.log(`Sesión ${i + 1}:`);
    console.log(`  sessionId: ${session.sessionId}`);
    console.log(`  sessionDate: ${session.sessionDate}`);
    console.log(`  linkedUserId: ${driver.linkedUserId || 'null'}`);
    console.log(`  personId: ${driver.personId || 'null'}`);
    console.log('');
  });

  await mongoose.disconnect();
}

checkDriver().catch(console.error);
