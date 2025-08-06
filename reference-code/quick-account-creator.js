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

async function createCompleteAccount(userData) {
    console.log(c('cyan', '🚀 CREANDO CUENTA COMPLETA'));
    console.log('=' .repeat(50));
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Usuario: ${userData.firstName} "${userData.alias}" ${userData.lastName}`);
    console.log(`📅 Nacimiento: ${userData.birthDate}`);
    console.log(`🏷️  FallbackTag: ${userData.fallbackTag}`);
    
    try {
        // FASE 1: CREAR CUENTA BASE
        console.log(c('cyan', '\n📝 FASE 1: CREANDO CUENTA BASE'));
        console.log('-' .repeat(30));
        
        // 1. Verificar email disponible
        console.log('1️⃣  Verificando disponibilidad del email...');
        const lookupData = {
            "lookupKind": 167,
            "fallbackTag": userData.fallbackTag,
            "userInput": userData.email
        };
        
        const lookupResult = await makeRequest(
            `${BASE_URL}/kiosk/lookup/speedpark?locale=es-419&defaultTemplate=true`,
            'POST',
            lookupData
        );
        
        console.log(`   📊 Status: ${lookupResult.statusCode}`);
        
        if (lookupResult.statusCode !== 404) {
            if (lookupResult.statusCode === 200) {
                console.log(c('yellow', '   ⚠️  Email ya existe - puede estar registrado'));
                console.log('   📄 Response:', JSON.stringify(lookupResult.data, null, 2));
            }
            throw new Error(`Email no disponible o error: ${lookupResult.statusCode}`);
        }
        
        console.log(c('green', '   ✅ Email disponible para registro'));
        
        // 2. Crear cuenta con questionnaire
        console.log('\n2️⃣  Enviando formulario de registro...');
        const questionnaireData = {
            "source": 1,
            "key": Date.now().toString(),
            "answers": [
                {
                    "questionId": "-67",
                    "pageId": "30806008", 
                    "questionKind": 167,
                    "value": userData.email
                },
                {
                    "questionId": "-74",
                    "pageId": "30806008",
                    "questionKind": 174, 
                    "value": userData.birthDate
                },
                {
                    "questionId": "-1",
                    "pageId": "30806061",
                    "questionKind": 101,
                    "value": userData.firstName
                },
                {
                    "questionId": "-2", 
                    "pageId": "30806061",
                    "questionKind": 102,
                    "value": userData.lastName
                },
                {
                    "questionId": "-4",
                    "pageId": "30806061", 
                    "questionKind": 104,
                    "value": userData.alias
                },
                {
                    "questionId": "-73",
                    "pageId": "30806061",
                    "questionKind": 173,
                    "value": userData.country,
                    "answerId": userData.countryAnswerId
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
            "tag": userData.fallbackTag
        };
        
        const questionnaireResult = await makeRequest(
            `${BASE_URL}/kiosk/questionnaire/speedpark?locale=es-419`,
            'POST',
            questionnaireData
        );
        
        console.log(`   📊 Status: ${questionnaireResult.statusCode}`);
        
        if (questionnaireResult.statusCode !== 200) {
            console.log(`   ❌ Error en formulario: ${questionnaireResult.rawData}`);
            throw new Error(`Error en formulario: ${questionnaireResult.statusCode}`);
        }
        
        const accountData = questionnaireResult.data;
        console.log(c('green', '   ✅ ¡Cuenta base creada exitosamente!'));
        console.log(`   🆔 PersonID: ${accountData.id}`);
        console.log(`   👤 Nombre completo: ${accountData.fullName}`);
        console.log(`   📧 Email: ${accountData.email}`);
        
        // 3. Subir imágenes
        console.log('\n3️⃣  Subiendo fotos...');
        const personId = accountData.id;
        const waiverSignatureIds = accountData.waiverSignatureIds.join(',');
        
        console.log('   📸 Subiendo imagen 1 (kind=141)...');
        const testImage1 = generateTestImage();
        
        const image1Result = await makeRequest(
            `${BASE_URL}/kiosk/picture/speedpark?kind=141&personId=${personId}&waiverSignatureIds=${waiverSignatureIds}`,
            'POST',
            testImage1,
            {
                'ngsw-bypass': '1',
                'Content-Type': 'application/octet-stream'
            }
        );
        
        console.log(`   📊 Imagen 1 Status: ${image1Result.statusCode} - ${image1Result.rawData}`);
        
        console.log('   📸 Subiendo imagen 2 (kind=140)...');
        const testImage2 = generateTestImage();
        
        const image2Result = await makeRequest(
            `${BASE_URL}/kiosk/picture/speedpark?kind=140&personId=${personId}&waiverSignatureIds=${waiverSignatureIds}`,
            'POST',
            testImage2,
            {
                'ngsw-bypass': '1',
                'Content-Type': 'application/octet-stream'
            }
        );
        
        console.log(`   📊 Imagen 2 Status: ${image2Result.statusCode} - ${image2Result.rawData}`);
        
        if (image1Result.statusCode === 200 && image2Result.statusCode === 200) {
            console.log(c('green', '   ✅ Imágenes subidas correctamente'));
        }
        
        // FASE 2: ACTIVAR CUENTA
        console.log(c('cyan', '\n🔐 FASE 2: SOLICITANDO ACTIVACIÓN'));
        console.log('-' .repeat(30));
        
        console.log('⏳ Esperando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 1. Obtener términos
        console.log('1️⃣  Obteniendo términos y condiciones...');
        const termsResult = await makeRequest(
            `${BASE_URL}/kiosk/terms/speedpark?questionId=30806373`,
            'POST'
        );
        
        console.log(`   📊 Terms Status: ${termsResult.statusCode}`);
        
        // 2. Solicitar activación (lookup con cuenta existente)
        console.log('\n2️⃣  Solicitando email de activación...');
        const activationFallbackTag = generateFallbackTag();
        const activationLookupData = {
            "lookupKind": 167,
            "fallbackTag": activationFallbackTag,
            "userInput": userData.email
        };
        
        const activationResult = await makeRequest(
            `${BASE_URL}/kiosk/lookup/speedpark?locale=es-419&defaultTemplate=true`,
            'POST',
            activationLookupData
        );
        
        console.log(`   📊 Activation Status: ${activationResult.statusCode}`);
        
        if (activationResult.statusCode === 200) {
            const response = activationResult.data;
            console.log(`   📄 Response:`, JSON.stringify(response, null, 2));
            
            if (response && response.loggedIn === false) {
                console.log(c('green', '   🎉 ¡EMAIL DE ACTIVACIÓN ENVIADO!'));
                
                // Guardar datos completos
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const accountFile = `./quick-accounts/account-${userData.email.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')}-${timestamp}.json`;
                fs.mkdirSync('./quick-accounts', { recursive: true });
                fs.writeFileSync(accountFile, JSON.stringify({
                    userData: userData,
                    accountData: accountData,
                    activationFallbackTag: activationFallbackTag,
                    createdAt: new Date().toISOString(),
                    status: 'awaiting_email_confirmation'
                }, null, 2));
                
                console.log(c('green', '\n🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!'));
                console.log('=' .repeat(60));
                console.log(`👤 Usuario: ${userData.firstName} "${userData.alias}" ${userData.lastName}`);
                console.log(`📧 Email: ${userData.email}`);
                console.log(`🆔 PersonID: ${accountData.id}`);
                console.log(`💾 Datos guardados: ${accountFile}`);
                
                console.log(c('yellow', '\n📧 PRÓXIMOS PASOS:'));
                console.log(`1️⃣  Revisa el email: ${userData.email}`);
                console.log('2️⃣  Busca email de SMS-Timing SpeedPark');
                console.log('3️⃣  Haz clic en el link de confirmación');
                console.log('4️⃣  ¡Cuenta 100% activada!');
                
                console.log(c('cyan', '\n💡 DESPUÉS DE CONFIRMAR EMAIL:'));
                console.log(`node user-data-extractor.js "${userData.email}"`);
                
                return { success: true, accountData, userData };
                
            } else {
                console.log(c('yellow', '   ⚠️  Respuesta inesperada en activación'));
            }
        } else {
            console.log(c('red', `   ❌ Error en activación: ${activationResult.statusCode}`));
        }
        
        return { success: false, error: `Error en activación: ${activationResult.statusCode}` };
        
    } catch (error) {
        console.log(c('red', `\n💥 Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 SMS-TIMING QUICK ACCOUNT CREATOR');
    console.log('Creación rápida de cuenta con parámetros');
    console.log('=' .repeat(80));
    
    // Leer parámetros
    const email = process.argv[2];
    const firstName = process.argv[3] || 'Test';
    const lastName = process.argv[4] || 'User';
    const alias = process.argv[5] || `racer${Date.now().toString().slice(-4)}`;
    const birthDate = process.argv[6] || '1995-01-01';
    
    if (!email) {
        console.log(c('red', '❌ Uso: node quick-account-creator.js EMAIL [NOMBRE] [APELLIDO] [ALIAS] [FECHA]'));
        console.log('Ejemplo: node quick-account-creator.js doctor@gmail.com "Juan" "Perez" "speedking" "1990-05-15"');
        return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log(c('red', '❌ Email inválido'));
        return;
    }
    
    const userData = {
        email: email,
        firstName: firstName,
        lastName: lastName,
        alias: alias,
        birthDate: birthDate,
        country: 'Chile',
        countryAnswerId: '88',
        fallbackTag: generateFallbackTag()
    };
    
    console.log('📋 DATOS DE LA CUENTA:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nombre: ${userData.firstName} "${userData.alias}" ${userData.lastName}`);
    console.log(`   Fecha nacimiento: ${userData.birthDate}`);
    console.log(`   País: ${userData.country}`);
    
    const result = await createCompleteAccount(userData);
    
    if (!result.success) {
        console.log(c('red', `❌ Error final: ${result.error}`));
    }
}

// Ejecutar
main().catch(console.error);