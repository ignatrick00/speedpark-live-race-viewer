# Solución: Sobrecarga de MongoDB

## 🚨 Problema Real

MongoDB se **traba/pega** porque recibe DEMASIADAS llamadas simultáneas desde SMS-Timing.

### Escenario actual:

```
SMS-Timing envía update cada 1-2 segundos
↓
20 pilotos en carrera
↓
Cada update procesa 20 pilotos
↓
Cada piloto hace ~3-5 operaciones MongoDB:
  - findOne (buscar piloto)
  - save (guardar sesión)
  - update (actualizar stats)
  - update (rankings)
↓
Total: 60-100 operaciones MongoDB por segundo 😱
```

**Resultado:** MongoDB se satura, algunas operaciones fallan, se pierden vueltas.

---

## 💡 Soluciones Propuestas

### Solución 1: **Batching/Debouncing** (RÁPIDO - RECOMENDADO)

Agrupar múltiples updates y procesarlos juntos:

```typescript
// Queue de updates pendientes
private static updateQueue: SMSData[] = [];
private static processingTimer: NodeJS.Timeout | null = null;

static async processLapData(smsData: SMSData): Promise<void> {
  // Agregar a la cola
  this.updateQueue.push(smsData);

  // Si ya hay un timer, no hacer nada (esperar)
  if (this.processingTimer) {
    console.log(`⏳ Update agregado a cola (${this.updateQueue.length} pendientes)`);
    return;
  }

  // Programar procesamiento en 3 segundos
  this.processingTimer = setTimeout(async () => {
    const batch = [...this.updateQueue];
    this.updateQueue = [];
    this.processingTimer = null;

    console.log(`📦 Procesando batch de ${batch.length} updates`);
    await this.processBatch(batch);
  }, 3000); // 3 segundos de debounce
}
```

**Reducción:** De ~60 ops/seg a ~20 ops cada 3 seg = **90% menos carga**

---

### Solución 2: **Bulk Operations** (MEDIO)

Usar operaciones bulk de MongoDB en vez de una por una:

```typescript
// En vez de:
for (const driver of drivers) {
  await DriverRaceData.findOne({ driverName: driver.N });
  await driverRecord.save();
}

// Hacer:
const bulkOps = drivers.map(driver => ({
  updateOne: {
    filter: { driverName: driver.N },
    update: { $set: { ... } },
    upsert: true
  }
}));

await DriverRaceData.bulkWrite(bulkOps);
```

**Reducción:** De 40 operaciones a 1 operación = **97.5% menos carga**

---

### Solución 3: **Caché en memoria** (AVANZADO)

Mantener datos en memoria, guardar a MongoDB periódicamente:

```typescript
// Cache de sesiones activas
private static activeSessionsCache: Map<string, SessionData> = new Map();

static async processLapData(smsData: SMSData): Promise<void> {
  // Actualizar solo en memoria
  this.updateCache(smsData);

  // Guardar a MongoDB cada 30 segundos
  if (!this.saveTimer) {
    this.saveTimer = setInterval(() => {
      this.flushCacheToDatabase();
    }, 30000);
  }
}
```

**Reducción:** De continuo a cada 30 seg = **99% menos carga**

---

### Solución 4: **Rate Limiting** (INMEDIATO - PARCHE)

Limitar cuántos updates se procesan por segundo:

```typescript
private static lastProcessTime = 0;
private static MIN_INTERVAL = 5000; // 5 segundos mínimo

static async processLapData(smsData: SMSData): Promise<void> {
  const now = Date.now();
  const timeSinceLastProcess = now - this.lastProcessTime;

  if (timeSinceLastProcess < this.MIN_INTERVAL) {
    console.log(`⏭️ Skipping update (too soon: ${timeSinceLastProcess}ms)`);
    return; // Ignorar este update
  }

  this.lastProcessTime = now;
  // Procesar normalmente...
}
```

**Reducción:** Máximo 1 procesamiento cada 5 seg = **80% menos carga**

---

## 🎯 Plan de Implementación Recomendado

### FASE 1: Parche Inmediato (5 minutos)
✅ Implementar **Rate Limiting** (Solución 4)
- Rápido de implementar
- Reduce carga inmediatamente
- No pierde datos críticos

### FASE 2: Optimización Media (30 minutos)
✅ Implementar **Batching/Debouncing** (Solución 1)
- Agrupa updates inteligentemente
- Reduce carga significativamente
- Mantiene datos en tiempo "casi real"

### FASE 3: Optimización Avanzada (2-3 horas)
✅ Implementar **Bulk Operations** (Solución 2)
- Reescribir operaciones a bulk
- Máxima eficiencia de MongoDB
- Requiere más testing

### FASE 4: Caché (Opcional - futuro)
⚪ Implementar caché si aún hay problemas

---

## 📝 Código Propuesto - FASE 1 (Inmediato)

```typescript
// src/lib/lapCaptureService.ts

export class LapCaptureService {

  // Rate limiting config
  private static lastProcessTime = 0;
  private static MIN_INTERVAL = 5000; // 5 segundos entre procesamiento
  private static pendingUpdate: SMSData | null = null;
  private static updateTimer: NodeJS.Timeout | null = null;

  static async processLapData(smsData: SMSData): Promise<void> {
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;

    // Guardar el update más reciente
    this.pendingUpdate = smsData;

    if (timeSinceLastProcess < this.MIN_INTERVAL) {
      // Demasiado pronto, programar para después
      if (!this.updateTimer) {
        const delay = this.MIN_INTERVAL - timeSinceLastProcess;
        console.log(`⏳ Rate limited: programando update en ${delay}ms`);

        this.updateTimer = setTimeout(async () => {
          this.updateTimer = null;
          if (this.pendingUpdate) {
            await this.processLapDataImmediate(this.pendingUpdate);
          }
        }, delay);
      }
      return;
    }

    // Procesar inmediatamente
    await this.processLapDataImmediate(smsData);
  }

  private static async processLapDataImmediate(smsData: SMSData): Promise<void> {
    this.lastProcessTime = Date.now();
    this.pendingUpdate = null;

    try {
      console.log(`🔍 Processing lap data: ${smsData.N}`);

      await connectDB();
      await DriverRaceDataService.processRaceData(smsData);
      await this.updateRealTimeRecords(smsData);

      console.log(`✅ Lap data processed successfully`);

    } catch (error) {
      console.error('❌ Error processing lap data:', error);
      throw error;
    }
  }

  // Resto del código...
}
```

---

## 📊 Impacto Esperado

### Antes (Sin rate limiting):
```
Updates SMS: cada 1-2 segundos
MongoDB ops: 60-100 ops/segundo
Resultado: ⚠️ Sobrecarga, timeouts, datos perdidos
```

### Después (Con rate limiting 5 seg):
```
Updates SMS: cada 1-2 segundos (pero ignorados)
Procesamiento: cada 5 segundos
MongoDB ops: 15-20 ops cada 5 segundos
Resultado: ✅ Sin sobrecarga, datos completos
```

---

## ⚠️ Trade-offs

### Rate Limiting:
- ✅ Reduce carga inmediatamente
- ✅ Fácil de implementar
- ⚠️ Datos "menos" en tiempo real (5 seg delay)
- ⚠️ Ignora updates intermedios (pero guarda el último)

### Batching:
- ✅ Procesa todos los updates
- ✅ Reduce carga inteligentemente
- ⚠️ Más complejo
- ⚠️ Delay de 3-5 segundos

### Bulk Operations:
- ✅ Máxima eficiencia
- ✅ Procesa todo
- ⚠️ Requiere reescribir queries
- ⚠️ Más testing necesario

---

## 🚀 ¿Qué implementamos primero?

**Opción A:** Rate Limiting (5 min) - Solución inmediata
**Opción B:** Rate Limiting + Batching (30 min) - Solución robusta
**Opción C:** Rate Limiting + Batching + Bulk Ops (3 horas) - Solución óptima

**Recomiendo: Opción A primero, luego B si funciona bien**
