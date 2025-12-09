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
  
  const userId = '6931e8329086701279fb4131';
  const user = await WebUser.findById(userId).lean();
  
  if (user) {
    console.log('👤 Usuario encontrado:');
    console.log('   Email:', user.email);
    console.log('   _id:', user._id);
    console.log('   firstName:', user.profile?.firstName);
    console.log('   lastName:', user.profile?.lastName);
    console.log('   alias:', user.profile?.alias);
    console.log('   driverName:', user.kartingLink?.speedParkProfile?.driverName);
    console.log('   aliases:', user.kartingLink?.speedParkProfile?.aliases);
    console.log('   kartingLink.status:', user.kartingLink?.status);
    console.log('   kartingLink.personId:', user.kartingLink?.personId);
  } else {
    console.log('❌ Usuario no encontrado');
  }
  
  await mongoose.connection.close();
}

test().catch(console.error);
