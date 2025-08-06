const https = require('https');
const fs = require('fs');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: require('crypto').randomUUID } : require('uuid');

// Colors para output
const c = (color, text) => `\x1b[${color === 'green' ? '32' : color === 'red' ? '31' : color === 'yellow' ? '33' : color === 'cyan' ? '36' : '37'}m${text}\x1b[0m`;

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

// Headers exactos capturados de Proxyman
const REAL_HEADERS = {
    'Host': 'mobile-api22.sms-timing.com',
    'Accept': 'application/json, text/plain, */*',
    'Sec-Fetch-Site': 'cross-site',
    'X-Fast-DeviceToken': '1111111134RBBD7010',
    'X-Fast-AccessToken': '30npoiqaqikpmykipnm',
    'Accept-Language': 'es-419,es;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Mode': 'cors',
    'Content-Type': 'application/json',
    'Origin': 'ionic://localhost',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'X-Fast-Version': '6250311 202504181931',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty'
};

function makeRequest(url, method = 'GET', postData = null, customHeaders = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        
        const headers = { ...REAL_HEADERS, ...customHeaders };
        
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: headers
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

// Generar UUID similar al que usa la app
function generateFallbackTag() {
    // Simular el formato UUID que usa la app
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    return uuid;
}

async function sendRealLoginRequest(email) {
    console.log(c('cyan', '🚀 ENVIANDO LOGIN REQUEST REAL'));
    console.log('=' .repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 URL: ${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`);
    
    const fallbackTag = generateFallbackTag();
    console.log(`🏷️  FallbackTag: ${fallbackTag}`);
    
    const requestBody = {
        "fallbackTag": fallbackTag,
        "userInput": email
    };
    
    console.log('\n📋 Headers enviados:');
    Object.entries(REAL_HEADERS).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n📄 Body enviado:');
    console.log(JSON.stringify(requestBody, null, 2));
    
    try {
        // Paso 1: OPTIONS preflight (automático en navegadores, pero lo hacemos explícito)
        console.log('\n1️⃣  Enviando OPTIONS preflight...');
        const optionsResult = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
            'OPTIONS',
            null,
            {
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type,x-fast-accesstoken,x-fast-devicetoken,x-fast-version'
            }
        );
        
        console.log(`   📊 OPTIONS Response: ${optionsResult.statusCode}`);
        
        // Paso 2: POST real
        console.log('\n2️⃣  Enviando POST request...');
        const result = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
            'POST',
            requestBody
        );
        
        console.log(`\n📊 Respuesta: ${result.statusCode}`);
        console.log('📋 Response Headers:');
        Object.entries(result.headers).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
        
        if (result.data) {
            console.log('\n📄 Response Data:');
            console.log(JSON.stringify(result.data, null, 2));
        }
        
        if (result.rawData) {
            console.log('\n📝 Raw Response:');
            console.log(result.rawData);
        }
        
        // Guardar respuesta completa
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `./real-auth-responses/real-login-${timestamp}.json`;
        fs.mkdirSync('./real-auth-responses', { recursive: true });
        fs.writeFileSync(filename, JSON.stringify({
            email,
            fallbackTag,
            timestamp: new Date().toISOString(),
            request: {
                url: `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
                method: 'POST',
                headers: REAL_HEADERS,
                body: requestBody
            },
            response: result
        }, null, 2));
        
        console.log(`\n💾 Respuesta guardada: ${filename}`);
        
        // Analizar la respuesta
        if (result.statusCode === 200) {
            console.log(c('green', '\n✅ ¡REQUEST ENVIADO EXITOSAMENTE!'));
            
            if (result.data) {
                const response = result.data;
                
                if (response.loggedIn === false) {
                    console.log(c('yellow', '📧 Email enviado. Revisa tu bandeja de entrada.'));
                    console.log(`📦 Tag: ${response.tag || 'null'}`);
                    console.log(`👤 Person: ${response.person || 'null'}`);
                    console.log(`🔑 LoginCode: ${response.loginCode || 'null'}`);
                    console.log(`📍 PersonReference: ${response.personReference || 'null'}`);
                    
                    console.log(c('cyan', '\n📬 PRÓXIMOS PASOS:'));
                    console.log('1. Revisa tu email: icabreraquezada@gmail.com');
                    console.log('2. Busca un email de SMS-Timing');
                    console.log('3. Copia el link completo que empiece con: https://smstim.in/speedpark/connect5?value=...');
                    console.log('4. Ejecuta: node sms-real-login.js "TU_LINK_AQUI"');
                    
                    return { success: true, needsEmailConfirmation: true, data: response };
                    
                } else if (response.loggedIn === true) {
                    console.log(c('green', '🎉 ¡LOGIN EXITOSO DIRECTO!'));
                    console.log('🔑 Ya tienes acceso a la cuenta');
                    
                    return { success: true, loggedIn: true, data: response };
                }
            }
        } else if (result.statusCode === 400) {
            console.log(c('red', '\n❌ REQUEST MALFORMADO (400)'));
            console.log('📝 Verifica el formato del email o los parámetros');
            return { success: false, error: 'Bad Request' };
            
        } else if (result.statusCode === 401) {
            console.log(c('red', '\n🔐 NO AUTORIZADO (401)'));
            console.log('📝 Email no registrado o tokens incorrectos');
            return { success: false, error: 'Unauthorized' };
            
        } else {
            console.log(c('red', `\n❌ ERROR: ${result.statusCode}`));
            return { success: false, error: `HTTP ${result.statusCode}` };
        }
        
    } catch (error) {
        console.log(c('red', `\n💥 Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function processAuthLink(authUrl) {
    console.log(c('cyan', '\n🔗 PROCESANDO LINK DE AUTENTICACIÓN'));
    console.log('=' .repeat(60));
    console.log(`🔗 URL: ${authUrl}`);
    
    try {
        // Extraer el token del URL
        const url = new URL(authUrl);
        const token = url.searchParams.get('value');
        
        if (!token) {
            console.log(c('red', '❌ No se encontró token en la URL'));
            return null;
        }
        
        console.log(`🎫 Token extraído: ${token.substring(0, 30)}...`);
        
        // Simular click en el link
        console.log('\n🖱️  Simulando click en el link...');
        
        const linkResult = await makeRequest(authUrl, 'GET');
        
        console.log(`📊 Link Response: ${linkResult.statusCode}`);
        
        if (linkResult.statusCode === 200 || linkResult.statusCode === 302) {
            console.log(c('green', '✅ Link procesado exitosamente'));
            
            // Ahora intentar usar el token para obtener datos de usuario
            console.log('\n🔑 Intentando obtener tokens de autenticación...');
            
            // Diferentes estrategias para usar el token
            const authStrategies = [
                {
                    name: 'Token directo como AccessToken',
                    headers: {
                        ...REAL_HEADERS,
                        'X-Fast-AccessToken': token
                    }
                },
                {
                    name: 'Token URL-decoded',
                    headers: {
                        ...REAL_HEADERS,
                        'X-Fast-AccessToken': decodeURIComponent(token)
                    }
                }
            ];
            
            const results = [];
            
            for (const strategy of authStrategies) {
                console.log(`\n🧪 Probando: ${strategy.name}`);
                
                try {
                    // Probar con endpoint conocido que requiere autenticación
                    const testResult = await makeRequest(
                        `${BASE_URL}/activity-history/list/speedpark`,
                        'GET',
                        null,
                        strategy.headers
                    );
                    
                    console.log(`   📊 ${strategy.name}: ${testResult.statusCode}`);
                    
                    if (testResult.statusCode === 200) {
                        console.log(c('green', '   🎉 ¡TOKENS VÁLIDOS ENCONTRADOS!'));
                        
                        if (testResult.data) {
                            console.log('   📄 Data preview:', JSON.stringify(testResult.data, null, 2).substring(0, 200) + '...');
                        }
                        
                        results.push({
                            strategy: strategy.name,
                            tokens: strategy.headers,
                            testResponse: testResult
                        });
                        
                        // Guardar tokens exitosos
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const filename = `./real-auth-responses/valid-tokens-${timestamp}.json`;
                        fs.writeFileSync(filename, JSON.stringify({
                            strategy: strategy.name,
                            tokens: strategy.headers,
                            testEndpoint: '/activity-history/list/speedpark',
                            response: testResult,
                            timestamp: new Date().toISOString()
                        }, null, 2));
                        
                        console.log(`   💾 Tokens guardados: ${filename}`);
                        
                    } else {
                        console.log(`   ❌ Error: ${testResult.statusCode}`);
                    }
                    
                } catch (error) {
                    console.log(`   💥 Error en ${strategy.name}: ${error.message}`);
                }
            }
            
            return results.length > 0 ? results[0] : null;
            
        } else {
            console.log(c('red', `❌ Error procesando link: ${linkResult.statusCode}`));
            return null;
        }
        
    } catch (error) {
        console.log(c('red', `💥 Error procesando link: ${error.message}`));
        return null;
    }
}

async function main() {
    console.log('🚀 SMS-TIMING REAL LOGIN FLOW');
    console.log('Usando datos exactos capturados de Proxyman');
    console.log('=' .repeat(80));
    
    const email = 'icabreraquezada@gmail.com';
    
    // Si se proporciona un link como argumento, procesarlo directamente
    if (process.argv[2] && process.argv[2].startsWith('https://smstim.in/')) {
        const authUrl = process.argv[2];
        console.log(c('cyan', '🔗 PROCESANDO LINK PROPORCIONADO...'));
        
        const authResult = await processAuthLink(authUrl);
        
        if (authResult) {
            console.log(c('green', '\n🎉 ¡AUTENTICACIÓN EXITOSA!'));
            console.log('🔑 Tokens válidos obtenidos');
            console.log('📁 Revisa ./real-auth-responses/ para los tokens');
            
            // Mostrar tokens para usar
            console.log('\n📋 TOKENS PARA USAR EN TUS SCRIPTS:');
            console.log('```javascript');
            console.log('const AUTH_HEADERS = {');
            Object.entries(authResult.tokens).forEach(([key, value]) => {
                if (key.startsWith('X-Fast-')) {
                    console.log(`  '${key}': '${value}',`);
                }
            });
            console.log('};');
            console.log('```');
            
        } else {
            console.log(c('red', '❌ No se pudieron obtener tokens válidos'));
        }
        
        return;
    }
    
    // Proceso normal: solicitar login por email
    console.log(`📧 Solicitando login para: ${email}`);
    
    const loginResult = await sendRealLoginRequest(email);
    
    if (loginResult.success) {
        if (loginResult.needsEmailConfirmation) {
            console.log(c('yellow', '\n⏳ Esperando confirmación por email...'));
            console.log('📧 Revisa tu email y ejecuta el script con el link recibido');
        } else if (loginResult.loggedIn) {
            console.log(c('green', '\n🎉 ¡Login directo exitoso!'));
        }
    } else {
        console.log(c('red', `\n❌ Error en login: ${loginResult.error}`));
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { sendRealLoginRequest, processAuthLink };