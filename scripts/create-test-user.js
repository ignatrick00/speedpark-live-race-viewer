#!/usr/bin/env node

/**
 * Script para crear usuario de prueba
 * Uso: node scripts/create-test-user.js
 */

const API_URL = 'http://localhost:3000';

async function createTestUser() {
  console.log('🚀 Creando usuario de prueba...\n');

  const userData = {
    email: 'ignacio@karteando.cl',
    password: 'test1234',
    firstName: 'Ignacio',
    lastName: 'Cabrera',
  };

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
      console.log('✅ Usuario creado exitosamente!\n');
      console.log('📧 Email:', userData.email);
      console.log('🔑 Password:', userData.password);
      console.log('\n🔗 Ahora puedes hacer login en: http://localhost:3000\n');

      if (data.token) {
        console.log('🎫 Token JWT:', data.token);
      }
    } else {
      console.log('❌ Error al crear usuario:', data.error);

      if (data.error?.includes('existe')) {
        console.log('\n💡 El usuario ya existe, intenta hacer login con:');
        console.log('📧 Email:', userData.email);
        console.log('🔑 Password:', userData.password);
      }
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('\n⚠️  Asegúrate de que el servidor esté corriendo:');
    console.log('   npm run dev');
  }
}

createTestUser();
