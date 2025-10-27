import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import WebUser from '@/models/WebUser';
import Squadron from '@/models/Squadron';
import FairRacingScore from '@/models/FairRacingScore';

const TEST_SQUADRONS = [
  {
    name: 'Thunder Racing',
    description: 'Equipo de élite enfocado en velocidad y precisión',
    colors: { primary: '#FFD700', secondary: '#FF8C00' },
    division: 'Elite' as const,
    recruitmentMode: 'open' as const,
  },
  {
    name: 'Neon Speeders',
    description: 'Pilotos agresivos que buscan la victoria',
    colors: { primary: '#39FF14', secondary: '#00FF00' },
    division: 'Pro' as const,
    recruitmentMode: 'open' as const,
  },
  {
    name: 'Cyber Wolves',
    description: 'Trabajo en equipo y estrategia',
    colors: { primary: '#FF0055', secondary: '#8B0000' },
    division: 'Masters' as const,
    recruitmentMode: 'invite-only' as const,
  },
  {
    name: 'Electric Knights',
    description: 'Nuevos en la competencia pero con mucha energía',
    colors: { primary: '#00D4FF', secondary: '#0057B8' },
    division: 'Open' as const,
    recruitmentMode: 'open' as const,
  },
  {
    name: 'Purple Storm',
    description: 'Equipo completo de veteranos',
    colors: { primary: '#9D00FF', secondary: '#4B0082' },
    division: 'Masters' as const,
    recruitmentMode: 'open' as const,
  },
];

const TEST_PILOTS = [
  { email: 'carlos@test.cl', firstName: 'Carlos', lastName: 'Rodríguez', alias: 'SpeedDemon' },
  { email: 'maria@test.cl', firstName: 'María', lastName: 'González', alias: 'NeonQueen' },
  { email: 'pedro@test.cl', firstName: 'Pedro', lastName: 'Silva', alias: 'ThunderBolt' },
  { email: 'ana@test.cl', firstName: 'Ana', lastName: 'Torres', alias: 'CyberAce' },
  { email: 'juan@test.cl', firstName: 'Juan', lastName: 'Martínez', alias: 'ElectricJuan' },
  { email: 'sofia@test.cl', firstName: 'Sofía', lastName: 'López', alias: 'StormRider' },
  { email: 'diego@test.cl', firstName: 'Diego', lastName: 'Fernández', alias: 'DiegoFast' },
  { email: 'laura@test.cl', firstName: 'Laura', lastName: 'Vargas', alias: 'LauraNeon' },
  { email: 'miguel@test.cl', firstName: 'Miguel', lastName: 'Castro', alias: 'MiguelSpeed' },
  { email: 'carla@test.cl', firstName: 'Carla', lastName: 'Rojas', alias: 'CarlaWolf' },
];

export async function seedSquadrons() {
  try {
    console.log('🌱 Iniciando seed de escuderías...');

    // Crear pilotos de prueba
    console.log('👥 Creando pilotos...');
    const hashedPassword = await bcrypt.hash('test1234', 10);
    const createdPilots = [];

    for (const pilot of TEST_PILOTS) {
      const existingUser = await WebUser.findOne({ email: pilot.email });
      if (!existingUser) {
        const user = await WebUser.create({
          email: pilot.email,
          password: hashedPassword,
          profile: {
            firstName: pilot.firstName,
            lastName: pilot.lastName,
            alias: pilot.alias,
          },
          squadron: {
            role: 'none',
          },
        });

        // Crear FairRacingScore
        await FairRacingScore.create({
          userId: user._id,
          currentScore: 70 + Math.floor(Math.random() * 30),
          totalRacesClean: Math.floor(Math.random() * 50),
        });

        createdPilots.push(user);
        console.log(`   ✓ ${pilot.alias} creado`);
      } else {
        createdPilots.push(existingUser);
        console.log(`   → ${pilot.alias} ya existe`);
      }
    }

    // Crear escuderías
    console.log('\n🏁 Creando escuderías...');
    for (let i = 0; i < TEST_SQUADRONS.length; i++) {
      const squadronData = TEST_SQUADRONS[i];

      const existingSquadron = await Squadron.findOne({ name: squadronData.name });
      if (existingSquadron) {
        console.log(`   → ${squadronData.name} ya existe`);
        continue;
      }

      // Asignar pilotos (2-4 por escuadría)
      const numMembers = 2 + Math.floor(Math.random() * 3); // 2 a 4 miembros
      const startIdx = i * 2;
      const squadronMembers = createdPilots.slice(startIdx, startIdx + numMembers);

      if (squadronMembers.length < 2) {
        console.log(`   ✗ No hay suficientes pilotos para ${squadronData.name}`);
        continue;
      }

      const captainId = squadronMembers[0]._id;

      // Crear escudería
      const squadron = await Squadron.create({
        squadronId: `SQ-${Date.now()}-${i}`,
        name: squadronData.name,
        description: squadronData.description,
        colors: squadronData.colors,
        division: squadronData.division,
        captainId,
        members: squadronMembers.map((m) => m._id),
        recruitmentMode: squadronData.recruitmentMode,
        totalPoints: Math.floor(Math.random() * 1000),
        ranking: i + 1,
      });

      // Actualizar usuarios
      for (let j = 0; j < squadronMembers.length; j++) {
        const member = squadronMembers[j];
        await WebUser.findByIdAndUpdate(member._id, {
          squadron: {
            squadronId: squadron._id,
            role: j === 0 ? 'captain' : 'member',
            joinedAt: new Date(),
          },
        });
      }

      // Calcular fair racing average
      const scores = await FairRacingScore.find({
        userId: { $in: squadronMembers.map((m) => m._id) },
      });
      const avgScore = scores.reduce((sum, s) => sum + s.currentScore, 0) / scores.length;
      squadron.fairRacingAverage = avgScore;
      await squadron.save();

      console.log(`   ✓ ${squadronData.name} creada con ${squadronMembers.length} miembros`);
      console.log(`      Capitán: ${squadronMembers[0].profile.alias}`);
    }

    console.log('\n✅ Seed completado!');
    console.log('\n📋 CREDENCIALES DE PRUEBA:');
    console.log('Email: [cualquier piloto]@test.cl');
    console.log('Password: test1234');
    console.log('\nEjemplos:');
    console.log('- carlos@test.cl (Capitán de Thunder Racing)');
    console.log('- maria@test.cl (Capitana de Neon Speeders)');
    console.log('- ignacio@karteando.cl (sin escudería)');

    return {
      success: true,
      pilotsCreated: createdPilots.length,
      squadronsCreated: TEST_SQUADRONS.length,
    };
  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  }
}
