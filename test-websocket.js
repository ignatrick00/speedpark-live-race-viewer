const WebSocket = require('ws');

const wsUrl = 'wss://rom3v84xzg.execute-api.us-east-1.amazonaws.com/production';

console.log('🔗 Conectando al WebSocket:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ Conectado al WebSocket exitosamente!');
  
  // Test 1: Join a session
  console.log('📤 Enviando mensaje de join...');
  ws.send(JSON.stringify({
    action: 'join',
    sessionName: 'test-session'
  }));
  
  // Test 2: Send a broadcast after 2 seconds
  setTimeout(() => {
    console.log('📤 Enviando mensaje de broadcast...');
    ws.send(JSON.stringify({
      action: 'broadcast',
      sessionName: 'test-session',
      message: {
        type: 'test',
        data: 'Mensaje de prueba desde Node.js'
      }
    }));
  }, 2000);
  
  // Close after 5 seconds
  setTimeout(() => {
    console.log('🔌 Cerrando conexión...');
    ws.close();
  }, 5000);
});

ws.on('message', function message(data) {
  console.log('📥 Mensaje recibido:', JSON.parse(data.toString()));
});

ws.on('error', function error(err) {
  console.error('❌ Error de WebSocket:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 Conexión cerrada:', code, reason.toString());
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Cerrando prueba...');
  ws.close();
  process.exit(0);
});