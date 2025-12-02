const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});
process.env.MONGODB_URI = envVars.MONGODB_URI;

const UserSchema = new mongoose.Schema({}, { strict: false });
const WebUser = mongoose.model('WebUser', UserSchema, 'webusers');

async function checkOrganizer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const organizerId = '690012dce9951b0faf9c4f9c';
    const user = await WebUser.findById(organizerId);
    
    if (user) {
      console.log(`\n👤 Usuario que creó los eventos:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nombre: ${user.profile?.firstName} ${user.profile?.lastName}`);
      console.log(`   ID: ${user._id}`);
    } else {
      console.log('❌ Usuario no encontrado');
    }

    // Also find organizer
    const organizer = await WebUser.findOne({ email: 'icabreraquezada@gmail.com' });
    if (organizer) {
      console.log(`\n🔧 Organizador autorizado:`);
      console.log(`   Email: ${organizer.email}`);
      console.log(`   ID: ${organizer._id}`);
      console.log(`\n${organizerId === organizer._id.toString() ? '✅ MISMO USUARIO' : '❌ USUARIOS DIFERENTES'}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkOrganizer();
