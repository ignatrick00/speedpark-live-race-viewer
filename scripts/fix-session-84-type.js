/**
 * Script de migración puntual para corregir el tipo de la sesión #84
 *
 * Problema: Sesión #84 tiene typo "Carerra" y fue clasificada como "otro"
 * Solución: Cambiar sessionType de "otro" a "carrera" solo para sesiones
 * que tienen "Carerra" en el nombre (typo de "Carrera")
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let MONGODB_URI = '';

for (const line of envLines) {
  if (line.startsWith('MONGODB_URI=')) {
    MONGODB_URI = line.split('=')[1].trim().replace(/['"]/g, '');
    break;
  }
}

const DB_NAME = 'karting';

async function fixSession84Type() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI no está definida en .env.local');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔗 Conectando a MongoDB...');
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection('race_sessions_v0');

    // Buscar sesiones con typo "Carerra" que están como "otro"
    console.log('\n🔍 Buscando sesiones con typo "Carerra"...');
    const sessionsWithTypo = await collection.find({
      sessionId: /Carerra/i,
      sessionType: 'otro'
    }).toArray();

    console.log(`📊 Encontradas ${sessionsWithTypo.length} sesiones con typo`);

    if (sessionsWithTypo.length === 0) {
      console.log('✅ No hay sesiones que corregir');
      return;
    }

    // Mostrar sesiones encontradas
    console.log('\n📋 Sesiones a corregir:');
    sessionsWithTypo.forEach(session => {
      console.log(`   - ${session.sessionId} (${session.sessionName}) - Tipo actual: ${session.sessionType}`);
    });

    // Confirmar antes de proceder
    console.log('\n⚠️  ¿Deseas cambiar estas sesiones de "otro" a "carrera"?');
    console.log('   Presiona Ctrl+C para cancelar, o espera 5 segundos para continuar...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Actualizar sessionType
    console.log('\n🔧 Actualizando sessionType...');
    const result = await collection.updateMany(
      {
        sessionId: /Carerra/i,
        sessionType: 'otro'
      },
      {
        $set: { sessionType: 'carrera' }
      }
    );

    console.log(`✅ Actualizado: ${result.modifiedCount} sesiones`);
    console.log('\n📊 Resumen:');
    console.log(`   - Sesiones encontradas: ${sessionsWithTypo.length}`);
    console.log(`   - Sesiones modificadas: ${result.modifiedCount}`);

    // Verificar el cambio
    console.log('\n🔍 Verificando cambios...');
    const verifySession = await collection.findOne({
      sessionId: /84.*Carerra/i
    });

    if (verifySession) {
      console.log(`✅ Sesión #84 ahora tiene tipo: "${verifySession.sessionType}"`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Conexión cerrada');
  }
}

// Ejecutar
fixSession84Type().catch(console.error);
