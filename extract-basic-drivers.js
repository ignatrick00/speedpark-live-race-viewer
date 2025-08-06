const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';
const AUTH_HEADERS = {
    'X-Fast-DeviceToken': '1111111129R2A932939',
    'X-Fast-AccessToken': '51klijayaaiyamkojkj',
    'X-Fast-Version': '6250311 202504181931',
    'Accept': 'application/json'
};

let allDrivers = new Map();

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
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

async function extractDriversFromSessions() {
    console.log('🔍 Extrayendo corredores de tus sesiones conocidas...');
    
    // Usar las sesiones que sabemos que funcionan
    const knownSessions = [
        '32030750', '32030742', '31929104', '31929102', '31929100', 
        '31929098', '31907996', '31907994', '31907988', '31907986',
        '31907477', '31907475', '31907469', '32231895', '31907457'
    ];
    
    console.log(`📊 Procesando ${knownSessions.length} sesiones conocidas...`);
    
    for (let i = 0; i < knownSessions.length; i++) {
        const sessionId = knownSessions[i];
        
        try {
            console.log(`\n🏁 ${i + 1}/${knownSessions.length} - Sesión ${sessionId}`);
            
            // Get session participants
            const sessionData = await makeRequest(
                `${BASE_URL}/racestatistics/sessionv2/speedpark?sessionId=${sessionId}`
            );
            
            // Get activity details for more complete data
            const activityData = await makeRequest(
                `${BASE_URL}/activity-history/details/speedpark?sessionId=${sessionId}`
            );
            
            if (sessionData && Array.isArray(sessionData)) {
                console.log(`   📊 ${sessionData.length} participantes encontrados`);
                
                sessionData.forEach(participant => {
                    const driverId = participant.id || participant.participantId;
                    
                    if (driverId && !allDrivers.has(driverId)) {
                        allDrivers.set(driverId, {
                            driverId: driverId,
                            personId: participant.personId || '',
                            alias: participant.alias || '',
                            firstName: participant.firstName || '',
                            lastName: participant.name || participant.lastName || '',
                            bestTime: participant.scoreDefault || null,
                            foundInSession: sessionId
                        });
                    }
                });
            }
            
            // Process activity details for additional data
            if (activityData && activityData.participants) {
                activityData.participants.forEach(participant => {
                    const driverId = participant.id;
                    
                    if (driverId && allDrivers.has(driverId)) {
                        const driver = allDrivers.get(driverId);
                        
                        // Update with more complete data if available
                        if (participant.alias && !driver.alias) driver.alias = participant.alias;
                        if (participant.firstName && !driver.firstName) driver.firstName = participant.firstName;
                        if (participant.name && !driver.lastName) driver.lastName = participant.name;
                        if (participant.personId && !driver.personId) driver.personId = participant.personId;
                    }
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.log(`   ❌ Error en sesión ${sessionId}: ${error.message}`);
        }
    }
    
    return Array.from(allDrivers.values());
}

function generateCSV(drivers) {
    console.log('\n📊 Generando CSV con datos básicos...');
    
    const headers = ['DriverID', 'PersonID', 'Alias', 'FirstName', 'LastName', 'BestTime_ms', 'BestTime_seconds', 'FoundInSession'];
    let csv = headers.join(',') + '\n';
    
    // Sort by alias for easy reading
    drivers.sort((a, b) => {
        const nameA = a.alias || a.firstName || 'ZZZ';
        const nameB = b.alias || b.firstName || 'ZZZ';
        return nameA.localeCompare(nameB);
    });
    
    drivers.forEach(driver => {
        const row = [
            driver.driverId,
            driver.personId,
            `"${driver.alias}"`,
            `"${driver.firstName}"`,
            `"${driver.lastName}"`,
            driver.bestTime || '',
            driver.bestTime ? (driver.bestTime / 1000).toFixed(3) : '',
            driver.foundInSession
        ];
        
        csv += row.join(',') + '\n';
    });
    
    fs.writeFileSync('./drivers_basic_database.csv', csv);
    console.log('✅ CSV guardado: drivers_basic_database.csv');
}

function displayDrivers(drivers) {
    console.log('\n👥 CORREDORES ENCONTRADOS:');
    console.log('=' .repeat(80));
    console.log('ID          | ALIAS           | FIRST NAME      | LAST NAME       | PERSON ID');
    console.log('-'.repeat(80));
    
    drivers.slice(0, 50).forEach(driver => {
        const id = driver.driverId.padEnd(10);
        const alias = (driver.alias || '').padEnd(15);
        const firstName = (driver.firstName || '').padEnd(15);
        const lastName = (driver.lastName || '').padEnd(15);
        const personId = driver.personId ? driver.personId.substring(0, 12) + '...' : '';
        
        console.log(`${id} | ${alias} | ${firstName} | ${lastName} | ${personId}`);
    });
    
    if (drivers.length > 50) {
        console.log(`... y ${drivers.length - 50} más`);
    }
    
    console.log('-'.repeat(80));
    console.log(`📊 Total: ${drivers.length} corredores únicos`);
}

async function main() {
    console.log('🚀 EXTRACTOR BÁSICO DE CORREDORES');
    console.log('Extrayendo: ID, Alias, FirstName, LastName, PersonID');
    console.log('=' .repeat(60));
    
    const drivers = await extractDriversFromSessions();
    
    console.log(`\n🎉 Procesamiento completado!`);
    console.log(`📊 ${drivers.length} corredores únicos encontrados`);
    
    displayDrivers(drivers);
    generateCSV(drivers);
    
    // Save JSON for future use
    fs.writeFileSync('./drivers_basic_database.json', JSON.stringify(drivers, null, 2));
    console.log('✅ JSON guardado: drivers_basic_database.json');
    
    console.log('\n📁 Archivos generados:');
    console.log('   📄 drivers_basic_database.csv - Para Excel/visualización');
    console.log('   📄 drivers_basic_database.json - Para desarrollo');
}

main().catch(console.error);