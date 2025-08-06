const https = require('https');
const readline = require('readline');

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Searching: ${url}`);
        
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

async function searchDriver(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const searchUrl = `${BASE_URL}/search?alias=${encodedQuery}`;
        
        const result = await makeRequest(searchUrl);
        
        if (result.statusCode !== 200) {
            console.log(`❌ Error ${result.statusCode}: ${result.rawData}`);
            return null;
        }
        
        return result.data;
    } catch (error) {
        console.log(`💥 Error: ${error.message}`);
        return null;
    }
}

async function getDriverDetails(driverId) {
    try {
        console.log(`\n🔍 Obteniendo detalles del corredor ${driverId}...`);
        
        const endpoints = [
            { name: 'Estadísticas', url: `/racestatistics/driver/${driverId}` },
            { name: 'Información', url: `/participants/${driverId}` },
            { name: 'Historial', url: `/driver/${driverId}/history` },
            { name: 'Mejores Tiempos', url: `/driver/${driverId}/best` }
        ];
        
        const results = {};
        
        for (const endpoint of endpoints) {
            try {
                const result = await makeRequest(BASE_URL + endpoint.url);
                
                if (result.statusCode === 200) {
                    results[endpoint.name] = result.data;
                    console.log(`✅ ${endpoint.name}: OK`);
                } else {
                    console.log(`⚠️  ${endpoint.name}: ${result.statusCode}`);
                }
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`❌ ${endpoint.name}: ${error.message}`);
            }
        }
        
        return results;
    } catch (error) {
        console.log(`💥 Error getting driver details: ${error.message}`);
        return null;
    }
}

function displayDriverInfo(searchResults) {
    if (!searchResults || !Array.isArray(searchResults)) {
        console.log('❌ No se encontraron resultados');
        return [];
    }
    
    console.log('\n🏁 RESULTADOS DE BÚSQUEDA:');
    console.log('=' .repeat(60));
    
    const drivers = [];
    
    searchResults.forEach((driver, index) => {
        console.log(`${index + 1}. ${driver.alias || driver.name || 'Sin nombre'}`);
        console.log(`   ID: ${driver.id || driver.driverId || 'N/A'}`);
        console.log(`   Track: ${driver.track || 'N/A'}`);
        
        if (driver.bestLapTime) {
            console.log(`   Mejor tiempo: ${formatTime(driver.bestLapTime)}`);
        }
        
        if (driver.totalRaces) {
            console.log(`   Carreras: ${driver.totalRaces}`);
        }
        
        console.log('');
        
        drivers.push({
            index: index + 1,
            id: driver.id || driver.driverId,
            name: driver.alias || driver.name,
            data: driver
        });
    });
    
    return drivers;
}

function displayDriverDetails(details) {
    console.log('\n📊 DETALLES DEL CORREDOR:');
    console.log('=' .repeat(60));
    
    Object.entries(details).forEach(([category, data]) => {
        console.log(`\n🔸 ${category.toUpperCase()}:`);
        
        if (Array.isArray(data)) {
            console.log(`   📊 ${data.length} registros encontrados`);
            
            if (data.length > 0) {
                console.log('   📋 Campos disponibles:', Object.keys(data[0]));
                
                // Show first few items
                data.slice(0, 3).forEach((item, index) => {
                    console.log(`   ${index + 1}. ${JSON.stringify(item).substring(0, 100)}...`);
                });
            }
        } else if (data && typeof data === 'object') {
            console.log('   📋 Información:');
            Object.entries(data).forEach(([key, value]) => {
                console.log(`      ${key}: ${value}`);
            });
        } else {
            console.log(`   📄 Datos: ${data}`);
        }
    });
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    console.log('🚀 SPEEDPARK DRIVER SEARCH');
    console.log('=' .repeat(40));
    
    while (true) {
        try {
            const query = await askQuestion('\n🔍 Ingresa el nombre del corredor (o "exit" para salir): ');
            
            if (query.toLowerCase() === 'exit') {
                console.log('👋 ¡Hasta luego!');
                break;
            }
            
            if (query.trim().length < 2) {
                console.log('⚠️  Ingresa al menos 2 caracteres');
                continue;
            }
            
            console.log(`\n🔎 Buscando "${query}"...`);
            
            const searchResults = await searchDriver(query);
            
            if (!searchResults) {
                console.log('❌ No se pudo realizar la búsqueda');
                continue;
            }
            
            const drivers = displayDriverInfo(searchResults);
            
            if (drivers.length === 0) {
                console.log('📭 No se encontraron corredores con ese nombre');
                continue;
            }
            
            const choice = await askQuestion('👆 Selecciona un número para ver detalles (o Enter para nueva búsqueda): ');
            
            if (choice.trim() === '') {
                continue;
            }
            
            const selectedIndex = parseInt(choice) - 1;
            
            if (selectedIndex >= 0 && selectedIndex < drivers.length) {
                const selectedDriver = drivers[selectedIndex];
                
                if (selectedDriver.id) {
                    const details = await getDriverDetails(selectedDriver.id);
                    if (details) {
                        displayDriverDetails(details);
                    }
                } else {
                    console.log('❌ No se pudo obtener el ID del corredor');
                }
            } else {
                console.log('❌ Selección inválida');
            }
            
        } catch (error) {
            console.log(`💥 Error: ${error.message}`);
        }
    }
    
    rl.close();
}

// Ejemplos de uso rápido
if (process.argv.length > 2) {
    const query = process.argv.slice(2).join(' ');
    console.log(`🚀 Búsqueda rápida: "${query}"`);
    
    searchDriver(query).then(results => {
        displayDriverInfo(results);
        process.exit(0);
    }).catch(error => {
        console.log(`💥 Error: ${error.message}`);
        process.exit(1);
    });
} else {
    main().catch(console.error);
}

console.log('\n💡 TIP: También puedes usar: node driver-search.js "Break Pitt"');