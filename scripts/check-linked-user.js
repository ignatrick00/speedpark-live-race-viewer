const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

async function test() {
  await mongoose.connect(envVars.MONGODB_URI);
  
  const RaceSessionV0 = mongoose.model('RaceSessionV0', new mongoose.Schema({}, { strict: false, collection: 'race_sessions_v0' }));
  
  const userId = '6931e8329086701279fb4131';
  
  console.log('Buscando todos los pilotos vinculados a userId:', userId);
  console.log('');
  
  const sessions = await RaceSessionV0.aggregate([
    { $unwind: '$drivers' },
    { $match: { 'drivers.linkedUserId': userId } },
    { $group: {
      _id: '$drivers.driverName',
      sessions: { $sum: 1 },
      lastRace: { $max: '$sessionDate' }
    }},
    { $sort: { sessions: -1 } }
  ]);
  
  console.log('Pilotos encontrados en race_sessions_v0:');
  sessions.forEach(s => {
    const date = new Date(s.lastRace);
    console.log('  -', s._id + ':', s.sessions, 'sesiones, ultima:', date.toLocaleDateString('es-CL'));
  });
  
  await mongoose.connection.close();
}

test().catch(console.error);
