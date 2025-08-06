const fs = require('fs');

console.log('🔄 CONSOLIDANDO CORREDORES POR PersonID');
console.log('=' .repeat(50));

// Read the JSON database
const driversData = JSON.parse(fs.readFileSync('./drivers_basic_database.json', 'utf8'));

// Group by PersonID and Alias for drivers without PersonID
const consolidatedDrivers = new Map();

driversData.forEach(driver => {
    let key;
    
    if (driver.personId && driver.personId.trim() !== '') {
        // Use PersonID as primary key for registered users
        key = driver.personId;
    } else {
        // Use alias as key for guest/unregistered users
        key = `guest_${driver.alias}`;
    }
    
    if (consolidatedDrivers.has(key)) {
        const existing = consolidatedDrivers.get(key);
        
        // Update best time if this one is better
        if (driver.bestTime && (!existing.bestTime || driver.bestTime < existing.bestTime)) {
            existing.bestTime = driver.bestTime;
            existing.bestTimeSession = driver.foundInSession;
        }
        
        // Add this session to races count
        existing.totalRaces = (existing.totalRaces || 1) + 1;
        existing.allDriverIds.push(driver.driverId);
        existing.allSessions.push(driver.foundInSession);
        
        // Update personal info if better data available
        if (driver.firstName && !existing.firstName) existing.firstName = driver.firstName;
        if (driver.lastName && !existing.lastName) existing.lastName = driver.lastName;
        if (driver.alias && !existing.alias) existing.alias = driver.alias;
        
    } else {
        // First time seeing this driver
        consolidatedDrivers.set(key, {
            personId: driver.personId || '',
            alias: driver.alias || '',
            firstName: driver.firstName || '',
            lastName: driver.lastName || '',
            bestTime: driver.bestTime,
            bestTimeSession: driver.foundInSession,
            totalRaces: 1,
            allDriverIds: [driver.driverId],
            allSessions: [driver.foundInSession],
            isRegistered: driver.personId && driver.personId.trim() !== ''
        });
    }
});

// Convert to array and sort by best time
const uniqueDrivers = Array.from(consolidatedDrivers.values());

// Sort by best time (nulls last)
uniqueDrivers.sort((a, b) => {
    if (!a.bestTime) return 1;
    if (!b.bestTime) return -1;
    return a.bestTime - b.bestTime;
});

console.log(`\n📊 CONSOLIDACIÓN COMPLETADA:`);
console.log(`   Original: ${driversData.length} entradas`);
console.log(`   Únicos: ${uniqueDrivers.length} corredores reales`);

// Show stats
const registered = uniqueDrivers.filter(d => d.isRegistered).length;
const guests = uniqueDrivers.length - registered;

console.log(`   Registrados: ${registered}`);
console.log(`   Invitados: ${guests}`);

// Generate consolidated CSV
function generateConsolidatedCSV(drivers) {
    const headers = [
        'Rank',
        'PersonID',
        'Alias', 
        'FirstName',
        'LastName',
        'BestTime_ms',
        'BestTime_seconds',
        'TotalRaces',
        'IsRegistered',
        'AllDriverIds',
        'AllSessions'
    ];
    
    let csv = headers.join(',') + '\n';
    
    drivers.forEach((driver, index) => {
        const row = [
            index + 1,
            driver.personId || '',
            `"${driver.alias}"`,
            `"${driver.firstName}"`,
            `"${driver.lastName}"`,
            driver.bestTime || '',
            driver.bestTime ? (driver.bestTime / 1000).toFixed(3) : '',
            driver.totalRaces,
            driver.isRegistered ? 'YES' : 'NO',
            `"${driver.allDriverIds.join(';')}"`,
            `"${driver.allSessions.join(';')}"`
        ];
        
        csv += row.join(',') + '\n';
    });
    
    fs.writeFileSync('./unique_drivers_consolidated.csv', csv);
    console.log('✅ CSV consolidado guardado: unique_drivers_consolidated.csv');
}

// Display top drivers
function displayTopDrivers(drivers) {
    console.log('\n🏆 TOP 20 CORREDORES ÚNICOS:');
    console.log('=' .repeat(80));
    console.log('Rank | Alias           | Name                    | Best Time | Races | Type');
    console.log('-'.repeat(80));
    
    drivers.slice(0, 20).forEach((driver, index) => {
        const rank = (index + 1).toString().padStart(4);
        const alias = (driver.alias || '').padEnd(15);
        const name = `${driver.firstName} ${driver.lastName}`.trim().padEnd(23);
        const bestTime = driver.bestTime ? (driver.bestTime / 1000).toFixed(3) + 's' : 'N/A'.padEnd(6);
        const races = driver.totalRaces.toString().padStart(5);
        const type = driver.isRegistered ? '👤' : '👥';
        
        console.log(`${rank} | ${alias} | ${name} | ${bestTime} | ${races} | ${type}`);
    });
}

// Show your personal stats
function showPersonalStats(drivers) {
    const you = drivers.find(d => d.alias === 'Break Pitt');
    if (you) {
        console.log('\n🎯 TUS ESTADÍSTICAS PERSONALES:');
        console.log('-'.repeat(40));
        console.log(`Alias: ${you.alias}`);
        console.log(`Nombre: ${you.firstName} ${you.lastName}`);
        console.log(`PersonID: ${you.personId}`);
        console.log(`Mejor tiempo: ${(you.bestTime / 1000).toFixed(3)}s`);
        console.log(`Total carreras: ${you.totalRaces}`);
        console.log(`Sesión de mejor tiempo: ${you.bestTimeSession}`);
        
        const rank = drivers.indexOf(you) + 1;
        console.log(`Ranking actual: #${rank} de ${drivers.length}`);
    }
}

// Execute all functions
displayTopDrivers(uniqueDrivers);
showPersonalStats(uniqueDrivers);
generateConsolidatedCSV(uniqueDrivers);

// Save JSON for development
fs.writeFileSync('./unique_drivers_consolidated.json', JSON.stringify(uniqueDrivers, null, 2));
console.log('✅ JSON consolidado guardado: unique_drivers_consolidated.json');

console.log('\n📁 ARCHIVOS GENERADOS:');
console.log('   📊 unique_drivers_consolidated.csv - Corredores únicos consolidados');
console.log('   📄 unique_drivers_consolidated.json - Para desarrollo');