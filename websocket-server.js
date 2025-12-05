const { WebSocketServer } = require('ws')
const WebSocket = require('ws')
// Importar fetch de forma dinámica para node-fetch v3
let fetch

// Estado del servidor
let smsConnection = null
let lastSMSData = null
let clients = new Set()
let processedSessions = new Map() // Para evitar duplicados con timestamp

// Importar fetch dinámicamente
async function initializeFetch() {
  const { default: nodeFetch } = await import('node-fetch')
  fetch = nodeFetch
}

console.log('🚀 Iniciando WebSocket Server...')

// Inicializar fetch al arrancar
initializeFetch().catch(console.error)

// Crear servidor WebSocket en el puerto que Railway asigne
const port = process.env.PORT || 8080
const wss = new WebSocketServer({ port, host: '0.0.0.0' })
console.log(`🌐 WebSocket Server corriendo en puerto ${port}`)
console.log(`🔗 Railway URL se generará automáticamente`)

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
    
    smsConnection.onmessage = async (event) => {
      // Solo procesar datos reales
      if (event.data && event.data !== '{}' && event.data.trim() !== '') {
        try {
          const testData = JSON.parse(event.data)
          if (testData.N && testData.D && Array.isArray(testData.D)) {
            console.log('🏁 DATOS ACTUALIZADOS:', testData.N, '- Pilotos:', testData.D?.length || 0)
            lastSMSData = event.data

            // ❌ DESHABILITADO: recordSessionStats ahora solo guarda JSON local (billing)
            // MongoDB se maneja completamente por captureLapByLapData → race_sessions_v0
            // Esto previene escrituras duplicadas y conflictos de versión
            // await recordSessionStats(testData)

            // ✅ ÚNICO GUARDADO: race_sessions_v0 con estructura V0 completa
            await captureLapByLapData(testData)
            
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

// 📊 FUNCIÓN PARA REGISTRAR ESTADÍSTICAS - DETECTAR [HEAT] NUEVO
async function recordSessionStats(smsData) {
  try {
    const sessionName = smsData.N
    const driversData = smsData.D
    
    console.log(`🔍 DEBUG: Analizando sesión: "${sessionName}"`)
    
    // 💰 SOLO SE COBRA EN CLASIFICACIÓN - CARRERA ES GRATIS/INCLUIDA
    const isHeat = sessionName && sessionName.toLowerCase().includes('heat')
    const isClasificacion = sessionName && sessionName.toLowerCase().includes('clasificacion')
    const isCarrera = sessionName && sessionName.toLowerCase().includes('carrera')
    
    if (!isHeat) {
      console.log(`⏭️ Sesión ignorada (no es HEAT): ${sessionName}`)
      return
    }
    
    if (isCarrera) {
      console.log(`🏁 CARRERA ignorada (incluida/gratis): ${sessionName}`)
      return // No cobrar por carreras, solo por clasificaciones
    }
    
    if (!isClasificacion) {
      console.log(`❓ HEAT sin clasificación ignorado: ${sessionName}`)
      return // Solo registrar clasificaciones
    }
    
    console.log(`✅ CLASIFICACIÓN detectada (SE COBRA): ${sessionName}`)
    
    // Crear identificador único para este HEAT específico
    const sessionId = `${sessionName}_${new Date().toDateString()}`
    console.log(`🆔 ID de sesión: ${sessionId}`)
    
    // Verificar si ya procesamos este HEAT hoy (solo cada 5 minutos para permitir actualizaciones)
    const lastProcessed = processedSessions.get(sessionId)
    const now = Date.now()
    
    if (lastProcessed && (now - lastProcessed) < 300000) { // 5 minutos
      console.log(`⏰ HEAT registrado hace menos de 5 min: ${sessionName}`)
      return // Esperar al menos 5 minutos entre registros del mismo HEAT
    }
    
    // Extraer nombres únicos de conductores del SMS-Timing
    const driverNames = driversData
      .map(driver => driver.N || 'Unknown')
      .filter(name => name && name !== 'Unknown' && name.trim() !== '')
    
    console.log(`👥 Conductores encontrados: ${driverNames.length} - ${driverNames.slice(0, 3).join(', ')}...`)
    
    if (driverNames.length === 0) {
      console.log('⚠️ No hay conductores válidos en este HEAT')
      return
    }
    
    console.log(`📤 Enviando datos a API...`)
    
    // Verificar que fetch esté disponible
    if (!fetch) {
      console.log('⚠️ Fetch no disponible aún, reiniciando en 1s...')
      setTimeout(() => recordSessionStats(smsData), 1000)
      return
    }
    
    // Llamar a la API de estadísticas (usar producción)
    const response = await fetch('https://karteando.cl/api/stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'record_session',
        sessionName: sessionName,
        drivers: driverNames,
        smsData: {
          N: sessionName,
          D: driversData
        }
      })
    })
    
    if (response.ok) {
      processedSessions.set(sessionId, now)
      console.log(`🔥 CLASIFICACIÓN registrada: ${sessionName} - ${driverNames.length} conductores × $17,000`)
    } else {
      const errorText = await response.text()
      console.log('⚠️ Error registrando HEAT:', response.status, errorText)
    }
    
  } catch (error) {
    console.log('⚠️ Error en recordSessionStats:', error.message, error)
  }
}

// 🏁 FUNCIÓN PARA CAPTURAR DATOS EN RACE_SESSIONS_V0
async function captureLapByLapData(smsData) {
  try {
    console.log(`🏁 [V0] Capturando datos en race_sessions_v0: "${smsData.N}" - ${smsData.D.length} pilotos`);

    // Verificar que fetch esté disponible
    if (!fetch) {
      console.log('⚠️ Fetch no disponible para lap capture, esperando...');
      return;
    }

    // Llamar a la API con acción V0 (nueva estructura race_sessions_v0)
    const response = await fetch('https://karteando.cl/api/lap-capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'process_race_data_v0',  // ← CAMBIO CLAVE: usar V0
        sessionData: smsData
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ [V0] Race data processed successfully in race_sessions_v0`);
    } else {
      const errorText = await response.text();
      console.log('⚠️ Error processing race data V0:', response.status, errorText);
    }

  } catch (error) {
    console.log('⚠️ Error en captureLapByLapData:', error.message);
  }
}

console.log('🎯 WebSocket Server listo para conexiones')
console.log('💰 MODO: Clasificaciones se cobran - Carreras incluidas')
console.log('🏁 V0: Guardando en race_sessions_v0 (estructura unificada)')
console.log('✅ SIN DUPLICACIÓN: Una sola escritura por sesión')