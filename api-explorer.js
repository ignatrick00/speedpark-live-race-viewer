const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';
const DRIVER_ID = '32617264';
const SESSION_ID = '32030750';

const endpoints = [
    {
        name: 'laps_fast5',
        url: `/racestatistics/laps_fast5/speedpark?sessionId=${SESSION_ID}`,
        description: 'Top 5 fastest laps for session'
    },
    {
        name: 'all_statistics',
        url: '/racestatistics/all/speedpark',
        description: 'All race statistics for speedpark'
    },
    {
        name: 'driver_stats',
        url: `/racestatistics/driver/${DRIVER_ID}`,
        description: 'Statistics for specific driver'
    },
    {
        name: 'participants',
        url: `/participants/${DRIVER_ID}`,
        description: 'Participant information'
    },
    {
        name: 'sessions',
        url: '/sessions/speedpark',
        description: 'All sessions for speedpark'
    },
    {
        name: 'recent_sessions',
        url: '/sessions/recent',
        description: 'Recent sessions across all tracks'
    },
    {
        name: 'leaderboard',
        url: '/leaderboard/speedpark',
        description: 'Current leaderboard for speedpark'
    },
    {
        name: 'driver_history',
        url: `/driver/${DRIVER_ID}/history`,
        description: 'Driver race history'
    },
    {
        name: 'driver_best',
        url: `/driver/${DRIVER_ID}/best`,
        description: 'Driver best times'
    },
    {
        name: 'search_driver',
        url: '/search?alias=Break%20Pitt',
        description: 'Search for driver by alias'
    }
];

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const fullUrl = BASE_URL + url;
        console.log(`🔍 Testing: ${fullUrl}`);
        
        const req = https.get(fullUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: jsonData,
                        rawData: data
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
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

function analyzeSessionData(data, driverId) {
    if (!data || !Array.isArray(data)) return null;
    
    const driverData = data.filter(lap => lap.driverId == driverId);
    if (driverData.length === 0) return null;
    
    const times = driverData.map(lap => lap.lapTime).filter(time => time > 0);
    const bestTime = Math.min(...times);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    return {
        totalLaps: driverData.length,
        bestTime: bestTime,
        averageTime: averageTime,
        times: times,
        progression: driverData.map((lap, index) => ({
            lap: index + 1,
            time: lap.lapTime,
            position: lap.position || 'N/A'
        }))
    };
}

async function exploreAPI() {
    console.log('🚀 SMS-TIMING API EXPLORER');
    console.log('=' .repeat(60));
    console.log(`Driver ID: ${DRIVER_ID}`);
    console.log(`Session ID: ${SESSION_ID}`);
    console.log('=' .repeat(60));
    
    const results = {};
    let sessionAnalysis = null;
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n📊 ${endpoint.name.toUpperCase()}`);
            console.log(`Description: ${endpoint.description}`);
            console.log('-'.repeat(40));
            
            const result = await makeRequest(endpoint.url);
            results[endpoint.name] = result;
            
            if (result.statusCode === 200) {
                console.log(`✅ Status: ${result.statusCode}`);
                console.log(`📦 Data type: ${Array.isArray(result.data) ? 'Array' : 'Object'}`);
                console.log(`📏 Size: ${Array.isArray(result.data) ? result.data.length + ' items' : Object.keys(result.data || {}).length + ' keys'}`);
                
                // Save to file
                const filename = `data/${endpoint.name}.json`;
                fs.mkdirSync('data', { recursive: true });
                fs.writeFileSync(filename, JSON.stringify(result.data, null, 2));
                console.log(`💾 Saved to: ${filename}`);
                
                // Show sample data
                if (Array.isArray(result.data) && result.data.length > 0) {
                    console.log(`📋 Sample item keys:`, Object.keys(result.data[0]));
                } else if (result.data && typeof result.data === 'object') {
                    console.log(`📋 Object keys:`, Object.keys(result.data));
                }
                
                // Special analysis for laps_fast5
                if (endpoint.name === 'laps_fast5' && result.data) {
                    sessionAnalysis = analyzeSessionData(result.data, DRIVER_ID);
                }
                
            } else {
                console.log(`❌ Status: ${result.statusCode}`);
                if (result.parseError) {
                    console.log(`🚫 Parse Error: ${result.parseError}`);
                }
                console.log(`📄 Raw response: ${result.rawData.substring(0, 200)}...`);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.log(`💥 Error: ${error.message}`);
            results[endpoint.name] = { error: error.message };
        }
    }
    
    // Driver Analysis
    if (sessionAnalysis) {
        console.log('\n' + '=' .repeat(60));
        console.log('🏁 TU ANÁLISIS DE SESIÓN');
        console.log('=' .repeat(60));
        console.log(`📊 Total de vueltas: ${sessionAnalysis.totalLaps}`);
        console.log(`⚡ Mejor tiempo: ${formatTime(sessionAnalysis.bestTime)}`);
        console.log(`📈 Tiempo promedio: ${formatTime(sessionAnalysis.averageTime)}`);
        
        console.log('\n🏃 PROGRESIÓN VUELTA POR VUELTA:');
        sessionAnalysis.progression.forEach(lap => {
            const timeFormatted = formatTime(lap.time);
            const isBest = lap.time === sessionAnalysis.bestTime ? ' 🔥' : '';
            console.log(`  Vuelta ${lap.lap}: ${timeFormatted} (Pos: ${lap.position})${isBest}`);
        });
        
        const improvement = sessionAnalysis.times[0] - sessionAnalysis.bestTime;
        console.log(`\n📉 Mejora desde primera vuelta: ${formatTime(improvement)}`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RESUMEN DE ENDPOINTS');
    console.log('=' .repeat(60));
    
    Object.entries(results).forEach(([name, result]) => {
        const status = result.error ? '❌ ERROR' : 
                      result.statusCode === 200 ? '✅ OK' : 
                      `⚠️  ${result.statusCode}`;
        console.log(`${name.padEnd(20)} ${status}`);
    });
    
    console.log('\n✅ Exploración completada!');
    console.log('📁 Datos guardados en carpeta ./data/');
}

// Run the explorer
exploreAPI().catch(console.error);