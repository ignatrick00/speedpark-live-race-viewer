const WebSocket = require('ws');
const fs = require('fs');

function getTimestamp() {
    return new Date().toISOString();
}

function log(message) {
    const timestamped = `[${getTimestamp()}] ${message}`;
    console.log(timestamped);
    fs.appendFileSync('log.txt', timestamped + '\n');
}

function connectToWebSocket() {
    log('Iniciando conexión WebSocket...');
    
    const ws = new WebSocket('wss://webserver22.sms-timing.com:10015/');
    
    ws.on('open', function open() {
        log('Conexión establecida');
        log('Enviando: START 8501@speedpark');
        ws.send('START 8501@speedpark');
    });
    
    ws.on('message', function message(data) {
        log(`Mensaje recibido: ${data}`);
    });
    
    ws.on('close', function close(code, reason) {
        log(`Conexión cerrada - Código: ${code}, Motivo: ${reason || 'No especificado'}`);
    });
    
    ws.on('error', function error(err) {
        log(`Error de WebSocket: ${err.message}`);
    });
    
    setTimeout(() => {
        log('Cerrando conexión después de 2 minutos...');
        ws.close();
    }, 2 * 60 * 1000);
}

log('=== Iniciando cliente WebSocket ===');
connectToWebSocket();