const { WebSocketServer } = require('ws')
const WebSocket = require('ws')

// Estado del servidor
let smsConnection = null
let lastSMSData = null
let clients = new Set()

console.log('🚀 Iniciando WebSocket Server...')

// Crear servidor WebSocket en puerto 8080 (escuchar en todas las interfaces)
const wss = new WebSocketServer({ port: 8080, host: '0.0.0.0' })
console.log('🌐 WebSocket Server corriendo en puerto 8080 (accesible desde la red)')
console.log('🔗 PC: ws://localhost:8080')
console.log('📱 Móvil: ws://192.168.1.135:8080')

// Conectar a SMS-Timing
function connectToSMSTiming() {
  if (smsConnection?.readyState === WebSocket.OPEN) {
    return // Ya conectado
  }

  try {
    console.log('🔗 Conectando a SMS-Timing...')
    smsConnection = new WebSocket('wss://webserver22.sms-timing.com:10015/')
    
    smsConnection.onopen = () => {
      console.log('✅ Conectado a SMS-Timing')
      setTimeout(() => {
        smsConnection?.send('START 8501@speedpark')
        console.log('📤 Comando enviado: START 8501@speedpark')
      }, 1000)
    }
    
    smsConnection.onmessage = (event) => {
      // Solo procesar datos reales
      if (event.data && event.data !== '{}' && event.data.trim() !== '') {
        try {
          const testData = JSON.parse(event.data)
          if (testData.N && testData.D) {
            console.log('🏁 DATOS ACTUALIZADOS:', testData.N, '- Pilotos:', testData.D?.length || 0)
            lastSMSData = event.data
            
            // Enviar a todos los clientes conectados
            clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(event.data)
              }
            })
          }
        } catch {
          // Si no es JSON válido, ignorar
        }
      }
    }
    
    smsConnection.onclose = () => {
      console.log('❌ SMS-Timing desconectado, reintentando en 5s...')
      setTimeout(connectToSMSTiming, 5000)
    }
    
    smsConnection.onerror = (error) => {
      console.error('💥 Error SMS-Timing:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Error conectando SMS-Timing:', error.message)
    setTimeout(connectToSMSTiming, 5000)
  }
}

// Manejar conexiones de clientes
wss.on('connection', (ws, request) => {
  console.log('👤 Cliente WebSocket conectado desde:', request.socket.remoteAddress)
  clients.add(ws)
  
  // Enviar datos iniciales si existen
  if (lastSMSData) {
    ws.send(lastSMSData)
    console.log('📨 Datos iniciales enviados al cliente')
  }
  
  // Manejar mensajes del cliente
  ws.on('message', (message) => {
    const msg = message.toString()
    if (msg === 'REQUEST_DATA' && lastSMSData) {
      ws.send(lastSMSData)
    }
  })
  
  // Limpiar al desconectar
  ws.on('close', () => {
    console.log('👋 Cliente WebSocket desconectado')
    clients.delete(ws)
  })
  
  // Manejar errores
  ws.on('error', (error) => {
    console.error('💥 Error cliente WebSocket:', error.message)
    clients.delete(ws)
  })
})

// Inicializar conexión a SMS-Timing
connectToSMSTiming()

// Heartbeat para mantener conexiones vivas
setInterval(() => {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping()
    } else {
      clients.delete(client)
    }
  })
}, 30000)

console.log('🎯 WebSocket Server listo para conexiones')