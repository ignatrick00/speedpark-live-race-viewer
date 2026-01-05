/**
 * Script de migración: Corregir sessionType de carreras con pistas alternativas
 *
 * Problema: Registros antiguos tienen sessionType='carrera' cuando deberían ser 'otro'
 * porque son de pistas alternativas (F1, K1, K2, GT, Mujeres, etc.)
 *
 * Este script:
 * 1. Busca todas las sesiones con sessionType='carrera'
 * 2. Valida el nombre usando la nueva lógica
 * 3. Actualiza a 'otro' si contiene keywords inválidas
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
const env = {};

envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const MONGODB_URI = env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no encontrado en .env.local');
  process.exit(1);
}

// Función de validación (igual que en raceSessionServiceV0.ts)
function isValidRaceSession(sessionName) {
  const nameLower = sessionName.toLowerCase();

  // Debe contener "carrera" o "race"
  if (!nameLower.includes('carrera') && !nameLower.includes('race')) {
    return false;
  }

  // Excluir pistas/categorías alternativas
  const invalidKeywords = [
    'f1', 'f2', 'f3', 'k 1', 'k 2', 'k 3', 'k1', 'k2', 'k3',
    'gt', 'mujeres', 'women', 'junior',
    ' m', // "Carrera M" (espacio antes para evitar false positives)
  ];

  const hasInvalidKeyword = invalidKeywords.some(keyword => nameLower.includes(keyword));

  return !hasInvalidKeyword; // Válida si NO tiene keywords inválidas
}

async function migrateRaceSessionsV0() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const RaceSessionV0 = mongoose.model('RaceSessionV0', new mongoose.Schema({}, {
      strict: false,
      collection: 'race_sessions_v0'
    }));

    // Buscar todas las sesiones con sessionType='carrera'
    console.log('\n📊 Buscando sesiones con sessionType="carrera"...');
    const sessions = await RaceSessionV0.find({ sessionType: 'carrera' });
    console.log(`✅ Encontradas ${sessions.length} sesiones`);

    let validCount = 0;
    let invalidCount = 0;
    const toUpdate = [];

    console.log('\n🔍 Validando sesiones...\n');

    sessions.forEach(session => {
      const isValid = isValidRaceSession(session.sessionName);

      if (isValid) {
        validCount++;
        console.log(`✅ VÁLIDA: ${session.sessionName}`);
      } else {
        invalidCount++;
        console.log(`❌ INVÁLIDA: ${session.sessionName} → cambiar a "otro"`);
        toUpdate.push(session._id);
      }
    });

    console.log(`\n📈 Resumen:`);
    console.log(`   ✅ Válidas: ${validCount}`);
    console.log(`   ❌ Inválidas: ${invalidCount}`);
    console.log(`   📝 A actualizar: ${toUpdate.length}`);

    if (toUpdate.length === 0) {
      console.log('\n✨ No hay registros para actualizar');
      await mongoose.disconnect();
      return;
    }

    // Pedir confirmación
    console.log('\n⚠️  ¿Deseas actualizar estos registros? (CTRL+C para cancelar)');
    console.log('   Esperando 5 segundos...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Actualizar registros
    console.log('\n🔄 Actualizando registros...');
    const result = await RaceSessionV0.updateMany(
      { _id: { $in: toUpdate } },
      { $set: { sessionType: 'otro' } }
    );

    console.log(`✅ Actualización completada:`);
    console.log(`   Documentos modificados: ${result.modifiedCount}`);
    console.log(`   Documentos encontrados: ${result.matchedCount}`);

    console.log('\n✨ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

async function migrateDriverRaceData() {
  try {
    console.log('\n\n🔗 Conectando a MongoDB (DriverRaceData)...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const DriverRaceData = mongoose.model('DriverRaceData', new mongoose.Schema({}, {
      strict: false,
      collection: 'driver_race_data'
    }));

    console.log('\n📊 Buscando drivers con sesiones...');
    const drivers = await DriverRaceData.find({ 'sessions.0': { $exists: true } });
    console.log(`✅ Encontrados ${drivers.length} drivers con sesiones`);

    let totalSessions = 0;
    let invalidSessions = 0;
    let driversToUpdate = [];

    console.log('\n🔍 Validando sesiones en driver_race_data...\n');

    for (const driver of drivers) {
      let driverModified = false;

      driver.sessions.forEach(session => {
        totalSessions++;

        if (session.sessionType === 'carrera') {
          const isValid = isValidRaceSession(session.sessionName);

          if (!isValid) {
            console.log(`❌ ${driver.driverName}: ${session.sessionName} → cambiar a "otro"`);
            session.sessionType = 'otro';
            invalidSessions++;
            driverModified = true;
          }
        }
      });

      if (driverModified) {
        driversToUpdate.push(driver);
      }
    }

    console.log(`\n📈 Resumen:`);
    console.log(`   📊 Total sesiones revisadas: ${totalSessions}`);
    console.log(`   ❌ Sesiones inválidas: ${invalidSessions}`);
    console.log(`   👥 Drivers a actualizar: ${driversToUpdate.length}`);

    if (driversToUpdate.length === 0) {
      console.log('\n✨ No hay registros para actualizar');
      await mongoose.disconnect();
      return;
    }

    // Pedir confirmación
    console.log('\n⚠️  ¿Deseas actualizar estos registros? (CTRL+C para cancelar)');
    console.log('   Esperando 5 segundos...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Guardar cambios
    console.log('\n🔄 Guardando cambios...');
    let savedCount = 0;

    for (const driver of driversToUpdate) {
      await driver.save();
      savedCount++;
      if (savedCount % 10 === 0) {
        console.log(`   Guardados: ${savedCount}/${driversToUpdate.length}`);
      }
    }

    console.log(`✅ Actualización completada: ${savedCount} drivers actualizados`);
    console.log('\n✨ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar migraciones
async function main() {
  console.log('🚀 Iniciando migración de sessionType\n');
  console.log('=' .repeat(60));

  console.log('\n📦 PARTE 1: Migrar race_sessions_v0');
  console.log('=' .repeat(60));
  await migrateRaceSessionsV0();

  console.log('\n📦 PARTE 2: Migrar driver_race_data');
  console.log('=' .repeat(60));
  await migrateDriverRaceData();

  console.log('\n🎉 TODAS LAS MIGRACIONES COMPLETADAS');
  process.exit(0);
}

main();
