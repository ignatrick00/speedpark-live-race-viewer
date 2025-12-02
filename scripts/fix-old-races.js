require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

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

async function fixOldRaces() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const FriendlyRace = mongoose.model('FriendlyRace', FriendlyRaceSchema);

    // Buscar todas las carreras
    const races = await FriendlyRace.find({});
    console.log(`📊 Encontradas ${races.length} carreras`);

    let updated = 0;
    for (const race of races) {
      let needsUpdate = false;

      // Revisar cada participante
      for (let i = 0; i < race.participants.length; i++) {
        const participant = race.participants[i];

        // Si no tiene kartNumber, asignar uno automático (1, 2, 3...)
        if (!participant.kartNumber) {
          race.participants[i].kartNumber = i + 1;
          needsUpdate = true;
          console.log(`  ➕ Asignando kart #${i + 1} a participante en carrera "${race.name}"`);
        }
      }

      // Agregar status si no tiene
      if (!race.status) {
        race.status = 'open';
        needsUpdate = true;
        console.log(`  ➕ Agregando status 'open' a carrera "${race.name}"`);
      }

      if (needsUpdate) {
        await race.save();
        updated++;
        console.log(`✅ Actualizada carrera "${race.name}"`);
      }
    }

    console.log(`\n🎉 Actualización completa: ${updated} carreras actualizadas`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }
}

fixOldRaces();
