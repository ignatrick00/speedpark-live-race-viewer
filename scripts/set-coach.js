const mongoose = require('mongoose');
const fs = require('fs');

// Leer .env.local manualmente
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
let MONGODB_URI = null;

for (const line of envLines) {
  if (line.startsWith('MONGODB_URI=')) {
    MONGODB_URI = line.substring('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
    break;
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI no está definido en .env.local');
  process.exit(1);
}

const WebUserSchema = new mongoose.Schema({
  email: String,
  role: String,
});

const WebUser = mongoose.models.WebUser || mongoose.model('WebUser', WebUserSchema);

async function setCoachRole() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'icabreraquezada@gmail.com';

    const user = await WebUser.findOneAndUpdate(
      { email },
      { role: 'coach' },
      { new: true }
    );

    if (user) {
      console.log('✅ Usuario actualizado a coach:', email);
      console.log('   Rol actual:', user.role);
    } else {
      console.log('❌ Usuario no encontrado:', email);
    }

    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

setCoachRole();
