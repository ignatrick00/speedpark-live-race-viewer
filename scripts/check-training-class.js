const mongoose = require('mongoose');
const fs = require('fs');

// Read MongoDB URI from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envLines = envContent.split('\n');
let MONGODB_URI = null;

for (const line of envLines) {
  if (line.startsWith('MONGODB_URI=')) {
    MONGODB_URI = line.substring('MONGODB_URI='.length).trim().replace(/^["']|["']$/g, '');
    break;
  }
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Define TrainingClass schema
const TrainingClassSchema = new mongoose.Schema({
  coachId: mongoose.Schema.Types.ObjectId,
  coachName: String,
  title: String,
  description: String,
  specialties: [String],
  date: Date,
  startTime: String,
  endTime: String,
  maxGroupCapacity: Number,
  individualPrice: Number,
  groupPricePerPerson: Number,
  individualBooking: {
    studentId: mongoose.Schema.Types.ObjectId,
    studentName: String,
    bookedAt: Date,
    status: String
  },
  groupBookings: [{
    studentId: mongoose.Schema.Types.ObjectId,
    studentName: String,
    bookedAt: Date,
    status: String
  }],
  status: String
});

const TrainingClass = mongoose.models.TrainingClass || mongoose.model('TrainingClass', TrainingClassSchema);

async function checkClass() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const classId = '692f5677de75ec5b549f0f4e';
    const trainingClass = await TrainingClass.findById(classId);

    if (!trainingClass) {
      console.log('❌ Class not found');
      return;
    }

    console.log('\n📋 Training Class Details:');
    console.log('ID:', trainingClass._id);
    console.log('Title:', trainingClass.title);
    console.log('Coach:', trainingClass.coachName);
    console.log('Date:', trainingClass.date);
    console.log('Time:', trainingClass.startTime, '-', trainingClass.endTime);
    console.log('Status:', trainingClass.status);
    console.log('\n👤 Individual Booking:');
    console.log(JSON.stringify(trainingClass.individualBooking, null, 2));
    console.log('\n👥 Group Bookings:');
    console.log(JSON.stringify(trainingClass.groupBookings, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkClass();
