const https = require('https');
const fs = require('fs');

// Colors para output
const c = (color, text) => `\x1b[${color === 'green' ? '32' : color === 'red' ? '31' : color === 'yellow' ? '33' : color === 'cyan' ? '36' : '37'}m${text}\x1b[0m`;

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

// Headers base capturados
const BASE_HEADERS = {
    'Host': 'mobile-api22.sms-timing.com',
    'Accept': 'application/json, text/plain, */*',
    'Sec-Fetch-Site': 'cross-site',
    'X-Fast-DeviceToken': '1111111128R3132E257',
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
            let data;
            if (postData instanceof Buffer) {
                data = postData;
                options.headers['Content-Type'] = 'application/octet-stream';
            } else {
                data = JSON.stringify(postData);
                options.headers['Content-Type'] = 'application/json';
            }
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
                        data: data.length > 0 && res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : null,
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
            if (postData instanceof Buffer) {
                req.write(postData);
            } else {
                req.write(JSON.stringify(postData));
            }
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

// Crear imagen de prueba
function generateTestImage() {
    const expandedData = Buffer.alloc(20000);
    for (let i = 0; i < expandedData.length; i++) {
        expandedData[i] = Math.floor(Math.random() * 256);
    }
    return expandedData;
}

async function createAccount(email, firstName, lastName, alias) {
    console.log(c('cyan', '🚀 FASE 1: CREANDO CUENTA BASE'));
    console.log('=' .repeat(50));
    
    const fallbackTag = generateFallbackTag();
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Usuario: ${firstName} "${alias}" ${lastName}`);
    console.log(`🏷️  FallbackTag: ${fallbackTag}`);
    
    try {
        // 1. Verificar email disponible
        console.log('\n1️⃣  Verificando email disponible...');
        const lookupData = {
            "lookupKind": 167,
            "fallbackTag": fallbackTag,
            "userInput": email
        };
        
        const lookupResult = await makeRequest(
            `${BASE_URL}/kiosk/lookup/speedpark?locale=es-419&defaultTemplate=true`,
            'POST',
            lookupData
        );
        
        console.log(`📊 Lookup Status: ${lookupResult.statusCode}`);
        
        if (lookupResult.statusCode !== 404) {
            console.log(c('yellow', '⚠️  Email ya existe o error'));
            return { success: false, error: 'Email no disponible' };
        }
        
        console.log(c('green', '✅ Email disponible'));
        
        // 2. Crear cuenta con questionnaire
        console.log('\n2️⃣  Creando cuenta...');
        const questionnaireData = {
            "source": 1,
            "key": Date.now().toString(),
            "answers": [
                {
                    "questionId": "-67",
                    "pageId": "30806008", 
                    "questionKind": 167,
                    "value": email
                },
                {
                    "questionId": "-74",
                    "pageId": "30806008",
                    "questionKind": 174, 
                    "value": "1995-01-01"
                },
                {
                    "questionId": "-1",
                    "pageId": "30806061",
                    "questionKind": 101,
                    "value": firstName
                },
                {
                    "questionId": "-2", 
                    "pageId": "30806061",
                    "questionKind": 102,
                    "value": lastName
                },
                {
                    "questionId": "-4",
                    "pageId": "30806061", 
                    "questionKind": 104,
                    "value": alias
                },
                {
                    "questionId": "-73",
                    "pageId": "30806061",
                    "questionKind": 173,
                    "value": "Chile",
                    "answerId": "88"
                },
                {
                    "questionId": "-15",
                    "pageId": "30806165",
                    "questionKind": 115, 
                    "value": true
                },
                {
                    "questionId": "-16",
                    "pageId": "30806165",
                    "questionKind": 116,
                    "value": true
                },
                {
                    "questionId": "30806373",
                    "pageId": "30805919",
                    "questionKind": 319,
                    "value": true
                }
            ],
            "surveyId": "30805840",
            "socialNetwork": {
                "kind": 3
            },
            "related": [],
            "tag": fallbackTag
        };
        
        const questionnaireResult = await makeRequest(
            `${BASE_URL}/kiosk/questionnaire/speedpark?locale=es-419`,
            'POST',
            questionnaireData
        );
        
        console.log(`📊 Questionnaire Status: ${questionnaireResult.statusCode}`);
        
        if (questionnaireResult.statusCode !== 200) {
            throw new Error(`Error en questionnaire: ${questionnaireResult.statusCode}`);
        }
        
        const accountData = questionnaireResult.data;
        console.log(c('green', '✅ Cuenta base creada!'));
        console.log(`🆔 PersonID: ${accountData.id}`);
        console.log(`👤 Nombre completo: ${accountData.fullName}`);
        
        // 3. Subir imágenes
        console.log('\n3️⃣  Subiendo imágenes...');
        const personId = accountData.id;
        const waiverSignatureIds = accountData.waiverSignatureIds.join(',');
        
        const testImage1 = generateTestImage();
        const testImage2 = generateTestImage();
        
        // Imagen 1
        const image1Result = await makeRequest(
            `${BASE_URL}/kiosk/picture/speedpark?kind=141&personId=${personId}&waiverSignatureIds=${waiverSignatureIds}`,
            'POST',
            testImage1,
            {
                'ngsw-bypass': '1',
                'Content-Type': 'application/octet-stream'
            }
        );
        
        // Imagen 2  
        const image2Result = await makeRequest(
            `${BASE_URL}/kiosk/picture/speedpark?kind=140&personId=${personId}&waiverSignatureIds=${waiverSignatureIds}`,
            'POST',
            testImage2,
            {
                'ngsw-bypass': '1',
                'Content-Type': 'application/octet-stream'
            }
        );
        
        console.log(`   📸 Imágenes subidas: ${image1Result.statusCode}, ${image2Result.statusCode}`);
        
        return { 
            success: true, 
            accountData, 
            fallbackTag,
            personId: accountData.id 
        };
        
    } catch (error) {
        console.log(c('red', `💥 Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function activateAccount(email) {
    console.log(c('cyan', '\n🔐 FASE 2: ACTIVANDO CUENTA'));
    console.log('=' .repeat(50));
    console.log(`📧 Email: ${email}`);
    
    const fallbackTag = generateFallbackTag();
    console.log(`🏷️  FallbackTag: ${fallbackTag}`);
    
    try {
        // 1. Obtener términos
        console.log('\n1️⃣  Obteniendo términos...');
        const termsResult = await makeRequest(
            `${BASE_URL}/kiosk/terms/speedpark?questionId=30806373`,
            'POST'
        );
        
        console.log(`📊 Terms Status: ${termsResult.statusCode}`);
        
        // 2. Lookup para activar
        console.log('\n2️⃣  Solicitando activación...');
        const lookupData = {
            "lookupKind": 167,
            "fallbackTag": fallbackTag,
            "userInput": email
        };
        
        const lookupResult = await makeRequest(
            `${BASE_URL}/kiosk/lookup/speedpark?locale=es-419&defaultTemplate=true`,
            'POST',
            lookupData
        );
        
        console.log(`📊 Lookup Status: ${lookupResult.statusCode}`);
        
        if (lookupResult.statusCode === 200) {
            const response = lookupResult.data;
            console.log(`📄 Response:`, JSON.stringify(response, null, 2));
            
            if (response.loggedIn === false) {
                console.log(c('green', '✅ Email de activación enviado!'));
                console.log(c('yellow', '📧 Revisa el email para confirmar la cuenta'));
                return { success: true, needsEmailConfirmation: true };
            }
        }
        
        return { success: false, error: `Status inesperado: ${lookupResult.statusCode}` };
        
    } catch (error) {
        console.log(c('red', `💥 Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 SMS-TIMING COMPLETE ACCOUNT FLOW');
    console.log('Creación + Activación automatizada');
    console.log('=' .repeat(80));
    
    const email = process.argv[2];
    const firstName = process.argv[3] || 'Test';
    const lastName = process.argv[4] || 'User';
    const alias = process.argv[5] || `racer${Date.now().toString().slice(-4)}`;
    
    if (!email) {
        console.log(c('red', '❌ Uso: node complete-account-flow.js EMAIL [NOMBRE] [APELLIDO] [ALIAS]'));
        console.log('Ejemplo: node complete-account-flow.js test@gmail.com "Juan" "Perez" "speedking"');
        return;
    }
    
    console.log('📋 DATOS DE LA CUENTA:');
    console.log(`   Email: ${email}`);
    console.log(`   Nombre: ${firstName}`);
    console.log(`   Apellido: ${lastName}`);
    console.log(`   Alias: ${alias}`);
    
    // Fase 1: Crear cuenta
    const createResult = await createAccount(email, firstName, lastName, alias);
    
    if (!createResult.success) {
        console.log(c('red', `❌ Error creando cuenta: ${createResult.error}`));
        return;
    }
    
    console.log(c('green', '🎉 ¡Cuenta base creada exitosamente!'));
    
    // Pausa antes de activar
    console.log('\n⏳ Esperando 3 segundos antes de activar...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Fase 2: Activar cuenta
    const activateResult = await activateAccount(email);
    
    if (activateResult.success) {
        console.log(c('green', '\n🎉 ¡PROCESO COMPLETADO!'));
        console.log('📧 Email de activación enviado');
        console.log('📋 PRÓXIMOS PASOS:');
        console.log('1. Revisa el email de activación');
        console.log('2. Haz clic en el link del email');
        console.log('3. La cuenta quedará 100% activada');
        console.log('4. Podrás hacer login normalmente');
        
        // Guardar datos
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const accountFile = `./complete-accounts/account-${email.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')}-${timestamp}.json`;
        fs.mkdirSync('./complete-accounts', { recursive: true });
        fs.writeFileSync(accountFile, JSON.stringify({
            email: email,
            firstName: firstName,
            lastName: lastName,
            alias: alias,
            createResult: createResult,
            activateResult: activateResult,
            createdAt: new Date().toISOString(),
            status: 'awaiting_email_confirmation'
        }, null, 2));
        
        console.log(`💾 Datos guardados: ${accountFile}`);
        
    } else {
        console.log(c('red', `❌ Error activando cuenta: ${activateResult.error}`));
    }
}

// Ejecutar
main().catch(console.error);