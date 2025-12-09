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
  roles: [String],
  coachProfile: mongoose.Schema.Types.Mixed,
}, { strict: false });

const CoachAvailabilitySchema = new mongoose.Schema({
  coachId: mongoose.Schema.Types.ObjectId,
  coachName: String,
  dayOfWeek: Number,
  startTime: String,
  endTime: String,
  blockDurationMinutes: Number,
  isActive: Boolean,
}, { strict: false });

const WebUser = mongoose.models.WebUser || mongoose.model('WebUser', WebUserSchema);
const CoachAvailability = mongoose.models.CoachAvailability || mongoose.model('CoachAvailability', CoachAvailabilitySchema);

async function checkCoachRole() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'appmiur@gmail.com';

    const user = await WebUser.findOne({ email }).lean();

    if (user) {
      console.log('✅ Usuario encontrado:', email);
      console.log('   ID:', user._id.toString());
      console.log('');
      console.log('📊 ROLES:');
      console.log('   role (legacy string):', user.role || 'NO DEFINIDO');
      console.log('   roles (array nuevo):', user.roles || 'NO DEFINIDO');
      console.log('');
      console.log('🎯 DETECCIÓN:');
      console.log('   ¿Es coach (legacy)?:', user.role === 'coach');
      console.log('   ¿Es coach (array)?:', user.roles?.includes('coach'));
      console.log('   ¿Tiene coachProfile?:', !!user.coachProfile);
      console.log('');

      // Check CoachAvailability collection
      const availability = await CoachAvailability.find({ coachId: user._id, isActive: true }).lean();
      console.log('👨‍🏫 COACH AVAILABILITY (colección separada):');
      console.log('   Total bloques activos:', availability.length);

      if (availability.length > 0) {
        const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        availability.forEach((block, i) => {
          console.log(`   Bloque ${i+1}: ${daysMap[block.dayOfWeek]} ${block.startTime} - ${block.endTime} (${block.blockDurationMinutes}min)`);
        });
      } else {
        console.log('   ⚠️  No hay bloques de disponibilidad configurados');
      }

      if (user.coachProfile) {
        console.log('');
        console.log('📝 COACH PROFILE (embedded):');
        console.log('   Availability:', user.coachProfile.availability?.length || 0, 'bloques');
        if (user.coachProfile.availability?.length > 0) {
          user.coachProfile.availability.forEach((block, i) => {
            console.log(`   Bloque ${i+1}: ${block.dayOfWeek} ${block.startTime} - ${block.endTime} (${block.blockDuration}min)`);
          });
        }
      }
    } else {
      console.log('❌ Usuario no encontrado:', email);
    }

    await mongoose.connection.close();
    console.log('');
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkCoachRole();
