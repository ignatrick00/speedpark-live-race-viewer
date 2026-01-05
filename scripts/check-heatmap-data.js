const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ignaciocabrera:Curicat00@cluster0.mongodb.net/speedpark?retryWrites=true&w=majority';

const RaceSessionV0Schema = new mongoose.Schema({
  sessionId: String,
  sessionName: String,
  sessionType: String,
  sessionDate: Date,
  drivers: [{
    driverName: String,
    kartNumber: Number,
    position: Number,
    bestTime: Number,
    lastTime: Number,
    gap: String,
    laps: Number
  }]
}, {
  collection: 'race_sessions_v0',
  timestamps: false
});

const RaceSessionV0 = mongoose.model('RaceSessionV0Check', RaceSessionV0Schema);

async function checkHeatmapData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Buscar todas las sesiones de clasificación
    const sessions = await RaceSessionV0.find({
      sessionName: { $regex: /clasificacion/i }
    }).sort({ sessionDate: -1 }).lean();

    console.log(`\n📊 Total clasificaciones encontradas: ${sessions.length}\n`);

    // Agrupar por fecha
    const byDate = new Map();
    const byWeekday = new Map();
    const byHour = new Map();

    sessions.forEach(s => {
      const date = new Date(s.sessionDate);
      const dateKey = date.toISOString().split('T')[0];
      const weekday = date.getDay();
      const hour = date.getHours();

      // Por fecha
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey).push(s.sessionName);

      // Por día de semana
      if (!byWeekday.has(weekday)) {
        byWeekday.set(weekday, 0);
      }
      byWeekday.set(weekday, byWeekday.get(weekday) + 1);

      // Por hora
      if (!byHour.has(hour)) {
        byHour.set(hour, 0);
      }
      byHour.set(hour, byHour.get(hour) + 1);
    });

    console.log('📅 Sesiones por fecha:');
    Array.from(byDate.entries()).forEach(([date, sessions]) => {
      const d = new Date(date);
      const weekdayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
      console.log(`  ${date} (${weekdayName}): ${sessions.length} sesiones`);
    });

    console.log('\n📊 Sesiones por día de semana:');
    const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    for (let i = 0; i < 7; i++) {
      const count = byWeekday.get(i) || 0;
      console.log(`  ${weekdayNames[i]}: ${count} sesiones`);
    }

    console.log('\n⏰ Sesiones por hora:');
    for (let h = 0; h < 24; h++) {
      const count = byHour.get(h) || 0;
      if (count > 0) {
        console.log(`  ${h}:00: ${count} sesiones`);
      }
    }

    // Mostrar últimas 5 sesiones
    console.log('\n🔍 Últimas 5 clasificaciones:');
    sessions.slice(0, 5).forEach(s => {
      const date = new Date(s.sessionDate);
      console.log(`  ${s.sessionName} - ${date.toLocaleString('es-CL')} - ${s.drivers?.length || 0} pilotos`);
    });

    // Rango de fechas total
    if (sessions.length > 0) {
      const oldest = new Date(sessions[sessions.length - 1].sessionDate);
      const newest = new Date(sessions[0].sessionDate);
      console.log(`\n📆 Rango de fechas: ${oldest.toLocaleDateString('es-CL')} - ${newest.toLocaleDateString('es-CL')}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkHeatmapData();
