const mongoose = require('mongoose');

// WebUser Schema
const WebUserSchema = new mongoose.Schema({
  email: String,
  password: String,
  emailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationSentAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  profile: {
    firstName: String,
    lastName: String,
    alias: String,
  },
  kartingLink: {
    personId: String,
    linkedAt: Date,
    status: String,
    speedParkProfile: mongoose.Schema.Types.Mixed,
  },
  squadron: {
    squadronId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadron' },
    role: String,
    joinedAt: Date,
  },
  invitations: [{
    squadronId: { type: mongoose.Schema.Types.ObjectId, ref: 'Squadron' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
    status: String,
    createdAt: Date,
    respondedAt: Date,
  }],
  role: {
    type: String,
    enum: ['user', 'organizer', 'admin'],
    default: 'user',
  },
  organizerProfile: {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
    approvedAt: Date,
    permissions: {
      canCreateChampionships: Boolean,
      canApproveSquadrons: Boolean,
      canLinkRaces: Boolean,
      canModifyStandings: Boolean,
    },
    organizationName: String,
    notes: String,
  },
  accountStatus: String,
  lastLoginAt: Date,
}, { timestamps: true });

const WebUser = mongoose.models.WebUser || mongoose.model('WebUser', WebUserSchema);

async function setOrganizerRole() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    const MONGODB_URI = 'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    const email = 'icabreraquezada@gmail.com';

    console.log(`\n🔍 Buscando usuario: ${email}`);
    const user = await WebUser.findOne({ email });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }

    console.log('✅ Usuario encontrado:', user.email);
    console.log('   Rol actual:', user.role || 'user');

    // Actualizar rol a organizador
    user.role = 'organizer';

    // Configurar perfil de organizador
    user.organizerProfile = {
      approvedBy: user._id, // Auto-aprobado
      approvedAt: new Date(),
      permissions: {
        canCreateChampionships: true,
        canApproveSquadrons: true,
        canLinkRaces: true,
        canModifyStandings: true,
      },
      organizationName: 'Karteando.cl Admin',
      notes: 'Organizador principal - Auto-aprobado',
    };

    await user.save();

    console.log('\n🎯 ¡Rol de organizador asignado exitosamente!');
    console.log('   Nuevo rol:', user.role);
    console.log('   Permisos otorgados:');
    console.log('     - Crear campeonatos: ✓');
    console.log('     - Aprobar escuderías: ✓');
    console.log('     - Vincular carreras: ✓');
    console.log('     - Modificar clasificaciones: ✓');

    await mongoose.connection.close();
    console.log('\n✅ Proceso completado');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

setOrganizerRole();
