const WebSocket = require('ws');
const fs = require('fs');

let previousRaceState = {};
let raceData = {};
let driverStats = {};

function getTimestamp() {
    return new Date().toISOString();
}

function log(message) {
    const timestamped = `[${getTimestamp()}] ${message}`;
    console.log(timestamped);
    fs.appendFileSync('race-log.txt', timestamped + '\n');
}

function formatTime(milliseconds) {
    if (!milliseconds) return 'N/A';
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
}

function parseRaceData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        if (!data.D || !Array.isArray(data.D)) {
            return null;
        }

        const sessionName = data.N || 'Sesión desconocida';
        const drivers = data.D.map(driver => {
            const driverName = driver.N;
            
            if (!driverStats[driverName]) {
                driverStats[driverName] = {
                    lapTimes: [],
                    totalTime: 0,
                    lapCount: 0,
                    lastCompletedLapTime: 0
                };
            }
            
            const currentLap = driver.L;
            const lastLapTime = driver.A;
            const stats = driverStats[driverName];
            
            if (currentLap > stats.lapCount && lastLapTime && lastLapTime > 0) {
                stats.lapTimes.push(lastLapTime);
                stats.totalTime += lastLapTime;
                stats.lapCount = currentLap;
                stats.lastCompletedLapTime = lastLapTime;
            }
            
            const averageLapTime = stats.lapTimes.length > 0 ? 
                stats.totalTime / stats.lapTimes.length : 0;
            
            return {
                name: driverName,
                kart: driver.K,
                position: driver.P,
                lap: driver.L,
                currentTime: driver.T,
                bestTime: driver.B,
                gap: driver.G || '',
                lastLapTime: driver.T || 0,
                averageLapTime: averageLapTime,
                racerID: driver.D,
                raceNumber: driver.R
            };
        });

        return {
            sessionName,
            drivers: drivers.sort((a, b) => a.position - b.position),
            timestamp: getTimestamp(),
            sessionTimestamp: data.T,
            sessionID: data.E || data.C
        };
    } catch (error) {
        return null;
    }
}

function displayRaceStatus(raceInfo) {
    console.clear();
    console.log('🏁 SPEEDPARK LIVE TIMING 🏁');
    console.log('=' .repeat(80));
    console.log(`📊 ${raceInfo.sessionName}`);
    console.log(`⏰ ${raceInfo.timestamp}`);
    console.log(`🏆 Session ID: ${raceInfo.sessionID} | Session Time: ${raceInfo.sessionTimestamp}`);
    console.log('=' .repeat(80));
    
    console.log('POS | PILOTO      | KART | VUELTA | MEJOR T. | ÚLT. VUELTA | PROMEDIO | GAP     ');
    console.log('-'.repeat(80));
    
    raceInfo.drivers.forEach(driver => {
        const pos = driver.position.toString().padStart(2);
        const name = driver.name.padEnd(10);
        const kart = driver.kart.padStart(2);
        const lap = driver.lap.toString().padStart(3);
        const bestTime = formatTime(driver.bestTime).padEnd(8);
        const lastLap = formatTime(driver.lastLapTime).padEnd(9);
        const avgTime = formatTime(driver.averageLapTime).padEnd(8);
        const gap = driver.gap.padEnd(7);
        
        console.log(`${pos}  | ${name} | ${kart}   | ${lap}    | ${bestTime} | ${lastLap} | ${avgTime} | ${gap}`);
    });
    
    console.log('-'.repeat(80));
    console.log('📊 DATOS PARA APP:');
    raceInfo.drivers.forEach(driver => {
        console.log(`   ${driver.name} (ID: ${driver.racerID}) - Race: ${driver.raceNumber} - Mejor: ${formatTime(driver.bestTime)}`);
    });
    
    console.log('-'.repeat(80));
}

function detectChanges(currentRace, previousRace) {
    if (!previousRace || !previousRace.drivers) return;
    
    const changes = [];
    
    currentRace.drivers.forEach(currentDriver => {
        const previousDriver = previousRace.drivers.find(d => d.name === currentDriver.name);
        
        if (previousDriver) {
            if (currentDriver.position !== previousDriver.position) {
                if (currentDriver.position < previousDriver.position) {
                    changes.push(`🔥 ${currentDriver.name} SUBE a la posición ${currentDriver.position}!`);
                } else {
                    changes.push(`📉 ${currentDriver.name} baja a la posición ${currentDriver.position}`);
                }
            }
            
            if (currentDriver.lap > previousDriver.lap) {
                const lapTime = formatTime(currentDriver.lastLapTime);
                const avgTime = formatTime(currentDriver.averageLapTime);
                changes.push(`✅ ${currentDriver.name} completa vuelta ${currentDriver.lap} - Tiempo: ${lapTime} (Promedio: ${avgTime})`);
            }
            
            if (currentDriver.bestTime < previousDriver.bestTime) {
                changes.push(`⚡ ${currentDriver.name} MEJOR TIEMPO! ${formatTime(currentDriver.bestTime)}`);
            }
        }
    });
    
    changes.forEach(change => log(change));
}

function connectToWebSocket() {
    log('🚀 Iniciando Race Tracker...');
    
    const ws = new WebSocket('wss://webserver22.sms-timing.com:10015/');
    
    ws.on('open', function open() {
        log('✅ Conexión establecida');
        log('📤 Enviando: START 8501@speedpark');
        ws.send('START 8501@speedpark');
    });
    
    ws.on('message', function message(data) {
        const raceInfo = parseRaceData(data.toString());
        
        if (raceInfo) {
            detectChanges(raceInfo, previousRaceState);
            displayRaceStatus(raceInfo);
            previousRaceState = JSON.parse(JSON.stringify(raceInfo));
        } else {
            log(`📨 Datos sin procesar: ${data}`);
        }
    });
    
    ws.on('close', function close(code, reason) {
        log(`❌ Conexión cerrada - Código: ${code}, Motivo: ${reason || 'No especificado'}`);
    });
    
    ws.on('error', function error(err) {
        log(`💥 Error de WebSocket: ${err.message}`);
    });
    
    setTimeout(() => {
        log('⏰ Cerrando conexión después de 2 minutos...');
        ws.close();
    }, 2 * 60 * 1000);
}

log('🏁 === SPEEDPARK RACE TRACKER INICIADO ===');
connectToWebSocket();