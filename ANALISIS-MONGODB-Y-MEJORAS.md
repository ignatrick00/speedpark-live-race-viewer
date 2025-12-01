# Análisis MongoDB y Sistema de Live Racing - Karteando

## 📊 Estado Actual de la Base de Datos

### Colecciones Principales

#### 1. **DriverRaceData** (Principal - Centrado en Piloto)
```typescript
{
  driverName: string,
  webUserId?: string,
  personId?: string,
  linkingStatus: 'unlinked' | 'pending' | 'linked' | 'manual',

  sessions: [
    {
      sessionId: string,
      sessionName: string,
      sessionDate: Date,
      sessionType: 'clasificacion' | 'carrera' | 'practica' | 'otro',
      bestTime: number,
      totalLaps: number,
      kartNumber: number,

      // VUELTA POR VUELTA
      laps: [
        {
          lapNumber: number,
          time: number,
          position: number,
          kartNumber: number,
          timestamp: Date,
          gapToLeader: string,
          isPersonalBest: boolean
        }
      ]
    }
  ],

  stats: {
    totalRaces: number,
    totalLaps: number,
    allTimeBestLap: number,
    bestPosition: number,
    podiumFinishes: number
  }
}
```

**Ventajas:**
- ✅ Estructura centrada en el piloto
- ✅ Historial completo de carreras por piloto
- ✅ Datos vuelta por vuelta incluidos
- ✅ Estadísticas agregadas pre-calculadas

**Problemas:**
- ⚠️ No tiene índices para búsqueda por fecha de sesión
- ⚠️ Búsqueda de carreras específicas requiere escanear todos los pilotos

---

#### 2. **RaceSession** (Legacy - Centrado en Carrera)
```typescript
{
  sessionId: string,
  sessionName: string,
  sessionType: 'classification' | 'practice' | 'race' | 'other',
  timestamp: Date,

  drivers: [
    {
      name: string,
      position: number,
      kartNumber: number,
      lapCount: number,
      bestTime: number,
      lastTime: number,
      averageTime: number,
      gapToLeader: string
    }
  ],

  processed: boolean,
  linkedUsers: [...]
}
```

**Problemas:**
- ❌ NO tiene datos vuelta por vuelta
- ❌ Solo snapshot final de la carrera
- ❌ Duplicación con DriverRaceData

---

#### 3. **LapRecord** (Legacy - Individual)
```typescript
{
  sessionId: string,
  driverName: string,
  webUserId?: string,
  lapNumber: number,
  position: number,
  lastTime: number,
  bestTime: number,
  timestamp: Date
}
```

**Problemas:**
- ❌ Duplicación masiva de datos
- ❌ Solo se guarda 10% del tiempo (random)
- ❌ No es confiable para historial completo

---

#### 4. **BestDriverTimes** & **BestKartTimes** (Rankings)
```typescript
BestDriverTimes {
  position: number,
  driverName: string,
  bestTime: number,
  kartNumber: number,
  sessionDate: Date
}

BestKartTimes {
  position: number,
  kartNumber: number,
  bestTime: number,
  driverName: string,
  sessionDate: Date
}
```

**Estado:**
- ✅ Funciona bien para Top 10 pilotos
- ✅ Funciona bien para Top 20 karts
- ⚠️ Solo muestra Top, no todos los karts

---

## 🚨 Problemas Identificados

### 1. Live Racing - Carreras Perdidas

**Problema:** El sistema puede perder carreras por varias razones:

```typescript
// En lapCaptureService.ts línea 62-71
if (Math.random() < 0.1) { // Solo 10% del tiempo
  await this.processLegacyLapData(smsData);
}
```

**Causa raíz:**
- ✅ `DriverRaceDataService.processRaceData()` SÍ captura TODAS las carreras
- ✅ `updateRealTimeRecords()` actualiza rankings
- ❌ `LapRecord` solo guarda 10% (pero esto es legacy)

**Conclusión:** Las carreras SÍ se están guardando en `DriverRaceData`, pero:
- El problema puede ser en la detección de nuevas vueltas
- O en la duplicación de vueltas

---

### 2. Detección de Nuevas Vueltas

```typescript
// driverRaceDataService.ts línea 225-234
private static isNewLap(current: SMSDriverData, previous?: SMSDriverData): boolean {
  if (!previous) return true;

  const lapIncreased = current.L > (previous.L || 0);
  return lapIncreased;
}
```

**Problema potencial:**
- Solo detecta si `L` (lap count) aumentó
- Si SMS-Timing envía la misma vuelta múltiples veces, se ignora
- Si SMS-Timing NO actualiza `L` correctamente, se pierden vueltas

---

### 3. Historial de Carreras - No Hay Buscador

**Estado actual:**
- ✅ Existe `RaceHistoryTable.tsx` component
- ❌ NO hay interfaz de búsqueda
- ❌ NO hay filtros por fecha, tipo, karting
- ❌ Solo muestra las últimas 20 carreras del usuario

---

### 4. Ranking de Karts - Incompleto

**Estado actual:**
- ✅ `TrackRecordsCard` muestra Top 20 karts
- ❌ NO muestra TODOS los karts
- ❌ NO hay ranking completo de karts

---

## 💡 Soluciones Propuestas

### Solución 1: Mejorar Captura de Carreras

**A. Crear nueva colección para sesiones completas**

```typescript
// models/CompleteRaceSession.ts
interface ICompleteRaceSession {
  sessionId: string;
  sessionName: string;
  sessionType: string;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'finished';

  // Snapshot de todos los pilotos cada X segundos
  snapshots: [
    {
      timestamp: Date,
      drivers: [
        {
          name: string,
          position: number,
          lapCount: number,
          lastLapTime: number,
          bestTime: number
        }
      ]
    }
  ],

  // Índices para búsqueda rápida
  drivers: string[], // Lista de nombres de pilotos
  kartNumbers: number[], // Lista de karts usados
}
```

**B. Mejorar detección de vueltas**

```typescript
// Agregar validación de tiempo entre vueltas
private static isNewLap(current: SMSDriverData, previous?: SMSDriverData): boolean {
  if (!previous) return true;

  const lapIncreased = current.L > (previous.L || 0);

  // Validación adicional: tiempo cambió significativamente
  const timeChanged = Math.abs((current.T || 0) - (previous.T || 0)) > 1000; // >1 segundo

  return lapIncreased || (timeChanged && current.L === previous.L);
}
```

---

### Solución 2: Sistema de Búsqueda de Carreras

**A. Crear índices en MongoDB**

```typescript
// Agregar a DriverRaceData schema
DriverRaceDataSchema.index({ 'sessions.sessionDate': -1 });
DriverRaceDataSchema.index({ 'sessions.sessionType': 1 });
DriverRaceDataSchema.index({ 'sessions.kartNumber': 1 });

// Crear índice compuesto para búsqueda combinada
DriverRaceDataSchema.index({
  'sessions.sessionDate': -1,
  'sessions.sessionType': 1,
  driverName: 1
});
```

**B. Nueva API para búsqueda**

```typescript
// api/races/search/route.ts
GET /api/races/search?
  startDate=2024-01-01&
  endDate=2024-12-31&
  sessionType=clasificacion&
  driverName=Manu&
  kartNumber=15&
  limit=50&
  offset=0

Response:
{
  total: 150,
  races: [
    {
      sessionId: string,
      sessionName: string,
      sessionDate: Date,
      driverName: string,
      position: number,
      bestTime: number,
      totalLaps: number,
      kartNumber: number
    }
  ]
}
```

**C. Componente de búsqueda**

```typescript
// components/RaceSearchPanel.tsx
<RaceSearchPanel>
  <DateRangePicker />
  <SessionTypeFilter options={['clasificacion', 'carrera', 'practica']} />
  <DriverNameSearch />
  <KartNumberFilter />
  <SearchButton />

  <RaceResultsTable
    results={searchResults}
    onRowClick={(race) => showRaceDetails(race)}
  />
</RaceSearchPanel>
```

---

### Solución 3: Ranking Completo de Karts

**A. Crear vista completa de karts**

```typescript
// api/karts/ranking/route.ts
GET /api/karts/ranking?includeAll=true

Response:
{
  karts: [
    {
      kartNumber: number,
      bestTime: number,
      driverName: string,
      totalRaces: number,
      avgTime: number,
      lastUsed: Date,
      status: 'top20' | 'active' | 'inactive'
    }
  ]
}
```

**B. Componente expandible**

```typescript
// components/AllKartsRanking.tsx
<AllKartsRanking>
  {/* Top 20 siempre visible */}
  <TopKarts limit={20} />

  {/* Expandible para ver todos */}
  <ExpandableSection title="Ver todos los karts">
    <KartGrid karts={allKarts} />
  </ExpandableSection>
</AllKartsRanking>
```

---

## 🎯 Plan de Implementación

### Fase 1: Diagnóstico (INMEDIATO)
- [ ] Agregar logging detallado en `isNewLap()`
- [ ] Monitorear cuántas vueltas se detectan vs esperadas
- [ ] Verificar que DriverRaceData tenga TODAS las sesiones

### Fase 2: Búsqueda de Carreras (ALTA PRIORIDAD)
- [ ] Crear índices en MongoDB
- [ ] Crear API `/api/races/search`
- [ ] Crear componente `RaceSearchPanel`
- [ ] Integrar en dashboard

### Fase 3: Ranking de Karts (MEDIA PRIORIDAD)
- [ ] Crear API `/api/karts/ranking`
- [ ] Modificar `TrackRecordsCard` para mostrar todos
- [ ] Agregar estadísticas de karts (total carreras, avg time)

### Fase 4: Optimización Live Racing (BAJA PRIORIDAD)
- [ ] Crear `CompleteRaceSession` collection
- [ ] Implementar snapshots cada 10 segundos
- [ ] Validación mejorada de nuevas vueltas

---

## 📈 Métricas de Éxito

1. **Live Racing:**
   - ✅ 100% de las carreras capturadas
   - ✅ 0 vueltas duplicadas
   - ✅ Datos vuelta por vuelta completos

2. **Búsqueda:**
   - ✅ Búsqueda por rango de fechas
   - ✅ Filtro por tipo de sesión
   - ✅ Filtro por piloto y kart
   - ✅ Resultados en < 500ms

3. **Rankings:**
   - ✅ Vista de TODOS los karts
   - ✅ Estadísticas por kart
   - ✅ Ordenamiento configurable

---

## 🔍 Consultas Útiles para Debugging

### Ver todas las sesiones de un piloto
```javascript
db.driver_race_data.findOne(
  { driverName: "Manu" },
  { sessions: 1 }
)
```

### Contar vueltas por sesión
```javascript
db.driver_race_data.aggregate([
  { $unwind: "$sessions" },
  { $unwind: "$sessions.laps" },
  { $group: {
      _id: "$sessions.sessionId",
      sessionName: { $first: "$sessions.sessionName" },
      totalLaps: { $sum: 1 }
  }},
  { $sort: { totalLaps: -1 } }
])
```

### Ver todos los karts únicos
```javascript
db.driver_race_data.aggregate([
  { $unwind: "$sessions" },
  { $group: {
      _id: "$sessions.kartNumber",
      bestTime: { $min: "$sessions.bestTime" },
      totalRaces: { $sum: 1 }
  }},
  { $sort: { bestTime: 1 } }
])
```

---

## 🚀 Siguiente Paso Recomendado

**OPCIÓN A: Diagnóstico First**
1. Agregar logging en `isNewLap()`
2. Correr una sesión de prueba
3. Verificar que todas las vueltas se capturan
4. Basado en resultados, ajustar lógica

**OPCIÓN B: Feature First**
1. Implementar búsqueda de carreras (más valor inmediato)
2. Implementar ranking completo de karts
3. Luego optimizar live racing si hay problemas

---

**¿Qué prefieres hacer primero?**
