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
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept-Language': 'es-419,es;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Origin': 'ionic://localhost',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                ...headers
            }
        };

        if (postData && method === 'POST') {
            const data = JSON.stringify(postData);
            options.headers['Content-Type'] = 'application/json';
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

async function requestEmailLogin(email) {
    console.log(c('cyan', '📧 SOLICITANDO LOGIN POR EMAIL'));
    console.log('=' .repeat(50));
    console.log(`📮 Email: ${email}`);
    console.log(`🎯 Endpoint: ${BASE_URL}/login/basiclogin/speedpark`);
    
    try {
        const result = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark`,
            'POST',
            { email: email }
        );
        
        console.log(`\n📊 Respuesta: ${result.statusCode}`);
        console.log('📋 Headers:');
        Object.entries(result.headers).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
        
        if (result.data) {
            console.log('📄 Data:', JSON.stringify(result.data, null, 2));
        }
        
        if (result.rawData) {
            console.log('📝 Raw Data:', result.rawData);
        }
        
        // Guardar respuesta
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `./auth-responses/login-request-${timestamp}.json`;
        fs.mkdirSync('./auth-responses', { recursive: true });
        fs.writeFileSync(filename, JSON.stringify({
            email,
            timestamp: new Date().toISOString(),
            request: {
                url: `${BASE_URL}/login/basiclogin/speedpark`,
                method: 'POST',
                body: { email }
            },
            response: result
        }, null, 2));
        
        console.log(`\n💾 Respuesta guardada: ${filename}`);
        
        if (result.statusCode === 200 || result.statusCode === 202) {
            console.log(c('green', '\n✅ ¡LOGIN REQUEST EXITOSO!'));
            console.log('📬 Revisa tu email para el link de acceso');
            return true;
        } else if (result.statusCode === 401) {
            console.log(c('yellow', '\n⚠️  Email no registrado o formato incorrecto'));
            return false;
        } else {
            console.log(c('red', `\n❌ Error: ${result.statusCode}`));
            return false;
        }
        
    } catch (error) {
        console.log(c('red', `\n💥 Error: ${error.message}`));
        return false;
    }
}

async function processAuthToken(authUrl) {
    console.log(c('cyan', '\n🔑 PROCESANDO TOKEN DE AUTENTICACIÓN'));
    console.log('=' .repeat(50));
    console.log(`🔗 URL: ${authUrl}`);
    
    try {
        // Extraer el token del URL
        const url = new URL(authUrl);
        const token = url.searchParams.get('value');
        
        if (!token) {
            console.log(c('red', '❌ No se encontró token en la URL'));
            return null;
        }
        
        console.log(`🎫 Token extraído: ${token.substring(0, 20)}...`);
        
        // Simular el proceso de la app móvil
        console.log('\n🔄 Simulando flujo de autenticación de la app...');
        
        // Paso 1: OPTIONS request (preflight)
        console.log('1️⃣  Enviando OPTIONS preflight...');
        const optionsResult = await makeRequest(
            `${BASE_URL}/karting/versions/speedpark?language=es-419`,
            'OPTIONS',
            null,
            {
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'x-fast-accesstoken,x-fast-devicetoken,x-fast-version'
            }
        );
        
        console.log(`   📊 OPTIONS Response: ${optionsResult.statusCode}`);
        
        // Paso 2: Intentar diferentes estrategias para obtener tokens
        console.log('\n2️⃣  Intentando obtener tokens de autenticación...');
        
        const authStrategies = [
            // Estrategia 1: Usar el token directamente como header
            {
                name: 'Token como X-Fast-AccessToken',
                headers: {
                    'X-Fast-AccessToken': token,
                    'X-Fast-DeviceToken': '1111111129R2A932939',
                    'X-Fast-Version': '6250311 202504181931'
                }
            },
            
            // Estrategia 2: Usar el token decodificado (URL decode)
            {
                name: 'Token URL-decoded',
                headers: {
                    'X-Fast-AccessToken': decodeURIComponent(token),
                    'X-Fast-DeviceToken': '1111111129R2A932939',
                    'X-Fast-Version': '6250311 202504181931'
                }
            },
            
            // Estrategia 3: Llamar a un endpoint de autenticación con el token
            {
                name: 'Endpoint de autenticación',
                endpoint: '/auth/verify',
                body: { token: token }
            },
            
            // Estrategia 4: Endpoint de activación
            {
                name: 'Endpoint de activación',
                endpoint: '/login/activate',
                body: { value: token }
            }
        ];
        
        const results = [];
        
        for (const strategy of authStrategies) {
            console.log(`\n   🧪 Probando: ${strategy.name}`);
            
            try {
                let result;
                
                if (strategy.endpoint) {
                    // POST request con el token
                    result = await makeRequest(
                        `${BASE_URL}${strategy.endpoint}`,
                        'POST',
                        strategy.body
                    );
                } else {
                    // GET request con headers
                    result = await makeRequest(
                        `${BASE_URL}/karting/versions/speedpark?language=es-419`,
                        'GET',
                        null,
                        strategy.headers
                    );
                }
                
                console.log(`   📊 ${strategy.name}: ${result.statusCode}`);
                
                if (result.statusCode === 200) {
                    console.log(c('green', '   ✅ ¡ÉXITO!'));
                    if (result.data) {
                        console.log('   📄 Data:', JSON.stringify(result.data, null, 4));
                    }
                    
                    // Guardar tokens si los encontramos
                    if (strategy.headers) {
                        results.push({
                            strategy: strategy.name,
                            tokens: strategy.headers,
                            response: result
                        });
                    }
                } else {
                    console.log(`   ❌ Error: ${result.statusCode}`);
                }
                
                // Guardar respuesta
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `./auth-responses/${strategy.name.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.json`;
                fs.writeFileSync(filename, JSON.stringify({
                    strategy: strategy.name,
                    token: token.substring(0, 20) + '...',
                    request: strategy,
                    response: result,
                    timestamp: new Date().toISOString()
                }, null, 2));
                
                await sleep(1000); // Pausa entre requests
                
            } catch (error) {
                console.log(`   💥 Error en ${strategy.name}: ${error.message}`);
            }
        }
        
        return results;
        
    } catch (error) {
        console.log(c('red', `\n💥 Error procesando token: ${error.message}`));
        return null;
    }
}

async function testWithValidTokens(tokens) {
    console.log(c('cyan', '\n🧪 PROBANDO CON TOKENS VÁLIDOS'));
    console.log('=' .repeat(50));
    
    const testEndpoints = [
        '/activity-history/list/speedpark',
        '/person/profile/speedpark',
        '/karting/versions/speedpark',
        '/racestatistics/recent/speedpark',
        '/user/settings/speedpark'
    ];
    
    for (const endpoint of testEndpoints) {
        console.log(`\n🎯 Probando: ${endpoint}`);
        
        try {
            const result = await makeRequest(
                `${BASE_URL}${endpoint}`,
                'GET',
                null,
                tokens
            );
            
            console.log(`📊 Respuesta: ${result.statusCode}`);
            
            if (result.statusCode === 200) {
                console.log(c('green', '✅ ¡ACCESO EXITOSO!'));
                if (result.data) {
                    console.log('📄 Data preview:', JSON.stringify(result.data, null, 2).substring(0, 200) + '...');
                }
                
                // Guardar datos
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `./auth-responses/authenticated-${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.json`;
                fs.writeFileSync(filename, JSON.stringify({
                    endpoint,
                    tokens,
                    response: result,
                    timestamp: new Date().toISOString()
                }, null, 2));
                
                console.log(`💾 Datos guardados: ${filename}`);
            } else {
                console.log(c('red', `❌ Error: ${result.statusCode}`));
            }
            
            await sleep(500);
            
        } catch (error) {
            console.log(c('red', `💥 Error: ${error.message}`));
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('🚀 SMS-TIMING AUTHENTICATION FLOW');
    console.log('Automatizando el proceso completo de autenticación');
    console.log('=' .repeat(80));
    
    const email = 'icabreraquezada@gmail.com'; // Tu email real
    
    console.log('📋 FLUJO DE AUTENTICACIÓN:');
    console.log('1. Solicitar login por email');
    console.log('2. Esperar que proporciones la URL del email');
    console.log('3. Extraer y procesar el token');
    console.log('4. Obtener tokens de autenticación');
    console.log('5. Probar acceso a endpoints protegidos');
    
    // Paso 1: Solicitar login por email
    const loginRequested = await requestEmailLogin(email);
    
    if (!loginRequested) {
        console.log(c('red', '\n❌ No se pudo solicitar el login. Verifica el email.'));
        return;
    }
    
    console.log(c('green', '\n✅ LOGIN SOLICITADO EXITOSAMENTE!'));
    console.log('📬 Revisa tu email: icabreraquezada@gmail.com');
    console.log('📱 Busca un email de SMS-Timing con el link de acceso');
    console.log('🔗 El link debe verse así: https://smstim.in/speedpark/connect5?value=...');
    
    console.log(c('yellow', '\n⏳ ESPERANDO TU INPUT...'));
    console.log('📝 Cuando recibas el email, copia la URL completa y úsala con:');
    console.log('📝 node sms-auth-flow.js "https://smstim.in/speedpark/connect5?value=TU_TOKEN_AQUI"');
    
    // Si se proporciona una URL como argumento
    if (process.argv[2]) {
        const authUrl = process.argv[2];
        console.log(c('cyan', '\n🔄 PROCESANDO URL PROPORCIONADA...'));
        
        const authResults = await processAuthToken(authUrl);
        
        if (authResults && authResults.length > 0) {
            console.log(c('green', '\n🎉 ¡TOKENS OBTENIDOS!'));
            
            // Usar los mejores tokens encontrados
            const bestResult = authResults[0];
            console.log(`🏆 Usando tokens de: ${bestResult.strategy}`);
            console.log('🔑 Tokens:');
            Object.entries(bestResult.tokens).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
            
            // Probar endpoints con los tokens
            await testWithValidTokens(bestResult.tokens);
            
            console.log(c('green', '\n🎉 ¡PROCESO COMPLETADO!'));
            console.log('📁 Revisa la carpeta ./auth-responses/ para todos los resultados');
            
        } else {
            console.log(c('red', '\n❌ No se pudieron obtener tokens válidos'));
        }
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { requestEmailLogin, processAuthToken, testWithValidTokens };