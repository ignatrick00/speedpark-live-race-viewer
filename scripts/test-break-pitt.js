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
  
  const WebUser = mongoose.model('WebUser', new mongoose.Schema({}, { strict: false, collection: 'webusers' }));
  const Squadron = mongoose.model('Squadron', new mongoose.Schema({}, { strict: false, collection: 'squadrons' }));
  
  console.log('🔍 Buscando usuarios con "Break Pitt"...\n');
  
  const users = await WebUser.find({
    $or: [
      { 'profile.alias': /Break Pitt/i },
      { 'kartingLink.speedParkProfile.driverName': /Break Pitt/i },
      { 'kartingLink.speedParkProfile.aliases': /Break Pitt/i }
    ]
  }).lean();
  
  console.log(`Encontrados: ${users.length} usuarios\n`);
  
  for (const user of users) {
    console.log('👤 Usuario:', user.email);
    console.log('   _id:', user._id);
    console.log('   alias:', user.profile?.alias);
    console.log('   driverName:', user.kartingLink?.speedParkProfile?.driverName);
    console.log('   aliases:', user.kartingLink?.speedParkProfile?.aliases);
    console.log('   kartingLink.status:', user.kartingLink?.status);
    
    // Buscar escudería
    const squadron = await Squadron.findOne({ members: user._id, isActive: true }).lean();
    if (squadron) {
      console.log('   🏁 Escudería:', squadron.name);
    } else {
      console.log('   ⚠️ Sin escudería');
    }
    console.log('');
  }
  
  await mongoose.connection.close();
}

test().catch(console.error);
