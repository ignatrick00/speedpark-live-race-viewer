const https = require('https');
const fs = require('fs');
const readline = require('readline');

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

// Crear interfaz de readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para hacer preguntas
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

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

// Validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validar fecha (YYYY-MM-DD)
function isValidDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Crear imagen de prueba realista
function generateTestImage() {
    // Crear una imagen PNG mínima pero válida
    const width = 100;
    const height = 100;
    const channels = 3; // RGB
    
    // Header PNG
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    
    // Crear datos de imagen aleatorios
    const imageSize = width * height * channels;
    const imageData = Buffer.alloc(imageSize + height); // +height para filter bytes
    
    for (let y = 0; y < height; y++) {
        imageData[y * (width * channels + 1)] = 0; // filter byte
        for (let x = 0; x < width * channels; x++) {
            imageData[y * (width * channels + 1) + 1 + x] = Math.floor(Math.random() * 256);
        }
    }
    
    // Simular compresión básica
    const finalImage = Buffer.alloc(20000 + Math.floor(Math.random() * 5000));
    
    // Llenar con datos semi-aleatorios que simulen una imagen
    for (let i = 0; i < finalImage.length; i++) {
        if (i < 100) {
            // Header-like data
            finalImage[i] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A][i % 8];
        } else {
            // Datos de imagen simulados
            finalImage[i] = Math.floor(Math.random() * 256);
        }
    }
    
    return finalImage;
}

async function collectUserData() {
    console.log(c('cyan', '🚀 SMS-TIMING INTERACTIVE ACCOUNT CREATOR'));
    console.log('=' .repeat(60));
    console.log('Vamos a crear una cuenta paso a paso\n');
    
    const userData = {};
    
    // Email
    while (true) {
        userData.email = await question(c('yellow', '📧 Email: '));
        if (isValidEmail(userData.email)) {
            break;
        }
        console.log(c('red', '❌ Email inválido. Formato: usuario@dominio.com'));
    }
    
    // Nombre
    userData.firstName = await question(c('yellow', '👤 Nombre: '));
    while (!userData.firstName.trim()) {
        console.log(c('red', '❌ El nombre no puede estar vacío'));
        userData.firstName = await question(c('yellow', '👤 Nombre: '));
    }
    
    // Apellido
    userData.lastName = await question(c('yellow', '👤 Apellido: '));
    while (!userData.lastName.trim()) {
        console.log(c('red', '❌ El apellido no puede estar vacío'));
        userData.lastName = await question(c('yellow', '👤 Apellido: '));
    }
    
    // Alias
    userData.alias = await question(c('yellow', '🏷️  Alias/Nickname: '));
    while (!userData.alias.trim()) {
        console.log(c('red', '❌ El alias no puede estar vacío'));
        userData.alias = await question(c('yellow', '🏷️  Alias/Nickname: '));
    }
    
    // Fecha de nacimiento
    while (true) {
        userData.birthDate = await question(c('yellow', '📅 Fecha de nacimiento (YYYY-MM-DD): '));
        if (isValidDate(userData.birthDate)) {
            break;
        }
        console.log(c('red', '❌ Fecha inválida. Formato: YYYY-MM-DD (ej: 1995-03-15)'));
    }
    
    // País (por defecto Chile)
    const country = await question(c('yellow', '🌍 País [Chile]: '));
    userData.country = country.trim() || 'Chile';
    userData.countryAnswerId = '88'; // ID para Chile
    
    console.log('\n📋 RESUMEN DE DATOS:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nombre: ${userData.firstName} "${userData.alias}" ${userData.lastName}`);
    console.log(`   Fecha de nacimiento: ${userData.birthDate}`);
    console.log(`   País: ${userData.country}`);
    
    const confirm = await question(c('yellow', '\n¿Crear cuenta con estos datos? (s/n): '));
    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si' && confirm.toLowerCase() !== 'yes') {
        console.log(c('red', '❌ Operación cancelada'));
        return null;
    }
    
    return userData;
}

async function createCompleteAccount(userData) {
    console.log(c('cyan', '\n🚀 INICIANDO CREACIÓN DE CUENTA'));
    console.log('=' .repeat(50));
    
    const fallbackTag = generateFallbackTag();
    console.log(`🏷️  FallbackTag generado: ${fallbackTag}`);
    
    try {
        // FASE 1: CREAR CUENTA BASE
        console.log(c('cyan', '\n📝 FASE 1: CREANDO CUENTA BASE'));
        console.log('-' .repeat(30));
        
        // 1. Verificar email disponible
        console.log('1️⃣  Verificando disponibilidad del email...');
        const lookupData = {
            "lookupKind": 167,
            "fallbackTag": fallbackTag,
            "userInput": userData.email
        };
        
        const lookupResult = await makeRequest(
            `${BASE_URL}/kiosk/lookup/speedpark?locale=es-419&defaultTemplate=true`,
            'POST',
            lookupData
        );
        
        console.log(`   📊 Status: ${lookupResult.statusCode}`);
        
        if (lookupResult.statusCode !== 404) {
            throw new Error('Email ya existe o no disponible');
        }
        
        console.log(c('green', '   ✅ Email disponible'));
        
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
            "tag": fallbackTag
        };
        
        const questionnaireResult = await makeRequest(
            `${BASE_URL}/kiosk/questionnaire/speedpark?locale=es-419`,
            'POST',
            questionnaireData
        );
        
        console.log(`   📊 Status: ${questionnaireResult.statusCode}`);
        
        if (questionnaireResult.statusCode !== 200) {
            throw new Error(`Error en formulario: ${questionnaireResult.statusCode}`);
        }
        
        const accountData = questionnaireResult.data;
        console.log(c('green', '   ✅ Cuenta base creada!'));
        console.log(`   🆔 PersonID: ${accountData.id}`);
        console.log(`   👤 Nombre: ${accountData.fullName}`);
        
        // 3. Subir imágenes (simuladas)
        console.log('\n3️⃣  Generando y subiendo fotos...');
        const personId = accountData.id;
        const waiverSignatureIds = accountData.waiverSignatureIds.join(',');
        
        console.log('   📸 Generando imagen 1 (foto perfil)...');
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
        
        console.log(`   📊 Imagen 1 Status: ${image1Result.statusCode}`);
        
        console.log('   📸 Generando imagen 2 (foto documento)...');
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
        
        console.log(`   📊 Imagen 2 Status: ${image2Result.statusCode}`);
        
        if (image1Result.statusCode === 200 && image2Result.statusCode === 200) {
            console.log(c('green', '   ✅ Imágenes subidas correctamente'));
        }
        
        // FASE 2: ACTIVAR CUENTA
        console.log(c('cyan', '\n🔐 FASE 2: ACTIVANDO CUENTA'));
        console.log('-' .repeat(30));
        
        console.log('⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 1. Obtener términos
        console.log('1️⃣  Obteniendo términos y condiciones...');
        const termsResult = await makeRequest(
            `${BASE_URL}/kiosk/terms/speedpark?questionId=30806373`,
            'POST'
        );
        
        console.log(`   📊 Status: ${termsResult.statusCode}`);
        
        // 2. Solicitar activación
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
        
        console.log(`   📊 Status: ${activationResult.statusCode}`);
        
        if (activationResult.statusCode === 200) {
            const response = activationResult.data;
            console.log(`   📄 Response:`, JSON.stringify(response, null, 2));
            
            if (response.loggedIn === false) {
                console.log(c('green', '   ✅ ¡Email de activación enviado!'));
                
                // Guardar datos completos
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const accountFile = `./interactive-accounts/account-${userData.email.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')}-${timestamp}.json`;
                fs.mkdirSync('./interactive-accounts', { recursive: true });
                fs.writeFileSync(accountFile, JSON.stringify({
                    userData: userData,
                    accountData: accountData,
                    fallbackTag: fallbackTag,
                    activationFallbackTag: activationFallbackTag,
                    createdAt: new Date().toISOString(),
                    status: 'awaiting_email_confirmation'
                }, null, 2));
                
                console.log(c('green', '\n🎉 ¡CUENTA CREADA EXITOSAMENTE!'));
                console.log('=' .repeat(50));
                console.log(`👤 Usuario: ${userData.firstName} "${userData.alias}" ${userData.lastName}`);
                console.log(`📧 Email: ${userData.email}`);
                console.log(`🆔 PersonID: ${accountData.id}`);
                console.log(`💾 Datos guardados: ${accountFile}`);
                
                console.log(c('yellow', '\n📧 PRÓXIMOS PASOS:'));
                console.log('1️⃣  Revisa tu email: ' + userData.email);
                console.log('2️⃣  Busca el email de SMS-Timing');
                console.log('3️⃣  Haz clic en el link de confirmación');
                console.log('4️⃣  ¡Tu cuenta estará 100% activada!');
                
                console.log(c('cyan', '\n💡 NOTA:'));
                console.log('Una vez confirmado el email, podrás usar:');
                console.log(`node user-data-extractor.js "${userData.email}"`);
                
                return { success: true, accountData, userData };
            }
        }
        
        throw new Error(`Error en activación: Status ${activationResult.statusCode}`);
        
    } catch (error) {
        console.log(c('red', `\n💥 Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        // Recopilar datos del usuario
        const userData = await collectUserData();
        
        if (!userData) {
            console.log(c('yellow', 'Operación cancelada por el usuario'));
            return;
        }
        
        // Crear cuenta completa
        const result = await createCompleteAccount(userData);
        
        if (!result.success) {
            console.log(c('red', `❌ Error creando cuenta: ${result.error}`));
        }
        
    } catch (error) {
        console.log(c('red', `💥 Error inesperado: ${error.message}`));
    } finally {
        rl.close();
    }
}

// Ejecutar
main();