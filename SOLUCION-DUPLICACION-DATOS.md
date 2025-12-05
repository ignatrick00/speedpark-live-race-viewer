# ✅ Solución Completa - Eliminación de Duplicación de Datos

## 🎯 PROBLEMA RESUELTO

**Antes:** El sistema guardaba datos en **DOS lugares diferentes**, causando:
- ❌ Conflictos de versión (VersionError)
- ❌ Escrituras duplicadas en MongoDB
- ❌ Pérdida de datos por colisiones
- ❌ Aplicación local y Vercel compitiendo por los mismos datos

**Ahora:** Sistema unificado con **UNA SOLA fuente de verdad**
- ✅ Una sola tabla MongoDB: `race_sessions_v0`
- ✅ Sin conflictos de concurrencia
- ✅ Todos los datos en un solo lugar
- ✅ Retry automático para errores temporales

---

## 📊 ARQUITECTURA FINAL

```
SMS-Timing WebSocket (kartodromo)
    ↓
Railway WebSocket Server
    ↓
POST /api/lap-capture (action: process_race_data_v0)
    ↓
MongoDB: race_sessions_v0 collection
    ↓
┌─────────────────────────────────────┐
│  TODAS LAS PÁGINAS LEEN DE AQUÍ:   │
├─────────────────────────────────────┤
│  • /dashboard (rankings, stats)    │
│  • /stats (facturación, métricas)  │
│  • /ranking (clasificaciones)      │
│  • /admin/drivers (gestión)        │
└─────────────────────────────────────┘
```

---

## 🔧 CAMBIOS REALIZADOS

### 1️⃣ **`/src/lib/statsService.ts`** - Solo JSON, sin MongoDB

**ANTES:**
```typescript
static async recordSession(sessionName, drivers, smsData) {
  // 1. Guardar en JSON
  tracker.recordSession(sessionName, drivers)

  // 2. Guardar en MongoDB (race_sessions) ← DUPLICADO
  RaceSession.create({...})

  // 3. Procesar linking de usuarios
  UserLinkingService.processRaceData(...)
}
```

**AHORA:**
```typescript
static async recordSession(sessionName, drivers, smsData) {
  // Solo guardar en JSON para facturación
  tracker.recordSession(sessionName, drivers)

  // MongoDB se maneja por /api/lap-capture → race_sessions_v0
  // Esto previene escrituras duplicadas

  return {
    success: true,
    jsonSession,
    mongoSession: null,
    message: 'Session recorded in JSON for billing. MongoDB handled by /api/lap-capture'
  }
}
```

**Nuevos métodos agregados:**
```typescript
// Leer de race_sessions_v0 en lugar de race_sessions
static async getRecentSessions(limit = 10)
static async getCombinedStatsFromV0()
```

---

### 2️⃣ **`/src/app/api/stats/route.ts`** - Lee de V0

**ANTES:**
```typescript
// Leía de tabla antigua: race_sessions
const tracker = await getStatsTracker()
const jsonStats = await tracker.getStats()
const combinedStats = await StatsService.getCombinedStats()
```

**AHORA:**
```typescript
// Lee de tabla nueva: race_sessions_v0
const v0Stats = await StatsService.getCombinedStatsFromV0()
const recentSessions = await StatsService.getRecentSessions(20)

return NextResponse.json({
  ...v0Stats,
  recentSessions,
  sources: {
    v0: 'available',  // Nueva fuente
    json: 'deprecated'  // Solo para facturación
  }
})
```

---

### 3️⃣ **`/src/lib/raceSessionServiceV0.ts`** - Retry Logic

**Agregado:**
- ✅ Retry automático en caso de VersionError (hasta 3 intentos)
- ✅ Delay aleatorio (0-50ms) para reducir colisiones
- ✅ Manejo graceful de errores de duplicados

```typescript
static async processRaceData(smsData, retryCount = 0) {
  const MAX_RETRIES = 3;

  try {
    // Delay aleatorio para evitar colisiones
    if (retryCount === 0) {
      const randomDelay = Math.random() * 50;
      await new Promise(resolve => setTimeout(resolve, randomDelay));
    }

    // ... procesamiento normal ...

  } catch (error: any) {
    // Retry automático en caso de VersionError
    if (error.name === 'VersionError' && retryCount < MAX_RETRIES) {
      const waitTime = (retryCount + 1) * 100;
      console.log(`⚠️ Version conflict, retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.processRaceData(smsData, retryCount + 1);
    }

    // Ignorar duplicados de sessionId
    if (error.code === 11000 && error.message.includes('sessionId')) {
      console.log(`⚠️ Session already exists, continuing...`);
      return;
    }

    throw error;
  }
}
```

---

### 4️⃣ **Railway WebSocket** - PENDIENTE DE DEPLOY

**Archivo:** `railway-websocket/websocket-server.js`

**Cambios a realizar:**

```javascript
// Línea 56-60: COMENTAR recordSessionStats
// ANTES:
await recordSessionStats(testData)
await captureLapByLapData(testData)

// DESPUÉS:
// await recordSessionStats(testData)  // ← COMENTADO
await captureLapByLapData(testData)

// Línea 247-250: CAMBIAR a process_race_data_v0
// ANTES:
body: JSON.stringify({
  action: 'process_lap_data',
  sessionData: smsData
})

// DESPUÉS:
body: JSON.stringify({
  action: 'process_race_data_v0',  // ← V0
  sessionData: smsData
})
```

**Ver instrucciones completas en:** [RAILWAY-WEBSOCKET-UPDATE.md](./RAILWAY-WEBSOCKET-UPDATE.md)

---

## 📋 CHECKLIST DE DEPLOY

### ✅ COMPLETADO (Local):
- [x] Modificar `statsService.ts` - Solo JSON, sin MongoDB
- [x] Crear métodos `getCombinedStatsFromV0()` y `getRecentSessions()`
- [x] Actualizar `/api/stats` para leer de `race_sessions_v0`
- [x] Agregar retry logic en `raceSessionServiceV0.ts`
- [x] Crear documentación de cambios

### 🚀 PENDIENTE (Railway):
- [ ] Editar `railway-websocket/websocket-server.js`
- [ ] Comentar llamada a `recordSessionStats()`
- [ ] Cambiar `action: 'process_lap_data'` → `'process_race_data_v0'`
- [ ] Commit y push a repositorio de Railway
- [ ] Deploy en Railway
- [ ] Verificar logs: debe decir `[V0] Race data processed successfully`

### ✅ VERIFICACIÓN:
- [ ] No más `VersionError` en logs
- [ ] No más `E11000 duplicate key error`
- [ ] Solo escrituras en `race_sessions_v0`
- [ ] Página `/stats` muestra datos correctos
- [ ] Dashboard muestra rankings actualizados

---

## 🔍 CÓMO VERIFICAR QUE FUNCIONA

### 1. Logs de Railway (después del deploy):
```bash
railway logs

# ✅ DEBE MOSTRAR:
[V0] Capturando datos en race_sessions_v0: "[HEAT] 61 - Clasificacion" - 12 pilotos
✅ [V0] Race data processed successfully

# ❌ NO DEBE MOSTRAR:
MongoDB session created (tabla antigua)
VersionError: No matching document found
E11000 duplicate key error
```

### 2. Verificar MongoDB directamente:
```javascript
// Ejecutar verify-laps.js
node verify-laps.js

# Debería mostrar:
📊 ÚLTIMAS 5 SESIONES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 [HEAT] 61 - Clasificacion
📅 05-12-2025, 6:45:00 p. m.
👥 Drivers: 15
🔢 Total laps: 120
```

### 3. Verificar página /stats:
```bash
# Abrir https://karteando.cl/stats
# Debe mostrar:
- Ingresos del día actualizados
- Top 10 corredores del mes
- Gráfico de ganancias por hora
- Sesiones recientes con datos reales
```

---

## 📊 BASES DE DATOS - ESTADO FINAL

| Base de Datos | Uso | Escritura | Lectura |
|---------------|-----|-----------|---------|
| `stats-sessions.json` | Facturación legacy | `/api/stats` (POST) | Deprecated |
| `race_sessions` | **OBSOLETO** | ❌ NINGUNO | ❌ NINGUNO |
| `race_sessions_v0` | **ÚNICA FUENTE** | `/api/lap-capture` V0 | `/stats`, `/dashboard`, `/ranking` |
| `driver_race_data` | **OBSOLETO** | ❌ NINGUNO | ❌ NINGUNO |

---

## 🎯 BENEFICIOS

### Performance:
- ✅ **50% menos escrituras** a MongoDB
- ✅ **Sin conflictos** de concurrencia
- ✅ **Retry automático** para errores temporales

### Mantenibilidad:
- ✅ **Una sola fuente de verdad** (`race_sessions_v0`)
- ✅ **Código más simple** - menos duplicación
- ✅ **Fácil debugging** - un solo lugar donde buscar

### Confiabilidad:
- ✅ **Sin pérdida de datos** por colisiones
- ✅ **Datos consistentes** en toda la app
- ✅ **Logs más claros** - menos ruido

---

## 🚨 IMPORTANTE

**NO correr servidor local cuando hay carreras en producción**

Si necesitas desarrollar localmente:
```env
# .env.local
MONGODB_URI=mongodb://localhost:27017/karteando-dev  # BD separada
```

O simplemente:
```bash
# Detener servidor local durante carreras
# La app de Vercel manejará todo
```

---

## 📞 SOPORTE

Si algo no funciona después del deploy:

1. **Verificar logs de Railway:** `railway logs`
2. **Verificar MongoDB:** `node verify-laps.js`
3. **Verificar `/stats`:** Abrir página y ver console
4. **Rollback si es necesario:** Volver a versión anterior en Railway

---

**Última actualización:** 05-12-2025
**Estado:** ✅ Cambios locales completados - Pendiente deploy Railway
