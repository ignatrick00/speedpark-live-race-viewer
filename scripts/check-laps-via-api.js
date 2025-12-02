// Script para verificar las últimas vueltas registradas vía API
async function checkRecentLaps() {
  try {
    console.log('=== VERIFICANDO ÚLTIMAS VUELTAS ===\n');

    // Tiempos que buscamos
    const ignacioTimes = [39.501, 40.170, 42.026];
    const palomaTimes = [45.862, 47.220, 49.484];

    console.log('Tiempos de Ignacio (Kart #19):');
    ignacioTimes.forEach(t => console.log(`  - ${t}s`));

    console.log('\nTiempos de Paloma (Kart #14):');
    palomaTimes.forEach(t => console.log(`  - ${t}s`));

    console.log('\n📋 Para verificar si se grabaron:');
    console.log('\n1. Ve a: http://localhost:3000/api/lap-capture?action=get_recent_laps&limit=20');
    console.log('   (Esto te mostrará las últimas 20 vueltas registradas)');

    console.log('\n2. Busca en el JSON si aparecen estos tiempos exactos');

    console.log('\n3. O ve al Dashboard y revisa la tabla de "Historial de Carreras"');
    console.log('   URL: http://localhost:3000/dashboard');

    console.log('\n\n=== ALTERNATIVA: Usar MongoDB Compass ===');
    console.log('1. Conectar a tu cluster de MongoDB');
    console.log('2. Ir a la colección "laps"');
    console.log('3. Buscar por: { kartNumber: 19 }  o  { kartNumber: 14 }');
    console.log('4. Ordenar por timestamp descendente (más recientes primero)');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentLaps();
