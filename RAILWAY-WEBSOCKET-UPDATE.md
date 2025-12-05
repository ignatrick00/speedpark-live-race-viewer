# 🚀 Railway WebSocket Server - Actualización para eliminar duplicación

## ⚠️ PROBLEMA ACTUAL
El servidor de Railway está llamando **DOS APIs diferentes**, causando:
- ❌ Escrituras duplicadas en MongoDB
- ❌ Conflictos de versión (VersionError)
- ❌ Intentos de crear la misma sesión 2 veces

## ✅ SOLUCIÓN
Usar **SOLO** `/api/lap-capture` con la acción `process_race_data_v0` para guardar TODO en `race_sessions_v0`.

---

## 📝 CAMBIOS A REALIZAR EN `railway-websocket/websocket-server.js`

### **Línea 56-60: COMENTAR la llamada a recordSessionStats**

```javascript
// ANTES:
await recordSessionStats(testData)
await captureLapByLapData(testData)

// DESPUÉS:
// ❌ DESHABILITADO: recordSessionStats ahora solo guarda en JSON local
// MongoDB se maneja completamente por captureLapByLapData → race_sessions_v0
// await recordSessionStats(testData)

await captureLapByLapData(testData)
```

### **Línea 247-250: CAMBIAR action a process_race_data_v0**

```javascript
// ANTES:
body: JSON.stringify({
  action: 'process_lap_data',  // ← Estructura antigua
  sessionData: smsData
})

// DESPUÉS:
body: JSON.stringify({
  action: 'process_race_data_v0',  // ← Estructura NUEVA V0
  sessionData: smsData
})
```

---

## 🔧 ARCHIVO COMPLETO ACTUALIZADO

```javascript
// Línea 47-73 (función onmessage)
smsConnection.onmessage = async (event) => {
  if (event.data && event.data !== '{}' && event.data.trim() !== '') {
    try {
      const testData = JSON.parse(event.data)
      if (testData.N && testData.D && Array.isArray(testData.D)) {
        console.log('🏁 DATOS ACTUALIZADOS:', testData.N, '- Pilotos:', testData.D?.length || 0)
        lastSMSData = event.data

        // ❌ DESHABILITADO: /api/stats ahora solo guarda JSON (billing)
        // MongoDB se maneja por /api/lap-capture → race_sessions_v0
        // await recordSessionStats(testData)

        // ✅ ÚNICO GUARDADO: race_sessions_v0 con estructura V0
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

// Línea 230-264 (función captureLapByLapData)
async function captureLapByLapData(smsData) {
  try {
    console.log(`🏁 [V0] Capturando datos en race_sessions_v0: "${smsData.N}" - ${smsData.D.length} pilotos`);

    if (!fetch) {
      console.log('⚠️ Fetch no disponible para lap capture, esperando...');
      return;
    }

    // Llamar a API con acción V0 (nueva estructura)
    const response = await fetch('https://karteando.cl/api/lap-capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'process_race_data_v0',  // ← CAMBIO CLAVE
        sessionData: smsData
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ [V0] Race data processed successfully`);
    } else {
      const errorText = await response.text();
      console.log('⚠️ Error processing race data:', response.status, errorText);
    }

  } catch (error) {
    console.log('⚠️ Error en captureLapByLapData:', error.message);
  }
}
```

---

## 🎯 RESULTADO ESPERADO

Después de estos cambios:

✅ **UNA SOLA llamada a MongoDB** → `/api/lap-capture` → `race_sessions_v0`
✅ **Sin duplicación** de datos
✅ **Sin VersionError** por conflictos de concurrencia
✅ **Datos completos** vuelta por vuelta en `race_sessions_v0`

### Flujo final:
```
SMS-Timing WebSocket
    ↓
Railway Server
    ↓
POST /api/lap-capture (action: process_race_data_v0)
    ↓
race_sessions_v0 collection (MongoDB)
    ↓
Dashboard, Rankings, Stats
```

---

## 📋 CHECKLIST DE DEPLOY

1. [ ] Editar `railway-websocket/websocket-server.js`
2. [ ] Comentar línea `await recordSessionStats(testData)`
3. [ ] Cambiar `action: 'process_lap_data'` → `action: 'process_race_data_v0'`
4. [ ] Commit y push a Railway
5. [ ] Verificar logs: debe decir `[V0] Race data processed successfully`
6. [ ] Verificar MongoDB: solo debe escribir en `race_sessions_v0`
7. [ ] Verificar que no haya más `VersionError` en logs

---

## 🔍 CÓMO VERIFICAR QUE FUNCIONA

```bash
# Ver logs de Railway
railway logs

# Deberías ver:
# ✅ [V0] Capturando datos en race_sessions_v0: "[HEAT] 61 - Clasificacion" - 12 pilotos
# ✅ [V0] Race data processed successfully

# NO deberías ver:
# ❌ MongoDB session created (esto ya no debe pasar)
# ❌ VersionError
# ❌ E11000 duplicate key error
```
