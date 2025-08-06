const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';
const AUTH_HEADERS = {
    'X-Fast-DeviceToken': '1111111129R2A932939',
    'X-Fast-AccessToken': '51klijayaaiyamkojkj',
    'X-Fast-Version': '6250311 202504181931',
    'Accept': 'application/json'
};

// Storage for all discovered drivers
let allDrivers = new Map();
let sessionDetails = [];

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: AUTH_HEADERS }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

async function getSessionHistory() {
    console.log('🔍 Obteniendo tu historial completo...');
    
    try {
        const history = await makeRequest(`${BASE_URL}/activity-history/list/speedpark`);
        
        if (!history || !Array.isArray(history)) {
            throw new Error('No se pudo obtener el historial');
        }
        
        console.log(`✅ Encontradas ${history.length} carreras en tu historial`);
        return history;
        
    } catch (error) {
        console.error('❌ Error obteniendo historial:', error.message);
        return [];
    }
}

async function getSessionDetails(sessionId) {
    try {
        // Get session participants
        const sessionData = await makeRequest(
            `${BASE_URL}/racestatistics/sessionv2/speedpark?sessionId=${sessionId}`
        );
        
        // Get detailed lap times  
        const lapData = await makeRequest(
            `${BASE_URL}/racestatistics/laps_fast5/speedpark?sessionId=${sessionId}`
        );
        
        // Get activity details
        const activityData = await makeRequest(
            `${BASE_URL}/activity-history/details/speedpark?sessionId=${sessionId}`
        );
        
        return { sessionData, lapData, activityData };
        
    } catch (error) {
        console.error(`❌ Error en sesión ${sessionId}:`, error.message);
        return null;
    }
}

function processSessionData(sessionId, sessionName, date, data) {
    if (!data) return;
    
    const { sessionData, lapData, activityData } = data;
    
    // Process participants from sessionv2
    if (sessionData && Array.isArray(sessionData)) {
        sessionData.forEach(participant => {
            const driverId = participant.id || participant.participantId;
            const personId = participant.personId;
            
            if (driverId) {
                const driver = {
                    driverId: driverId,
                    personId: personId || null,
                    alias: participant.alias || '',
                    firstName: participant.firstName || '',
                    lastName: participant.name || participant.lastName || '',
                    bestTimeInSession: participant.scoreDefault || null,
                    positionInSession: participant.position || null,
                    sessions: allDrivers.has(driverId) ? 
                        [...allDrivers.get(driverId).sessions, { sessionId, sessionName, date, position: participant.position }] :
                        [{ sessionId, sessionName, date, position: participant.position }]
                };
                
                // Update or add driver
                if (allDrivers.has(driverId)) {
                    const existing = allDrivers.get(driverId);
                    existing.sessions.push({ sessionId, sessionName, date, position: participant.position });
                    
                    // Update best time if better
                    if (participant.scoreDefault && 
                        (!existing.bestTimeOverall || participant.scoreDefault < existing.bestTimeOverall)) {
                        existing.bestTimeOverall = participant.scoreDefault;
                        existing.bestTimeSession = sessionId;
                    }
                    
                    existing.totalRaces = existing.sessions.length;
                    existing.lastSeen = date;
                    
                } else {
                    driver.bestTimeOverall = participant.scoreDefault || null;
                    driver.bestTimeSession = sessionId;
                    driver.totalRaces = 1;
                    driver.firstSeen = date;
                    driver.lastSeen = date;
                    
                    allDrivers.set(driverId, driver);
                }
            }
        });
    }
    
    // Process detailed participants from activity-history
    if (activityData && activityData.participants && Array.isArray(activityData.participants)) {
        activityData.participants.forEach(participant => {
            const driverId = participant.id;
            const personId = participant.personId;
            
            if (driverId && allDrivers.has(driverId)) {
                const driver = allDrivers.get(driverId);
                
                // Update with more complete data
                if (participant.alias && !driver.alias) driver.alias = participant.alias;
                if (participant.firstName && !driver.firstName) driver.firstName = participant.firstName;
                if (participant.name && !driver.lastName) driver.lastName = participant.name;
                if (personId && !driver.personId) driver.personId = personId;
            }
        });
    }
    
    sessionDetails.push({
        sessionId,
        sessionName, 
        date,
        participantCount: sessionData ? sessionData.length : 0,
        processed: true
    });
}

async function buildDriversDatabase() {
    console.log('🚀 CONSTRUYENDO BASE DE DATOS DE CORREDORES');
    console.log('Fuente: Tu historial completo de carreras');
    console.log('=' .repeat(60));
    
    // Step 1: Get your race history
    const history = await getSessionHistory();
    
    if (history.length === 0) {
        console.log('❌ No se pudo obtener el historial');
        return;
    }
    
    console.log(`\n📊 Procesando ${history.length} carreras...`);
    
    // Step 2: Process each session
    for (let i = 0; i < history.length; i++) {
        const session = history[i];
        
        console.log(`\n🏁 ${i + 1}/${history.length} - ${session.name} (${session.id})`);
        console.log(`   📅 ${session.date}`);
        
        const data = await getSessionDetails(session.id);
        
        if (data) {
            processSessionData(session.id, session.name, session.date, data);
            console.log(`   ✅ Procesada - ${data.sessionData ? data.sessionData.length : 0} participantes`);
        } else {
            console.log(`   ❌ Error procesando sesión`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Step 3: Generate final database
    console.log('\n📊 GENERANDO BASE DE DATOS FINAL...');
    
    const driversArray = Array.from(allDrivers.values());
    
    // Sort by best time
    driversArray.sort((a, b) => {
        if (!a.bestTimeOverall) return 1;
        if (!b.bestTimeOverall) return -1;
        return a.bestTimeOverall - b.bestTimeOverall;
    });
    
    // Generate database files
    const database = {
        metadata: {
            generatedAt: new Date().toISOString(),
            totalDrivers: driversArray.length,
            totalSessions: sessionDetails.length,
            dateRange: {
                from: history[history.length - 1]?.date,
                to: history[0]?.date
            }
        },
        drivers: driversArray,
        sessions: sessionDetails
    };
    
    // Save complete database
    fs.writeFileSync('./speedpark_drivers_database.json', JSON.stringify(database, null, 2));
    
    // Save CSV for easy viewing
    generateCSV(driversArray);
    
    // Generate summary report
    generateSummaryReport(driversArray, sessionDetails);
    
    console.log('\n🎉 BASE DE DATOS COMPLETADA!');
    console.log(`📊 ${driversArray.length} corredores únicos encontrados`);
    console.log(`🏁 ${sessionDetails.length} carreras procesadas`);
    console.log('📁 Archivos generados:');
    console.log('   📄 speedpark_drivers_database.json - Base de datos completa');
    console.log('   📊 speedpark_drivers_summary.csv - Resumen en CSV');
    console.log('   📋 database_report.txt - Reporte detallado');
}

function generateCSV(drivers) {
    const headers = [
        'Rank',
        'DriverID',
        'PersonID', 
        'Alias',
        'FirstName',
        'LastName',
        'BestTime_ms',
        'BestTime_seconds',
        'TotalRaces',
        'FirstSeen', 
        'LastSeen'
    ];
    
    let csv = headers.join(',') + '\n';
    
    drivers.forEach((driver, index) => {
        const row = [
            index + 1,
            driver.driverId,
            driver.personId || '',
            `"${driver.alias}"`,
            `"${driver.firstName}"`, 
            `"${driver.lastName}"`,
            driver.bestTimeOverall || '',
            driver.bestTimeOverall ? (driver.bestTimeOverall / 1000).toFixed(3) : '',
            driver.totalRaces,
            driver.firstSeen?.split('T')[0] || '',
            driver.lastSeen?.split('T')[0] || ''
        ];
        
        csv += row.join(',') + '\n';
    });
    
    fs.writeFileSync('./speedpark_drivers_summary.csv', csv);
}

function generateSummaryReport(drivers, sessions) {
    let report = `SPEEDPARK DRIVERS DATABASE REPORT\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `=" .repeat(50)\n\n`;
    
    report += `STATISTICS:\n`;
    report += `- Total unique drivers: ${drivers.length}\n`;
    report += `- Total races processed: ${sessions.length}\n`;
    report += `- Date range: ${sessions[sessions.length - 1]?.date?.split('T')[0]} to ${sessions[0]?.date?.split('T')[0]}\n\n`;
    
    report += `TOP 10 FASTEST DRIVERS:\n`;
    drivers.slice(0, 10).forEach((driver, index) => {
        const time = driver.bestTimeOverall ? (driver.bestTimeOverall / 1000).toFixed(3) + 's' : 'N/A';
        report += `${index + 1}. ${driver.alias || driver.firstName + ' ' + driver.lastName} - ${time} (${driver.totalRaces} races)\n`;
    });
    
    report += `\nMOST ACTIVE DRIVERS:\n`;
    const byActivity = [...drivers].sort((a, b) => b.totalRaces - a.totalRaces);
    byActivity.slice(0, 10).forEach((driver, index) => {
        report += `${index + 1}. ${driver.alias || driver.firstName + ' ' + driver.lastName} - ${driver.totalRaces} races\n`;
    });
    
    fs.writeFileSync('./database_report.txt', report);
}

// Run the database builder
buildDriversDatabase().catch(console.error);