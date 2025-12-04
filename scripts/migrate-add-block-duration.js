/**
 * Migration script to add blockDurationMinutes field to existing CoachAvailability documents
 * Run this script once to update all availabilities that don't have blockDurationMinutes
 */

const mongoose = require('mongoose');

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/karteando';

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the CoachAvailability collection
    const CoachAvailability = mongoose.model('CoachAvailability', new mongoose.Schema({}, { strict: false }));

    // Find all availabilities without blockDurationMinutes field
    const availabilitiesWithoutBlock = await CoachAvailability.find({
      blockDurationMinutes: { $exists: false }
    });

    console.log(`\n📊 Found ${availabilitiesWithoutBlock.length} availabilities without blockDurationMinutes`);

    if (availabilitiesWithoutBlock.length === 0) {
      console.log('✅ All availabilities already have blockDurationMinutes field');
      process.exit(0);
      return;
    }

    console.log('\n🔧 Updating availabilities...\n');

    // Update each availability
    let updated = 0;
    for (const availability of availabilitiesWithoutBlock) {
      const result = await CoachAvailability.updateOne(
        { _id: availability._id },
        { $set: { blockDurationMinutes: 45 } } // Set default to 45 minutes
      );

      if (result.modifiedCount > 0) {
        updated++;
        console.log(`✅ Updated: ${availability.coachName} - ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][availability.dayOfWeek]} ${availability.startTime}-${availability.endTime}`);
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updated} availabilities`);
    console.log('📝 All availabilities now have blockDurationMinutes = 45 minutes (default)');
    console.log('💡 Coaches can now edit their availabilities to change the block duration');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
