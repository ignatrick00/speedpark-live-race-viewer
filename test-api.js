const fetch = require('node-fetch');

async function testAPI() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  console.log('📅 Testing with date:', dateStr);
  console.log('🌐 URL: http://localhost:3000/api/races-v0?date=' + dateStr);

  try {
    const response = await fetch(`http://localhost:3000/api/races-v0?date=${dateStr}`);
    const data = await response.json();

    console.log('\n✅ Response status:', response.status);
    console.log('📊 Success:', data.success);
    console.log('📋 Total races:', data.totalRaces);

    if (data.races && data.races.length > 0) {
      console.log('\n📋 Primera carrera:');
      console.log(JSON.stringify(data.races[0], null, 2));
    } else {
      console.log('\n⚠️ No races found');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
