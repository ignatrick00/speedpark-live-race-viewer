const https = require('https');
const fs = require('fs');

// Colors para output
const c = (color, text) => `\x1b[${color === 'green' ? '32' : color === 'red' ? '31' : color === 'yellow' ? '33' : color === 'cyan' ? '36' : '37'}m${text}\x1b[0m`;

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

// Headers base de la app
const BASE_HEADERS = {
    'Host': 'mobile-api22.sms-timing.com',
    'Accept': 'application/json, text/plain, */*',
    'Sec-Fetch-Site': 'cross-site',
    'X-Fast-DeviceToken': '1111111134RBBD7010',
    'X-Fast-AccessToken': '30npoiqaqikpmykipnm',
    'Accept-Language': 'es-419,es;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Mode': 'cors',
    'Origin': 'ionic://localhost',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'X-Fast-Version': '6250311 202504181931',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty'
};

function makeRequest(url, method = 'GET', postData = null, customHeaders = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        
        const headers = { ...BASE_HEADERS, ...customHeaders };
        
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: headers
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

async function completeAuthFlow(encryptedToken, fallbackTag) {
    console.log(c('cyan', '🔐 EJECUTANDO FLUJO COMPLETO DE AUTENTICACIÓN'));
    console.log('=' .repeat(70));
    console.log(`🎫 Token encriptado: ${encryptedToken.substring(0, 30)}...`);
    console.log(`🏷️  FallbackTag: ${fallbackTag}`);
    
    const results = {};
    
    try {
        // Paso 1: Obtener info del karting
        console.log('\n1️⃣  Obteniendo info de karting...');
        const kartingInfo = await makeRequest(`${BASE_URL}/karting/info/speedpark`);
        console.log(`   📊 Status: ${kartingInfo.statusCode}`);
        if (kartingInfo.data) {
            console.log('   📄 Info:', JSON.stringify(kartingInfo.data, null, 2));
            results.kartingInfo = kartingInfo.data;
        }
        
        // Paso 2: Verificar si tiene persona (primera vez)
        console.log('\n2️⃣  Verificando usuario inicial...');
        const hasPersonInitial = await makeRequest(
            `${BASE_URL}/person/hasperson/speedpark?fallbackTag=${fallbackTag}`
        );
        console.log(`   📊 Status: ${hasPersonInitial.statusCode}`);
        if (hasPersonInitial.data) {
            console.log('   📄 HasPerson:', JSON.stringify(hasPersonInitial.data, null, 2));
            results.hasPersonInitial = hasPersonInitial.data;
        }
        
        // Paso 3: CONFIRMAR LOGIN (paso crítico)
        console.log('\n3️⃣  🔑 CONFIRMANDO LOGIN...');
        const confirmLogin = await makeRequest(
            `${BASE_URL}/login/confirmlogin/speedpark?input=${encodeURIComponent(encryptedToken)}`,
            'POST'
        );
        console.log(`   📊 Status: ${confirmLogin.statusCode}`);
        console.log(`   📄 Response: ${confirmLogin.rawData}`);
        
        if (confirmLogin.statusCode === 200 && confirmLogin.rawData === 'true') {
            console.log(c('green', '   ✅ ¡LOGIN CONFIRMADO EXITOSAMENTE!'));
            results.loginConfirmed = true;
        } else {
            console.log(c('red', '   ❌ Error confirmando login'));
            return { success: false, error: 'Login confirmation failed' };
        }
        
        // Paso 4: OBTENER TOKENS FINALES
        console.log('\n4️⃣  🎯 OBTENIENDO TOKENS FINALES...');
        const hasPersonFinal = await makeRequest(
            `${BASE_URL}/person/hasperson/speedpark?fallbackTag=${fallbackTag}`
        );
        console.log(`   📊 Status: ${hasPersonFinal.statusCode}`);
        
        if (hasPersonFinal.statusCode === 200 && hasPersonFinal.data) {
            console.log('   📄 Response:', JSON.stringify(hasPersonFinal.data, null, 2));
            
            if (hasPersonFinal.data.hasPerson && hasPersonFinal.data.tag && hasPersonFinal.data.loginCode) {
                console.log(c('green', '   🎉 ¡TOKENS OBTENIDOS EXITOSAMENTE!'));
                
                const authTokens = {
                    tag: hasPersonFinal.data.tag,
                    loginCode: hasPersonFinal.data.loginCode,
                    fallbackTag: fallbackTag
                };
                
                console.log('\n🔑 TOKENS DE AUTENTICACIÓN:');
                console.log(`   Tag: ${authTokens.tag}`);
                console.log(`   LoginCode: ${authTokens.loginCode}`);
                console.log(`   FallbackTag: ${authTokens.fallbackTag}`);
                
                results.authTokens = authTokens;
                
                // Paso 5: Probar tokens con endpoints protegidos
                console.log('\n5️⃣  🧪 PROBANDO TOKENS CON ENDPOINTS PROTEGIDOS...');
                await testAuthenticatedEndpoints(authTokens);
                
                // Guardar tokens para uso futuro
                const tokenFile = `./auth-tokens/valid-tokens-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                fs.mkdirSync('./auth-tokens', { recursive: true });
                fs.writeFileSync(tokenFile, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    email: 'icabreraquezada@gmail.com',
                    tokens: authTokens,
                    headers: {
                        ...BASE_HEADERS,
                        'X-Fast-LoginCode': authTokens.loginCode,
                        'X-Fast-Tag': authTokens.tag
                    },
                    flowResults: results
                }, null, 2));
                
                console.log(`\n💾 Tokens guardados: ${tokenFile}`);
                
                return { success: true, tokens: authTokens, results };
                
            } else {
                console.log(c('red', '   ❌ No se obtuvieron tokens válidos'));
                return { success: false, error: 'No valid tokens received' };
            }
        } else {
            console.log(c('red', '   ❌ Error obteniendo tokens finales'));
            return { success: false, error: 'Failed to get final tokens' };
        }
        
    } catch (error) {
        console.log(c('red', `💥 Error en flujo de autenticación: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function testAuthenticatedEndpoints(authTokens) {
    console.log(c('cyan', '🧪 PROBANDO ENDPOINTS CON TOKENS DE AUTENTICACIÓN'));
    console.log('=' .repeat(60));
    
    // Headers con autenticación
    const authHeaders = {
        ...BASE_HEADERS,
        'X-Fast-LoginCode': authTokens.loginCode,
        'X-Fast-Tag': authTokens.tag
    };
    
    const testEndpoints = [
        {
            name: 'Historial de actividades',
            url: `${BASE_URL}/activity-history/list/speedpark`,
            method: 'GET'
        },
        {
            name: 'Perfil personal',
            url: `${BASE_URL}/person/profile/speedpark`,
            method: 'GET'
        },
        {
            name: 'Estadísticas de carreras',
            url: `${BASE_URL}/racestatistics/recent/speedpark`,
            method: 'GET'
        },
        {
            name: 'Versiones de karting',
            url: `${BASE_URL}/karting/versions/speedpark?language=es-419`,
            method: 'GET'
        },
        {
            name: 'Configuración de usuario',
            url: `${BASE_URL}/user/settings/speedpark`,
            method: 'GET'
        }
    ];
    
    const successfulEndpoints = [];
    
    for (const endpoint of testEndpoints) {
        console.log(`\n🎯 Probando: ${endpoint.name}`);
        console.log(`   URL: ${endpoint.url}`);
        
        try {
            const result = await makeRequest(endpoint.url, endpoint.method, null, authHeaders);
            
            console.log(`   📊 Status: ${result.statusCode}`);
            
            if (result.statusCode === 200) {
                console.log(c('green', '   ✅ ¡ACCESO EXITOSO!'));
                
                if (result.data) {
                    const preview = JSON.stringify(result.data, null, 2);
                    console.log(`   📄 Preview: ${preview.substring(0, 150)}${preview.length > 150 ? '...' : ''}`);
                    
                    // Guardar datos completos
                    const dataFile = `./authenticated-data/${endpoint.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                    fs.mkdirSync('./authenticated-data', { recursive: true });
                    fs.writeFileSync(dataFile, JSON.stringify({
                        endpoint: endpoint.name,
                        url: endpoint.url,
                        tokens: authTokens,
                        response: result,
                        timestamp: new Date().toISOString()
                    }, null, 2));
                    
                    console.log(`   💾 Datos guardados: ${dataFile}`);
                }
                
                successfulEndpoints.push(endpoint);
                
            } else if (result.statusCode === 401) {
                console.log(c('red', '   🔐 NO AUTORIZADO - Tokens inválidos'));
            } else if (result.statusCode === 404) {
                console.log(c('yellow', '   ❌ ENDPOINT NO ENCONTRADO'));
            } else {
                console.log(c('yellow', `   ⚠️  ERROR: ${result.statusCode}`));
            }
            
        } catch (error) {
            console.log(c('red', `   💥 Error: ${error.message}`));
        }
        
        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(c('green', `\n🎉 PRUEBAS COMPLETADAS: ${successfulEndpoints.length}/${testEndpoints.length} exitosas`));
    
    if (successfulEndpoints.length > 0) {
        console.log('\n✅ Endpoints con acceso exitoso:');
        successfulEndpoints.forEach(ep => {
            console.log(`   • ${ep.name}`);
        });
    }
    
    return successfulEndpoints;
}

async function main() {
    console.log('🚀 SMS-TIMING COMPLETE AUTHENTICATION FLOW');
    console.log('Ejecutando el protocolo completo descubierto');
    console.log('=' .repeat(80));
    
    // Tokens del flujo capturado
    const ENCRYPTED_TOKEN = '5HbmiQ6ztVk0LL%2FMmfLO%2FpnDl81cZpn7cVuPCMWXYfF2NRB%2BDWCWfQEIfi7Usli98TBoCggKQlJmjbIME1SLpdPpNkYlbm4dyGPyBHXqSb%2Bi7P5%2Bl0swtENeZRgGyJU3';
    const FALLBACK_TAG = '2c23fa0f-d1c4-4000-96da-bc769ff27a17';
    
    console.log('📋 DATOS DEL FLUJO:');
    console.log(`   Email: icabreraquezada@gmail.com`);
    console.log(`   Token encriptado: ${ENCRYPTED_TOKEN.substring(0, 30)}...`);
    console.log(`   FallbackTag: ${FALLBACK_TAG}`);
    
    const result = await completeAuthFlow(ENCRYPTED_TOKEN, FALLBACK_TAG);
    
    if (result.success) {
        console.log(c('green', '\n🎉 ¡AUTENTICACIÓN COMPLETA EXITOSA!'));
        console.log('🔑 Tokens válidos obtenidos y probados');
        console.log('📁 Revisa las carpetas:');
        console.log('   📄 ./auth-tokens/ - Tokens de autenticación');
        console.log('   📄 ./authenticated-data/ - Datos obtenidos con los tokens');
        
        console.log('\n📋 RESUMEN DE TOKENS:');
        console.log('```javascript');
        console.log('const AUTH_HEADERS = {');
        console.log(`  'X-Fast-DeviceToken': '1111111134RBBD7010',`);
        console.log(`  'X-Fast-AccessToken': '30npoiqaqikpmykipnm',`);
        console.log(`  'X-Fast-Version': '6250311 202504181931',`);
        console.log(`  'X-Fast-LoginCode': '${result.tokens.loginCode}',`);
        console.log(`  'X-Fast-Tag': '${result.tokens.tag}'`);
        console.log('};');
        console.log('```');
        
    } else {
        console.log(c('red', `\n❌ ERROR EN AUTENTICACIÓN: ${result.error}`));
    }
}

// Ejecutar
main().catch(console.error);