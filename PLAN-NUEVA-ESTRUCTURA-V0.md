# Plan: Nueva Estructura de Datos V0 - Centrada en Carreras

## 📋 Resumen Ejecutivo

**Objetivo:** Crear una nueva estructura de datos donde **una carrera = un documento**, guardando todos los pilotos y sus vueltas desde el WebSocket.

**Colección MongoDB:** `race_sessions_v0` (Datos_de_CarreraV0)

---

## 🎯 Problema Actual

### Estructura Actual (driver_race_data)
```javascript
// UN DOCUMENTO POR PILOTO
{
  driverName: "Diego",
  sessions: [
    {
      sessionId: "HEAT 77",
      laps: [1, 2, 3...] // ← Solo vueltas de Diego
    }
  ]
}

// Para ver una carrera completa:
// - Buscar TODOS los pilotos
// - Filtrar sus sesiones por sessionId
// - Combinar datos manualmente
```

**Problemas:**
- ❌ Difícil obtener vista completa de una carrera
- ❌ Metadata duplicada (sessionId, sessionName en cada piloto)
- ❌ Queries lentas para rankings de carreras
- ❌ A veces solo guarda 1 vuelta (bug que arreglamos)

---

## ✅ Nueva Estructura (race_sessions_v0)

```javascript
// UN DOCUMENTO POR CARRERA
{
  sessionId: "[HEAT] 77 - Clasificacion_Wed Dec 04 2024",
  sessionName: "[HEAT] 77 - Clasificacion",
  sessionDate: ISODate("2024-12-04T20:46:00"),
  sessionType: "clasificacion",

  drivers: [
    {
      driverName: "Diego",
      finalPosition: 1,
      kartNumber: 12,
      totalLaps: 15,
      bestTime: 42500,
      laps: [
        { lapNumber: 1, time: 44500, position: 3 },
        { lapNumber: 2, time: 43200, position: 2 },
        // ... TODAS las vueltas de Diego
      ]
    },
    {
      driverName: "Carlos",
      // ... TODAS las vueltas de Carlos
    }
    // ... más pilotos
  ],

  totalDrivers: 6,
  totalLaps: 88 // Suma de todas las vueltas
}
```

**Ventajas:**
- ✅ Una query = Toda la carrera
- ✅ No duplica metadata
- ✅ Fácil hacer rankings
- ✅ Fix de vueltas aplicado desde inicio

---

## 🔄 Flujo de Datos

### Flujo Actual (Viejo)
```
WebSocket → useWebSocket → /api/lap-capture →
DriverRaceDataService → driver_race_data (por piloto)
```

### Flujo Nuevo (V0)
```
WebSocket (AWS)
    ↓ cada ~4 segundos
useWebSocket Hook
    ↓ detecta datos
Envía a: /api/lap-capture
    action: "process_race_data_v0"
    sessionData: { N: "...", D: [...] }
    ↓
RaceSessionServiceV0.processRaceData()
    ↓
[Verifica toggle de guardado]
    ↓ si enabled
[Detecta nuevas vueltas]
    ¿L aumentó? → SÍ
    ↓
MongoDB: race_sessions_v0
    ↓
Busca carrera por sessionId
    ¿Existe? → NO: Crear nueva
           → SÍ: Actualizar
    ↓
Por cada piloto:
  - Buscar en array drivers[]
  - ¿Nueva vuelta? → Agregar a laps[]
  - Actualizar stats (bestTime, totalLaps, etc)
    ↓
Guardar documento
```

---

## 🏗️ Arquitectura de Archivos

### Modelos (1 nuevo)
```
src/models/
├── RaceSessionV0.ts ✨ NUEVO
│   └── Estructura: sessionId, drivers[], totalLaps, etc.
└── DriverRaceData.ts (mantener para compatibilidad)
```

### Servicios (1 nuevo)
```
src/lib/
├── raceSessionServiceV0.ts ✨ NUEVO
│   ├── processRaceData(smsData)
│   ├── detectNewLap(current, previous)
│   ├── addLapToDriver(driver, lapData)
│   └── updateDriverStats(driver)
├── lapCaptureService.ts (mantener)
└── driverRaceDataService.ts (mantener)
```

### APIs (2 nuevas)
```
src/app/api/
├── races-v0/
│   └── route.ts ✨ NUEVO
│       └── GET: Listar carreras por fecha
├── race-results-v0/
│   └── route.ts ✨ NUEVO
│       └── GET: Obtener carrera completa por sessionId
└── lap-capture/
    └── route.ts (modificar)
        └── Agregar acción: process_race_data_v0
```

### Frontend (1 modificar)
```
src/app/
└── ranking/
    └── page.tsx (modificar)
        └── Usar /api/races-v0 en lugar de /api/races
```

---

## 📝 Implementación Paso a Paso

### PASO 1: Crear Modelo RaceSessionV0 ✅ COMPLETADO
**Archivo:** `src/models/RaceSessionV0.ts`

**Contiene:**
- Interface `ILapV0`: Una vuelta
- Interface `IDriverInRace`: Un piloto con todas sus vueltas
- Interface `IRaceSessionV0`: Documento completo de la carrera
- Schema de Mongoose con índices
- Métodos helper: `recalculateTotals()`, `upsertDriver()`

---

### PASO 2: Crear Servicio RaceSessionServiceV0
**Archivo:** `src/lib/raceSessionServiceV0.ts`

**Funciones principales:**

```typescript
class RaceSessionServiceV0 {
  // Mapa para detectar cambios entre actualizaciones
  private static lastSessionData: Map<string, SMSDriverData[]>

  // Función principal
  static async processRaceData(smsData: SMSData) {
    // 1. Generar sessionId único
    // 2. Buscar o crear documento de carrera
    // 3. Para cada piloto en smsData.D:
    //    - Detectar si completó nueva vuelta (L aumentó)
    //    - Si es nueva: agregar a laps[]
    //    - Actualizar stats del piloto
    // 4. Recalcular totales de la carrera
    // 5. Guardar documento
  }

  // Detectar nueva vuelta
  private static isNewLap(current, previous) {
    // Solo retorna true si L > previous.L
    // Mismo fix que aplicamos antes
  }

  // Agregar vuelta a piloto
  private static addLapToDriver(driver, lapData) {
    // Verificar que lapNumber no exista (anti-duplicados)
    // Agregar lap al array
    // Marcar isPersonalBest si corresponde
  }

  // Actualizar estadísticas del piloto
  private static updateDriverStats(driver, currentSMSData) {
    // Actualizar: bestTime, lastTime, averageTime
    // Actualizar: finalPosition, totalLaps
    // Actualizar: gapToLeader
  }
}
```

---

### PASO 3: Crear API /api/races-v0
**Archivo:** `src/app/api/races-v0/route.ts`

**Endpoint:** `GET /api/races-v0?date=2024-12-04`

**Retorna:**
```json
{
  "success": true,
  "races": [
    {
      "sessionId": "[HEAT] 77 - Clasificacion_Wed Dec 04 2024",
      "sessionName": "[HEAT] 77 - Clasificacion",
      "sessionDate": "2024-12-04T20:46:00",
      "sessionType": "clasificacion",
      "totalDrivers": 6,
      "totalLaps": 88,
      "displayDate": "04/12/2024",
      "displayTime": "20:46"
    }
  ]
}
```

**Query MongoDB:**
```javascript
RaceSessionV0.find({
  sessionDate: { $gte: startDate, $lte: endDate }
})
.sort({ sessionDate: -1 })
```

---

### PASO 4: Crear API /api/race-results-v0
**Archivo:** `src/app/api/race-results-v0/route.ts`

**Endpoint:** `GET /api/race-results-v0?sessionId=[HEAT]...`

**Retorna:**
```json
{
  "success": true,
  "sessionId": "[HEAT] 77 - Clasificacion_Wed Dec 04 2024",
  "sessionName": "[HEAT] 77 - Clasificacion",
  "drivers": [
    {
      "driverName": "Diego",
      "finalPosition": 1,
      "totalLaps": 15,
      "laps": [
        { "lapNumber": 1, "time": 44500, "position": 3 },
        // ... todas las vueltas
      ]
    }
  ]
}
```

**Query MongoDB:**
```javascript
RaceSessionV0.findOne({ sessionId })
```

---

### PASO 5: Modificar /api/lap-capture
**Archivo:** `src/app/api/lap-capture/route.ts`

**Agregar nueva acción:**
```typescript
if (action === 'process_race_data_v0' && sessionData) {
  await RaceSessionServiceV0.processRaceData(sessionData);

  return NextResponse.json({
    success: true,
    message: 'Race data processed with V0 structure',
    sessionName: sessionData.N
  });
}
```

---

### PASO 6: Modificar useWebSocket Hook
**Archivo:** `src/hooks/useWebSocket.ts`

**Cambiar acción enviada:**
```typescript
// Línea ~55: Cambiar de 'process_lap_data' a 'process_race_data_v0'
body: JSON.stringify({
  action: 'process_race_data_v0', // ← Cambio
  sessionData: {
    N: parsedData.sessionName,
    D: parsedData.drivers.map(...)
  }
})
```

---

### PASO 7: Crear Navegador de Carreras V0
**Archivo:** `src/components/RaceBrowserV0.tsx` ✨ NUEVO

**Componente exclusivo para datos V0** (no reutilizar el viejo)

**Características:**
```typescript
interface RaceBrowserV0Props {
  // Sin props, maneja su propio estado
}

export default function RaceBrowserV0() {
  // Estados
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [races, setRaces] = useState<RaceV0[]>([]);
  const [selectedRace, setSelectedRace] = useState<RaceSessionV0 | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverInRace | null>(null);

  // Funciones
  const fetchRaces = async () => {
    // GET /api/races-v0?date=...
  }

  const fetchRaceResults = async () => {
    // GET /api/race-results-v0?sessionId=...
  }

  return (
    // Vista de 3 niveles:
    // 1. Selector de fecha + Lista de carreras
    // 2. Tabla de resultados de carrera (todos los pilotos)
    // 3. Progresión vuelta a vuelta de un piloto
  )
}
```

**Vistas del componente:**

**NIVEL 1: Lista de Carreras**
```
┌─────────────────────────────────────────┐
│ 📅 Carreras del 04 de diciembre de 2024 │
├─────────────────────────────────────────┤
│ [HEAT] 77 - Clasificacion               │
│ ⏰ 08:46 p.m. • 👥 2 pilotos • 🏁 21 vueltas │
├─────────────────────────────────────────┤
│ [HEAT] 76 - Carrera                     │
│ ⏰ 08:34 p.m. • 👥 3 pilotos • 🏁 41 vueltas │
├─────────────────────────────────────────┤
│ [HEAT] 72 - Carrera                     │
│ ⏰ 08:00 p.m. • 👥 6 pilotos • 🏁 88 vueltas │
└─────────────────────────────────────────┘
```

**NIVEL 2: Resultados de Carrera**
```
┌──────────────────────────────────────────────────────────┐
│ 🏁 [HEAT] 72 - Carrera                   ← Volver        │
├────┬──────────┬──────┬─────────┬──────────────┬──────────┤
│Pos │ Piloto   │ Kart │ Vueltas │ Mejor Vuelta │ Promedio │
├────┼──────────┼──────┼─────────┼──────────────┼──────────┤
│ 🥇 │ Diego    │ #12  │   15    │   0:42.500   │ 0:43.800 │
│ 🥈 │ Carlos   │ #8   │   14    │   0:43.200   │ 0:44.100 │
│ 🥉 │ Juan     │ #5   │   14    │   0:43.800   │ 0:44.500 │
│ 4  │ Pedro    │ #15  │   15    │   0:44.100   │ 0:44.900 │
│ 5  │ Luis     │ #3   │   15    │   0:44.500   │ 0:45.200 │
│ 6  │ Mario    │ #21  │   15    │   0:45.000   │ 0:45.600 │
└────┴──────────┴──────┴─────────┴──────────────┴──────────┘
      ↑ Click para ver progresión vuelta a vuelta
```

**NIVEL 3: Progresión Vuelta a Vuelta**
```
┌──────────────────────────────────────────────────────────┐
│ 🏎️ Diego - Progresión de Carrera        ← Volver        │
├──────┬──────────┬──────┬─────────────────────────────────┤
│Vuelta│  Tiempo  │ Pos  │            Gráfico              │
├──────┼──────────┼──────┼─────────────────────────────────┤
│  1   │ 0:44.500 │  3   │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░             │
│  2   │ 0:43.200 │  2   │ ▓▓▓▓▓▓▓░░░░░░░░░░░░             │
│  3   │ 0:42.800 │  2   │ ▓▓▓▓▓▓░░░░░░░░░░░░░ ⭐ BEST    │
│  4   │ 0:43.100 │  1   │ ▓▓▓▓▓▓▓░░░░░░░░░░░░             │
│  5   │ 0:42.500 │  1   │ ▓▓▓▓▓░░░░░░░░░░░░░░ ⭐ BEST    │
│ ...  │   ...    │ ...  │                                 │
└──────┴──────────┴──────┴─────────────────────────────────┘
```

**Código del componente:**
```typescript
// src/components/RaceBrowserV0.tsx

'use client';

import React, { useState, useEffect } from 'react';

// Interfaces específicas para V0
interface RaceV0 {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionType: string;
  totalDrivers: number;
  totalLaps: number;
  displayDate: string;
  displayTime: string;
}

interface LapV0 {
  lapNumber: number;
  time: number;
  position: number;
  timestamp: string;
  gapToLeader?: string;
  isPersonalBest?: boolean;
}

interface DriverResultV0 {
  driverName: string;
  finalPosition: number;
  kartNumber: number;
  totalLaps: number;
  bestTime: number;
  lastTime: number;
  averageTime: number;
  laps: LapV0[];
}

interface RaceSessionV0 {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionType: string;
  drivers: DriverResultV0[];
  totalDrivers: number;
  totalLaps: number;
}

export default function RaceBrowserV0() {
  // Estado para fecha seleccionada
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Estado para lista de carreras
  const [races, setRaces] = useState<RaceV0[]>([]);

  // Estado para carrera seleccionada
  const [selectedRace, setSelectedRace] = useState<RaceSessionV0 | null>(null);

  // Estado para piloto seleccionado
  const [selectedDriver, setSelectedDriver] = useState<DriverResultV0 | null>(null);

  // Estado de carga
  const [loading, setLoading] = useState(false);

  // Cargar carreras cuando cambia la fecha
  useEffect(() => {
    fetchRaces();
  }, [selectedDate]);

  // Cargar resultados cuando se selecciona una carrera
  useEffect(() => {
    if (selectedRace) {
      fetchRaceResults();
    }
  }, [selectedRace]);

  // Función para obtener carreras del día
  const fetchRaces = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/races-v0?date=${selectedDate}`);
      const data = await response.json();

      if (data.success) {
        setRaces(data.races);
        console.log(`📊 [V0] Loaded ${data.races.length} races for ${selectedDate}`);
      }
    } catch (error) {
      console.error('❌ Error fetching races V0:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener resultados de una carrera
  const fetchRaceResults = async () => {
    if (!selectedRace) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/race-results-v0?sessionId=${encodeURIComponent(selectedRace.sessionId)}`
      );
      const data = await response.json();

      if (data.success) {
        setSelectedRace(data.race);
        console.log(`🏁 [V0] Loaded results for ${data.race.sessionName}`);
      }
    } catch (error) {
      console.error('❌ Error fetching race results V0:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones auxiliares para formato
  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--.---';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  // RENDER: Vista principal con 3 niveles
  return (
    <div className="space-y-6">
      {/* Header & Selector de Fecha */}
      <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-electric-blue mb-2">
              🏁 Navegador de Carreras V0
            </h2>
            <p className="text-sm text-sky-blue/60">
              Nueva estructura centrada en carreras
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-white font-semibold">Fecha:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedRace(null);
                setSelectedDriver(null);
              }}
              className="bg-racing-black border-2 border-electric-blue/30 text-white px-4 py-2 rounded-lg font-bold hover:border-electric-blue transition-all"
            />
          </div>
        </div>
      </div>

      {/* NIVEL 1: Lista de Carreras */}
      {!selectedRace && (
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-electric-blue mb-4">
            Carreras del {new Date(selectedDate).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </h3>

          {loading && (
            <div className="text-center text-gray-400 py-8">
              Cargando carreras V0...
            </div>
          )}

          {!loading && races.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No hay carreras V0 registradas en esta fecha
            </div>
          )}

          {!loading && races.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {races.map((race) => (
                <button
                  key={race.sessionId}
                  onClick={() => setSelectedRace(race as any)}
                  className="bg-racing-black/40 border border-sky-blue/20 rounded-lg p-4 hover:border-electric-blue/50 hover:bg-racing-black/60 transition-all text-left"
                >
                  <div className="font-bold text-white mb-2">
                    {race.sessionName}
                  </div>
                  <div className="text-sm text-sky-blue/60 space-y-1">
                    <div>⏰ {race.displayTime}</div>
                    <div>👥 {race.totalDrivers} pilotos</div>
                    <div>🏁 {race.totalLaps} vueltas totales</div>
                    <div className="text-xs text-electric-blue mt-2 capitalize">
                      {race.sessionType}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NIVEL 2: Resultados de Carrera + NIVEL 3: Progresión */}
      {/* ... resto del código de vistas 2 y 3 ... */}
    </div>
  );
}
```

---

### PASO 8: Actualizar página /ranking para usar RaceBrowserV0
**Archivo:** `src/app/ranking/page.tsx`

**Cambio:**
```typescript
// Antes:
import RaceBrowser from '@/components/RaceBrowser';

// Después:
import RaceBrowserV0 from '@/components/RaceBrowserV0';

// En el JSX:
<RaceBrowserV0 />
```

---

## 🧪 Testing del Sistema

### 1. Verificar Toggle Funciona
```
1. Ir a http://localhost:3000/ranking
2. Click "PAUSAR GUARDADO"
3. Verificar logs: "⏸️ [LAP CAPTURE DISABLED]"
4. Click "ACTIVAR GUARDADO"
5. Verificar logs: "✅ [PROCESSING]"
```

### 2. Monitorear Carrera en Vivo
```
1. Activar guardado en /ranking
2. Iniciar WebSocket (LiveRaceViewer o esperar carrera real)
3. Verificar logs del servidor:
   - "🔍 [LAP DETECTION] Diego: lapIncreased"
   - "✅ [LAP ADDED] Diego - Lap 5"
```

### 3. Verificar MongoDB
```javascript
// Conectar a MongoDB
use karteando-cl

// Ver carreras guardadas
db.race_sessions_v0.find().pretty()

// Ver carrera específica con todas las vueltas
db.race_sessions_v0.findOne(
  { sessionName: /HEAT.*77/ },
  { "drivers.driverName": 1, "drivers.totalLaps": 1, "drivers.laps": 1 }
).pretty()

// Verificar que todas las vueltas están
db.race_sessions_v0.aggregate([
  { $unwind: "$drivers" },
  { $project: {
      driverName: "$drivers.driverName",
      totalLaps: "$drivers.totalLaps",
      lapsCount: { $size: "$drivers.laps" }
  }}
])
// ✅ totalLaps debe ser igual a lapsCount
```

### 4. Verificar en /ranking
```
1. Ir a /ranking
2. Seleccionar fecha de hoy
3. Debe aparecer la carrera con:
   - Nombre correcto
   - 6 pilotos
   - 88 vueltas totales (suma de todas)
4. Click en carrera
5. Debe mostrar todos los pilotos con todas sus vueltas
```

---

## 📊 Comparación de Estructuras

| Característica | Vieja (driver_race_data) | Nueva (race_sessions_v0) |
|----------------|--------------------------|--------------------------|
| **Organización** | Por piloto | Por carrera |
| **Documentos** | 1 por piloto | 1 por carrera |
| **Query "Ver carrera"** | Múltiples + combinar | 1 query directo |
| **Duplicación metadata** | Alta (en cada piloto) | Ninguna |
| **Problema vueltas** | Sí (arreglado) | No (fix aplicado) |
| **Uso en /ranking** | ❌ No (datos viejos) | ✅ Sí (datos nuevos) |
| **Performance** | Lenta | Rápida |

---

## 🔄 Migración (Futuro)

### Fase 1: Dual Write (Actual)
- Guardar en AMBAS estructuras
- `/ranking` usa V0
- Otras páginas usan vieja

### Fase 2: Migración de datos
```javascript
// Script para migrar datos históricos
async function migrateToV0() {
  // 1. Obtener todas las sesiones únicas
  // 2. Para cada sesión:
  //    - Buscar todos los pilotos que participaron
  //    - Crear documento RaceSessionV0
  //    - Copiar laps de cada piloto
  // 3. Validar migración
}
```

### Fase 3: Deprecar vieja estructura
- Actualizar todas las páginas a V0
- Eliminar código viejo
- Borrar colección `driver_race_data`

---

## ⚠️ Consideraciones Importantes

### 1. Concurrencia
- El WebSocket envía datos cada ~4 segundos
- Múltiples pilotos pueden actualizar al mismo tiempo
- **Solución:** Usar `findOneAndUpdate` con `upsert: true`

### 2. Memoria
- Variable `lastSessionData` en memoria se resetea al reiniciar servidor
- **Solución:** Primera actualización después de restart guardará estado actual

### 3. Sesiones Largas
- Una carrera puede tener muchas vueltas
- Documento puede crecer mucho
- **Solución:** MongoDB soporta hasta 16MB por documento (suficiente para ~1000 vueltas)

### 4. Timestamps
- Cada vuelta tiene timestamp
- Útil para análisis de progresión temporal
- **Solución:** Usar `new Date()` al detectar nueva vuelta

---

## 🎯 Resultado Esperado

Después de implementar:

1. **WebSocket activo** → Datos llegan cada ~4 segundos
2. **Toggle en /ranking** → Controla si se guarda o no
3. **MongoDB `race_sessions_v0`** → Un documento por carrera
4. **Cada carrera tiene:**
   - Todos los pilotos
   - Todas las vueltas de cada piloto
   - Metadata completa
5. **Página /ranking muestra:**
   - Lista de carreras del día
   - Filtros por fecha
   - Click en carrera → Ver todos los pilotos y vueltas

---

## 📝 Checklist de Implementación

- [x] PASO 1: Crear modelo RaceSessionV0.ts
- [ ] PASO 2: Crear servicio raceSessionServiceV0.ts
- [ ] PASO 3: Crear API /api/races-v0/route.ts
- [ ] PASO 4: Crear API /api/race-results-v0/route.ts
- [ ] PASO 5: Modificar /api/lap-capture/route.ts
- [ ] PASO 6: Modificar useWebSocket.ts
- [ ] PASO 7: Crear componente RaceBrowserV0.tsx
- [ ] PASO 8: Actualizar /ranking/page.tsx para usar RaceBrowserV0
- [ ] PASO 9: Testing completo
- [ ] PASO 10: Hacer commit
- [ ] PASO 11: Monitorear carrera real

---

## 🎨 Resumen Visual del Plan

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO V0                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WebSocket AWS                                              │
│       ↓                                                     │
│  useWebSocket Hook (PASO 6)                                │
│       ↓                                                     │
│  POST /api/lap-capture (PASO 5)                            │
│    action: "process_race_data_v0"                          │
│       ↓                                                     │
│  RaceSessionServiceV0.processRaceData() (PASO 2)           │
│    - Detecta nuevas vueltas (L aumentó?)                   │
│    - Busca/crea documento de carrera                       │
│    - Actualiza pilotos y vueltas                           │
│       ↓                                                     │
│  MongoDB: race_sessions_v0 (PASO 1 ✅)                     │
│    {                                                        │
│      sessionId: "HEAT 77...",                              │
│      drivers: [                                            │
│        { driverName: "Diego", laps: [...] },               │
│        { driverName: "Carlos", laps: [...] }               │
│      ]                                                      │
│    }                                                        │
│       ↓                                                     │
│  GET /api/races-v0 (PASO 3)                                │
│    → Lista de carreras del día                             │
│       ↓                                                     │
│  GET /api/race-results-v0 (PASO 4)                         │
│    → Carrera completa con todos los pilotos                │
│       ↓                                                     │
│  RaceBrowserV0 Component (PASO 7)                          │
│    - Lista de carreras                                     │
│    - Resultados de carrera                                 │
│    - Progresión vuelta a vuelta                            │
│       ↓                                                     │
│  /ranking Page (PASO 8)                                    │
│    - Toggle de guardado                                    │
│    - Muestra RaceBrowserV0                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**¿Todo claro? ¿Continuamos con PASO 2 (servicio)?**
