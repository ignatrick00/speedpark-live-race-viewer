// Script para revisar las colecciones de MongoDB y ver qué datos tenemos
const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://icabreraquezada:Nacho123@karteandocl.i5jfc.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=KarteandoCl";

async function debugCollections() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db('karteando-cl');
    
    // 1. Revisar webusers - ¿qué usuarios tenemos?
    console.log('\n🧑‍💼 === WEBUSERS ===');
    const users = await db.collection('webusers').find({}).toArray();
    console.log(`Total usuarios: ${users.length}`);
    
    users.forEach(user => {
      console.log(`- ${user.profile?.firstName} ${user.profile?.lastName} (${user.profile?.alias || 'sin alias'}) - Email: ${user.email}`);
      console.log(`  Karting Link: ${user.kartingLink?.status || 'no definido'} - Driver: ${user.kartingLink?.driverName || 'ninguno'}`);
    });
    
    // 2. Revisar lap_records - ¿qué datos de carreras tenemos?
    console.log('\n🏁 === LAP_RECORDS ===');
    const lapRecords = await db.collection('lap_records').find({}).sort({ timestamp: -1 }).limit(10).toArray();
    console.log(`Total registros de vueltas: ${await db.collection('lap_records').countDocuments()}`);
    
    console.log('Últimos 10 registros:');
    lapRecords.forEach(record => {
      console.log(`- ${record.driverName} - Sesión: ${record.sessionName} - Vuelta: ${record.lapNumber} - Pos: ${record.position} - Tiempo: ${record.lastTime}ms`);
      console.log(`  WebUserId: ${record.webUserId || 'NO VINCULADO'} - PersonId: ${record.personId || 'sin personId'}`);
    });
    
    // 3. Revisar driver_identities - ¿qué vinculaciones tenemos?
    console.log('\n🔗 === DRIVER_IDENTITIES ===');
    const identities = await db.collection('driver_identities').find({}).toArray();
    console.log(`Total identidades de corredores: ${identities.length}`);
    
    identities.forEach(identity => {
      console.log(`- ${identity.primaryName} -> WebUser: ${identity.webUserId || 'NO VINCULADO'}`);
      console.log(`  PersonId: ${identity.personId || 'sin personId'} - Status: ${identity.linkingStatus} - Confianza: ${identity.confidence}%`);
    });
    
    // 4. Revisar racesessions - ¿qué sesiones tenemos?
    console.log('\n🏆 === RACE_SESSIONS ===');
    const sessions = await db.collection('racesessions').find({}).sort({ timestamp: -1 }).limit(5).toArray();
    console.log(`Total sesiones: ${await db.collection('racesessions').countDocuments()}`);
    
    console.log('Últimas 5 sesiones:');
    sessions.forEach(session => {
      console.log(`- ${session.sessionName} - ${session.drivers?.length || 0} pilotos - Revenue: $${session.revenue}`);
      console.log(`  Fecha: ${session.timestamp} - Procesado: ${session.processed}`);
    });
    
    // 5. Buscar específicamente el usuario Diego
    console.log('\n🎯 === BUSCANDO DIEGO ===');
    
    // Buscar usuario Diego
    const diegoUser = await db.collection('webusers').findOne({
      $or: [
        { 'profile.firstName': /diego/i },
        { 'profile.lastName': /diego/i },
        { 'profile.alias': /diego/i }
      ]
    });
    
    if (diegoUser) {
      console.log(`✅ Usuario Diego encontrado: ${diegoUser.profile.firstName} ${diegoUser.profile.lastName} (${diegoUser.profile.alias})`);
      console.log(`WebUserId: ${diegoUser._id}`);
      
      // Buscar sus lap records
      const diegoLaps = await db.collection('lap_records').find({
        webUserId: diegoUser._id.toString()
      }).toArray();
      
      console.log(`Diego tiene ${diegoLaps.length} registros de vueltas`);
      
      if (diegoLaps.length > 0) {
        console.log('Muestra de sus vueltas:');
        diegoLaps.slice(0, 3).forEach(lap => {
          console.log(`  - Vuelta ${lap.lapNumber} - Pos ${lap.position} - ${lap.lastTime}ms - Sesión: ${lap.sessionName}`);
        });
      }
    } else {
      console.log('❌ Usuario Diego no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugCollections().catch(console.error);