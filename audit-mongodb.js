// MongoDB Connection Audit Script
// Usage: mongosh "mongodb+srv://..." --username icabreraquezada audit-mongodb.js

print("🔍 AUDITORÍA DE CONEXIONES MONGODB\n");

// 1. Ver información del servidor
print("📊 Información del Cluster:");
const serverStatus = db.serverStatus();
print(`- Versión: ${serverStatus.version}`);
print(`- Uptime: ${Math.floor(serverStatus.uptime / 60)} minutos`);
print(`- Conexiones actuales: ${serverStatus.connections.current}`);
print(`- Conexiones disponibles: ${serverStatus.connections.available}`);
print(`- Conexiones totales creadas: ${serverStatus.connections.totalCreated}`);

print("\n🔌 CONEXIONES ACTIVAS:");

// 2. Ver conexiones activas detalladas
const currentOps = db.currentOp({});
const activeConnections = currentOps.inprog;

print(`- Total operaciones activas: ${activeConnections.length}\n`);

// Agrupar por cliente
const connectionsByClient = {};
activeConnections.forEach(op => {
  const client = op.client || "unknown";
  if (!connectionsByClient[client]) {
    connectionsByClient[client] = [];
  }
  connectionsByClient[client].push(op);
});

print("📍 Conexiones por origen:");
Object.keys(connectionsByClient).forEach(client => {
  const ops = connectionsByClient[client];
  print(`  ${client}: ${ops.length} operaciones`);

  // Mostrar detalles de las primeras 3
  ops.slice(0, 3).forEach(op => {
    print(`    - ${op.op}: ${op.ns || 'N/A'} (${op.secs_running || 0}s running)`);
  });

  if (ops.length > 3) {
    print(`    ... y ${ops.length - 3} más`);
  }
});

print("\n📈 ESTADÍSTICAS POR BASE DE DATOS:");

// 3. Ver estadísticas de bases de datos
const databases = db.adminCommand({ listDatabases: 1 });
databases.databases.forEach(database => {
  if (database.name === "karteando") {
    print(`\n🎯 Base de datos: ${database.name}`);
    print(`   Tamaño: ${(database.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);

    // Cambiar a la base de datos
    db = db.getSiblingDB(database.name);

    // Ver colecciones
    const collections = db.getCollectionNames();
    print(`   Colecciones: ${collections.length}`);

    collections.forEach(collName => {
      const stats = db.getCollection(collName).stats();
      print(`     - ${collName}:`);
      print(`       Documentos: ${stats.count}`);
      print(`       Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
    });
  }
});

print("\n✅ Auditoría completada");
