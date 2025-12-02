const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});
process.env.MONGODB_URI = envVars.MONGODB_URI;

const UserSchema = new mongoose.Schema({}, { strict: false });
const WebUser = mongoose.model('WebUser', UserSchema, 'webusers');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await WebUser.findById('690012dce9951b0faf9c4f9c');
  console.log('Usuario:', user ? user.email : 'No encontrado');
  await mongoose.disconnect();
}

run().catch(console.error);
