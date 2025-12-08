const { MongoClient } = require('mongodb');

// Leer directamente del archivo .env.local
const fs = require('fs');
const path = require('path');

let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match) {
      MONGODB_URI = match[1].trim();
    }
  } catch (e) {
    console.error('No se pudo leer .env.local');
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no encontrado');
  process.exit(1);
}

async function diagnoseConnections() {
  console.log('🔍 DIAGNÓSTICO DE CONEXIONES MONGODB\n');

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 1, // Solo 1 conexión para diagnóstico
    minPoolSize: 1
  });

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db();
    const admin = db.admin();

    // 1. Ver estadísticas de servidor
    console.log('📊 ESTADÍSTICAS DEL SERVIDOR:');
    const serverStatus = await admin.serverStatus();
    console.log('- Conexiones actuales:', serverStatus.connections.current);
    console.log('- Conexiones disponibles:', serverStatus.connections.available);
    console.log('- Conexiones totales permitidas:', serverStatus.connections.current + serverStatus.connections.available);
    console.log('- % Usado:', ((serverStatus.connections.current / (serverStatus.connections.current + serverStatus.connections.available)) * 100).toFixed(2) + '%\n');

    // 2. Ver operaciones actuales
    console.log('⚡ OPERACIONES ACTIVAS:');
    const currentOps = await db.admin().command({ currentOp: 1 });
    const activeOps = currentOps.inprog.filter(op => op.active);

    console.log('- Total operaciones activas:', activeOps.length);

    if (activeOps.length > 0) {
      console.log('\n📋 Primeras 10 operaciones:');
      activeOps.slice(0, 10).forEach((op, idx) => {
        console.log(`\n  ${idx + 1}. ${op.op || 'unknown'} en ${op.ns || 'unknown'}`);
        console.log(`     Cliente: ${op.client || 'unknown'}`);
        console.log(`     Duración: ${op.secs_running || 0}s`);
        console.log(`     App: ${op.appName || 'N/A'}`);
      });
    }

    // 3. Agrupar por cliente
    console.log('\n\n🌐 CONEXIONES POR CLIENTE:');
    const clientCounts = {};
    currentOps.inprog.forEach(op => {
      const client = op.client || 'unknown';
      const ip = client.split(':')[0];
      clientCounts[ip] = (clientCounts[ip] || 0) + 1;
    });

    Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ip, count]) => {
        console.log(`  ${ip}: ${count} conexiones`);
      });

    // 4. Ver conexiones por aplicación
    console.log('\n\n📱 CONEXIONES POR APLICACIÓN:');
    const appCounts = {};
    currentOps.inprog.forEach(op => {
      const app = op.appName || 'unknown';
      appCounts[app] = (appCounts[app] || 0) + 1;
    });

    Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([app, count]) => {
        console.log(`  ${app}: ${count} conexiones`);
      });

    // 5. Detectar conexiones idle (inactivas)
    console.log('\n\n💤 CONEXIONES IDLE (inactivas):');
    const idleOps = currentOps.inprog.filter(op => !op.active);
    console.log('- Total conexiones idle:', idleOps.length);

    if (idleOps.length > 5) {
      console.log('⚠️  PROBLEMA: Muchas conexiones idle - pueden estar sin cerrar correctamente');
    }

    // 6. Ver databases activas
    console.log('\n\n💾 DATABASES CON ACTIVIDAD:');
    const dbCounts = {};
    currentOps.inprog.forEach(op => {
      if (op.ns) {
        const dbName = op.ns.split('.')[0];
        dbCounts[dbName] = (dbCounts[dbName] || 0) + 1;
      }
    });

    Object.entries(dbCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dbName, count]) => {
        console.log(`  ${dbName}: ${count} operaciones`);
      });

    // RESUMEN
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN Y DIAGNÓSTICO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const percentUsed = (serverStatus.connections.current / (serverStatus.connections.current + serverStatus.connections.available)) * 100;

    if (percentUsed > 80) {
      console.log('🔴 CRÍTICO: Uso de conexiones > 80%');
      console.log('\nPosibles causas:');
      console.log('1. Conexiones no se están cerrando (revisar código)');
      console.log('2. Pool size muy grande (reducir maxPoolSize)');
      console.log('3. Múltiples instancias/deployments activos');
      console.log('4. Requests concurrentes muy altos');
    } else if (percentUsed > 50) {
      console.log('🟡 ADVERTENCIA: Uso de conexiones > 50%');
    } else {
      console.log('🟢 OK: Uso de conexiones normal');
    }

    console.log(`\nConexiones actuales: ${serverStatus.connections.current}`);
    console.log(`Idle: ${idleOps.length} (${((idleOps.length/serverStatus.connections.current)*100).toFixed(1)}%)`);
    console.log(`Activas: ${activeOps.length} (${((activeOps.length/serverStatus.connections.current)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('\n\n✅ Diagnóstico completado');
  }
}

diagnoseConnections();
