# 🏁 SPEEDPARK KARTING WEBAPP - MONGODB SCHEMA

## 📋 Análisis de Datos Disponibles

### Datos de SMS-Timing API:
- **Sesiones completas** con participantes y resultados
- **Tiempos por vuelta** detallados (lap-by-lap)
- **Información de corredores** (PersonID, alias, nombres)
- **Posiciones y rankings** por sesión
- **Mejores tiempos** y puntuaciones

### WebSocket en tiempo real:
- Timing live durante carreras activas
- Posiciones actualizadas en tiempo real

---

## 🗄️ ESTRUCTURA DE COLECCIONES MONGODB

### 1. **users** (Corredores registrados)

Almacena información de usuarios registrados en la webapp, vinculados por PersonID de SMS-Timing.

```javascript
{
  _id: ObjectId(),
  personId: "63000000000383541", // SMS-Timing PersonID (único)
  alias: "Break Pitt",
  firstName: "Ignacio",
  lastName: "Cabrera",
  email: "ignacio@example.com",
  password: "hashed_password",
  avatar: "url_to_avatar",
  
  // Estadísticas calculadas y cacheadas
  stats: {
    bestLapTime: 38035, // en ms
    bestLapSession: "31929100",
    totalRaces: 15,
    totalWins: 3,
    totalPodiums: 8,
    averagePosition: 4.2,
    cleanDriverScore: 85, // Puntuación de corredor limpio (0-100)
    consistencyScore: 0.95 // Consistencia en tiempos (0-1)
  },
  
  // Liga y puntos
  league: {
    currentSeasonPoints: 245,
    currentRank: 4,
    seasonId: ObjectId("season_id"),
    totalSeasons: 3
  },
  
  // Configuración personal
  preferences: {
    notifications: true,
    publicProfile: true,
    units: "metric", // metric/imperial
    language: "es"
  },
  
  // Timestamps
  createdAt: ISODate(),
  updatedAt: ISODate(),
  lastActive: ISODate()
}
```

**Propósito**: Usuario central del sistema, vinculado a SMS-Timing por PersonID.

---

### 2. **sessions** (Sesiones de SMS-Timing)

Representa cada sesión de karting extraída de SMS-Timing.

```javascript
{
  _id: ObjectId(),
  smsSessionId: "32030750", // ID único de SMS-Timing
  name: "45 - Clasificacion",
  date: ISODate("2025-08-02T15:30:55.206Z"),
  
  // Información de la sesión
  sessionState: 3, // 1=programada, 2=activa, 3=completada
  resourceId: "8501", // ID del recurso en SMS-Timing
  resourceKind: 2,
  
  // Resultados generales
  results: {
    winner: {
      userId: ObjectId("user_id"),
      alias: "Break Pitt",
      personId: "63000000000383541"
    },
    bestTime: 44700, // mejor tiempo de la sesión en ms
    totalParticipants: 17,
    duration: 900000, // duración total en ms
    totalLaps: 245 // suma de todas las vueltas
  },
  
  // Clasificación y tipo
  type: "practice", // practice, qualifying, race, official
  category: "open", // open, junior, senior, pro
  isOfficial: false, // si otorga puntos de liga
  weatherConditions: "dry", // dry, wet, mixed
  
  // Metadatos
  processedAt: ISODate(),
  createdAt: ISODate()
}
```

**Propósito**: Almacenar información general de cada sesión de karting.

---

### 3. **session_participants** (Participantes por sesión)

Detalle de cada participante en una sesión específica.

```javascript
{
  _id: ObjectId(),
  sessionId: ObjectId("session_id"),
  smsSessionId: "32030750",
  
  // Identificación del participante
  userId: ObjectId("user_id"), // null si es invitado no registrado
  smsParticipantId: "32617264", // SMS-Timing participant ID
  personId: "63000000000383541", // SMS-Timing person ID (puede ser null)
  alias: "Break Pitt",
  firstName: "Ignacio",
  lastName: "Cabrera",
  isGuest: false, // true si no tiene cuenta en la webapp
  
  // Resultados finales
  finalPosition: 1,
  bestLapTime: 44700, // mejor vuelta en ms
  bestLapNumber: 13,
  totalTime: 656789, // tiempo total acumulado en ms
  totalLaps: 14,
  
  // Estadísticas calculadas de la sesión
  averageLapTime: 47198,
  consistency: 0.92, // 1 - (desviación estándar / media)
  improvement: 2134, // mejora desde primera vuelta (ms)
  penalties: 0, // número de penalizaciones
  cleanDriver: true, // sesión sin penalizaciones
  
  // Puntos y recompensas
  points: 25, // puntos de liga obtenidos (si es oficial)
  bonusPoints: {
    participation: 2,
    cleanDriver: 1,
    bestLap: 3,
    improvement: 1
  },
  
  // Timestamps
  createdAt: ISODate()
}
```

**Propósito**: Resultados detallados de cada corredor en cada sesión.

---

### 4. **lap_times** (Tiempos detallados por vuelta)

Registro detallado de cada vuelta de cada corredor.

```javascript
{
  _id: ObjectId(),
  sessionId: ObjectId("session_id"),
  participantId: ObjectId("session_participant_id"),
  
  // Datos de la vuelta
  lapNumber: 13,
  lapTime: 44700, // tiempo de vuelta en ms
  position: 1, // posición después de esta vuelta
  gap: 0, // diferencia con el líder en ms
  interval: 1234, // diferencia con el anterior en ms
  
  // Análisis de la vuelta
  isBestLap: true, // mejor vuelta de toda la sesión
  isPersonalBest: true, // mejor vuelta personal del corredor
  isSessionRecord: false, // nuevo récord de la pista en esta sesión
  improvementFromPrevious: -892, // mejora respecto vuelta anterior (negativo = mejor)
  
  // Contexto de la vuelta
  sector1: 15234, // tiempo sector 1 (si disponible)
  sector2: 14567, // tiempo sector 2 (si disponible)
  sector3: 14899, // tiempo sector 3 (si disponible)
  
  // Metadatos SMS-Timing
  smsParticipantId: "32617264",
  startTime: ISODate(), // cuando empezó la vuelta
  
  // Timestamps
  createdAt: ISODate()
}
```

**Propósito**: Análisis detallado vuelta por vuelta para métricas y mejoras.

---

### 5. **races** (Carreras programadas/oficiales)

Carreras organizadas por la webapp, diferentes a las sesiones automáticas de SMS-Timing.

```javascript
{
  _id: ObjectId(),
  name: "Gran Premio de Agosto 2025",
  description: "Carrera oficial del campeonato de temporada",
  banner: "url_to_race_banner.jpg",
  
  // Programación
  scheduledDate: ISODate("2025-08-15T19:00:00Z"),
  registrationOpenDate: ISODate("2025-08-01T00:00:00Z"),
  registrationDeadline: ISODate("2025-08-15T18:30:00Z"),
  maxParticipants: 20,
  minParticipants: 8,
  
  // Configuración de la carrera
  type: "official", // official, practice, qualifying, championship
  category: "open", // open, junior, senior, pro, women
  format: "sprint", // sprint, endurance, qualifying
  laps: 15, // número de vueltas (si es fijo)
  duration: 900000, // duración en ms (si es por tiempo)
  pointsMultiplier: 1.5, // multiplicador de puntos para liga
  
  // Requisitos
  requirements: {
    minRaces: 5, // carreras mínimas para participar
    maxLapTime: 50000, // tiempo máximo permitido en ms
    seasonMembership: true // requiere membresía de temporada
  },
  
  // Estado actual
  status: "scheduled", // scheduled, registration_open, full, in_progress, completed, cancelled
  currentParticipants: 12,
  
  // Inscripciones
  registrations: [
    {
      userId: ObjectId("user_id"),
      alias: "Break Pitt",
      registeredAt: ISODate(),
      status: "confirmed", // confirmed, waitlist, cancelled
      paymentStatus: "paid", // paid, pending, free
      notes: "Comentarios del participante"
    }
  ],
  
  // Lista de espera
  waitlist: [
    {
      userId: ObjectId("user_id"),
      registeredAt: ISODate(),
      position: 1
    }
  ],
  
  // Resultados (cuando esté completada)
  results: {
    sessionId: ObjectId("session_id"), // vinculada a sesión SMS-Timing
    winner: ObjectId("user_id"),
    podium: [ObjectId("user1"), ObjectId("user2"), ObjectId("user3")],
    fastestLap: {
      userId: ObjectId("user_id"),
      lapTime: 44700,
      lapNumber: 13
    },
    completedAt: ISODate()
  },
  
  // Organización
  createdBy: ObjectId("admin_user_id"),
  organizers: [ObjectId("admin_user_id")],
  
  // Timestamps
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

**Propósito**: Gestión de carreras organizadas, inscripciones y campeonatos.

---

### 6. **seasons** (Temporadas de liga)

Sistema de temporadas con diferentes configuraciones de puntos.

```javascript
{
  _id: ObjectId(),
  name: "Temporada 2025",
  description: "Primera temporada oficial de SpeedPark Racing League",
  startDate: ISODate("2025-01-01"),
  endDate: ISODate("2025-12-31"),
  
  // Sistema de puntos
  pointsSystem: {
    // Puntos por posición final (índice 0 = 1er lugar)
    positions: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    bonuses: {
      participation: 2, // por participar
      cleanDriver: 1, // sesión sin penalizaciones
      bestLap: 3, // mejor vuelta de la sesión
      improvement: 1, // mejora significativa en la sesión
      podium: 2, // bonus adicional por podium
      win: 5 // bonus adicional por victoria
    },
    penalties: {
      noShow: -5, // no presentarse a carrera inscrita
      unsportsmanlike: -10, // conducta antideportiva
      cheating: -50 // hacer trampa
    }
  },
  
  // Configuración de categorías
  categories: [
    {
      name: "open",
      description: "Categoría abierta",
      requirements: {},
      pointsMultiplier: 1.0
    },
    {
      name: "pro",
      description: "Categoría profesional",
      requirements: {
        minRaces: 20,
        maxAvgLapTime: 45000
      },
      pointsMultiplier: 1.5
    }
  ],
  
  // Estado de la temporada
  status: "active", // upcoming, active, completed, cancelled
  
  // Estadísticas de la temporada
  stats: {
    totalRaces: 24,
    officialRaces: 12,
    completedRaces: 15,
    totalParticipants: 156,
    activeParticipants: 89,
    averageParticipantsPerRace: 14.2
  },
  
  // Configuración
  settings: {
    minRacesForRanking: 5, // carreras mínimas para aparecer en ranking
    dropWorstResults: 2, // eliminar N peores resultados
    requireMembership: true
  },
  
  // Timestamps
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

**Propósito**: Gestión de temporadas, sistemas de puntos y rankings.

---

### 7. **global_stats** (Estadísticas globales y récords)

Estadísticas generales y récords históricos de la pista.

```javascript
{
  _id: ObjectId(),
  type: "track_record", // track_record, monthly_stats, yearly_stats, all_time
  
  // Récord absoluto de pista
  trackRecord: {
    lapTime: 37774, // en ms
    userId: ObjectId("user_id"),
    alias: "Andres",
    firstName: "Andres",
    lastName: "Bustamante",
    sessionId: ObjectId("session_id"),
    smsSessionId: "31907988",
    date: ISODate("2025-07-15"),
    verified: true,
    conditions: "dry"
  },
  
  // Top 10 mejores tiempos históricos
  topTimes: [
    {
      position: 1,
      lapTime: 37774,
      userId: ObjectId("user_id"),
      alias: "Andres",
      date: ISODate("2025-07-15")
    }
    // ... más registros
  ],
  
  // Estadísticas mensuales
  monthlyStats: {
    year: 2025,
    month: 8,
    totalSessions: 45,
    totalParticipants: 156,
    uniqueParticipants: 78,
    averageLapTime: 42500,
    bestLapTime: 38035,
    totalLaps: 3456,
    mostActiveDriver: {
      userId: ObjectId("user_id"),
      alias: "Break Pitt",
      sessions: 12
    },
    fastestDriver: {
      userId: ObjectId("user_id"),
      alias: "Andres",
      bestTime: 37774
    }
  },
  
  // Estadísticas anuales
  yearlyStats: {
    year: 2025,
    totalSessions: 234,
    totalParticipants: 1245,
    uniqueParticipants: 189,
    championshipWinner: ObjectId("user_id"),
    rookieOfTheYear: ObjectId("user_id"),
    mostImprovedDriver: ObjectId("user_id")
  },
  
  // Metadatos
  lastCalculated: ISODate(),
  calculatedBy: "system", // system, admin, manual
  updatedAt: ISODate()
}
```

**Propósito**: Récords históricos y estadísticas agregadas del sistema.

---

### 8. **live_sessions** (Sesiones en vivo - WebSocket data)

Datos en tiempo real de sesiones activas capturados via WebSocket.

```javascript
{
  _id: ObjectId(),
  smsSessionId: "current_session_id",
  sessionName: "Sesión 47 - Práctica Libre",
  status: "active", // waiting, active, paused, finished
  
  // Información de la sesión en vivo
  sessionInfo: {
    startTime: ISODate(),
    estimatedDuration: 900000, // 15 minutos en ms
    currentLap: 8,
    timeRemaining: 456000, // tiempo restante en ms
    flagStatus: "green" // green, yellow, red, checkered
  },
  
  // Datos actuales de corredores
  currentDrivers: [
    {
      name: "Break Pitt",
      userId: ObjectId("user_id"), // si está registrado
      kart: 5,
      position: 1,
      currentLap: 8,
      lastLapTime: 45234,
      bestTime: 44700,
      gap: 0, // diferencia con líder en ms
      interval: 0, // diferencia con anterior en ms
      racerID: "D12345", // ID del sistema SMS-Timing
      isActive: true, // si está corriendo actualmente
      pitStops: 0
    }
    // ... más corredores
  ],
  
  // Eventos recientes
  recentEvents: [
    {
      type: "best_lap", // best_lap, position_change, new_leader, pit_stop
      message: "Break Pitt establece nuevo mejor tiempo: 44.700s",
      timestamp: ISODate(),
      driverName: "Break Pitt",
      data: {
        lapTime: 44700,
        lapNumber: 13
      }
    }
  ],
  
  // Metadatos de la transmisión
  webSocketData: {
    lastMessage: "raw websocket message",
    connectionStatus: "connected",
    messagesReceived: 1234,
    errorsCount: 2
  },
  
  // Timestamps
  startTime: ISODate(),
  lastUpdate: ISODate(),
  sessionTimestamp: "15:45:30" // timestamp del sistema SMS-Timing
}
```

**Propósito**: Almacenar datos en tiempo real para dashboard live y análisis.

---

## 🔗 ÍNDICES RECOMENDADOS

### Índices de Performance Crítica

```javascript
// users - Búsquedas frecuentes
db.users.createIndex({ "personId": 1 }, { unique: true });
db.users.createIndex({ "alias": 1 });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "stats.bestLapTime": 1 });
db.users.createIndex({ "league.currentRank": 1 });
db.users.createIndex({ "league.seasonId": 1, "league.currentSeasonPoints": -1 });

// sessions - Consultas temporales y por tipo
db.sessions.createIndex({ "smsSessionId": 1 }, { unique: true });
db.sessions.createIndex({ "date": -1 });
db.sessions.createIndex({ "type": 1, "isOfficial": 1 });
db.sessions.createIndex({ "results.bestTime": 1 });

// session_participants - Ranking y búsquedas por usuario
db.session_participants.createIndex({ "sessionId": 1, "finalPosition": 1 });
db.session_participants.createIndex({ "userId": 1, "sessionId": 1 });
db.session_participants.createIndex({ "userId": 1, "createdAt": -1 });
db.session_participants.createIndex({ "bestLapTime": 1 });
db.session_participants.createIndex({ "personId": 1 });
db.session_participants.createIndex({ "smsParticipantId": 1 });

// lap_times - Análisis de vueltas
db.lap_times.createIndex({ "sessionId": 1, "lapNumber": 1 });
db.lap_times.createIndex({ "participantId": 1, "lapNumber": 1 });
db.lap_times.createIndex({ "lapTime": 1 });
db.lap_times.createIndex({ "isBestLap": 1, "lapTime": 1 });
db.lap_times.createIndex({ "isPersonalBest": 1, "participantId": 1 });

// races - Gestión de carreras
db.races.createIndex({ "scheduledDate": 1 });
db.races.createIndex({ "status": 1, "type": 1 });
db.races.createIndex({ "registrations.userId": 1 });
db.races.createIndex({ "type": 1, "category": 1, "scheduledDate": -1 });

// seasons - Temporadas activas
db.seasons.createIndex({ "status": 1, "startDate": -1 });
db.seasons.createIndex({ "startDate": 1, "endDate": 1 });

// global_stats - Estadísticas y récords
db.global_stats.createIndex({ "type": 1, "lastCalculated": -1 });
db.global_stats.createIndex({ "trackRecord.lapTime": 1 });
db.global_stats.createIndex({ "monthlyStats.year": 1, "monthlyStats.month": 1 });

// live_sessions - Sesiones en vivo
db.live_sessions.createIndex({ "smsSessionId": 1 }, { unique: true });
db.live_sessions.createIndex({ "status": 1, "lastUpdate": -1 });
```

---

## 🚀 VENTAJAS DE ESTE DISEÑO

### **🎯 Escalabilidad**
- **Colecciones separadas** por función específica
- **Índices optimizados** para consultas más frecuentes
- **Documentos desnormalizados** para estadísticas rápidas
- **Sharding preparado** por sessionId y userId

### **⚡ Performance**
- **Estadísticas precalculadas** en documentos de usuario
- **Índices compuestos** para consultas complejas
- **Datos de tiempo real** en colección separada para no impactar performance
- **TTL collections** para datos temporales

### **🔧 Flexibilidad**
- **Soporte dual** para usuarios registrados e invitados
- **Sistema de puntos configurable** por temporada
- **Múltiples tipos de carreras** y categorías
- **Extensible** para nuevas funcionalidades

### **🛡️ Integridad**
- **Referencias consistentes** entre colecciones con ObjectId
- **Campos únicos** donde corresponde (personId, email, smsSessionId)
- **Validación de datos** integrada en el esquema
- **Soft deletes** para mantener historial

### **📊 Analytics Ready**
- **Datos históricos** preservados para análisis
- **Métricas calculadas** para dashboards
- **Estructura optimizada** para reportes
- **Agregaciones eficientes** con pipeline de MongoDB

---

## 🔄 RELACIONES ENTRE COLECCIONES

```
users (1) ←→ (N) session_participants
users (1) ←→ (N) races.registrations
users (1) ←→ (1) seasons.league

sessions (1) ←→ (N) session_participants
sessions (1) ←→ (N) lap_times
sessions (1) ←→ (1) races.results

session_participants (1) ←→ (N) lap_times

seasons (1) ←→ (N) users.league
seasons (1) ←→ (N) races

live_sessions (1) ←→ (1) sessions (eventual)
```

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### **Migración de Datos Existentes**
1. Procesar `unique_drivers_consolidated.json` → `users`
2. Procesar archivos de sesiones SMS-Timing → `sessions` + `session_participants`
3. Extraer tiempos por vuelta → `lap_times`
4. Calcular estadísticas globales → `global_stats`

### **WebSocket Integration**
- Escuchar datos en tiempo real
- Actualizar `live_sessions` cada mensaje
- Crear `sessions` cuando termine la sesión
- Procesar `lap_times` desde datos WebSocket

### **Validación de Datos**
- PersonID único pero opcional (invitados)
- Tiempos en milisegundos (consistencia)
- Fechas en UTC (ISODate)
- Estados enumerados (validation rules)

### **Performance Considerations**
- Usar agregation pipeline para rankings
- Cache de estadísticas frecuentes
- Índices parciales para datos activos
- Compresión para datos históricos

---

*Documento creado: 2025-08-05*  
*Versión: 1.0*  
*Autor: Claude AI Assistant*