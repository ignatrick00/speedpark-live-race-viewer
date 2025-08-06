const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors para output
const c = (color, text) => `\x1b[${color === 'green' ? '32' : color === 'red' ? '31' : color === 'yellow' ? '33' : color === 'cyan' ? '36' : '37'}m${text}\x1b[0m`;

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

// Headers base capturados
const BASE_HEADERS = {
    'Host': 'mobile-api22.sms-timing.com',
    'Accept': 'application/json, text/plain, */*',
    'Sec-Fetch-Site': 'cross-site',
    'X-Fast-DeviceToken': '1111111131R39FB795B',
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
                delete options.headers['Content-Type']; // Let browser set for binary
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

// Generar datos de prueba por defecto
function generateTestData(email, customData = {}) {
    const defaults = {
        email: email,
        firstName: 'Test',
        lastName: 'User',
        alias: `racer${Date.now().toString().slice(-4)}`,
        birthDate: '1995-01-01',
        country: 'Chile',
        countryAnswerId: '88'
    };
    
    return { ...defaults, ...customData };
}

// Crear imagen de prueba simple
function generateTestImage() {
    // Crear una imagen PNG de 1x1 pixel simple
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE, // CRC
        0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
        0xE2, 0x21, 0xBC, 0x33, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    // Expandir para hacer más realista (añadir ruido)
    const expandedData = Buffer.alloc(20000);
    for (let i = 0; i < expandedData.length; i++) {
        expandedData[i] = Math.floor(Math.random() * 256);
    }
    
    return expandedData;
}

async function checkEmailAvailability(email, fallbackTag) {
    console.log(c('cyan', '📧 VERIFICANDO DISPONIBILIDAD DE EMAIL'));
    console.log('=' .repeat(50));
    console.log(`📧 Email: ${email}`);
    console.log(`🏷️  FallbackTag: ${fallbackTag}`);
    
    try {
        // Paso 1: OPTIONS preflight
        console.log('\n1️⃣  Enviando OPTIONS preflight...');
        await makeRequest(
            `${BASE_URL}/kiosk/lookup/speedpark?locale=es-419&defaultTemplate=true`,
            'OPTIONS',
            null,
            {
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type,x-fast-accesstoken,x-fast-devicetoken,x-fast-version'
            }
        );
        
        // Paso 2: POST lookup
        console.log('\n2️⃣  Verificando email...');
        const lookupData = {
            "lookupKind": 167,
            "fallbackTag": fallbackTag,
            "userInput": email
        };
        
        const result = await makeRequest(
            `${BASE_URL}/kiosk/lookup/speedpark?locale=es-419&defaultTemplate=true`,
            'POST',
            lookupData
        );
        
        console.log(`📊 Status: ${result.statusCode}`);
        
        if (result.statusCode === 404) {
            console.log(c('green', '✅ Email disponible - se puede crear cuenta'));
            return { available: true, canCreate: true };
        } else if (result.statusCode === 200) {
            console.log(c('yellow', '⚠️  Email ya existe'));
            return { available: false, canCreate: false };
        } else {
            console.log(c('red', `❌ Error inesperado: ${result.statusCode}`));
            return { available: false, canCreate: false, error: `HTTP ${result.statusCode}` };
        }
        
    } catch (error) {
        console.log(c('red', `💥 Error: ${error.message}`));
        return { available: false, canCreate: false, error: error.message };
    }
}

async function createAccount(userData, fallbackTag) {
    console.log(c('cyan', '\n🚀 CREANDO CUENTA NUEVA'));
    console.log('=' .repeat(50));
    console.log(`👤 Usuario: ${userData.firstName} "${userData.alias}" ${userData.lastName}`);
    console.log(`📧 Email: ${userData.email}`);
    
    try {
        // Paso 1: OPTIONS preflight para questionnaire
        console.log('\n1️⃣  Enviando OPTIONS preflight...');
        await makeRequest(
            `${BASE_URL}/kiosk/questionnaire/speedpark?locale=es-419`,
            'OPTIONS',
            null,
            {
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type,x-fast-accesstoken,x-fast-devicetoken,x-fast-version'
            }
        );
        
        // Paso 2: POST questionnaire con datos del usuario
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
        console.log(`📄 Reference: ${accountData.reference.substring(0, 30)}...`);
        
        const personId = accountData.id;
        const waiverSignatureIds = accountData.waiverSignatureIds.join(',');
        
        // Paso 3: Subir imágenes
        console.log('\n3️⃣  Subiendo imágenes...');
        
        const testImage1 = generateTestImage();
        const testImage2 = generateTestImage();
        
        // OPTIONS para primera imagen
        await makeRequest(
            `${BASE_URL}/kiosk/picture/speedpark?kind=141&personId=${personId}&waiverSignatureIds=${waiverSignatureIds}`,
            'OPTIONS',
            null,
            {
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type,ngsw-bypass,x-fast-accesstoken,x-fast-devicetoken,x-fast-version'
            }
        );
        
        // POST primera imagen
        const image1Result = await makeRequest(
            `${BASE_URL}/kiosk/picture/speedpark?kind=141&personId=${personId}&waiverSignatureIds=${waiverSignatureIds}`,
            'POST',
            testImage1,
            {
                'ngsw-bypass': '1',
                'Content-Type': 'application/octet-stream'
            }
        );
        
        console.log(`   📸 Imagen 1 (kind=141): ${image1Result.statusCode} - ${image1Result.rawData}`);
        
        // POST segunda imagen  
        const image2Result = await makeRequest(
            `${BASE_URL}/kiosk/picture/speedpark?kind=140&personId=${personId}&waiverSignatureIds=${waiverSignatureIds}`,
            'POST',
            testImage2,
            {
                'ngsw-bypass': '1',
                'Content-Type': 'application/octet-stream'
            }
        );
        
        console.log(`   📸 Imagen 2 (kind=140): ${image2Result.statusCode} - ${image2Result.rawData}`);
        
        // Paso 4: Verificar cuenta creada
        console.log('\n4️⃣  Verificando cuenta creada...');
        
        const menuResult = await makeRequest(
            `${BASE_URL}/menu/data-inbox-v4/speedpark?deviceLoginState=2`
        );
        
        console.log(`📊 Menu Status: ${menuResult.statusCode}`);
        
        if (menuResult.statusCode === 200 && menuResult.data) {
            const personSummary = menuResult.data.personSummary;
            console.log(c('green', '\n🎉 ¡CUENTA CREADA EXITOSAMENTE!'));
            console.log(`👤 Nombre: ${personSummary.name}`);
            console.log(`🏷️  Alias: ${personSummary.alias}`);
            console.log(`📧 Email: ${personSummary.email}`);
            console.log(`🆔 PersonID: ${personSummary.personId}`);
            
            return {
                success: true,
                accountData: {
                    ...accountData,
                    personSummary: personSummary
                }
            };
        }
        
        return { success: true, accountData };
        
    } catch (error) {
        console.log(c('red', `💥 Error creando cuenta: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 SMS-TIMING AUTOMATED ACCOUNT CREATOR');
    console.log('Sistema automático de creación de cuentas');
    console.log('=' .repeat(80));
    
    // Obtener email y datos del usuario
    const email = process.argv[2];
    
    if (!email) {
        console.log(c('red', '❌ Uso: node automated-account-creator.js EMAIL [NOMBRE] [APELLIDO] [ALIAS]'));
        console.log('Ejemplo: node automated-account-creator.js test@gmail.com "Juan" "Perez" "speedracer"');
        return;
    }
    
    const userData = generateTestData(email, {
        firstName: process.argv[3] || 'Test',
        lastName: process.argv[4] || 'User', 
        alias: process.argv[5] || `racer${Date.now().toString().slice(-4)}`
    });
    
    console.log('📋 DATOS DEL USUARIO:');
    Object.entries(userData).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    
    const fallbackTag = generateFallbackTag();
    console.log(`\n🏷️  FallbackTag generado: ${fallbackTag}`);
    
    // Paso 1: Verificar disponibilidad del email
    console.log('\n📧 Fase 1: Verificando disponibilidad del email...');
    const availabilityCheck = await checkEmailAvailability(email, fallbackTag);
    
    if (!availabilityCheck.canCreate) {
        if (availabilityCheck.error) {
            console.log(c('red', `❌ Error: ${availabilityCheck.error}`));
        } else {
            console.log(c('yellow', '⚠️  El email ya está registrado'));
        }
        return;
    }
    
    // Paso 2: Crear cuenta
    console.log('\n🚀 Fase 2: Creando cuenta...');
    const createResult = await createAccount(userData, fallbackTag);
    
    if (createResult.success) {
        // Guardar datos de la cuenta creada
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const accountFile = `./created-accounts/account-${email.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')}-${timestamp}.json`;
        fs.mkdirSync('./created-accounts', { recursive: true });
        fs.writeFileSync(accountFile, JSON.stringify({
            email: email,
            userData: userData,
            fallbackTag: fallbackTag,
            accountData: createResult.accountData,
            createdAt: new Date().toISOString()
        }, null, 2));
        
        console.log(c('green', '\n🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!'));
        console.log(`📁 Datos guardados: ${accountFile}`);
        console.log('\n📋 PRÓXIMOS PASOS:');
        console.log('1. La cuenta está lista para usar');
        console.log('2. Puedes hacer login con: node user-data-extractor.js EMAIL');
        console.log('3. O usar la cuenta directamente en la app móvil');
        
    } else {
        console.log(c('red', `❌ Error creando cuenta: ${createResult.error}`));
    }
}

// Ejecutar
main().catch(console.error);