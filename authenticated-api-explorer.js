const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Configuration
const BASE_URL = 'https://mobile-api22.sms-timing.com/api';
const USER_INFO = {
    personId: '63000000000383541',
    alias: 'Break Pitt'
};

// Authentication headers
const AUTH_HEADERS = {
    'X-Fast-DeviceToken': '1111111129R2A932939',
    'X-Fast-AccessToken': '51klijayaaiyamkojkj',
    'X-Fast-Version': '6250311 202504181931',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
};

// Results storage
let results = {
    working: [],
    needsAuth: [],
    notFound: [],
    errors: [],
    raceHistory: [],
    statistics: {},
    bestTimes: []
};

// Helper function to make authenticated requests
function makeAuthenticatedRequest(url, method = 'GET', additionalHeaders = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const finalHeaders = { ...AUTH_HEADERS, ...additionalHeaders };
        
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: finalHeaders
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                let parsedData = null;
                try {
                    parsedData = JSON.parse(data);
                } catch (e) {
                    parsedData = data;
                }
                
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: parsedData,
                    rawData: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Test a single endpoint with authentication
async function testAuthenticatedEndpoint(endpoint, description = '') {
    const url = `${BASE_URL}${endpoint}`;
    const displayUrl = endpoint.length > 50 ? endpoint.substring(0, 47) + '...' : endpoint;
    
    try {
        process.stdout.write(`${c('cyan', '🔐')} Testing: ${c('white', displayUrl.padEnd(50))} `);
        
        const result = await makeAuthenticatedRequest(url);
        
        let statusColor, icon, statusDescription;
        
        switch (true) {
            case result.statusCode === 200:
                statusColor = 'green';
                icon = '✅';
                statusDescription = 'SUCCESS';
                results.working.push({ endpoint, description, result });
                await saveResponse(endpoint, result.data, description);
                break;
            case result.statusCode === 401 || result.statusCode === 403:
                statusColor = 'yellow';
                icon = '🔐';
                statusDescription = 'NEEDS AUTH';
                results.needsAuth.push({ endpoint, statusCode: result.statusCode });
                break;
            case result.statusCode === 404:
                statusColor = 'red';
                icon = '❌';
                statusDescription = 'NOT FOUND';
                results.notFound.push({ endpoint });
                break;
            case result.statusCode === 429:
                statusColor = 'yellow';
                icon = '⏳';
                statusDescription = 'RATE LIMITED';
                console.log(`${icon} ${c(statusColor, result.statusCode)} ${statusDescription}`);
                console.log(`${c('yellow', '⏳ Rate limited, waiting 5 seconds...')}`);
                await sleep(5000);
                return await testAuthenticatedEndpoint(endpoint, description);
            default:
                statusColor = 'red';
                icon = '⚠️';
                statusDescription = 'ERROR';
                results.errors.push({ endpoint, statusCode: result.statusCode, error: result.rawData });
        }
        
        console.log(`${icon} ${c(statusColor, result.statusCode)} ${statusDescription}`);
        
        if (result.statusCode === 200 && result.data) {
            const preview = getDataPreview(result.data);
            if (preview) {
                console.log(`   ${c('cyan', '📄')} ${preview}`);
            }
            
            // Process race history data
            if (endpoint.includes('activity-history') || endpoint.includes('sessions') || endpoint.includes('races')) {
                processRaceHistoryData(result.data, endpoint);
            }
            
            // Process statistics data
            if (endpoint.includes('statistics') || endpoint.includes('best-times')) {
                processStatisticsData(result.data, endpoint);
            }
        }
        
        return result;
        
    } catch (error) {
        console.log(`${c('red', '💥 ERROR')}: ${error.message}`);
        results.errors.push({ endpoint, error: error.message });
        return null;
    }
}

// Save response to file
async function saveResponse(endpoint, data, description = '') {
    try {
        const dir = './data';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const filename = endpoint.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        const filepath = path.join(dir, filename);
        
        const fileData = {
            endpoint: endpoint,
            description: description,
            timestamp: new Date().toISOString(),
            data: data
        };
        
        fs.writeFileSync(filepath, JSON.stringify(fileData, null, 2));
    } catch (error) {
        console.log(`   ${c('red', '⚠️  Failed to save response')}: ${error.message}`);
    }
}

// Get preview of data
function getDataPreview(data) {
    if (!data) return null;
    
    if (Array.isArray(data)) {
        return `Array[${data.length}] - ${data.length > 0 ? Object.keys(data[0]).join(', ') : 'empty'}`;
    } else if (typeof data === 'object') {
        const keys = Object.keys(data);
        return `Object{${keys.length}} - ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
    } else {
        const preview = String(data).substring(0, 100);
        return `${typeof data}: ${preview}${data.length > 100 ? '...' : ''}`;
    }
}

// Process race history data
function processRaceHistoryData(data, endpoint) {
    if (Array.isArray(data)) {
        data.forEach(race => {
            if (race.sessionId || race.id) {
                results.raceHistory.push({
                    sessionId: race.sessionId || race.id,
                    date: race.date || race.startTime,
                    position: race.position || race.finalPosition,
                    bestTime: race.bestTime || race.bestLapTime,
                    totalLaps: race.totalLaps || race.lapsCompleted,
                    source: endpoint
                });
            }
        });
    } else if (data && typeof data === 'object') {
        if (data.sessions && Array.isArray(data.sessions)) {
            processRaceHistoryData(data.sessions, endpoint);
        }
    }
}

// Process statistics data
function processStatisticsData(data, endpoint) {
    if (data && typeof data === 'object') {
        if (data.bestLapTime || data.bestTime) {
            results.bestTimes.push({
                time: data.bestLapTime || data.bestTime,
                date: data.date,
                track: data.track || 'speedpark',
                source: endpoint
            });
        }
        
        if (data.totalRaces) results.statistics.totalRaces = data.totalRaces;
        if (data.averagePosition) results.statistics.averagePosition = data.averagePosition;
        if (data.totalLaps) results.statistics.totalLaps = data.totalLaps;
    }
}

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test personal data endpoints
async function testPersonalData() {
    console.log(`\n${c('bright', '👤 PARTE 1: DATOS PERSONALES')}`);
    console.log('=' .repeat(60));
    
    const personalEndpoints = [
        { path: `/person/${USER_INFO.personId}`, desc: 'Información personal completa' },
        { path: '/person/me', desc: 'Mi perfil actual' },
        { path: '/my-profile', desc: 'Mi perfil detallado' },
        { path: `/driver/${USER_INFO.personId}/full`, desc: 'Datos completos del conductor' }
    ];
    
    for (const { path, desc } of personalEndpoints) {
        await testAuthenticatedEndpoint(path, desc);
        await sleep(500);
    }
}

// Test race history endpoints
async function testRaceHistory() {
    console.log(`\n${c('bright', '🏁 PARTE 2: HISTORIAL COMPLETO')}`);
    console.log('=' .repeat(60));
    
    const historyEndpoints = [
        { path: `/activity-history/person/${USER_INFO.personId}`, desc: 'Historial de actividades' },
        { path: `/activity-history/speedpark?personId=${USER_INFO.personId}`, desc: 'Historial en SpeedPark' },
        { path: `/sessions/history?personId=${USER_INFO.personId}`, desc: 'Historial de sesiones' },
        { path: `/person/${USER_INFO.personId}/sessions`, desc: 'Mis sesiones' },
        { path: `/person/${USER_INFO.personId}/races`, desc: 'Mis carreras' }
    ];
    
    for (const { path, desc } of historyEndpoints) {
        await testAuthenticatedEndpoint(path, desc);
        await sleep(500);
    }
}

// Test statistics endpoints
async function testStatistics() {
    console.log(`\n${c('bright', '📊 PARTE 3: ESTADÍSTICAS')}`);
    console.log('=' .repeat(60));
    
    const statisticsEndpoints = [
        { path: `/statistics/person/${USER_INFO.personId}`, desc: 'Estadísticas personales' },
        { path: `/person/${USER_INFO.personId}/best-times`, desc: 'Mejores tiempos' },
        { path: `/person/${USER_INFO.personId}/statistics/speedpark`, desc: 'Estadísticas en SpeedPark' },
        { path: `/leaderboard/speedpark?highlight=${USER_INFO.personId}`, desc: 'Leaderboard destacado' }
    ];
    
    for (const { path, desc } of statisticsEndpoints) {
        await testAuthenticatedEndpoint(path, desc);
        await sleep(500);
    }
}

// Test search endpoints
async function testSearches() {
    console.log(`\n${c('bright', '🔍 PARTE 4: BÚSQUEDAS')}`);
    console.log('=' .repeat(60));
    
    const searchEndpoints = [
        { path: `/search/sessions?personId=${USER_INFO.personId}`, desc: 'Buscar mis sesiones' },
        { path: `/search/results?alias=${encodeURIComponent(USER_INFO.alias)}`, desc: 'Buscar por alias' },
        { path: `/activity-history/search?q=${encodeURIComponent(USER_INFO.alias)}`, desc: 'Buscar en historial' }
    ];
    
    for (const { path, desc } of searchEndpoints) {
        await testAuthenticatedEndpoint(path, desc);
        await sleep(500);
    }
}

// Test live data endpoints
async function testLiveData() {
    console.log(`\n${c('bright', '🔴 PARTE 5: DATOS EN VIVO')}`);
    console.log('=' .repeat(60));
    
    const liveEndpoints = [
        { path: '/sessions/live/speedpark', desc: 'Sesiones en vivo' },
        { path: '/sessions/current/speedpark', desc: 'Sesión actual' },
        { path: '/timing/live/speedpark', desc: 'Tiempos en vivo' }
    ];
    
    for (const { path, desc } of liveEndpoints) {
        await testAuthenticatedEndpoint(path, desc);
        await sleep(500);
    }
}

// Test confirmed endpoints
async function testConfirmedEndpoints() {
    console.log(`\n${c('bright', '✅ PARTE 6: ENDPOINTS CONFIRMADOS')}`);
    console.log('=' .repeat(60));
    
    const confirmedEndpoints = [
        { path: '/racestatistics/sessionv2/speedpark?sessionId=31907477', desc: 'Datos de sesión v2' },
        { path: '/racestatistics/laps_fast5/speedpark?sessionId=31907477', desc: 'Top 5 vueltas rápidas' },
        { path: '/activity-history/details/speedpark?sessionId=31907477', desc: 'Detalles del historial' }
    ];
    
    for (const { path, desc } of confirmedEndpoints) {
        await testAuthenticatedEndpoint(path, desc);
        await sleep(500);
    }
}

// Generate API documentation
function generateAPIDocumentation() {
    let markdown = `# SMS-Timing API Documentation\n\n`;
    markdown += `Generated: ${new Date().toISOString()}\n`;
    markdown += `User: ${USER_INFO.alias} (${USER_INFO.personId})\n\n`;
    
    markdown += `## Authentication Headers\n\n`;
    markdown += `All requests must include these headers:\n\n`;
    markdown += `\`\`\`javascript\n`;
    markdown += `const headers = {\n`;
    Object.entries(AUTH_HEADERS).forEach(([key, value]) => {
        markdown += `  '${key}': '${value}',\n`;
    });
    markdown += `};\n\`\`\`\n\n`;
    
    if (results.working.length > 0) {
        markdown += `## Working Endpoints (${results.working.length})\n\n`;
        results.working.forEach(({ endpoint, description, result }) => {
            markdown += `### \`GET ${endpoint}\`\n\n`;
            if (description) markdown += `${description}\n\n`;
            markdown += `**Response Structure:**\n`;
            if (result.data) {
                if (Array.isArray(result.data)) {
                    markdown += `- Array with ${result.data.length} items\n`;
                    if (result.data.length > 0) {
                        markdown += `- Item structure: ${Object.keys(result.data[0]).join(', ')}\n`;
                    }
                } else {
                    markdown += `- Object with keys: ${Object.keys(result.data).join(', ')}\n`;
                }
            }
            markdown += `\n`;
        });
    }
    
    if (results.needsAuth.length > 0) {
        markdown += `## Endpoints Requiring Different Auth (${results.needsAuth.length})\n\n`;
        results.needsAuth.forEach(({ endpoint, statusCode }) => {
            markdown += `- \`${endpoint}\` - Status: ${statusCode}\n`;
        });
        markdown += `\n`;
    }
    
    markdown += `## Usage Example\n\n`;
    markdown += `\`\`\`javascript\n`;
    markdown += `const https = require('https');\n\n`;
    markdown += `const AUTH_HEADERS = {\n`;
    Object.entries(AUTH_HEADERS).forEach(([key, value]) => {
        markdown += `  '${key}': '${value}',\n`;
    });
    markdown += `};\n\n`;
    markdown += `function makeRequest(endpoint) {\n`;
    markdown += `  const url = 'https://mobile-api22.sms-timing.com/api' + endpoint;\n`;
    markdown += `  return new Promise((resolve, reject) => {\n`;
    markdown += `    const req = https.get(url, { headers: AUTH_HEADERS }, (res) => {\n`;
    markdown += `      let data = '';\n`;
    markdown += `      res.on('data', chunk => data += chunk);\n`;
    markdown += `      res.on('end', () => resolve(JSON.parse(data)));\n`;
    markdown += `    });\n`;
    markdown += `    req.on('error', reject);\n`;
    markdown += `  });\n`;
    markdown += `}\n`;
    markdown += `\`\`\`\n`;
    
    fs.writeFileSync('./API_DOCUMENTATION.md', markdown);
    console.log(`${c('green', '📄')} API documentation saved to API_DOCUMENTATION.md`);
}

// Generate race history summary
function generateRaceHistorySummary() {
    if (results.raceHistory.length === 0) {
        console.log(`${c('yellow', '⚠️  No race history data found')}`);
        return;
    }
    
    const raceHistory = {
        timestamp: new Date().toISOString(),
        user: USER_INFO,
        totalRaces: results.raceHistory.length,
        races: results.raceHistory,
        statistics: {
            bestTime: results.bestTimes.length > 0 ? Math.min(...results.bestTimes.map(b => b.time)) : null,
            averagePosition: results.raceHistory.length > 0 ? 
                results.raceHistory.reduce((sum, r) => sum + (r.position || 0), 0) / results.raceHistory.length : null,
            totalLaps: results.raceHistory.reduce((sum, r) => sum + (r.totalLaps || 0), 0)
        }
    };
    
    fs.writeFileSync('./my_race_history.json', JSON.stringify(raceHistory, null, 2));
    
    console.log(`\n${c('bright', '🏆 TU RESUMEN DE CARRERAS')}`);
    console.log('=' .repeat(50));
    console.log(`${c('cyan', '🏁')} Total de carreras: ${c('white', raceHistory.totalRaces)}`);
    if (raceHistory.statistics.bestTime) {
        console.log(`${c('cyan', '⚡')} Mejor tiempo: ${c('green', (raceHistory.statistics.bestTime / 1000).toFixed(3))}s`);
    }
    if (raceHistory.statistics.averagePosition) {
        console.log(`${c('cyan', '📊')} Posición promedio: ${c('white', raceHistory.statistics.averagePosition.toFixed(1))}`);
    }
    console.log(`${c('cyan', '🔄')} Total de vueltas: ${c('white', raceHistory.statistics.totalLaps)}`);
    console.log(`${c('green', '💾')} Historial guardado en my_race_history.json`);
}

// Generate app code
function generateAppCode() {
    let code = `// SMS-Timing API Client\n`;
    code += `// Generated: ${new Date().toISOString()}\n\n`;
    
    code += `class SMSTimingAPI {\n`;
    code += `  constructor() {\n`;
    code += `    this.baseURL = 'https://mobile-api22.sms-timing.com/api';\n`;
    code += `    this.headers = {\n`;
    Object.entries(AUTH_HEADERS).forEach(([key, value]) => {
        code += `      '${key}': '${value}',\n`;
    });
    code += `    };\n`;
    code += `  }\n\n`;
    
    code += `  async makeRequest(endpoint) {\n`;
    code += `    const response = await fetch(this.baseURL + endpoint, {\n`;
    code += `      headers: this.headers\n`;
    code += `    });\n`;
    code += `    return response.json();\n`;
    code += `  }\n\n`;
    
    if (results.working.length > 0) {
        results.working.forEach(({ endpoint, description }) => {
            const methodName = endpoint
                .replace(/^\//, '')
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/_$/, '');
            
            code += `  // ${description || endpoint}\n`;
            code += `  async ${methodName}() {\n`;
            code += `    return this.makeRequest('${endpoint}');\n`;
            code += `  }\n\n`;
        });
    }
    
    code += `}\n\n`;
    code += `// Usage example:\n`;
    code += `// const api = new SMSTimingAPI();\n`;
    code += `// const data = await api.person_${USER_INFO.personId}();\n`;
    
    fs.writeFileSync('./SMSTimingAPI.js', code);
    console.log(`${c('green', '📱')} App code generated: SMSTimingAPI.js`);
}

// Generate final report
function generateFinalReport() {
    console.log(`\n${c('bright', '📋 REPORTE FINAL')}`);
    console.log('=' .repeat(60));
    
    console.log(`${c('green', '✅ ENDPOINTS FUNCIONANDO')} (${results.working.length}):`);
    results.working.forEach(({ endpoint, description }) => {
        console.log(`   ${c('green', '✓')} ${endpoint} - ${description || 'OK'}`);
    });
    
    if (results.needsAuth.length > 0) {
        console.log(`\n${c('yellow', '🔐 NECESITAN OTRA AUTH')} (${results.needsAuth.length}):`);
        results.needsAuth.forEach(({ endpoint, statusCode }) => {
            console.log(`   ${c('yellow', '🔒')} ${endpoint} - ${statusCode}`);
        });
    }
    
    if (results.notFound.length > 0) {
        console.log(`\n${c('red', '❌ NO ENCONTRADOS')} (${results.notFound.length}):`);
        results.notFound.slice(0, 5).forEach(({ endpoint }) => {
            console.log(`   ${c('red', '✗')} ${endpoint}`);
        });
        if (results.notFound.length > 5) {
            console.log(`   ${c('red', '...')} y ${results.notFound.length - 5} más`);
        }
    }
    
    console.log(`\n${c('cyan', '📁 ARCHIVOS GENERADOS')}:`);
    console.log(`   📄 ./data/ - ${results.working.length} archivos JSON`);
    console.log(`   📚 API_DOCUMENTATION.md - Documentación completa`);
    console.log(`   🏁 my_race_history.json - Tu historial de carreras`);
    console.log(`   📱 SMSTimingAPI.js - Código para tu app`);
}

// Main function
async function main() {
    console.log(`${c('bright', '🚀 SMS-TIMING AUTHENTICATED API EXPLORER')}`);
    console.log(`${c('cyan', 'Usuario:')} ${USER_INFO.alias} (${USER_INFO.personId})`);
    console.log(`${c('cyan', 'Auth Method:')} X-Fast headers`);
    console.log('=' .repeat(70));
    
    // Test all endpoint categories
    await testPersonalData();
    await testRaceHistory();
    await testStatistics();
    await testSearches();
    await testLiveData();
    await testConfirmedEndpoints();
    
    // Generate all outputs
    generateAPIDocumentation();
    generateRaceHistorySummary();
    generateAppCode();
    generateFinalReport();
    
    console.log(`\n${c('green', '🎉 EXPLORACIÓN AUTENTICADA COMPLETADA!')}`);
}

// Run the explorer
if (require.main === module) {
    main().catch(console.error);
}