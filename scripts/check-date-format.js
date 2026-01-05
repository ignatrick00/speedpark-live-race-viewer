const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';

const RaceSessionV0Schema = new mongoose.Schema({
  sessionId: String,
  sessionName: String,
  sessionDate: Date,
  drivers: [{
    driverName: String,
    kartNumber: Number
  }]
}, {
  collection: 'race_sessions_v0',
  timestamps: false
});

const RaceSessionV0 = mongoose.model('RaceSessionV0Check2', RaceSessionV0Schema);

async function checkDateFormat() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const sessions = await RaceSessionV0.find({
      sessionName: { $regex: /clasificacion/i }
    })
    .sort({ sessionDate: -1 })
    .limit(10)
    .lean();

    console.log('🔍 Últimas 10 sesiones - Análisis de fechas:\n');

    sessions.forEach((s, i) => {
      const date = new Date(s.sessionDate);

      console.log(`${i + 1}. ${s.sessionName}`);
      console.log(`   Raw DB value: ${s.sessionDate}`);
      console.log(`   JS Date object: ${date}`);
      console.log(`   ISO String (UTC): ${date.toISOString()}`);
      console.log(`   UTC: ${date.toUTCString()}`);
      console.log(`   getHours() [UTC]: ${date.getHours()}:${date.getMinutes()}`);
      console.log(`   getDay() [UTC]: ${date.getDay()} = ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()]}`);

      // Convertir a Chile
      const chileStr = date.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
      console.log(`   Chile toString: ${chileStr}`);

      // ¿Qué hora es ahora en Chile?
      const now = new Date();
      const nowChile = now.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
      console.log(`   (Hora actual Chile: ${nowChile})`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDateFormat();
