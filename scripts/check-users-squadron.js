const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://icabreraqu:Chanchito123.@karteandocluster.zzruo.mongodb.net/karteando?retryWrites=true&w=majority&appName=KarteandoCluster';

const WebUserSchema = new mongoose.Schema({}, { strict: false, collection: 'webusers' });
const WebUser = mongoose.models.WebUser || mongoose.model('WebUser', WebUserSchema);

async function checkUsersSquadron() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find both users
    const organizador = await WebUser.findOne({ email: 'icabreraquezada@gmail.com' });
    const ircabrera = await WebUser.findOne({ email: 'ircabrera@gmail.com' });

    console.log('\n📧 ORGANIZADOR (icabreraquezada@gmail.com):');
    console.log('  User ID:', organizador?._id.toString());
    console.log('  Squadron ID:', organizador?.squadron?.squadronId?.toString());
    console.log('  Squadron Role:', organizador?.squadron?.role);

    console.log('\n📧 IRCABRERA (ircabrera@gmail.com):');
    console.log('  User ID:', ircabrera?._id.toString());
    console.log('  Squadron ID:', ircabrera?.squadron?.squadronId?.toString());
    console.log('  Squadron Role:', ircabrera?.squadron?.role);

    console.log('\n🔍 COMPARISON:');
    if (organizador?.squadron?.squadronId?.toString() === ircabrera?.squadron?.squadronId?.toString()) {
      console.log('  ❌ PROBLEMA: Ambos usuarios están en LA MISMA ESCUDERÍA');
      console.log('  Por eso cuando uno se registra/desregistra, afecta al otro');
    } else {
      console.log('  ✅ Los usuarios están en escuaderías diferentes');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsersSquadron();
