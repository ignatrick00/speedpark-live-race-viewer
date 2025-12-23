/**
 * Script de migración para agregar campos de vinculación a carreras amistosas existentes
 *
 * Ejecutar con: npx ts-node src/scripts/migrate-friendly-races.ts
 */

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';

async function migrateFriendlyRaces() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await connectDB();

    const FriendlyRace = mongoose.connection.collection('friendly_races');

    console.log('📊 Verificando carreras existentes...');
    const totalRaces = await FriendlyRace.countDocuments({});
    console.log(`   Total de carreras: ${totalRaces}`);

    // Contar carreras sin campos de vinculación
    const racesWithoutLinkFields = await FriendlyRace.countDocuments({
      linkedRaceSessionId: { $exists: false }
    });
    console.log(`   Carreras sin campos de vinculación: ${racesWithoutLinkFields}`);

    if (racesWithoutLinkFields === 0) {
      console.log('✅ Todas las carreras ya tienen los campos de vinculación');
      process.exit(0);
    }

    console.log('\n🔧 Aplicando migración...');

    // Actualizar todas las carreras que no tienen los campos
    const result = await FriendlyRace.updateMany(
      {
        linkedRaceSessionId: { $exists: false }
      },
      {
        $set: {
          raceStatus: 'pending',
          linkedRaceSessionId: null,
          results: null
        }
      }
    );

    console.log(`✅ Migración completada!`);
    console.log(`   Documentos modificados: ${result.modifiedCount}`);
    console.log(`   Documentos coincidentes: ${result.matchedCount}`);

    // Verificar migración
    console.log('\n🔍 Verificando migración...');
    const updatedRaces = await FriendlyRace.find({}).limit(3).toArray();
    console.log('   Ejemplo de carreras actualizadas:');
    updatedRaces.forEach((race: any, idx: number) => {
      console.log(`\n   ${idx + 1}. ${race.name}`);
      console.log(`      - raceStatus: ${race.raceStatus}`);
      console.log(`      - linkedRaceSessionId: ${race.linkedRaceSessionId || 'null'}`);
      console.log(`      - status: ${race.status}`);
    });

    console.log('\n🎉 Migración finalizada exitosamente!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateFriendlyRaces();
