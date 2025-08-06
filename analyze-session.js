const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Fetching: ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: null,
                        error: error.message
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
    });
}

function formatTime(milliseconds) {
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
}

function analyzeSession(data, targetParticipantId = null) {
    // Agrupar datos por participante
    const participants = {};
    
    data.forEach(lap => {
        const pid = lap.participantId;
        
        if (!participants[pid]) {
            participants[pid] = {
                id: pid,
                name: `${lap.firstName || ''} ${lap.lastName || ''}`.trim() || lap.alias,
                alias: lap.alias,
                laps: [],
                bestTime: null,
                worstTime: null,
                totalTime: 0,
                averageTime: 0
            };
        }
        
        participants[pid].laps.push({
            lapNumber: lap.lapNumber,
            time: lap.LapTimeMs,
            position: lap.position
        });
    });
    
    // Calcular estadísticas para cada participante
    Object.values(participants).forEach(participant => {
        const times = participant.laps.map(lap => lap.time);
        
        participant.bestTime = Math.min(...times);
        participant.worstTime = Math.max(...times);
        participant.totalTime = times.reduce((sum, time) => sum + time, 0);
        participant.averageTime = participant.totalTime / times.length;
        
        // Ordenar vueltas por número
        participant.laps.sort((a, b) => a.lapNumber - b.lapNumber);
    });
    
    return participants;
}

function displayAnalysis(participants, targetId = null) {
    console.log('\n🏁 ANÁLISIS COMPLETO DE LA SESIÓN');
    console.log('=' .repeat(80));
    
    // Ordenar por mejor tiempo
    const sortedParticipants = Object.values(participants)
        .sort((a, b) => a.bestTime - b.bestTime);
    
    console.log('🏆 RANKING POR MEJOR TIEMPO:');
    console.log('-'.repeat(80));
    console.log('POS | PILOTO              | MEJOR T. | PROMEDIO | VUELTAS | PROGRESIÓN');
    console.log('-'.repeat(80));
    
    sortedParticipants.forEach((p, index) => {
        const pos = (index + 1).toString().padStart(2);
        const name = (p.alias || p.name).padEnd(18);
        const best = formatTime(p.bestTime).padEnd(8);
        const avg = formatTime(p.averageTime).padEnd(8);
        const laps = p.laps.length.toString().padStart(2);
        
        // Mostrar mejora/empeoramiento
        const firstLap = p.laps[0]?.time || 0;
        const lastLap = p.laps[p.laps.length - 1]?.time || 0;
        const improvement = firstLap - lastLap;
        const arrow = improvement > 1000 ? '📈' : improvement < -1000 ? '📉' : '➡️';
        
        const isTarget = p.id === targetId ? ' 🎯' : '';
        
        console.log(`${pos}  | ${name} | ${best} | ${avg} | ${laps}     | ${arrow}${isTarget}`);
    });
    
    // Análisis detallado del piloto objetivo
    if (targetId && participants[targetId]) {
        const target = participants[targetId];
        
        console.log('\n' + '=' .repeat(80));
        console.log(`🎯 TU ANÁLISIS DETALLADO - ${target.alias}`);
        console.log('=' .repeat(80));
        
        console.log(`📊 Estadísticas generales:`);
        console.log(`   💯 Total de vueltas: ${target.laps.length}`);
        console.log(`   ⚡ Mejor tiempo: ${formatTime(target.bestTime)}`);
        console.log(`   📈 Tiempo promedio: ${formatTime(target.averageTime)}`);
        console.log(`   📉 Peor tiempo: ${formatTime(target.worstTime)}`);
        
        const improvement = target.laps[0].time - target.bestTime;
        console.log(`   🚀 Mejora máxima: ${formatTime(improvement)}`);
        
        console.log(`\n🏃 Progresión vuelta por vuelta:`);
        target.laps.forEach(lap => {
            const time = formatTime(lap.time);
            const isBest = lap.time === target.bestTime ? ' 🔥 MEJOR!' : '';
            const pos = `P${lap.position}`.padStart(3);
            console.log(`   Vuelta ${lap.lapNumber}: ${time} ${pos}${isBest}`);
        });
        
        // Comparación con el ganador
        const winner = sortedParticipants[0];
        if (winner.id !== targetId) {
            const gap = target.bestTime - winner.bestTime;
            console.log(`\n🏆 Comparación con el ganador (${winner.alias}):`);
            console.log(`   Gap con mejor tiempo: +${formatTime(gap)}`);
        }
    }
}

async function analyzeSessionById(sessionId, targetParticipantId = null) {
    try {
        const url = `${BASE_URL}/racestatistics/laps_fast5/speedpark?sessionId=${sessionId}`;
        const result = await makeRequest(url);
        
        if (result.statusCode !== 200) {
            console.log(`❌ Error ${result.statusCode}: No se pudo obtener datos de la sesión`);
            return;
        }
        
        if (!result.data || result.data.length === 0) {
            console.log('❌ No hay datos en esta sesión');
            return;
        }
        
        console.log(`📊 SESIÓN ${sessionId}`);
        console.log(`📈 ${result.data.length} registros de vueltas encontrados`);
        
        // Guardar datos raw
        fs.mkdirSync('session_data', { recursive: true });
        const filename = `session_data/session_${sessionId}.json`;
        fs.writeFileSync(filename, JSON.stringify(result.data, null, 2));
        console.log(`💾 Datos guardados en: ${filename}`);
        
        const participants = analyzeSession(result.data, targetParticipantId);
        displayAnalysis(participants, targetParticipantId);
        
        return participants;
        
    } catch (error) {
        console.log(`💥 Error: ${error.message}`);
    }
}

// Sesiones conocidas
const KNOWN_SESSIONS = {
    'break_pitt_race': '31907477',  // Tu carrera donde apareces
    'your_session': '32030750'      // Tu sesión original
};

const YOUR_PARTICIPANT_ID = '32230941';  // Tu ID de la carrera encontrada

async function main() {
    console.log('🚀 ANALIZADOR DE SESIONES SMS-TIMING');
    console.log('=' .repeat(50));
    
    if (process.argv.length > 2) {
        // Analizar sesión específica desde línea de comandos
        const sessionId = process.argv[2];
        const participantId = process.argv[3] || null;
        
        await analyzeSessionById(sessionId, participantId);
    } else {
        // Analizar sesiones conocidas
        console.log('📊 Analizando tu carrera encontrada...');
        await analyzeSessionById(KNOWN_SESSIONS.break_pitt_race, YOUR_PARTICIPANT_ID);
        
        console.log('\n⏳ Esperando 2 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📊 Probando tu sesión original...');
        await analyzeSessionById(KNOWN_SESSIONS.your_session, null);
    }
}

main().catch(console.error);

console.log('\n💡 USO:');
console.log('  node analyze-session.js [sessionId] [participantId]');
console.log('  node analyze-session.js 31907477 32230941');