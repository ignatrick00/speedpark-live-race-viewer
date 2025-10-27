#!/usr/bin/env node

/**
 * Script completo para setup de datos de prueba
 * Crea usuarios, escuderías y datos para testing
 * Uso: node scripts/setup-test-data.js
 */

const API_URL = 'http://localhost:3000';

// Usuarios de prueba
const testUsers = [
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

async function createUser(userData) {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ Usuario creado: ${userData.firstName} ${userData.lastName} (${userData.email})`);
      return data.token;
    } else if (data.error?.includes('existe')) {
      console.log(`⚠️  Usuario ya existe: ${userData.email}`);
      // Intentar login
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
        }),
      });
      const loginData = await loginResponse.json();
      return loginData.token;
    } else {
      console.log(`❌ Error: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error de conexión:`, error.message);
    return null;
  }
}

async function createSquadron(token, squadronData) {
  try {
    const response = await fetch(`${API_URL}/api/squadron/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(squadronData),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ Escudería creada: ${squadronData.name}`);
      return data.squadron;
    } else {
      console.log(`❌ Error al crear escudería: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error de conexión:`, error.message);
    return null;
  }
}

async function setupTestData() {
  console.log('🚀 Iniciando setup de datos de prueba...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Crear usuarios
  console.log('👥 CREANDO USUARIOS:\n');
  const tokens = [];
  for (const user of testUsers) {
    const token = await createUser(user);
    tokens.push({ email: user.email, token, name: `${user.firstName} ${user.lastName}` });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. Crear escuderías de ejemplo
  if (tokens[0]?.token) {
    console.log('🏁 CREANDO ESCUDERÍAS DE EJEMPLO:\n');

    const squadron1 = await createSquadron(tokens[0].token, {
      name: 'Velocity Racing',
      description: 'Escudería enfocada en velocidad pura y dominio técnico',
      colors: {
        primary: '#00D4FF', // Electric blue
        secondary: '#0057B8', // RB blue
      },
      recruitmentMode: 'open',
    });

    if (tokens[1]?.token) {
      const squadron2 = await createSquadron(tokens[1].token, {
        name: 'Thunder Drivers',
        description: 'Equipo competitivo con enfoque en fair racing',
        colors: {
          primary: '#FFD700', // Gold
          secondary: '#87CEEB', // Sky blue
        },
        recruitmentMode: 'open',
      });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ SETUP COMPLETADO!\n');
  console.log('📋 CREDENCIALES DE PRUEBA:\n');

  testUsers.forEach((user, i) => {
    console.log(`${i + 1}. ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}\n`);
  });

  console.log('🔗 Accede a: http://localhost:3000');
  console.log('🏁 Dashboard Squadron: http://localhost:3000/squadron\n');
}

// Verificar si el servidor está corriendo
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/api/test-db`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Ejecutar
(async () => {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ El servidor no está corriendo\n');
    console.log('⚠️  Ejecuta primero: npm run dev\n');
    process.exit(1);
  }

  await setupTestData();
})();
