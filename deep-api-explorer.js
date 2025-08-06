const https = require('https');
const fs = require('fs');

// Colors
const c = (color, text) => `\x1b[${color === 'green' ? '32' : color === 'red' ? '31' : color === 'yellow' ? '33' : color === 'cyan' ? '36' : '37'}m${text}\x1b[0m`;

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';
const AUTH_HEADERS = {
    'X-Fast-DeviceToken': '1111111129R2A932939',
    'X-Fast-AccessToken': '51klijayaaiyamkojkj',
    'X-Fast-Version': '6250311 202504181931',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15'
};

const USER_INFO = {
    personId: '63000000000383541',
    participantId: '32617264',
    sessionIds: ['31907477', '32030750']
};

let discoveredEndpoints = [];

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const req = https.request({
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: AUTH_HEADERS
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, data: jsonData, rawData: data });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: null, rawData: data });
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

async function testEndpoint(path) {
    try {
        const result = await makeRequest(`${BASE_URL}${path}`);
        
        let status, icon;
        if (result.statusCode === 200) {
            status = c('green', '✅ 200');
            icon = '🎉';
            discoveredEndpoints.push({ path, status: result.statusCode, data: result.data });
            
            // Save successful responses
            const filename = `./discoveries/${path.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            fs.mkdirSync('./discoveries', { recursive: true });
            fs.writeFileSync(filename, JSON.stringify({ path, data: result.data }, null, 2));
        } else if (result.statusCode === 401 || result.statusCode === 403) {
            status = c('yellow', `🔐 ${result.statusCode}`);
            icon = '🔑';
        } else if (result.statusCode === 404) {
            status = c('red', '❌ 404');
            icon = '❌';
        } else {
            status = c('yellow', `⚠️ ${result.statusCode}`);
            icon = '⚠️';
        }
        
        const preview = result.data ? getPreview(result.data) : '';
        console.log(`${icon} ${path.padEnd(60)} ${status} ${preview}`);
        
        return result;
    } catch (error) {
        console.log(`💥 ${path.padEnd(60)} ${c('red', 'ERROR')} ${error.message.substring(0, 30)}`);
        return null;
    }
}

function getPreview(data) {
    if (Array.isArray(data)) {
        return c('cyan', `[${data.length} items]`);
    } else if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        return c('cyan', `{${keys.length} keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`);
    }
    return '';
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function exploreSystematic() {
    console.log(c('cyan', '🚀 EXPLORACIÓN SISTEMÁTICA DE LA API SMS-TIMING'));
    console.log('=' .repeat(80));
    
    // 1. ROOT LEVEL ENDPOINTS
    console.log(c('yellow', '\n📁 NIVEL RAÍZ:'));
    const rootEndpoints = [
        '/',
        '/health',
        '/status',
        '/version',
        '/info',
        '/config',
        '/settings'
    ];
    
    for (const endpoint of rootEndpoints) {
        await testEndpoint(endpoint);
        await sleep(300);
    }
    
    // 2. MAIN CATEGORIES
    console.log(c('yellow', '\n📁 CATEGORÍAS PRINCIPALES:'));
    const mainCategories = [
        '/activity-history',
        '/racestatistics', 
        '/person',
        '/sessions',
        '/participants',
        '/driver',
        '/drivers',
        '/leaderboard',
        '/statistics',
        '/timing',
        '/tracks',
        '/competitions',
        '/search',
        '/auth',
        '/api',
        '/admin',
        '/reports'
    ];
    
    for (const category of mainCategories) {
        await testEndpoint(category);
        await sleep(300);
    }
    
    // 3. RACESTATISTICS VARIATIONS (sabemos que esta funciona)
    console.log(c('yellow', '\n📁 RACESTATISTICS (VARIACIONES):'));
    const raceStatsEndpoints = [
        '/racestatistics',
        '/racestatistics/speedpark',
        '/racestatistics/all',
        '/racestatistics/recent',
        '/racestatistics/live',
        '/racestatistics/current',
        '/racestatistics/today',
        '/racestatistics/latest',
        '/racestatistics/session',
        '/racestatistics/sessions',
        '/racestatistics/laps',
        '/racestatistics/times',
        '/racestatistics/best'
    ];
    
    for (const endpoint of raceStatsEndpoints) {
        await testEndpoint(endpoint);
        await sleep(300);
    }
    
    // 4. SESSION-BASED ENDPOINTS
    console.log(c('yellow', '\n📁 ENDPOINTS BASADOS EN SESIONES:'));
    for (const sessionId of USER_INFO.sessionIds) {
        const sessionEndpoints = [
            `/racestatistics/session/${sessionId}`,
            `/racestatistics/details/${sessionId}`,
            `/racestatistics/full/${sessionId}`,
            `/racestatistics/summary/${sessionId}`,
            `/sessions/${sessionId}`,
            `/sessions/details/${sessionId}`,
            `/activity-history/${sessionId}`,
            `/timing/${sessionId}`,
            `/results/${sessionId}`,
            `/participants/${sessionId}`,
            `/leaderboard/${sessionId}`
        ];
        
        for (const endpoint of sessionEndpoints) {
            await testEndpoint(endpoint);
            await sleep(300);
        }
    }
    
    // 5. PERSON-BASED ENDPOINTS
    console.log(c('yellow', '\n📁 ENDPOINTS BASADOS EN PERSONA:'));
    const personEndpoints = [
        `/person/${USER_INFO.personId}`,
        `/person/profile/${USER_INFO.personId}`,
        `/person/stats/${USER_INFO.personId}`,
        `/person/history/${USER_INFO.personId}`,
        `/person/sessions/${USER_INFO.personId}`,
        `/person/times/${USER_INFO.personId}`,
        `/driver/${USER_INFO.personId}`,
        `/participants/${USER_INFO.personId}`,
        `/statistics/${USER_INFO.personId}`,
        `/leaderboard/person/${USER_INFO.personId}`
    ];
    
    for (const endpoint of personEndpoints) {
        await testEndpoint(endpoint);
        await sleep(300);
    }
    
    // 6. SPEEDPARK SPECIFIC
    console.log(c('yellow', '\n📁 ESPECÍFICOS DE SPEEDPARK:'));
    const speedparkEndpoints = [
        '/speedpark',
        '/speedpark/sessions',
        '/speedpark/live',
        '/speedpark/current',
        '/speedpark/today',
        '/speedpark/recent',
        '/speedpark/statistics',
        '/speedpark/leaderboard',
        '/speedpark/participants',
        '/speedpark/history',
        '/activity-history/speedpark',
        '/sessions/speedpark',
        '/timing/speedpark',
        '/leaderboard/speedpark',
        '/statistics/speedpark'
    ];
    
    for (const endpoint of speedparkEndpoints) {
        await testEndpoint(endpoint);
        await sleep(300);
    }
    
    // 7. COMMON API PATTERNS
    console.log(c('yellow', '\n📁 PATRONES COMUNES DE API:'));
    const commonPatterns = [
        '/v1/racestatistics',
        '/v2/racestatistics', 
        '/api/v1/sessions',
        '/api/v2/sessions',
        '/mobile/sessions',
        '/mobile/statistics',
        '/public/leaderboard',
        '/live/timing',
        '/real-time/sessions',
        '/data/sessions',
        '/feed/live',
        '/stream/timing'
    ];
    
    for (const endpoint of commonPatterns) {
        await testEndpoint(endpoint);
        await sleep(300);
    }
}

async function testKnownWorkingVariations() {
    console.log(c('yellow', '\n📁 VARIACIONES DE ENDPOINTS CONOCIDOS:'));
    
    // Probamos variaciones de los endpoints que sabemos que funcionan
    const knownWorking = [
        '/racestatistics/sessionv2/speedpark',
        '/racestatistics/laps_fast5/speedpark', 
        '/activity-history/details/speedpark'
    ];
    
    const variations = ['', '/all', '/recent', '/live', '/current', '/today', '/latest'];
    const sessionVariations = ['', '?limit=10', '?recent=true', '?live=true'];
    
    for (const base of knownWorking) {
        for (const variation of variations) {
            await testEndpoint(base + variation);
            await sleep(200);
        }
        
        // Test with different session IDs
        for (const sessionId of USER_INFO.sessionIds) {
            for (const sessionVar of sessionVariations) {
                await testEndpoint(`${base}?sessionId=${sessionId}${sessionVar}`);
                await sleep(200);
            }
        }
    }
}

function generateReport() {
    console.log(c('cyan', '\n🎉 EXPLORACIÓN COMPLETADA!'));
    console.log('=' .repeat(60));
    
    console.log(c('green', `✅ ENDPOINTS DESCUBIERTOS: ${discoveredEndpoints.length}`));
    
    if (discoveredEndpoints.length > 0) {
        discoveredEndpoints.forEach(({ path, status, data }) => {
            const preview = getPreview(data);
            console.log(`   ${c('green', '✓')} ${path} ${preview}`);
        });
        
        // Save complete report
        const report = {
            timestamp: new Date().toISOString(),
            totalDiscovered: discoveredEndpoints.length,
            userInfo: USER_INFO,
            authHeaders: AUTH_HEADERS,
            discoveredEndpoints: discoveredEndpoints
        };
        
        fs.writeFileSync('./api-discovery-report.json', JSON.stringify(report, null, 2));
        console.log(c('cyan', '\n💾 Reporte completo guardado en: api-discovery-report.json'));
        console.log(c('cyan', '📁 Respuestas guardadas en: ./discoveries/'));
    } else {
        console.log(c('yellow', '⚠️  No se descubrieron nuevos endpoints'));
    }
}

async function main() {
    console.log('Usando tokens de autenticación válidos...');
    console.log(`PersonID: ${USER_INFO.personId}`);
    console.log(`Sessions: ${USER_INFO.sessionIds.join(', ')}`);
    console.log('=' .repeat(80));
    
    await exploreSystematic();
    await testKnownWorkingVariations();
    
    generateReport();
}

main().catch(console.error);