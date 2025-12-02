const mongoose = require('mongoose');

// Usar la URI directamente
const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';

const FriendlyRaceSchema = new mongoose.Schema({
  name: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
  date: Date,
  time: String,
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
    kartNumber: Number,
    joinedAt: Date,
  }],
  maxParticipants: Number,
  status: String,
  createdAt: Date,
});

const FriendlyRace = mongoose.models.FriendlyRace || mongoose.model('FriendlyRace', FriendlyRaceSchema);

async function deleteAllRaces() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Mostrar todas las carreras antes de borrar
    const races = await FriendlyRace.find().populate('createdBy', 'email profile');
    console.log(`\n📋 Carreras encontradas: ${races.length}`);

    races.forEach((race, idx) => {
      console.log(`\n${idx + 1}. ${race.name}`);
      console.log(`   ID: ${race._id}`);
      console.log(`   Fecha: ${race.date} - ${race.time}`);
      console.log(`   Participantes: ${race.participants.length}`);
      console.log(`   Creador: ${race.createdBy?.email || 'N/A'}`);
    });

    // Confirmar antes de borrar
    console.log('\n⚠️  ¿Quieres borrar TODAS las carreras? Presiona Ctrl+C para cancelar...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await FriendlyRace.deleteMany({});
    console.log(`\n🗑️  Borradas ${result.deletedCount} carreras`);

    await mongoose.connection.close();
    console.log('✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteAllRaces();
