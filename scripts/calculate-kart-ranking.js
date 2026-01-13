const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Importar modelos
async function loadModels() {
  // Necesitamos compilar TypeScript a JavaScript para poder importar
  const RaceSessionV0 = (await import('../src/models/RaceSessionV0.js')).default;
  const KartRanking = (await import('../src/models/KartRanking.js')).default;
  return { RaceSessionV0, KartRanking };
}

async function calculateKartRanking() {
  try {
    // Cargar variables de entorno
    loadEnv();

    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/karteando';
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Cargar modelos
    const { RaceSessionV0, KartRanking } = await loadModels();

    // Calcular fecha límite (14 días atrás en timezone Chile)
    const nowChileStr = new Date().toLocaleString('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    const nowChile = new Date(nowChileStr);
    const fourteenDaysAgo = new Date(nowChile);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    console.log(`📊 Calculando ranking de karts desde ${fourteenDaysAgo.toISOString()}`);
    console.log(`📊 Hasta ${nowChile.toISOString()}`);

    // Aggregation Pipeline
    const kartData = await RaceSessionV0.aggregate([
      // 1. Filtrar últimos 14 días
      { $match: { sessionDate: { $gte: fourteenDaysAgo } } },

      // 2. Unwind drivers y laps
      { $unwind: '$drivers' },
      { $unwind: '$drivers.laps' },

      // 3. Filtrar tiempos válidos (> 0 y < 2 minutos para evitar outliers)
      { $match: {
        'drivers.laps.time': { $gt: 0, $lt: 120000 }
      }},

      // 4. Agrupar por kart y recopilar TODOS los tiempos
      { $group: {
        _id: '$drivers.kartNumber',
        allTimes: { $push: '$drivers.laps.time' }
      }},

      // 5. Ordenar tiempos ascendente y tomar top 10
      { $project: {
        kartNumber: '$_id',
        allTimesSorted: { $sortArray: { input: '$allTimes', sortBy: 1 } },
        totalLaps: { $size: '$allTimes' }
      }},

      { $project: {
        kartNumber: 1,
        totalLaps: 1,
        top10Times: {
          $cond: {
            if: { $gte: ['$totalLaps', 10] },
            then: { $slice: ['$allTimesSorted', 10] },
            else: '$allTimesSorted' // Si hay menos de 10, usar todas
          }
        }
      }},

      // 6. Calcular promedio de top 10 y mejor tiempo
      { $project: {
        kartNumber: 1,
        totalLaps: 1,
        top10Times: 1,
        avgTop10Time: { $avg: '$top10Times' },
        bestTime: { $first: '$top10Times' }
      }},

      // 7. Ordenar por promedio (mejor primero)
      { $sort: { avgTop10Time: 1 } }
    ]);

    console.log(`✅ Analizados ${kartData.length} karts con actividad`);

    if (kartData.length === 0) {
      console.log('⚠️ No hay datos suficientes para generar ranking');
      await mongoose.disconnect();
      return null;
    }

    // Agregar posición
    const rankings = kartData.map((kart, index) => ({
      position: index + 1,
      kartNumber: kart.kartNumber,
      avgTop10Time: Math.round(kart.avgTop10Time),
      bestTime: kart.bestTime,
      totalLaps: kart.totalLaps,
      top10Times: kart.top10Times
    }));

    // Crear snapshot y guardarlo
    const snapshot = new KartRanking({
      generatedAt: new Date(),
      period: '14days',
      rankings: rankings,
      totalKartsAnalyzed: kartData.length,
      dateRange: {
        from: fourteenDaysAgo,
        to: nowChile
      }
    });

    await snapshot.save();
    console.log(`✅ Snapshot guardado: ${snapshot._id}`);
    console.log(`🏆 Top 5 Karts:`);
    rankings.slice(0, 5).forEach(k => {
      console.log(`   #${k.position}: Kart ${k.kartNumber} - Promedio: ${(k.avgTop10Time/1000).toFixed(3)}s (${k.totalLaps} vueltas)`);
    });

    await mongoose.disconnect();
    console.log('✅ Proceso completado exitosamente');
    return snapshot;

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  calculateKartRanking()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = calculateKartRanking;
