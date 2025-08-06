const https = require('https');
const fs = require('fs');
const path = require('path');

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

// Generar UUID para fallbackTag
function generateFallbackTag() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function requestLogin(email) {
    console.log(c('cyan', '📧 SOLICITANDO LOGIN POR EMAIL'));
    console.log('=' .repeat(50));
    console.log(`👤 Email: ${email}`);
    
    const fallbackTag = generateFallbackTag();
    console.log(`🏷️  FallbackTag generado: ${fallbackTag}`);
    
    const requestBody = {
        "fallbackTag": fallbackTag,
        "userInput": email
    };
    
    try {
        const result = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
            'POST',
            requestBody
        );
        
        console.log(`📊 Status: ${result.statusCode}`);
        
        if (result.statusCode === 200) {
            console.log(c('green', '✅ Email de login enviado exitosamente'));
            
            if (result.data) {
                console.log('📄 Response:', JSON.stringify(result.data, null, 2));
            }
            
            return { success: true, fallbackTag, email };
        } else {
            console.log(c('red', `❌ Error: ${result.statusCode}`));
            return { success: false, error: `HTTP ${result.statusCode}` };
        }
        
    } catch (error) {
        console.log(c('red', `💥 Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function processAuthLink(authUrl, fallbackTag, email) {
    console.log(c('cyan', '\n🔐 PROCESANDO AUTENTICACIÓN'));
    console.log('=' .repeat(50));
    
    try {
        // Extraer token del URL
        const url = new URL(authUrl);
        const encryptedToken = url.searchParams.get('value');
        
        if (!encryptedToken) {
            throw new Error('No se encontró token en la URL');
        }
        
        console.log(`🎫 Token extraído: ${encryptedToken.substring(0, 30)}...`);
        
        // Paso 1: Confirmar login
        console.log('\n1️⃣  Confirmando login...');
        const confirmResult = await makeRequest(
            `${BASE_URL}/login/confirmlogin/speedpark?input=${encodeURIComponent(encryptedToken)}`,
            'POST'
        );
        
        if (confirmResult.statusCode !== 200 || confirmResult.rawData !== 'true') {
            throw new Error('Error confirmando login');
        }
        
        console.log(c('green', '   ✅ Login confirmado'));
        
        // Paso 2: Obtener tokens finales
        console.log('\n2️⃣  Obteniendo tokens de autenticación...');
        const tokensResult = await makeRequest(
            `${BASE_URL}/person/hasperson/speedpark?fallbackTag=${fallbackTag}`
        );
        
        if (tokensResult.statusCode !== 200 || !tokensResult.data) {
            throw new Error('Error obteniendo tokens');
        }
        
        const { tag, loginCode } = tokensResult.data;
        
        if (!tag || !loginCode) {
            throw new Error('Tokens inválidos recibidos');
        }
        
        console.log(c('green', '   ✅ Tokens obtenidos exitosamente'));
        console.log(`   🔑 Tag: ${tag}`);
        console.log(`   🔑 LoginCode: ${loginCode}`);
        
        return { success: true, tokens: { tag, loginCode, fallbackTag }, email };
        
    } catch (error) {
        console.log(c('red', `💥 Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function extractAllUserData(tokens, email) {
    console.log(c('cyan', '\n📊 EXTRAYENDO TODOS LOS DATOS DEL USUARIO'));
    console.log('=' .repeat(60));
    console.log(`👤 Email: ${email}`);
    
    // Headers con autenticación
    const authHeaders = {
        ...BASE_HEADERS,
        'X-Fast-LoginCode': tokens.loginCode,
        'X-Fast-Tag': tokens.tag
    };
    
    const userData = {
        email,
        tokens,
        extractedAt: new Date().toISOString(),
        data: {}
    };
    
    // Lista completa de endpoints a probar
    const endpoints = [
        // Perfil y configuración
        { name: 'profile', url: '/person/profile/speedpark', description: 'Perfil personal' },
        { name: 'settings', url: '/user/settings/speedpark', description: 'Configuración de usuario' },
        { name: 'karting-info', url: '/karting/info/speedpark', description: 'Info de karting' },
        { name: 'versions', url: '/karting/versions/speedpark?language=es-419', description: 'Versiones de karting' },
        
        // Historial y actividades
        { name: 'activity-history', url: '/activity-history/list/speedpark', description: 'Historial completo de actividades' },
        { name: 'activity-recent', url: '/activity-history/recent/speedpark', description: 'Actividades recientes' },
        
        // Estadísticas de carreras
        { name: 'race-stats', url: '/racestatistics/speedpark', description: 'Estadísticas de carreras' },
        { name: 'race-recent', url: '/racestatistics/recent/speedpark', description: 'Carreras recientes' },
        { name: 'race-best', url: '/racestatistics/best/speedpark', description: 'Mejores tiempos' },
        
        // Datos personales específicos
        { name: 'person-details', url: '/person/details/speedpark', description: 'Detalles de persona' },
        { name: 'person-stats', url: '/person/statistics/speedpark', description: 'Estadísticas personales' },
        
        // Sesiones específicas (se llenarán dinámicamente)
    ];
    
    console.log(`🎯 Probando ${endpoints.length} endpoints...`);
    
    let successCount = 0;
    
    for (const endpoint of endpoints) {
        console.log(`\n📍 ${endpoint.description}`);
        console.log(`   URL: ${endpoint.url}`);
        
        try {
            const result = await makeRequest(`${BASE_URL}${endpoint.url}`, 'GET', null, authHeaders);
            
            console.log(`   📊 Status: ${result.statusCode}`);
            
            if (result.statusCode === 200) {
                console.log(c('green', '   ✅ Datos obtenidos'));
                
                userData.data[endpoint.name] = result.data;
                successCount++;
                
                // Mostrar preview de datos importantes
                if (['activity-history', 'race-stats', 'profile'].includes(endpoint.name)) {
                    if (result.data && Array.isArray(result.data)) {
                        console.log(`   📄 Encontrados ${result.data.length} elementos`);
                    } else if (result.data && typeof result.data === 'object') {
                        const keys = Object.keys(result.data);
                        console.log(`   📄 Datos: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
                    }
                }
                
            } else if (result.statusCode === 401) {
                console.log(c('red', '   🔐 No autorizado'));
            } else if (result.statusCode === 404) {
                console.log(c('yellow', '   ❌ No encontrado'));
            } else {
                console.log(c('yellow', `   ⚠️  ${result.statusCode}`));
            }
            
        } catch (error) {
            console.log(c('red', `   💥 Error: ${error.message}`));
        }
        
        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Si tenemos historial de actividades, extraer sesiones específicas
    if (userData.data['activity-history'] && Array.isArray(userData.data['activity-history'])) {
        console.log(c('cyan', '\n🔍 EXTRAYENDO DATOS DE SESIONES ESPECÍFICAS'));
        
        const sessions = userData.data['activity-history'].slice(0, 10); // Últimas 10 sesiones
        console.log(`📊 Procesando ${sessions.length} sesiones recientes...`);
        
        userData.data.sessions = {};
        
        for (const session of sessions) {
            if (session.id) {
                console.log(`\n📍 Sesión ${session.id}: ${session.name || 'Sin nombre'}`);
                
                const sessionEndpoints = [
                    { name: 'details', url: `/activity-history/details/speedpark?sessionId=${session.id}` },
                    { name: 'results', url: `/racestatistics/sessionv2/speedpark?sessionId=${session.id}` },
                    { name: 'laps', url: `/racestatistics/laps_fast5/speedpark?sessionId=${session.id}` }
                ];
                
                userData.data.sessions[session.id] = {
                    info: session,
                    data: {}
                };
                
                for (const sesEndpoint of sessionEndpoints) {
                    try {
                        const sesResult = await makeRequest(`${BASE_URL}${sesEndpoint.url}`, 'GET', null, authHeaders);
                        
                        if (sesResult.statusCode === 200) {
                            userData.data.sessions[session.id].data[sesEndpoint.name] = sesResult.data;
                            console.log(`   ✅ ${sesEndpoint.name}`);
                        }
                        
                    } catch (error) {
                        console.log(`   ❌ Error en ${sesEndpoint.name}`);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
    }
    
    console.log(c('green', `\n🎉 EXTRACCIÓN COMPLETADA: ${successCount} endpoints exitosos`));
    
    return userData;
}

async function saveUserData(userData) {
    // Crear carpeta para el usuario
    const userFolder = `./user-data/${userData.email.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')}`;
    fs.mkdirSync(userFolder, { recursive: true });
    
    // Guardar datos completos
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataFile = path.join(userFolder, `complete-data-${timestamp}.json`);
    fs.writeFileSync(dataFile, JSON.stringify(userData, null, 2));
    
    // Guardar solo tokens para reutilizar
    const tokensFile = path.join(userFolder, 'tokens.json');
    fs.writeFileSync(tokensFile, JSON.stringify({
        email: userData.email,
        tokens: userData.tokens,
        lastUpdate: userData.extractedAt
    }, null, 2));
    
    // Crear resumen legible
    const summaryFile = path.join(userFolder, 'summary.txt');
    let summary = `RESUMEN DE DATOS EXTRAÍDOS\n`;
    summary += `Email: ${userData.email}\n`;
    summary += `Extraído: ${userData.extractedAt}\n`;
    summary += `=`.repeat(50) + '\n\n';
    
    // Analizar datos obtenidos
    if (userData.data.profile) {
        summary += `PERFIL:\n`;
        const profile = userData.data.profile;
        summary += `- Nombre: ${profile.firstName || ''} ${profile.lastName || ''}\n`;
        summary += `- Alias: ${profile.alias || ''}\n`;
        summary += `- PersonID: ${profile.personId || ''}\n\n`;
    }
    
    if (userData.data['activity-history']) {
        const activities = userData.data['activity-history'];
        summary += `HISTORIAL DE CARRERAS:\n`;
        summary += `- Total de carreras: ${activities.length}\n`;
        
        if (activities.length > 0) {
            summary += `- Primera carrera: ${activities[activities.length - 1].date}\n`;
            summary += `- Última carrera: ${activities[0].date}\n`;
        }
        summary += '\n';
    }
    
    if (userData.data.sessions) {
        const sessionIds = Object.keys(userData.data.sessions);
        summary += `SESIONES DETALLADAS:\n`;
        summary += `- Sesiones procesadas: ${sessionIds.length}\n\n`;
    }
    
    fs.writeFileSync(summaryFile, summary);
    
    console.log(c('green', '\n💾 DATOS GUARDADOS:'));
    console.log(`   📁 Carpeta: ${userFolder}`);
    console.log(`   📄 Datos completos: ${path.basename(dataFile)}`);
    console.log(`   🔑 Tokens: ${path.basename(tokensFile)}`);
    console.log(`   📋 Resumen: ${path.basename(summaryFile)}`);
    
    return userFolder;
}

async function main() {
    console.log('🚀 EXTRACTOR COMPLETO DE DATOS DE USUARIO SMS-TIMING');
    console.log('Proceso automatizado: Email → Login → Autenticación → Extracción completa');
    console.log('=' .repeat(80));
    
    // Obtener email del argumento o pedir input
    const email = process.argv[2];
    const authLink = process.argv[3];
    
    if (!email) {
        console.log(c('red', '❌ Uso: node user-data-extractor.js EMAIL [AUTH_LINK]'));
        console.log('Ejemplo: node user-data-extractor.js usuario@gmail.com');
        console.log('         node user-data-extractor.js usuario@gmail.com "https://smstim.in/speedpark/connect5?value=..."');
        return;
    }
    
    console.log(`👤 Email objetivo: ${email}`);
    
    let fallbackTag;
    
    // Si no hay link de auth, solicitar login
    if (!authLink) {
        console.log('\n📧 Fase 1: Solicitando login por email...');
        const loginResult = await requestLogin(email);
        
        if (!loginResult.success) {
            console.log(c('red', `❌ Error solicitando login: ${loginResult.error}`));
            return;
        }
        
        fallbackTag = loginResult.fallbackTag;
        
        console.log(c('yellow', '\n⏳ ESPERANDO LINK DE AUTENTICACIÓN...'));
        console.log(`📧 Revisa el email: ${email}`);
        console.log('🔗 Cuando recibas el email, ejecuta:');
        console.log(`node user-data-extractor.js "${email}" "LINK_DEL_EMAIL"`);
        return;
    }
    
    // Si hay link, procesar autenticación
    console.log('\n🔐 Fase 2: Procesando autenticación...');
    
    // Necesitamos el fallbackTag del login anterior, o usar uno por defecto
    fallbackTag = '2c23fa0f-d1c4-4000-96da-bc769ff27a17'; // Fallback por defecto
    
    const authResult = await processAuthLink(authLink, fallbackTag, email);
    
    if (!authResult.success) {
        console.log(c('red', `❌ Error en autenticación: ${authResult.error}`));
        return;
    }
    
    // Extraer todos los datos
    console.log('\n📊 Fase 3: Extrayendo todos los datos...');
    const userData = await extractAllUserData(authResult.tokens, email);
    
    // Guardar datos
    console.log('\n💾 Fase 4: Guardando datos...');
    const userFolder = await saveUserData(userData);
    
    console.log(c('green', '\n🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!'));
    console.log(`📁 Todos los datos del usuario ${email} han sido extraídos y guardados`);
    console.log(`📂 Ubicación: ${userFolder}`);
    
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Revisa los archivos generados');
    console.log('2. Los tokens quedan guardados para reutilizar');
    console.log('3. Puedes ejecutar este script con otros emails');
}

// Ejecutar
main().catch(console.error);