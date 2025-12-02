const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
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

const SquadronEventSchema = new mongoose.Schema({}, { strict: false });
const SquadronEvent = mongoose.model('SquadronEvent', SquadronEventSchema, 'squadronevents');

async function listEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const events = await SquadronEvent.find({}).sort({ createdAt: -1 }).limit(5);
    
    console.log(`\n📋 Últimos ${events.length} eventos:\n`);
    events.forEach((event, i) => {
      console.log(`${i + 1}. ${event.name || 'Sin nombre'}`);
      console.log(`   ID: ${event._id}`);
      console.log(`   Estado: ${event.status || 'N/A'}`);
      console.log(`   Creado por: ${event.createdBy || 'N/A'}`);
      console.log(`   Fecha: ${event.eventDate || 'N/A'}`);
      console.log(`   Hora: ${event.eventTime || 'N/A'}`);
      console.log(`   Duración: ${event.duration || 'N/A'} min`);
      console.log(`   Categoría: ${event.category || 'N/A'}`);
      console.log(`   Creado: ${event.createdAt || 'N/A'}`);
      console.log('');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listEvents();
