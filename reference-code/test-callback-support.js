const https = require('https');

// Colors para output
const c = (color, text) => `\x1b[${color === 'green' ? '32' : color === 'red' ? '31' : color === 'yellow' ? '33' : color === 'cyan' ? '36' : '37'}m${text}\x1b[0m`;

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

// Headers base
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
                    const parsedData = data ? JSON.parse(data) : null;
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsedData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (postData && method === 'POST') {
            req.write(JSON.stringify(postData));
        }
        
        req.end();
    });
}

function generateFallbackTag() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function testCallbackSupport() {
    console.log('🔍 INVESTIGANDO SOPORTE DE CALLBACKS EN SMS-TIMING');
    console.log('=' .repeat(60));
    
    const testEmail = 'icabreraquezada@gmail.com'; // Email válido registrado
    const fallbackTag = generateFallbackTag();
    
    // Test 1: Request normal (baseline)
    console.log('\n📊 TEST 1: Request normal (baseline)');
    try {
        const result1 = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
            'POST',
            {
                "fallbackTag": fallbackTag,
                "userInput": testEmail
            }
        );
        
        console.log(`   Status: ${result1.statusCode}`);
        console.log(`   Response: ${JSON.stringify(result1.data, null, 2)}`);
    } catch (error) {
        console.log(c('red', `   Error: ${error.message}`));
    }
    
    // Test 2: Con parámetro callbackUrl en body
    console.log('\n📊 TEST 2: Con callbackUrl en body');
    try {
        const result2 = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
            'POST',
            {
                "fallbackTag": fallbackTag,
                "userInput": testEmail,
                "callbackUrl": "https://speedpark-viewer.com/auth/callback"
            }
        );
        
        console.log(`   Status: ${result2.statusCode}`);
        console.log(`   Response: ${JSON.stringify(result2.data, null, 2)}`);
    } catch (error) {
        console.log(c('red', `   Error: ${error.message}`));
    }
    
    // Test 3: Con parámetro redirectUrl en body
    console.log('\n📊 TEST 3: Con redirectUrl en body');
    try {
        const result3 = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
            'POST',
            {
                "fallbackTag": fallbackTag,
                "userInput": testEmail,
                "redirectUrl": "https://speedpark-viewer.com/auth/callback"
            }
        );
        
        console.log(`   Status: ${result3.statusCode}`);
        console.log(`   Response: ${JSON.stringify(result3.data, null, 2)}`);
    } catch (error) {
        console.log(c('red', `   Error: ${error.message}`));
    }
    
    // Test 4: Con parámetro en query string
    console.log('\n📊 TEST 4: Con callback en query string');
    try {
        const result4 = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true&callbackUrl=https://speedpark-viewer.com/auth/callback`,
            'POST',
            {
                "fallbackTag": fallbackTag,
                "userInput": testEmail
            }
        );
        
        console.log(`   Status: ${result4.statusCode}`);
        console.log(`   Response: ${JSON.stringify(result4.data, null, 2)}`);
    } catch (error) {
        console.log(c('red', `   Error: ${error.message}`));
    }
    
    // Test 5: Con header personalizado
    console.log('\n📊 TEST 5: Con header X-Callback-URL');
    try {
        const result5 = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark?defaultTemplate=true`,
            'POST',
            {
                "fallbackTag": fallbackTag,
                "userInput": testEmail
            },
            {
                'X-Callback-URL': 'https://speedpark-viewer.com/auth/callback'
            }
        );
        
        console.log(`   Status: ${result5.statusCode}`);
        console.log(`   Response: ${JSON.stringify(result5.data, null, 2)}`);
    } catch (error) {
        console.log(c('red', `   Error: ${error.message}`));
    }
    
    // Test 6: Con template personalizado
    console.log('\n📊 TEST 6: Sin defaultTemplate');
    try {
        const result6 = await makeRequest(
            `${BASE_URL}/login/basiclogin/speedpark`,
            'POST',
            {
                "fallbackTag": fallbackTag,
                "userInput": testEmail,
                "templateUrl": "https://speedpark-viewer.com/auth/callback"
            }
        );
        
        console.log(`   Status: ${result6.statusCode}`);
        console.log(`   Response: ${JSON.stringify(result6.data, null, 2)}`);
    } catch (error) {
        console.log(c('red', `   Error: ${error.message}`));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 ANÁLISIS COMPLETO');
    console.log('Revisar las respuestas para identificar si algún parámetro fue aceptado');
}

// Ejecutar tests
testCallbackSupport().catch(console.error);