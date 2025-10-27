const { WebSocketServer } = require('ws')
const WebSocket = require('ws')
// Importar fetch de forma dinámica para node-fetch v3
let fetch

// Estado del servidor
let smsConnection = null
let lastSMSData = null
let clients = new Set()
let processedSessions = new Map() // Para evitar duplicados con timestamp

// 🧠 IN-MEMORY SESSION STORAGE - Reduce MongoDB writes by 100x
const activeSessions = new Map() // sessionId -> { sessionName, karts: Map(kartNumber -> lastLapCount), lastPersist, stats }
const BACKUP_PERSIST_INTERVAL = 2 * 60 * 1000 // 2 minutes backup persistence

// Importar fetch dinámicamente
async function initializeFetch() {
  const { default: nodeFetch } = await import('node-fetch')
  fetch = nodeFetch
}

console.log('🚀 Iniciando WebSocket Server...')

// Inicializar fetch al arrancar
initializeFetch().catch(console.error)

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
    
    smsConnection.onmessage = async (event) => {
      // Solo procesar datos reales
      if (event.data && event.data !== '{}' && event.data.trim() !== '') {
        try {
          const testData = JSON.parse(event.data)
          if (testData.N && testData.D && Array.isArray(testData.D)) {
            console.log('🏁 DATOS ACTUALIZADOS:', testData.N, '- Pilotos:', testData.D?.length || 0)
            lastSMSData = event.data
            
            // 📊 REGISTRAR ESTADÍSTICAS AUTOMÁTICAMENTE - USAR DATOS PARSEADOS
            await recordSessionStats(testData)
            
            // 🏁 CAPTURAR DATOS LAP-BY-LAP VUELTA POR VUELTA
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

// 💾 BACKUP PERSISTENCE TIMER - Guardar datos en memoria cada 2 minutos
setInterval(async () => {
  const now = Date.now()

  for (const [sessionName, session] of activeSessions) {
    const timeSinceLastPersist = now - session.lastPersist

    // Solo persistir si han pasado al menos 2 minutos
    if (timeSinceLastPersist >= BACKUP_PERSIST_INTERVAL) {
      console.log(`💾 Backup persistence para sesión: ${sessionName}`)

      // Create summary of current session state
      const sessionSummary = {
        sessionName,
        kartsActive: session.karts.size,
        totalLaps: Array.from(session.karts.values()).reduce((sum, laps) => sum + laps, 0),
        timestamp: new Date().toISOString()
      }

      // Update last persist time
      session.lastPersist = now

      console.log(`✅ Backup guardado: ${sessionSummary.kartsActive} karts, ${sessionSummary.totalLaps} vueltas`)
    }
  }

  // Clean up old sessions (>1 hour inactive)
  for (const [sessionName, session] of activeSessions) {
    if (now - session.lastPersist > 60 * 60 * 1000) {
      console.log(`🧹 Limpiando sesión inactiva: ${sessionName}`)
      activeSessions.delete(sessionName)
    }
  }
}, BACKUP_PERSIST_INTERVAL)

// 📊 FUNCIÓN PARA REGISTRAR ESTADÍSTICAS - Solo en inicio/fin de sesión
async function recordSessionStats(smsData) {
  try {
    const sessionName = smsData.N
    const driversData = smsData.D

    // 💰 SOLO SE COBRA EN CLASIFICACIÓN - CARRERA ES GRATIS/INCLUIDA
    const isHeat = sessionName && sessionName.toLowerCase().includes('heat')
    const isClasificacion = sessionName && sessionName.toLowerCase().includes('clasificacion')
    const isCarrera = sessionName && sessionName.toLowerCase().includes('carrera')

    if (!isHeat || isCarrera || !isClasificacion) {
      return // Solo procesar clasificaciones
    }

    // Crear identificador único para este HEAT específico
    const sessionId = `${sessionName}_${new Date().toDateString()}`

    // 🧠 THROTTLE: Solo registrar cada 5 minutos (inicio y actualización final)
    const lastProcessed = processedSessions.get(sessionId)
    const now = Date.now()

    if (lastProcessed && (now - lastProcessed) < 300000) { // 5 minutos
      return // Ya registrado recientemente
    }

    // Extraer nombres únicos de conductores del SMS-Timing
    const driverNames = driversData
      .map(driver => driver.N || 'Unknown')
      .filter(name => name && name !== 'Unknown' && name.trim() !== '')

    if (driverNames.length === 0) {
      return
    }

    console.log(`📊 Registrando sesión: ${sessionName} - ${driverNames.length} conductores`)

    // Verificar que fetch esté disponible
    if (!fetch) {
      console.log('⚠️ Fetch no disponible aún, reiniciando en 1s...')
      setTimeout(() => recordSessionStats(smsData), 1000)
      return
    }

    // Llamar a la API de estadísticas - SOLO cada 5 minutos
    const response = await fetch('http://localhost:3000/api/stats', {
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
      console.log(`✅ CLASIFICACIÓN registrada: ${sessionName} - ${driverNames.length} conductores × $17,000`)
    } else {
      const errorText = await response.text()
      console.log('⚠️ Error registrando HEAT:', response.status, errorText)
    }

  } catch (error) {
    console.log('⚠️ Error en recordSessionStats:', error.message, error)
  }
}

// 🧠 DETECTAR VUELTA COMPLETA - Solo guardar cuando el piloto cruza meta
function detectLapCompletions(smsData) {
  const sessionName = smsData.N
  const driversData = smsData.D

  if (!sessionName || !driversData) return []

  // Get or create session in memory
  let session = activeSessions.get(sessionName)
  if (!session) {
    session = {
      sessionName,
      karts: new Map(), // kartNumber -> lastLapCount
      lastPersist: Date.now(),
      stats: null
    }
    activeSessions.set(sessionName, session)
    console.log(`🆕 Nueva sesión en memoria: ${sessionName}`)
  }

  const completedLaps = []

  // Check each driver for lap completion
  driversData.forEach(driver => {
    const kartNumber = driver.C // Kart number
    const currentLapCount = driver.L || 0 // Current lap count

    if (!kartNumber) return

    const lastLapCount = session.karts.get(kartNumber) || 0

    // Lap completed when lap count increases
    if (currentLapCount > lastLapCount) {
      completedLaps.push({
        kartNumber,
        driverName: driver.N,
        lapNumber: currentLapCount,
        lapTime: driver.LT, // Last lap time
        bestLap: driver.B,  // Best lap
        position: driver.P, // Position
        gap: driver.G       // Gap to leader
      })

      console.log(`🏁 Vuelta completa - Kart ${kartNumber} (${driver.N}): Vuelta ${currentLapCount} - ${driver.LT}`)
    }

    // Update lap count in memory
    session.karts.set(kartNumber, currentLapCount)
  })

  return completedLaps
}

// 🏁 FUNCIÓN PARA CAPTURAR DATOS VUELTA POR VUELTA - Solo cuando cruzan meta
async function captureLapByLapData(smsData) {
  try {
    // Detect lap completions first
    const completedLaps = detectLapCompletions(smsData)

    if (completedLaps.length === 0) {
      return // No laps completed, no DB write needed
    }

    console.log(`🏁 ${completedLaps.length} vuelta(s) completada(s), guardando en DB...`)

    // Verificar que fetch esté disponible
    if (!fetch) {
      console.log('⚠️ Fetch no disponible para lap capture, esperando...')
      return
    }

    // Llamar a la API para procesar datos lap-by-lap - SOLO cuando hay vueltas completas
    const response = await fetch('http://localhost:3000/api/lap-capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'process_lap_data',
        sessionData: smsData,
        completedLaps // Send only completed laps for efficiency
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Lap data guardado: ${result.recordsCreated || 0} registros`)
    } else {
      const errorText = await response.text()
      console.log('⚠️ Error guardando lap data:', response.status, errorText)
    }

  } catch (error) {
    console.log('⚠️ Error en captureLapByLapData:', error.message)
  }
}

console.log('🎯 WebSocket Server listo para conexiones')
console.log('💰 MODO FINAL: SOLO Clasificaciones (se cobran) - Carreras son gratis/incluidas')
console.log('🏁 NUEVO: Captura lap-by-lap VUELTA POR VUELTA con datos reales SMS-Timing')
console.log('🧠 OPTIMIZACIÓN: Memory-first architecture - Solo guarda al completar vuelta')
console.log('💾 Backup automático cada 2 minutos para sesiones activas')