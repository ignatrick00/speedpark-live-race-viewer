const WebSocket = require('ws');

function getTimestamp() {
    return new Date().toISOString();
}

function debugJson(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        console.log('\n🔍 DEBUG - Estructura JSON completa:');
        console.log('=' .repeat(60));
        console.log(JSON.stringify(data, null, 2));
        console.log('=' .repeat(60));
        
        if (data.D && Array.isArray(data.D)) {
            console.log('\n📊 PILOTOS - Campos disponibles:');
            data.D.forEach((driver, index) => {
                console.log(`\nPiloto ${index + 1}: ${driver.N}`);
                console.log(`  - A: ${driver.A} (${driver.A ? (driver.A/1000).toFixed(3) + 's' : 'N/A'})`);
                console.log(`  - B: ${driver.B} (${driver.B ? (driver.B/1000).toFixed(3) + 's' : 'N/A'})`);
                console.log(`  - T: ${driver.T} (${driver.T ? (driver.T/1000).toFixed(3) + 's' : 'N/A'})`);
                console.log(`  - K: ${driver.K} (kart)`);
                console.log(`  - L: ${driver.L} (vuelta)`);
                console.log(`  - P: ${driver.P} (posición)`);
                console.log(`  - G: "${driver.G}" (gap)`);
                console.log(`  - Todos los campos:`, Object.keys(driver));
            });
        }
        
    } catch (error) {
        console.log('❌ Error parseando JSON:', error.message);
        console.log('Raw data:', jsonData);
    }
}

function connectToWebSocket() {
    console.log(`[${getTimestamp()}] 🔍 Iniciando debug del JSON...`);
    
    const ws = new WebSocket('wss://webserver22.sms-timing.com:10015/');
    let messageCount = 0;
    
    ws.on('open', function open() {
        console.log(`[${getTimestamp()}] ✅ Conexión establecida`);
        console.log(`[${getTimestamp()}] 📤 Enviando: START 8501@speedpark`);
        ws.send('START 8501@speedpark');
    });
    
    ws.on('message', function message(data) {
        messageCount++;
        console.log(`\n[${getTimestamp()}] 📨 Mensaje ${messageCount}:`);
        debugJson(data.toString());
        
        if (messageCount >= 3) {
            console.log('\n✅ Debug completado con 3 mensajes');
            ws.close();
        }
    });
    
    ws.on('close', function close(code, reason) {
        console.log(`[${getTimestamp()}] ❌ Conexión cerrada`);
    });
    
    ws.on('error', function error(err) {
        console.log(`[${getTimestamp()}] 💥 Error: ${err.message}`);
    });
}

connectToWebSocket();