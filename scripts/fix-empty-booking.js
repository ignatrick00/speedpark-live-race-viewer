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

async function fixEmptyBooking() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all classes with individualBooking but no studentId
    const classes = await TrainingClass.find({
      'individualBooking': { $exists: true }
    });

    console.log(`\n📋 Found ${classes.length} classes with individualBooking`);

    for (const clase of classes) {
      if (!clase.individualBooking.studentId) {
        console.log(`\n🔧 Fixing class ${clase._id}:`);
        console.log(`   Title: ${clase.title}`);
        console.log(`   Before: individualBooking =`, clase.individualBooking);

        // Remove the empty individualBooking
        clase.individualBooking = undefined;
        clase.status = 'available';
        await clase.save();

        console.log(`   After: individualBooking = undefined, status = available`);
        console.log(`   ✅ Fixed!`);
      } else {
        console.log(`\n✓ Class ${clase._id} (${clase.title}) has valid booking`);
      }
    }

    console.log('\n✅ All classes fixed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixEmptyBooking();
