const mongoose = require('mongoose');

const SquadronEventSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
  eventDate: Date,
  registrationDeadline: Date,
  location: String,
  maxSquadrons: Number,
  minPilotsPerSquadron: Number,
  maxPilotsPerSquadron: Number,
  pointsForWinner: Number,
  pointsDistribution: [{ position: Number, points: Number }],
  participants: Array,
  results: Array,
  status: String,
  publishedAt: Date,
  completedAt: Date,
}, { timestamps: true });

const SquadronEvent = mongoose.models.SquadronEvent || mongoose.model('SquadronEvent', SquadronEventSchema);

async function checkEvents() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const events = await SquadronEvent.find().sort({ createdAt: -1 });

    console.log(`📊 Total de eventos: ${events.length}\n`);

    if (events.length === 0) {
      console.log('❌ No hay eventos en la base de datos');
    } else {
      events.forEach((event, index) => {
        console.log(`\n--- Evento ${index + 1} ---`);
        console.log(`ID: ${event._id}`);
        console.log(`Nombre: ${event.name}`);
        console.log(`Categoría: ${event.category}`);
        console.log(`Estado: ${event.status}`);
        console.log(`Fecha del evento: ${event.eventDate}`);
        console.log(`Creado por: ${event.createdBy}`);
        console.log(`Creado el: ${event.createdAt}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Verificación completada');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkEvents();
