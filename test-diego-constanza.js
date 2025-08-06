const https = require('https');

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

// IDs que conocemos del WebSocket
const DIEGO_ID = '32670842';
const CONSTANZA_ID = '32670841';
const KNOWN_SESSION_TIMESTAMP = '1754403600';

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Testing: ${url}`);
        
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
                        data: jsonData,
                        rawData: data
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: null,
                        rawData: data,
                        parseError: error.message
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

function formatTime(milliseconds) {
    if (!milliseconds) return 'N/A';
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
}

async function testSessionRange(baseSession, range = 50) {
    console.log(`🔍 Probando rango de sesiones alrededor de ${baseSession}...`);
    
    const results = [];
    
    for (let i = -range; i <= range; i++) {
        const sessionId = parseInt(baseSession) + i;
        
        try {
            const url = `${BASE_URL}/racestatistics/laps_fast5/speedpark?sessionId=${sessionId}`;
            const result = await makeRequest(url);
            
            if (result.statusCode === 200 && result.data) {
                console.log(`✅ ENCONTRADA! Session ${sessionId}`);
                
                // Buscar Diego y Constanza en los datos
                const diegoData = result.data.filter(lap => 
                    lap.driverId == DIEGO_ID || 
                    (lap.driverName && lap.driverName.toLowerCase().includes('diego'))
                );
                
                const constanzaData = result.data.filter(lap => 
                    lap.driverId == CONSTANZA_ID || 
                    (lap.driverName && lap.driverName.toLowerCase().includes('constanza'))
                );
                
                if (diegoData.length > 0 || constanzaData.length > 0) {
                    console.log(`🎯 BINGO! Sesión ${sessionId} tiene Diego y/o Constanza!`);
                    
                    results.push({
                        sessionId: sessionId,
                        data: result.data,
                        diegoLaps: diegoData.length,
                        constanzaLaps: constanzaData.length
                    });
                }
                
                console.log(`   📊 ${result.data.length} registros, pilotos únicos: ${[...new Set(result.data.map(d => d.driverName || d.driverId))].length}`);
                
            } else if (result.statusCode === 401) {
                console.log(`🔐 Session ${sessionId}: Unauthorized (existe pero privada)`);
            } else if (result.statusCode !== 404) {
                console.log(`❓ Session ${sessionId}: Status ${result.statusCode}`);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            // Silently continue for network errors
        }
    }
    
    return results;
}

async function analyzeSession(sessionId, data) {
    console.log(`\n📊 ANÁLISIS DE SESIÓN ${sessionId}`);
    console.log('=' .repeat(60));
    
    // Agrupar por piloto
    const driverStats = {};
    
    data.forEach(lap => {
        const driverId = lap.driverId || 'unknown';
        const driverName = lap.driverName || `Driver_${driverId}`;
        
        if (!driverStats[driverId]) {
            driverStats[driverId] = {
                name: driverName,
                laps: [],
                bestTime: Infinity,
                totalTime: 0
            };
        }
        
        if (lap.lapTime && lap.lapTime > 0) {
            driverStats[driverId].laps.push(lap.lapTime);
            driverStats[driverId].bestTime = Math.min(driverStats[driverId].bestTime, lap.lapTime);
            driverStats[driverId].totalTime += lap.lapTime;
        }
    });
    
    // Mostrar estadísticas
    Object.entries(driverStats).forEach(([driverId, stats]) => {
        const avgTime = stats.laps.length > 0 ? stats.totalTime / stats.laps.length : 0;
        const isTargetDriver = driverId === DIEGO_ID || driverId === CONSTANZA_ID;
        const icon = isTargetDriver ? '🎯' : '🏁';
        
        console.log(`${icon} ${stats.name} (ID: ${driverId})`);
        console.log(`   💯 Vueltas: ${stats.laps.length}`);
        console.log(`   ⚡ Mejor tiempo: ${formatTime(stats.bestTime)}`);
        console.log(`   📈 Tiempo promedio: ${formatTime(avgTime)}`);
        console.log('');
    });
}

async function main() {
    console.log('🚀 BUSCANDO SESIÓN DE DIEGO Y CONSTANZA');
    console.log('=' .repeat(50));
    console.log(`🎯 Diego ID: ${DIEGO_ID}`);
    console.log(`🎯 Constanza ID: ${CONSTANZA_ID}`);
    console.log('=' .repeat(50));
    
    // Probar diferentes estrategias para encontrar su sesión
    
    // 1. Probar alrededor de tu sesión conocida
    console.log('\n📍 ESTRATEGIA 1: Cerca de tu sesión conocida');
    const yourSession = '32030750';
    let results = await testSessionRange(yourSession, 100);
    
    if (results.length === 0) {
        // 2. Probar sesiones más recientes
        console.log('\n📍 ESTRATEGIA 2: Sesiones más recientes');
        const recentSession = String(parseInt(yourSession) + 1000);
        results = await testSessionRange(recentSession, 50);
    }
    
    if (results.length === 0) {
        // 3. Probar usando el timestamp como pista
        console.log('\n📍 ESTRATEGIA 3: Basado en timestamp');
        // El timestamp podría dar pistas del rango de sesiones
        const estimatedSession = '32031000'; // Estimación
        results = await testSessionRange(estimatedSession, 30);
    }
    
    // Analizar resultados encontrados
    if (results.length > 0) {
        console.log(`\n🎉 ENCONTRADAS ${results.length} SESIONES CON DIEGO/CONSTANZA!`);
        
        for (const result of results) {
            await analyzeSession(result.sessionId, result.data);
        }
    } else {
        console.log('\n😞 No se encontraron sesiones con Diego y Constanza en los rangos probados');
        console.log('💡 Podrían estar en sesiones más lejanas o usar IDs diferentes');
    }
}

main().catch(console.error);