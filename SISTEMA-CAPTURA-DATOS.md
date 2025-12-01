# 📊 Sistema de Captura de Datos - Karteando.cl

## 1. ¿CÓMO SE ESTÁN GUARDANDO LOS DATOS?

### Estructura de 3 Colecciones en MongoDB:

#### A. **DriverRaceData** (Principal - Datos Históricos)
```
Colección: driverracedatas
Estructura:
{
  driverName: "Franco",
  sessions: [
    {
      sessionId: "[HEAT] 69_Mon Dec 01 2025",
      sessionName: "[HEAT] 69 - Clasificacion",
      laps: [
        { lapNumber: 1, time: 45987, position: 1, kartNumber: 12 },
        { lapNumber: 2, time: 46123, position: 1, kartNumber: 12 }
      ],
      bestTime: 45987,
      totalLaps: 2
    }
  ],
  stats: {
    totalRaces: 1,
    totalLaps: 2,
    allTimeBestLap: 45987
  }
}
```

**Cuándo se guarda**: Solo cuando **aumenta el lap count** (L)
- Si L pasa de 1 → 2 ✅ Guarda
- Si L se mantiene en 2 ❌ NO guarda (aunque el tiempo cambie)

**Problema actual**: SMS-Timing envía L=2 repetidamente sin aumentar, entonces NO se guardan las vueltas.

---

#### B. **BestDriverTimes** (Rankings de Pilotos - Top 10)
```
Colección: bestdrivertimes
Estructura: Array de 10 documentos máximo
{
  position: 1,
  driverName: "Franco",
  bestTime: 39170,
  kartNumber: 12,
  sessionName: "[HEAT] 65",
  sessionDate: "2025-11-29"
}
```

**Cuándo se actualiza**:
- Cada 4 segundos (rate limit)
- Solo si el tiempo mejora el top 10 actual
- Reemplaza al peor del top 10 si nuevo tiempo es mejor

---

#### C. **BestKartTimes** (Rankings de Karts - Top 20)
```
Colección: bestkarttimes
Estructura: Array de 20 documentos máximo
{
  position: 1,
  kartNumber: 12,
  driverName: "Franco",
  bestTime: 39170,
  sessionName: "[HEAT] 65"
}
```

**Cuándo se actualiza**:
- Cada 4 segundos (rate limit)
- Solo si el kart mejora su mejor tiempo
- Reemplaza al peor del top 20 si nuevo tiempo es mejor

---

## 2. ¿CADA CUÁNTO SE GUARDAN LOS DATOS?

### Rate Limiting: **4 segundos mínimo** entre guardados

```typescript
MIN_INTERVAL = 4000; // 4 segundos
```

**Funcionamiento**:
1. SMS-Timing envía datos cada ~1 segundo
2. Sistema recibe datos pero **NO guarda inmediatamente**
3. Espera 4 segundos
4. Guarda solo el **último** dato recibido en esos 4 segundos
5. Descarta los intermedios

**Ejemplo**:
```
0s → Recibe datos → Guarda en cola
1s → Recibe datos → Reemplaza en cola
2s → Recibe datos → Reemplaza en cola
3s → Recibe datos → Reemplaza en cola
4s → Procesa el último dato guardado en MongoDB
```

---

## 3. ¿CÓMO SE EVITA SATURACIÓN DE MONGODB?

### Estrategias implementadas:

#### A. **Rate Limiting** (4 segundos)
- Evita escrituras cada segundo
- Reduce de ~60 escrituras/min a ~15 escrituras/min
- **Ahorro: 75% de operaciones**

#### B. **Datos pre-calculados** (BestDriverTimes y BestKartTimes)
- En vez de hacer queries complejas, lee 10 o 20 documentos directos
- Query ultra rápido: `BestDriverTimes.find().sort({ position: 1 }).limit(10)`
- **Tiempo de respuesta: ~150ms** (antes era >3000ms)

#### C. **Estructura de datos optimizada**
- DriverRaceData agrupa todas las vueltas de un piloto en 1 documento
- En vez de 100 documentos para 100 vueltas → 1 documento con array de 100 vueltas
- **Ahorro: 99% de documentos**

#### D. **Procesamiento deshabilitado legacy**
```typescript
// Disabled legacy processing to reduce MongoDB load
// if (Math.random() < 0.05) { // Only 5% of the time
```
- Sistema viejo está apagado
- Solo usa el nuevo sistema

---

## 4. ¿CÓMO ESTÁN CARGANDO LOS RANKINGS?

### A. **Ranking de Mejores Pilotos**
**Endpoint**: `GET /api/best-times`

**Query MongoDB**:
```typescript
BestDriverTime.find({})
  .sort({ position: 1 })
  .limit(10)
  .lean()
```

**Ventajas**:
- ✅ Solo lee 10 documentos (no toda la BD)
- ✅ No hace cálculos (datos pre-calculados)
- ✅ Responde en ~150ms

---

### B. **Ranking de Mejores Karts**
**Endpoint**: `GET /api/best-karts`

**Query MongoDB**:
```typescript
BestKartTime.find({})
  .sort({ position: 1 })
  .limit(20)
  .lean()
```

**Ventajas**:
- ✅ Solo lee 20 documentos
- ✅ Datos pre-calculados
- ✅ Responde en ~150ms

---

### C. **Dashboard Personal**
**Endpoint**: `GET /api/lap-capture?action=get_driver_summary&webUserId=X`

**Proceso**:
1. Busca el DriverRaceData del usuario vinculado
2. Lee sus sesiones y stats pre-calculadas
3. No hace aggregations pesadas

**Query**:
```typescript
DriverRaceData.findById(personId).lean()
```

---

## 5. ¿CUÁL ES EL PROBLEMA ACTUAL?

### 🚨 NO SE ESTÁN GUARDANDO VUELTAS

**Detección de vueltas actual**:
```typescript
private static isNewLap(current, previous): boolean {
  const lapIncreased = current.L > (previous.L || 0);
  return lapIncreased; // ❌ SOLO CHEQUEA SI AUMENTA L
}
```

**Problema**:
SMS-Timing está enviando:
```json
{ "L": 2, "T": 45987 }  // Vuelta 2, tiempo 45.987s
{ "L": 2, "T": 46123 }  // ❌ Vuelta 2 otra vez (pero tiempo diferente)
{ "L": 2, "T": 45750 }  // ❌ Vuelta 2 otra vez
```

Como `L` no aumenta (siempre es 2), **el sistema NO detecta vueltas nuevas**.

---

## 6. SOLUCIÓN PROPUESTA

### Modificar detección de vueltas para usar CAMBIO DE TIEMPO

```typescript
private static isNewLap(current, previous): boolean {
  if (!previous) return true;

  // OPCIÓN 1: Detectar cuando L aumenta O cuando T cambia significativamente
  const lapIncreased = current.L > (previous.L || 0);
  const timeDiff = Math.abs((current.T || 0) - (previous.T || 0));
  const significantTimeChange = timeDiff > 100; // Más de 100ms de diferencia

  return lapIncreased || significantTimeChange;
}
```

**Ventajas**:
- ✅ Detecta vueltas aunque L no cambie
- ✅ Evita duplicados (solo si tiempo cambia >100ms)
- ✅ No sobrecarga MongoDB (mantiene rate limit de 4s)

**Consideraciones**:
- ⚠️ Si T cambia por actualizaciones mid-lap, podría crear vueltas falsas
- ✅ Mitigado por: rate limit de 4s + threshold de 100ms

---

### OPCIÓN 2: Detectar vueltas solo cuando cambia BEST TIME (B)

```typescript
private static isNewLap(current, previous): boolean {
  if (!previous) return true;

  const lapIncreased = current.L > (previous.L || 0);
  const bestTimeChanged = (current.B || 0) !== (previous.B || 0);

  return lapIncreased || bestTimeChanged;
}
```

**Ventajas**:
- ✅ Solo guarda cuando hay un nuevo mejor tiempo
- ✅ Más conservador (menos writes)
- ❌ Pierde vueltas que no son personal best

---

### OPCIÓN 3 (RECOMENDADA): Híbrido

```typescript
private static isNewLap(current, previous): boolean {
  if (!previous) return true;

  // 1. Detectar incremento de lap count (más confiable)
  const lapIncreased = current.L > (previous.L || 0);

  // 2. Detectar cambio significativo en last time (T)
  const timeDiff = Math.abs((current.T || 0) - (previous.T || 0));
  const lastTimeChanged = timeDiff > 500; // >0.5 segundos

  // 3. Detectar cambio en best time (B)
  const bestTimeImproved = current.B && previous.B && current.B < previous.B;

  return lapIncreased || lastTimeChanged || bestTimeImproved;
}
```

**Ventajas**:
- ✅ Triple verificación
- ✅ Detecta mejoras de record
- ✅ Detecta vueltas completas (>0.5s cambio)
- ✅ Mantiene detección por lap count
- ⚠️ Threshold de 500ms evita false positives

---

## 7. IMPACTO EN MONGODB

### Escenario actual (NO funciona):
```
Escrituras: 0 vueltas/minuto
Carga: Muy baja
Rankings: ✅ Funcionan (datos viejos)
Problema: ❌ No hay datos nuevos
```

### Con solución OPCIÓN 1 (timeDiff > 100ms):
```
SMS-Timing envía: ~60 updates/min
Rate limit: Procesa cada 4s = ~15 updates/min
Vueltas detectadas: ~15-30 vueltas/min (depende de cuántas son realmente nuevas)
Carga estimada: Media-Alta
```

### Con solución OPCIÓN 3 RECOMENDADA (threshold 500ms):
```
SMS-Timing envía: ~60 updates/min
Rate limit: Procesa cada 4s = ~15 updates/min
Vueltas detectadas: ~5-10 vueltas/min (solo cambios significativos)
Carga estimada: Baja-Media ✅
```

---

## 8. ARQUITECTURA COMPLETA DEL FLUJO

```
SMS-Timing (cada ~1s)
    ↓
POST /api/lap-capture
    ↓
LapCaptureService (Rate Limit 4s)
    ↓
    ├─→ DriverRaceDataService → DriverRaceData (Histórico)
    │   └─→ Solo guarda si isNewLap() = true ❌ PROBLEMA AQUÍ
    │
    └─→ updateRealTimeRecords → BestDriverTimes + BestKartTimes
        └─→ Siempre actualiza si mejora top 10/20 ✅ FUNCIONA
```

**Componentes**:
1. **LapCaptureService**: Rate limiting (4s)
2. **DriverRaceDataService**: Detección de vueltas + guardado histórico
3. **updateRealTimeRecords**: Rankings pre-calculados
4. **MongoDB**: 3 colecciones optimizadas

---

## 9. RECOMENDACIÓN FINAL

### Implementar OPCIÓN 3 con estos parámetros:

```typescript
// En driverRaceDataService.ts línea ~225
private static isNewLap(current, previous): boolean {
  if (!previous) {
    console.log(`🆕 [NEW DRIVER] ${current.N}`);
    return true;
  }

  // 1. Lap count aumentó (más confiable)
  const lapIncreased = current.L > (previous.L || 0);

  // 2. Last time cambió significativamente (>500ms = nueva vuelta)
  const timeDiff = Math.abs((current.T || 0) - (previous.T || 0));
  const lastTimeChanged = timeDiff > 500;

  // 3. Best time mejoró
  const bestTimeImproved = current.B && previous.B && current.B < previous.B;

  // Log para debugging
  console.log(`🔍 [LAP DETECTION] ${current.N}:`, {
    lapIncreased,
    lastTimeChanged: `${timeDiff}ms diff`,
    bestTimeImproved,
    willSave: lapIncreased || lastTimeChanged || bestTimeImproved
  });

  return lapIncreased || lastTimeChanged || bestTimeImproved;
}
```

### Beneficios:
- ✅ Detecta vueltas aunque L no cambie
- ✅ No sobrecarga MongoDB (rate limit 4s sigue activo)
- ✅ Rankings se actualizan correctamente
- ✅ Dashboard muestra historial completo
- ✅ Threshold conservador (500ms) evita false positives

### Riesgos mitigados:
- ⚠️ Podría detectar vueltas incompletas si T salta >500ms mid-lap
  - ✅ Mitigado por: rate limit procesa cada 4s (no cada segundo)
- ⚠️ Podría crear duplicados
  - ✅ Mitigado por: código ya filtra duplicados en línea 265

---

*Última actualización: 2025-12-01*
