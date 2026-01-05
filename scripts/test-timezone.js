// Test timezone conversion methods

// Método actual que estamos usando
function toChileTimeOLD(date) {
  const chileDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  return {
    hour: chileDate.getHours(),
    weekday: chileDate.getDay(),
    date: chileDate
  };
}

// Método alternativo más robusto
function toChileTimeNEW(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type) => parts.find(p => p.type === type)?.value;

  const year = getValue('year');
  const month = getValue('month');
  const day = getValue('day');
  const hour = getValue('hour');
  const minute = getValue('minute');
  const second = getValue('second');

  const chileDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);

  return {
    hour: parseInt(hour),
    weekday: chileDate.getDay(),
    date: chileDate
  };
}

// Test con fecha real de la base de datos
const testDates = [
  // Ejemplos de sesiones que deberían estar entre 10:00-22:00 hora Chile
  new Date('2026-01-05T13:27:31.000Z'), // Domingo 13:27 UTC = 10:27 Chile
  new Date('2026-01-05T15:59:02.000Z'), // Domingo 15:59 UTC = 12:59 Chile
  new Date('2026-01-04T23:30:00.000Z'), // Sábado 23:30 UTC = 20:30 Chile (sábado)
  new Date('2026-01-05T01:30:00.000Z'), // Domingo 01:30 UTC = 22:30 Chile (SÁBADO!)
];

console.log('🔍 TESTING TIMEZONE CONVERSION\n');

testDates.forEach((date, i) => {
  console.log(`\n📅 Test ${i + 1}:`);
  console.log(`  UTC Date: ${date.toISOString()}`);
  console.log(`  UTC Hour: ${date.getHours()}:${date.getMinutes()}`);
  console.log(`  UTC Day: ${date.getDay()} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()]})`);

  const oldResult = toChileTimeOLD(date);
  console.log(`\n  ❌ OLD METHOD (toLocaleString):`);
  console.log(`     Chile Hour: ${oldResult.hour}:00`);
  console.log(`     Chile Day: ${oldResult.weekday} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][oldResult.weekday]})`);

  const newResult = toChileTimeNEW(date);
  console.log(`\n  ✅ NEW METHOD (Intl.DateTimeFormat):`);
  console.log(`     Chile Hour: ${newResult.hour}:00`);
  console.log(`     Chile Day: ${newResult.weekday} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][newResult.weekday]})`);

  // También mostrar lo que dice directamente toLocaleString
  const directLocale = date.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  console.log(`\n  📍 Direct toLocaleString: ${directLocale}`);
});

console.log('\n\n🎯 EXPECTED RESULTS:');
console.log('  Test 1: Should be ~10:27 Chile (Domingo)');
console.log('  Test 2: Should be ~12:59 Chile (Domingo)');
console.log('  Test 3: Should be ~20:30 Chile (Sábado)');
console.log('  Test 4: Should be ~22:30 Chile (SÁBADO, not Domingo!)');
