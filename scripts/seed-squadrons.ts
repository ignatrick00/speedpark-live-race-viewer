import mongoose from 'mongoose';
import { seedSquadrons } from '../src/lib/seedSquadrons';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/karteando';

async function main() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    await seedSquadrons();

    console.log('\n👋 Cerrando conexión...');
    await mongoose.connection.close();
    console.log('✅ Listo!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
