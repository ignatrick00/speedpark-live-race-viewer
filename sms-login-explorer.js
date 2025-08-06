const https = require('https');
const fs = require('fs');

// Colors para output
const c = (color, text) => `\x1b[${color === 'green' ? '32' : color === 'red' ? '31' : color === 'yellow' ? '33' : color === 'cyan' ? '36' : '37'}m${text}\x1b[0m`;

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

function makeRequest(url, method = 'GET', postData = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15',
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (postData && method === 'POST') {
            const data = JSON.stringify(postData);
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data.length > 0 ? JSON.parse(data) : null,
                        rawData: data
                    };
                    resolve(result);
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: null,
                        rawData: data,
                        parseError: e.message
                    });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        if (postData && method === 'POST') {
            req.write(JSON.stringify(postData));
        }
        
        req.end();
    });
}

async function exploreLoginAPI() {
    console.log(c('cyan', '🔍 EXPLORANDO SMS-TIMING LOGIN API'));
    console.log('=' .repeat(60));
    
    // 1. Explorar el endpoint básico de login
    console.log(c('yellow', '\n📁 1. EXPLORANDO BASIC LOGIN:'));
    
    const loginEndpoints = [
        '/login/basiclogin/speedpark',
        '/login/basiclogin/speedpark?format=json',
        '/login/speedpark',
        '/auth/login/speedpark',
        '/auth/basiclogin/speedpark'
    ];
    
    for (const endpoint of loginEndpoints) {
        await testLoginEndpoint(endpoint);
        await sleep(500);
    }
    
    // 2. Intentar diferentes métodos HTTP
    console.log(c('yellow', '\n📁 2. PROBANDO DIFERENTES MÉTODOS:'));
    
    const methods = ['GET', 'POST', 'OPTIONS'];
    for (const method of methods) {
        await testLoginMethod('/login/basiclogin/speedpark', method);
        await sleep(500);
    }
    
    // 3. Explorar con datos de login ficticios
    console.log(c('yellow', '\n📁 3. PROBANDO CON DATOS DE LOGIN:'));
    
    const testCredentials = [
        { email: 'test@example.com', password: 'test123' },
        { username: 'test', password: 'test123' },
        { email: 'user@speedpark.com', password: 'password' },
        { login: 'test@example.com', password: 'test123' }
    ];
    
    for (const creds of testCredentials) {
        await testLoginWithCredentials('/login/basiclogin/speedpark', creds);
        await sleep(500);
    }
    
    // 4. Explorar endpoints relacionados
    console.log(c('yellow', '\n📁 4. ENDPOINTS RELACIONADOS:'));
    
    const relatedEndpoints = [
        '/login',
        '/auth',
        '/auth/speedpark',
        '/login/forgot-password/speedpark',
        '/login/reset-password/speedpark',
        '/login/register/speedpark',
        '/login/verify/speedpark',
        '/user/profile/speedpark',
        '/account/speedpark'
    ];
    
    for (const endpoint of relatedEndpoints) {
        await testLoginEndpoint(endpoint);
        await sleep(300);
    }
}

async function testLoginEndpoint(endpoint) {
    try {
        const result = await makeRequest(`${BASE_URL}${endpoint}`);
        
        let status, icon;
        if (result.statusCode === 200) {
            status = c('green', '✅ 200');
            icon = '🎉';
        } else if (result.statusCode === 401 || result.statusCode === 403) {
            status = c('yellow', `🔐 ${result.statusCode}`);
            icon = '🔑';
        } else if (result.statusCode === 404) {
            status = c('red', '❌ 404');
            icon = '❌';
        } else if (result.statusCode === 405) {
            status = c('yellow', '⚠️  405 Method Not Allowed');
            icon = '🚫';
        } else {
            status = c('yellow', `⚠️  ${result.statusCode}`);
            icon = '⚠️';
        }
        
        const preview = getPreview(result.data, result.rawData);
        console.log(`${icon} ${endpoint.padEnd(40)} ${status} ${preview}`);
        
        // Guardar respuestas exitosas
        if (result.statusCode === 200 || result.statusCode === 400 || result.statusCode === 401) {
            const filename = `./login-discoveries/${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            fs.mkdirSync('./login-discoveries', { recursive: true });
            fs.writeFileSync(filename, JSON.stringify({
                endpoint,
                statusCode: result.statusCode,
                headers: result.headers,
                data: result.data,
                rawData: result.rawData
            }, null, 2));
        }
        
        return result;
    } catch (error) {
        console.log(`💥 ${endpoint.padEnd(40)} ${c('red', 'ERROR')} ${error.message.substring(0, 30)}`);
        return null;
    }
}

async function testLoginMethod(endpoint, method) {
    try {
        const result = await makeRequest(`${BASE_URL}${endpoint}`, method);
        
        let status = `${method} ${result.statusCode}`;
        if (result.statusCode === 200) status = c('green', status);
        else if (result.statusCode === 405) status = c('red', status);
        else status = c('yellow', status);
        
        const preview = getPreview(result.data, result.rawData);
        console.log(`   ${method.padEnd(8)} ${endpoint.padEnd(35)} ${status} ${preview}`);
        
        return result;
    } catch (error) {
        console.log(`   ${method.padEnd(8)} ${endpoint.padEnd(35)} ${c('red', 'ERROR')} ${error.message}`);
        return null;
    }
}

async function testLoginWithCredentials(endpoint, credentials) {
    try {
        const result = await makeRequest(`${BASE_URL}${endpoint}`, 'POST', credentials);
        
        let status;
        if (result.statusCode === 200) {
            status = c('green', '✅ 200 LOGIN SUCCESS?');
        } else if (result.statusCode === 401) {
            status = c('yellow', '🔐 401 UNAUTHORIZED');
        } else if (result.statusCode === 400) {
            status = c('yellow', '⚠️  400 BAD REQUEST');
        } else {
            status = c('red', `❌ ${result.statusCode}`);
        }
        
        const preview = getPreview(result.data, result.rawData);
        const credStr = `${Object.keys(credentials)[0]}:${Object.values(credentials)[0]}`;
        console.log(`   ${credStr.padEnd(25)} ${status} ${preview}`);
        
        // Guardar respuestas interesantes
        if (result.statusCode === 200 || result.statusCode === 400 || result.statusCode === 401) {
            const filename = `./login-discoveries/POST_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_${Object.keys(credentials)[0]}.json`;
            fs.mkdirSync('./login-discoveries', { recursive: true });
            fs.writeFileSync(filename, JSON.stringify({
                endpoint,
                method: 'POST',
                credentials,
                statusCode: result.statusCode,
                headers: result.headers,
                data: result.data,
                rawData: result.rawData
            }, null, 2));
        }
        
        return result;
    } catch (error) {
        console.log(`   ${Object.keys(credentials)[0]}:*** ${c('red', 'ERROR')} ${error.message}`);
        return null;
    }
}

function getPreview(data, rawData) {
    if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
            return c('cyan', `[${data.length} items]`);
        } else {
            const keys = Object.keys(data);
            const preview = keys.slice(0, 3).join(', ');
            return c('cyan', `{${keys.length} keys: ${preview}${keys.length > 3 ? '...' : ''}}`);
        }
    } else if (rawData && rawData.length > 0) {
        return c('gray', `"${rawData.substring(0, 50)}${rawData.length > 50 ? '...' : ''}"`);
    }
    return '';
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Función específica para probar el login con email real
async function testRealLogin() {
    console.log(c('cyan', '\n🔐 PROBANDO LOGIN CON EMAIL REAL'));
    console.log('=' .repeat(60));
    
    console.log('⚠️  NOTA: Este script NO enviará emails reales. Solo explora la API.');
    console.log('📧 Para probar con tu email real, edita la variable testEmail más abajo.\n');
    
    // Cambia este email por el tuyo si quieres probar
    const testEmails = [
        'ignacio@example.com',  // Cambia por tu email real
        'test@speedpark.com',
        'admin@speedpark.com',
        'usuario@gmail.com'
    ];
    
    for (const email of testEmails) {
        console.log(c('yellow', `\n📧 Probando con: ${email}`));
        
        // Probar diferentes formatos de datos
        const loginFormats = [
            { email: email },
            { email: email, venue: 'speedpark' },
            { username: email },
            { login: email },
            { user: email },
            { account: email }
        ];
        
        for (const format of loginFormats) {
            await testLoginWithCredentials('/login/basiclogin/speedpark', format);
            await sleep(300);
        }
    }
}

async function main() {
    console.log('🚀 SMS-TIMING LOGIN API EXPLORER');
    console.log('Objetivo: Encontrar cómo obtener tokens de autenticación');
    console.log('=' .repeat(80));
    
    await exploreLoginAPI();
    await testRealLogin();
    
    console.log(c('cyan', '\n🎉 EXPLORACIÓN COMPLETADA!'));
    console.log('=' .repeat(60));
    console.log('📁 Revisa la carpeta ./login-discoveries/ para ver las respuestas');
    console.log('🔍 Busca endpoints que respondan 200 o que muestren estructura de login');
    
    // Mostrar resumen de archivos creados
    try {
        const files = fs.readdirSync('./login-discoveries');
        if (files.length > 0) {
            console.log(c('green', `\n✅ ${files.length} archivos de respuesta guardados:`));
            files.forEach(file => {
                console.log(`   📄 ${file}`);
            });
        }
    } catch (error) {
        console.log(c('yellow', '\n⚠️  No se crearon archivos de respuesta'));
    }
    
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('1. Revisa los archivos JSON generados');
    console.log('2. Identifica endpoints que acepten POST con email');
    console.log('3. Prueba con tu email real en esos endpoints');
    console.log('4. Analiza las respuestas para entender el flujo de login');
}

main().catch(console.error);