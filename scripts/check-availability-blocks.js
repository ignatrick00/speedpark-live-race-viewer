const mongoose = require('mongoose');

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/karteando';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('✅ Connected to MongoDB');

  const CoachAvailability = mongoose.model('CoachAvailability', new mongoose.Schema({}, { strict: false }));
  const availabilities = await CoachAvailability.find({ isActive: true });

  console.log('\n📊 Total active availabilities:', availabilities.length);
  console.log('\n');

  availabilities.forEach((a, index) => {
    console.log(`${index + 1}. ${a.coachName}`);
    console.log(`   Day: ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][a.dayOfWeek]}`);
    console.log(`   Time: ${a.startTime} - ${a.endTime}`);
    console.log(`   Block Duration: ${a.blockDurationMinutes || 'NOT SET (will use default 45)'} minutes`);
    console.log('');
  });

  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
