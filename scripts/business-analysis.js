const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';

const RaceSessionV0Schema = new mongoose.Schema({
  sessionId: String,
  sessionName: String,
  sessionType: String,
  sessionDate: Date,
  drivers: [{
    driverName: String,
    kartNumber: Number,
    position: Number,
    bestTime: Number
  }]
}, {
  collection: 'race_sessions_v0',
  timestamps: false
});

const RaceSessionV0 = mongoose.model('RaceSessionV0Analysis', RaceSessionV0Schema);

// Helper para convertir UTC a hora Chile (+3 horas)
function toChileTime(date) {
  const dbHour = date.getHours();
  const dbDay = date.getDay();

  let chileHour = dbHour + 3;
  let chileDay = dbDay;

  if (chileHour >= 24) {
    chileHour -= 24;
    chileDay = (dbDay + 1) % 7;
  }

  return { hour: chileHour, weekday: chileDay };
}

async function businessAnalysis() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Rango: último mes
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    console.log(`📊 ANÁLISIS DE NEGOCIO - ÚLTIMO MES`);
    console.log(`📅 Período: ${startDate.toLocaleDateString('es-CL')} - ${endDate.toLocaleDateString('es-CL')}\n`);
    console.log('='.repeat(80));

    const sessions = await RaceSessionV0.find({
      sessionName: { $regex: /clasificacion/i },
      sessionDate: { $gte: startDate, $lte: endDate }
    }).lean();

    console.log(`\n📈 RESUMEN GENERAL`);
    console.log('='.repeat(80));

    const totalSessions = sessions.length;
    const totalDrivers = sessions.reduce((acc, s) => acc + (s.drivers?.length || 0), 0);
    const totalRevenue = totalDrivers * 17000;
    const avgDriversPerSession = totalDrivers / totalSessions;

    console.log(`🏁 Total clasificaciones: ${totalSessions}`);
    console.log(`👥 Total pilotos: ${totalDrivers}`);
    console.log(`💰 Ingresos totales: $${totalRevenue.toLocaleString('es-CL')}`);
    console.log(`📊 Promedio pilotos/sesión: ${avgDriversPerSession.toFixed(1)}`);

    // Análisis por día de la semana
    console.log(`\n\n📅 ANÁLISIS POR DÍA DE LA SEMANA`);
    console.log('='.repeat(80));

    const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const weekdayStats = Array(7).fill(0).map((_, day) => ({
      day,
      name: weekdayNames[day],
      sessions: 0,
      drivers: 0,
      revenue: 0
    }));

    sessions.forEach(s => {
      const { weekday } = toChileTime(new Date(s.sessionDate));
      const driversCount = s.drivers?.length || 0;

      weekdayStats[weekday].sessions += 1;
      weekdayStats[weekday].drivers += driversCount;
      weekdayStats[weekday].revenue += driversCount * 17000;
    });

    weekdayStats.forEach(stat => {
      const avgDrivers = stat.sessions > 0 ? (stat.drivers / stat.sessions).toFixed(1) : 0;
      console.log(`${stat.name.padEnd(12)} | Sesiones: ${String(stat.sessions).padStart(3)} | Pilotos: ${String(stat.drivers).padStart(4)} | Ingresos: $${stat.revenue.toLocaleString('es-CL').padStart(10)} | Promedio: ${avgDrivers} pilotos/sesión`);
    });

    // Encontrar días de bajo rendimiento
    const avgRevenuePerDay = weekdayStats.reduce((sum, d) => sum + d.revenue, 0) / 7;
    const lowPerformanceDays = weekdayStats
      .filter(d => d.revenue < avgRevenuePerDay * 0.7)
      .sort((a, b) => a.revenue - b.revenue);

    // Análisis por hora
    console.log(`\n\n⏰ ANÁLISIS POR HORA DEL DÍA`);
    console.log('='.repeat(80));

    const hourlyStats = Array(24).fill(0).map((_, hour) => ({
      hour,
      sessions: 0,
      drivers: 0,
      revenue: 0
    }));

    sessions.forEach(s => {
      const { hour } = toChileTime(new Date(s.sessionDate));
      const driversCount = s.drivers?.length || 0;

      hourlyStats[hour].sessions += 1;
      hourlyStats[hour].drivers += driversCount;
      hourlyStats[hour].revenue += driversCount * 17000;
    });

    const activeHours = hourlyStats.filter(h => h.sessions > 0);
    activeHours.forEach(stat => {
      const avgDrivers = stat.sessions > 0 ? (stat.drivers / stat.sessions).toFixed(1) : 0;
      console.log(`${String(stat.hour).padStart(2)}:00 | Sesiones: ${String(stat.sessions).padStart(3)} | Pilotos: ${String(stat.drivers).padStart(4)} | Ingresos: $${stat.revenue.toLocaleString('es-CL').padStart(10)} | Promedio: ${avgDrivers} pilotos/sesión`);
    });

    // Encontrar horarios de bajo rendimiento
    const avgRevenuePerHour = activeHours.reduce((sum, h) => sum + h.revenue, 0) / activeHours.length;
    const lowPerformanceHours = activeHours
      .filter(h => h.revenue < avgRevenuePerHour * 0.5)
      .sort((a, b) => a.revenue - b.revenue);

    // Encontrar picos
    const peakHour = hourlyStats.reduce((max, curr) => curr.drivers > max.drivers ? curr : max, hourlyStats[0]);
    const peakDay = weekdayStats.reduce((max, curr) => curr.drivers > max.drivers ? curr : max, weekdayStats[0]);

    // RECOMENDACIONES DE NEGOCIO
    console.log(`\n\n💡 RECOMENDACIONES ESTRATÉGICAS PARA AUMENTAR INGRESOS`);
    console.log('='.repeat(80));

    console.log(`\n1️⃣ HORARIOS DE BAJA DEMANDA (Oportunidad de eventos/promociones):`);
    console.log('-'.repeat(80));
    if (lowPerformanceHours.length > 0) {
      lowPerformanceHours.slice(0, 5).forEach(h => {
        const loss = avgRevenuePerHour - h.revenue;
        console.log(`   ⏰ ${h.hour}:00 - ${h.hour + 1}:00`);
        console.log(`      Actual: ${h.drivers} pilotos → $${h.revenue.toLocaleString('es-CL')}`);
        console.log(`      Potencial si alcanza promedio: +$${loss.toLocaleString('es-CL')}`);
        console.log(`      💡 Sugerencia: "Happy Hour ${h.hour}:00-${h.hour + 1}:00" - 2x1 o 30% descuento\n`);
      });
    }

    console.log(`\n2️⃣ DÍAS DE BAJA DEMANDA (Eventos especiales recomendados):`);
    console.log('-'.repeat(80));
    if (lowPerformanceDays.length > 0) {
      lowPerformanceDays.forEach(d => {
        const potentialGain = (avgRevenuePerDay - d.revenue);
        console.log(`   📅 ${d.name}`);
        console.log(`      Actual: ${d.drivers} pilotos → $${d.revenue.toLocaleString('es-CL')}`);
        console.log(`      Potencial adicional: +$${potentialGain.toLocaleString('es-CL')}`);
        console.log(`      💡 Ideas de eventos:`);
        if (d.name === 'Lunes' || d.name === 'Martes') {
          console.log(`         - "Lunes/Martes de Amigos" - Grupos 4+ pilotos: 20% descuento`);
          console.log(`         - Torneos corporativos con empresas locales`);
        }
        if (d.name === 'Miércoles') {
          console.log(`         - "Miércoles Universitario" - Descuento con carnet estudiante`);
          console.log(`         - Ladies Night - Descuento especial mujeres`);
        }
        console.log('');
      });
    }

    console.log(`\n3️⃣ ANÁLISIS DE HORARIOS PICO (Maximizar capacidad):`);
    console.log('-'.repeat(80));
    console.log(`   🔥 Hora pico: ${peakHour.hour}:00 - ${peakHour.hour + 1}:00`);
    console.log(`      ${peakHour.drivers} pilotos totales | ${peakHour.sessions} sesiones`);
    console.log(`      Promedio: ${(peakHour.drivers / peakHour.sessions).toFixed(1)} pilotos/sesión`);
    console.log(`      💡 Asegurar staff completo en esta franja horaria`);

    console.log(`\n   🌟 Día pico: ${peakDay.name}`);
    console.log(`      ${peakDay.drivers} pilotos totales | ${peakDay.sessions} sesiones`);
    console.log(`      Ingresos: $${peakDay.revenue.toLocaleString('es-CL')}`);
    console.log(`      💡 Considerar aumentar capacidad o precios premium en días pico`);

    console.log(`\n4️⃣ OPORTUNIDADES DE CRECIMIENTO:`);
    console.log('-'.repeat(80));

    const totalPotentialFromLowDays = lowPerformanceDays.reduce((sum, d) =>
      sum + (avgRevenuePerDay - d.revenue), 0
    );

    console.log(`   📈 Potencial de ingresos adicionales llevando días bajos al promedio:`);
    console.log(`      +$${totalPotentialFromLowDays.toLocaleString('es-CL')} por mes`);
    console.log(`      +$${(totalPotentialFromLowDays * 12).toLocaleString('es-CL')} por año\n`);

    console.log(`   🎯 Estrategias específicas:`);
    console.log(`      1. Paquetes mensuales/anuales con descuento (fidelización)`);
    console.log(`      2. Programa de referidos: "Trae un amigo y ambos obtienen 10% descuento"`);
    console.log(`      3. Torneos mensuales en horarios/días bajos`);
    console.log(`      4. Alianzas con empresas para team building`);
    console.log(`      5. Escuela de karting en horarios de baja demanda`);

    console.log(`\n5️⃣ ANÁLISIS DE PRECIO/DEMANDA:`);
    console.log('-'.repeat(80));
    const avgDailyRevenue = totalRevenue / 30;
    console.log(`   💰 Ingreso promedio diario: $${avgDailyRevenue.toLocaleString('es-CL')}`);
    console.log(`   📊 Con mejoras en días bajos, potencial diario: $${(avgDailyRevenue + totalPotentialFromLowDays/30).toLocaleString('es-CL')}`);
    console.log(`   🎯 Incremento proyectado: ${((totalPotentialFromLowDays / totalRevenue) * 100).toFixed(1)}%\n`);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 FIN DEL ANÁLISIS - Generado ${new Date().toLocaleString('es-CL')}`);
    console.log(`${'='.repeat(80)}\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

businessAnalysis();
