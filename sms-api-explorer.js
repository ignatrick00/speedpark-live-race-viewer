const https = require('https');
const fs = require('fs');
const path = require('path');

// Using simple colors without chalk since it might cause issues
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
    alias: 'Break Pitt',
    participantId: '32617264',
    sessions: ['31907477', '32030750']
};

// Global state
let authToken = null;
let sessionId = null;
let results = {
    working: [],
    needsAuth: [],
    notFound: [],
    errors: [],
    authMethods: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'SMS-Timing-Explorer/1.0',
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (options.body && options.method !== 'GET') {
            const bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

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
                    // Not JSON, keep as string
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

        if (options.body && options.method !== 'GET') {
            const bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            req.write(bodyData);
        }

        req.end();
    });
}

// Test a single endpoint
async function testEndpoint(endpoint, method = 'GET', headers = {}, body = null) {
    const url = `${BASE_URL}${endpoint}`;
    const displayUrl = endpoint.length > 50 ? endpoint.substring(0, 47) + '...' : endpoint;
    
    try {
        process.stdout.write(`${c('cyan', '🔍')} Testing: ${c('white', displayUrl.padEnd(50))} `);
        
        const result = await makeRequest(url, { method, headers, body });
        
        let statusColor, icon, description;
        
        switch (true) {
            case result.statusCode === 200:
                statusColor = 'green';
                icon = '✅';
                description = 'SUCCESS';
                results.working.push({ endpoint, method, result });
                await saveResponse(endpoint, result.data);
                break;
            case result.statusCode === 401 || result.statusCode === 403:
                statusColor = 'yellow';
                icon = '🔐';
                description = 'NEEDS AUTH';
                results.needsAuth.push({ endpoint, method, statusCode: result.statusCode });
                break;
            case result.statusCode === 404:
                statusColor = 'red';
                icon = '❌';
                description = 'NOT FOUND';
                results.notFound.push({ endpoint, method });
                break;
            case result.statusCode === 301 || result.statusCode === 302:
                statusColor = 'blue';
                icon = '↗️';
                description = 'REDIRECT';
                break;
            case result.statusCode === 429:
                statusColor = 'yellow';
                icon = '⏳';
                description = 'RATE LIMITED';
                console.log(`${icon} ${c(statusColor, result.statusCode)} ${description}`);
                console.log(`${c('yellow', '⏳ Rate limited, waiting 5 seconds...')}`);
                await sleep(5000);
                return await testEndpoint(endpoint, method, headers, body); // Retry
            default:
                statusColor = 'red';
                icon = '⚠️';
                description = 'ERROR';
                results.errors.push({ endpoint, method, statusCode: result.statusCode, error: result.rawData });
        }
        
        console.log(`${icon} ${c(statusColor, result.statusCode)} ${description}`);
        
        if (result.statusCode === 200 && result.data) {
            const preview = getDataPreview(result.data);
            if (preview) {
                console.log(`   ${c('cyan', '📄')} ${preview}`);
            }
        }
        
        return result;
        
    } catch (error) {
        console.log(`${c('red', '💥 ERROR')}: ${error.message}`);
        results.errors.push({ endpoint, method, error: error.message });
        return null;
    }
}

// Save response to file
async function saveResponse(endpoint, data) {
    try {
        const dir = './responses';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const filename = endpoint.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        const filepath = path.join(dir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
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

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Find authentication method
async function findAuthMethod() {
    console.log(`\n${c('bright', '🔐 PARTE 1: BUSCANDO MÉTODO DE AUTENTICACIÓN')}`);
    console.log('=' .repeat(60));
    
    const loginEndpoints = [
        { path: '/auth/login', method: 'POST', body: { username: 'Break Pitt', password: '' } },
        { path: '/auth/login', method: 'POST', body: { alias: 'Break Pitt', password: '' } },
        { path: '/auth/login', method: 'POST', body: { personId: USER_INFO.personId, password: '' } },
        { path: '/login', method: 'POST', body: { username: 'Break Pitt' } },
        { path: '/login', method: 'POST', body: { alias: 'Break Pitt' } },
        { path: '/token', method: 'POST', body: { personId: USER_INFO.personId } },
        { path: '/token', method: 'GET' },
        { path: '/auth/session', method: 'GET' },
        { path: '/authenticate', method: 'POST', body: { personId: USER_INFO.personId } },
        { path: '/authenticate', method: 'POST', body: { alias: 'Break Pitt' } }
    ];
    
    for (const { path, method, body } of loginEndpoints) {
        const result = await testEndpoint(path, method, {}, body);
        
        if (result && result.statusCode === 200 && result.data) {
            if (result.data.token || result.data.sessionId || result.data.accessToken) {
                authToken = result.data.token || result.data.accessToken;
                sessionId = result.data.sessionId;
                console.log(`${c('green', '🎉 FOUND AUTH METHOD!')}`);
                console.log(`   Token: ${authToken ? 'YES' : 'NO'}`);
                console.log(`   Session: ${sessionId ? 'YES' : 'NO'}`);
                results.authMethods.push({ path, method, body, result: result.data });
                return true;
            }
        }
        
        await sleep(500);
    }
    
    return false;
}

// Test different auth headers
async function testAuthHeaders() {
    console.log(`\n${c('bright', '🔐 PARTE 2: PROBANDO DIFERENTES MÉTODOS DE AUTH')}`);
    console.log('=' .repeat(60));
    
    const authHeaders = [
        { 'Authorization': `Bearer ${USER_INFO.sessions[0]}` },
        { 'Authorization': `Bearer ${USER_INFO.personId}` },
        { 'X-Session-Id': USER_INFO.sessions[0] },
        { 'X-Person-Id': USER_INFO.personId },
        { 'X-API-Key': 'speedpark' },
        { 'Cookie': `sessionId=${USER_INFO.sessions[0]}` },
        { 'Cookie': `personId=${USER_INFO.personId}` },
        { 'X-Participant-Id': USER_INFO.participantId }
    ];
    
    // Test with a known endpoint that needs auth
    const testEndpoint = '/person/me';
    
    for (const headers of authHeaders) {
        console.log(`\n${c('cyan', '🔑')} Testing auth: ${c('white', Object.entries(headers).map(([k,v]) => `${k}: ${v.substring(0,20)}...`).join(', '))}`);
        
        const result = await makeRequest(`${BASE_URL}${testEndpoint}`, { headers });
        
        if (result.statusCode === 200) {
            console.log(`${c('green', '🎉 AUTH METHOD WORKS!')}`);
            results.authMethods.push({ headers, endpoint: testEndpoint, result });
            return headers;
        } else {
            console.log(`   ${c('red', result.statusCode)} Failed`);
        }
        
        await sleep(500);
    }
    
    return null;
}

// Test public endpoints
async function testPublicEndpoints() {
    console.log(`\n${c('bright', '🌐 PARTE 3: ENDPOINTS PÚBLICOS')}`);
    console.log('=' .repeat(60));
    
    const publicEndpoints = [
        '/activity-history/speedpark',
        '/activity-history/recent/speedpark',
        '/sessions/live/speedpark',
        '/leaderboard/speedpark',
        '/statistics/best-times/speedpark',
        '/sessions/speedpark',
        '/sessions/recent',
        '/racestatistics/all/speedpark',
        '/competitions/speedpark',
        '/tracks/speedpark',
        `/racestatistics/laps_fast5/speedpark?sessionId=${USER_INFO.sessions[0]}`
    ];
    
    for (const endpoint of publicEndpoints) {
        await testEndpoint(endpoint);
        await sleep(500);
    }
}

// Test private endpoints
async function testPrivateEndpoints(authHeaders = {}) {
    console.log(`\n${c('bright', '🔒 PARTE 4: ENDPOINTS PRIVADOS')}`);
    console.log('=' .repeat(60));
    
    const privateEndpoints = [
        `/person/${USER_INFO.personId}/full`,
        '/person/me',
        '/my-history',
        '/my-statistics',
        `/person/${USER_INFO.personId}/sessions`,
        `/person/${USER_INFO.personId}/best-times`,
        `/person/${USER_INFO.personId}/statistics`,
        `/participants/${USER_INFO.participantId}`,
        `/driver/${USER_INFO.participantId}/history`,
        `/driver/${USER_INFO.participantId}/best`
    ];
    
    for (const endpoint of privateEndpoints) {
        await testEndpoint(endpoint, 'GET', authHeaders);
        await sleep(500);
    }
}

// Search for user data
async function searchUserData(authHeaders = {}) {
    console.log(`\n${c('bright', '🔍 PARTE 5: BÚSQUEDA DE TUS DATOS')}`);
    console.log('=' .repeat(60));
    
    const searchEndpoints = [
        `/search?personId=${USER_INFO.personId}`,
        `/activity-history/person/${USER_INFO.personId}`,
        `/sessions?participantId=${USER_INFO.participantId}`,
        `/history?alias=${encodeURIComponent(USER_INFO.alias)}`,
        `/search?alias=${encodeURIComponent(USER_INFO.alias)}`,
        `/person/search?alias=${encodeURIComponent(USER_INFO.alias)}`,
        `/participants/search?alias=${encodeURIComponent(USER_INFO.alias)}`
    ];
    
    for (const endpoint of searchEndpoints) {
        await testEndpoint(endpoint, 'GET', authHeaders);
        await sleep(500);
    }
}

// Generate final report
function generateReport() {
    console.log(`\n${c('bright', '📊 REPORTE FINAL DE LA API')}`);
    console.log('=' .repeat(60));
    
    console.log(`${c('green', '✅ ENDPOINTS QUE FUNCIONAN')} (${results.working.length}):`);
    results.working.forEach(({ endpoint, result }) => {
        console.log(`   ${c('green', '✓')} ${endpoint} - ${getDataPreview(result.data)}`);
    });
    
    console.log(`\n${c('yellow', '🔐 ENDPOINTS QUE NECESITAN AUTH')} (${results.needsAuth.length}):`);
    results.needsAuth.forEach(({ endpoint, statusCode }) => {
        console.log(`   ${c('yellow', '🔒')} ${endpoint} - ${statusCode}`);
    });
    
    console.log(`\n${c('red', '❌ ENDPOINTS NO ENCONTRADOS')} (${results.notFound.length}):`);
    results.notFound.forEach(({ endpoint }) => {
        console.log(`   ${c('red', '✗')} ${endpoint}`);
    });
    
    if (results.authMethods.length > 0) {
        console.log(`\n${c('green', '🎉 MÉTODOS DE AUTH ENCONTRADOS')} (${results.authMethods.length}):`);
        results.authMethods.forEach((method, index) => {
            console.log(`   ${index + 1}. ${JSON.stringify(method.headers || method.path)}`);
        });
    }
    
    console.log(`\n${c('cyan', '📁 ARCHIVOS GENERADOS')}:`);
    console.log(`   📄 ./responses/ - ${results.working.length} archivos JSON con respuestas`);
    
    // Save summary report
    const reportData = {
        timestamp: new Date().toISOString(),
        userInfo: USER_INFO,
        summary: {
            working: results.working.length,
            needsAuth: results.needsAuth.length,
            notFound: results.notFound.length,
            errors: results.errors.length
        },
        results: results
    };
    
    fs.writeFileSync('./api-report.json', JSON.stringify(reportData, null, 2));
    console.log(`   📊 ./api-report.json - Reporte completo`);
}

// Main function
async function main() {
    console.log(`${c('bright', '🚀 SMS-TIMING API EXPLORER')}`);
    console.log(`${c('cyan', 'Usuario:')} ${USER_INFO.alias} (${USER_INFO.personId})`);
    console.log('=' .repeat(60));
    
    // Part 1: Find auth method
    const foundAuth = await findAuthMethod();
    
    // Part 2: Test different auth headers
    let workingAuth = null;
    if (!foundAuth) {
        workingAuth = await testAuthHeaders();
    }
    
    // Part 3: Test public endpoints
    await testPublicEndpoints();
    
    // Part 4: Test private endpoints
    await testPrivateEndpoints(workingAuth || {});
    
    // Part 5: Search user data
    await searchUserData(workingAuth || {});
    
    // Generate final report
    generateReport();
    
    console.log(`\n${c('green', '🎉 EXPLORACIÓN COMPLETADA!')}`);
    console.log(`${c('cyan', 'Revisa los archivos generados para más detalles.')}`);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.log(`${c('red', '💥 Unhandled error:')} ${error.message}`);
});

// Run the explorer
if (require.main === module) {
    main().catch(console.error);
}