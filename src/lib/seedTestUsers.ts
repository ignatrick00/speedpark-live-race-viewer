import connectDB from './mongodb';
import WebUser from '@/models/WebUser';
import bcrypt from 'bcryptjs';

const TEST_USERS = [
  {
    email: 'ignacio@karteando.cl',
    password: 'test1234',
    firstName: 'Ignacio',
    lastName: 'Cabrera',
  },
  {
    email: 'piloto1@karteando.cl',
    password: 'test1234',
    firstName: 'Carlos',
    lastName: 'Ramirez',
  },
  {
    email: 'piloto2@karteando.cl',
    password: 'test1234',
    firstName: 'María',
    lastName: 'González',
  },
  {
    email: 'piloto3@karteando.cl',
    password: 'test1234',
    firstName: 'Pedro',
    lastName: 'López',
  },
];

export async function seedTestUsers() {
  try {
    await connectDB();

    console.log('🌱 Verificando usuarios de prueba...');

    let createdCount = 0;
    let existingCount = 0;

    for (const userData of TEST_USERS) {
      const existing = await WebUser.findOne({ email: userData.email });

      if (!existing) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        await WebUser.create({
          email: userData.email,
          password: hashedPassword,
          profile: {
            firstName: userData.firstName,
            lastName: userData.lastName,
          },
          squadron: {
            role: 'none',
          },
        });

        console.log(`  ✅ Usuario creado: ${userData.firstName} ${userData.lastName} (${userData.email})`);
        createdCount++;
      } else {
        existingCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`\n✅ ${createdCount} usuario(s) de prueba creado(s)`);
      console.log(`📋 Credenciales:`);
      console.log(`   Email: ignacio@karteando.cl`);
      console.log(`   Password: test1234\n`);
    }

    if (existingCount === TEST_USERS.length) {
      console.log(`✓ Usuarios de prueba ya existen (${existingCount})`);
    }

  } catch (error) {
    console.error('❌ Error al crear usuarios de prueba:', error);
  }
}
