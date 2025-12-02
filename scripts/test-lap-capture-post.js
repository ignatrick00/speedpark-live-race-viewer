// Script para simular lo que SMS-Timing debería enviar
async function testLapCapture() {
  const url = 'http://192.168.1.17:3001/api/lap-capture';

  const testData = {
    action: 'process_lap_data',
    sessionData: {
      N: 'Test Session - ' + new Date().toISOString(),
      D: [
        {
          N: 'Ignacio',
          P: 1,
          K: 19,
          L: 16,
          B: 39.501,
          T: 40.170,
          A: 40.5,
          G: '0.000'
        },
        {
          N: 'Paloma',
          P: 2,
          K: 14,
          L: 14,
          B: 45.862,
          T: 47.220,
          A: 47.5,
          G: '6.361'
        }
      ]
    }
  };

  console.log('📤 Enviando datos de prueba al endpoint...\n');
  console.log('URL:', url);
  console.log('Data:', JSON.stringify(testData, null, 2));
  console.log('\n');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📥 Respuesta recibida:');
    console.log('Status:', response.status);

    const data = await response.json();
    console.log('Body:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ ¡Datos procesados exitosamente!');
      console.log('\nAhora ejecuta: node scripts/check-driver-race-data.js');
      console.log('Para verificar si se guardaron en la base de datos.');
    } else {
      console.log('\n❌ Error al procesar datos');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLapCapture();
