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

const RaceSessionV0 = mongoose.model('RaceSessionV0StatsOnly', RaceSessionV0Schema);

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

async function statsAnalysis() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Rango: último mes
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    console.log(`📊 ANÁLISIS ESTADÍSTICO - ÚLTIMO MES`);
    console.log(`📅 Período: ${startDate.toLocaleDateString('es-CL')} - ${endDate.toLocaleDateString('es-CL')}`);
    console.log(`⏰ Horario de operación: 10:00 AM - 10:00 PM\n`);
    console.log('='.repeat(100));

    const allSessions = await RaceSessionV0.find({
      sessionName: { $regex: /clasificacion/i },
      sessionDate: { $gte: startDate, $lte: endDate }
    }).lean();

    // Filtrar solo sesiones dentro del horario de operación (10:00-22:00)
    const sessions = allSessions.filter(s => {
      const { hour } = toChileTime(new Date(s.sessionDate));
      return hour >= 10 && hour <= 22;
    });

    console.log(`\n📈 RESUMEN GENERAL`);
    console.log('='.repeat(100));

    const totalSessions = sessions.length;
    const totalDrivers = sessions.reduce((acc, s) => acc + (s.drivers?.length || 0), 0);
    const totalRevenue = totalDrivers * 17000;
    const avgDriversPerSession = totalDrivers / totalSessions;

    console.log(`Total de clasificaciones: ${totalSessions}`);
    console.log(`Total de pilotos: ${totalDrivers.toLocaleString('es-CL')}`);
    console.log(`Ingresos totales: $${totalRevenue.toLocaleString('es-CL')}`);
    console.log(`Promedio pilotos por sesión: ${avgDriversPerSession.toFixed(2)}`);
    console.log(`Ingreso promedio por sesión: $${(totalRevenue / totalSessions).toLocaleString('es-CL')}`);
    console.log(`Ingreso promedio por día: $${(totalRevenue / 30).toLocaleString('es-CL')}`);

    // Análisis por día de la semana
    console.log(`\n\n📅 DISTRIBUCIÓN POR DÍA DE LA SEMANA`);
    console.log('='.repeat(100));

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

    console.log('\n' + 'Día'.padEnd(15) + 'Sesiones'.padStart(12) + 'Pilotos'.padStart(12) + 'Ingresos'.padStart(18) + 'Prom. Pilotos/Sesión'.padStart(25) + '% del Total'.padStart(15));
    console.log('-'.repeat(100));

    weekdayStats.forEach(stat => {
      const avgDrivers = stat.sessions > 0 ? (stat.drivers / stat.sessions).toFixed(2) : '0.00';
      const percentOfTotal = ((stat.revenue / totalRevenue) * 100).toFixed(1);
      console.log(
        stat.name.padEnd(15) +
        String(stat.sessions).padStart(12) +
        String(stat.drivers).padStart(12) +
        ('$' + stat.revenue.toLocaleString('es-CL')).padStart(18) +
        avgDrivers.padStart(25) +
        (percentOfTotal + '%').padStart(15)
      );
    });

    // Totales
    const totalWeekSessions = weekdayStats.reduce((sum, d) => sum + d.sessions, 0);
    const totalWeekDrivers = weekdayStats.reduce((sum, d) => sum + d.drivers, 0);
    const totalWeekRevenue = weekdayStats.reduce((sum, d) => sum + d.revenue, 0);
    console.log('-'.repeat(100));
    console.log(
      'TOTAL'.padEnd(15) +
      String(totalWeekSessions).padStart(12) +
      String(totalWeekDrivers).padStart(12) +
      ('$' + totalWeekRevenue.toLocaleString('es-CL')).padStart(18) +
      (totalWeekDrivers / totalWeekSessions).toFixed(2).padStart(25) +
      '100.0%'.padStart(15)
    );

    // Análisis por hora del día (solo 10:00-22:00)
    console.log(`\n\n⏰ DISTRIBUCIÓN POR HORA DEL DÍA (10:00 AM - 10:00 PM)`);
    console.log('='.repeat(100));

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

    // Filtrar solo horario de operación
    const activeHours = hourlyStats.filter(h => h.hour >= 10 && h.hour <= 22);

    console.log('\n' + 'Hora'.padEnd(15) + 'Sesiones'.padStart(12) + 'Pilotos'.padStart(12) + 'Ingresos'.padStart(18) + 'Prom. Pilotos/Sesión'.padStart(25) + '% del Total'.padStart(15));
    console.log('-'.repeat(100));

    activeHours.forEach(stat => {
      const avgDrivers = stat.sessions > 0 ? (stat.drivers / stat.sessions).toFixed(2) : '0.00';
      const percentOfTotal = ((stat.revenue / totalRevenue) * 100).toFixed(1);
      const hourLabel = `${stat.hour}:00 - ${stat.hour + 1}:00`;
      console.log(
        hourLabel.padEnd(15) +
        String(stat.sessions).padStart(12) +
        String(stat.drivers).padStart(12) +
        ('$' + stat.revenue.toLocaleString('es-CL')).padStart(18) +
        avgDrivers.padStart(25) +
        (percentOfTotal + '%').padStart(15)
      );
    });

    const totalHourSessions = activeHours.reduce((sum, h) => sum + h.sessions, 0);
    const totalHourDrivers = activeHours.reduce((sum, h) => sum + h.drivers, 0);
    const totalHourRevenue = activeHours.reduce((sum, h) => sum + h.revenue, 0);
    console.log('-'.repeat(100));
    console.log(
      'TOTAL'.padEnd(15) +
      String(totalHourSessions).padStart(12) +
      String(totalHourDrivers).padStart(12) +
      ('$' + totalHourRevenue.toLocaleString('es-CL')).padStart(18) +
      (totalHourDrivers / totalHourSessions).toFixed(2).padStart(25) +
      '100.0%'.padStart(15)
    );

    // Estadísticas adicionales
    console.log(`\n\n📊 ESTADÍSTICAS COMPARATIVAS`);
    console.log('='.repeat(100));

    const peakHour = activeHours.reduce((max, curr) => curr.drivers > max.drivers ? curr : max, activeHours[0]);
    const lowHour = activeHours.filter(h => h.sessions > 0).reduce((min, curr) => curr.drivers < min.drivers ? curr : min, activeHours.find(h => h.sessions > 0));
    const peakDay = weekdayStats.reduce((max, curr) => curr.drivers > max.drivers ? curr : max, weekdayStats[0]);
    const lowDay = weekdayStats.filter(d => d.sessions > 0).reduce((min, curr) => curr.drivers < min.drivers ? curr : min, weekdayStats.find(d => d.sessions > 0));

    console.log(`\nHorario con mayor demanda:`);
    console.log(`  ${peakHour.hour}:00 - ${peakHour.hour + 1}:00 con ${peakHour.drivers} pilotos (${peakHour.sessions} sesiones, promedio ${(peakHour.drivers / peakHour.sessions).toFixed(2)} pilotos/sesión)`);

    console.log(`\nHorario con menor demanda:`);
    console.log(`  ${lowHour.hour}:00 - ${lowHour.hour + 1}:00 con ${lowHour.drivers} pilotos (${lowHour.sessions} sesiones, promedio ${(lowHour.drivers / lowHour.sessions).toFixed(2)} pilotos/sesión)`);

    console.log(`\nDía con mayor demanda:`);
    console.log(`  ${peakDay.name} con ${peakDay.drivers} pilotos (${peakDay.sessions} sesiones, promedio ${(peakDay.drivers / peakDay.sessions).toFixed(2)} pilotos/sesión)`);

    console.log(`\nDía con menor demanda:`);
    console.log(`  ${lowDay.name} con ${lowDay.drivers} pilotos (${lowDay.sessions} sesiones, promedio ${(lowDay.drivers / lowDay.sessions).toFixed(2)} pilotos/sesión)`);

    // Análisis de tendencias
    console.log(`\n\n📈 ANÁLISIS DE TENDENCIAS`);
    console.log('='.repeat(100));

    const avgRevenuePerDay = totalRevenue / 30;
    const avgSessionsPerDay = totalSessions / 30;
    const avgDriversPerDay = totalDrivers / 30;

    console.log(`\nPromedios diarios:`);
    console.log(`  Sesiones por día: ${avgSessionsPerDay.toFixed(2)}`);
    console.log(`  Pilotos por día: ${avgDriversPerDay.toFixed(2)}`);
    console.log(`  Ingresos por día: $${avgRevenuePerDay.toLocaleString('es-CL')}`);

    console.log(`\nDistribución semanal (% de ingresos):`);
    console.log(`  Fin de semana (Vie-Dom): ${(((weekdayStats[5].revenue + weekdayStats[6].revenue + weekdayStats[0].revenue) / totalRevenue) * 100).toFixed(1)}%`);
    console.log(`  Entre semana (Lun-Jue): ${(((weekdayStats[1].revenue + weekdayStats[2].revenue + weekdayStats[3].revenue + weekdayStats[4].revenue) / totalRevenue) * 100).toFixed(1)}%`);

    console.log(`\nDistribución por franja horaria (% de ingresos):`);
    const morningRevenue = hourlyStats.filter(h => h.hour >= 10 && h.hour < 14).reduce((sum, h) => sum + h.revenue, 0);
    const afternoonRevenue = hourlyStats.filter(h => h.hour >= 14 && h.hour < 18).reduce((sum, h) => sum + h.revenue, 0);
    const eveningRevenue = hourlyStats.filter(h => h.hour >= 18 && h.hour <= 22).reduce((sum, h) => sum + h.revenue, 0);

    console.log(`  Mañana (10:00-14:00): ${((morningRevenue / totalRevenue) * 100).toFixed(1)}%`);
    console.log(`  Tarde (14:00-18:00): ${((afternoonRevenue / totalRevenue) * 100).toFixed(1)}%`);
    console.log(`  Noche (18:00-22:00): ${((eveningRevenue / totalRevenue) * 100).toFixed(1)}%`);

    console.log(`\n\n${'='.repeat(100)}`);
    console.log(`📊 Reporte generado: ${new Date().toLocaleString('es-CL')}`);
    console.log(`${'='.repeat(100)}\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

statsAnalysis();
