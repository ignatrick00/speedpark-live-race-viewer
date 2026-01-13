# 🔍 RaceFacer WebSocket Inspector

Herramientas para analizar el WebSocket y API de RaceFacer (KM42 Paine).

---

## 📁 Archivos

### 1. `inspect-racefacer-websocket.js`
**Script manual para navegador** - Lo pegas en la consola de Chrome.

**Uso:**
```bash
1. Abre https://live.racefacer.com/KM42Paine en Chrome
2. Presiona F12 (DevTools)
3. Ve a la pestaña "Console"
4. Copia TODO el contenido de inspect-racefacer-websocket.js
5. Pégalo en la consola y presiona Enter
6. Espera a que haya una carrera activa
```

**Qué hace:**
- ✅ Intercepta TODAS las conexiones WebSocket
- ✅ Captura mensajes enviados/recibidos
- ✅ Parsea JSON automáticamente
- ✅ Muestra estadísticas en tiempo real
- ✅ Genera reporte copiable

**Comandos disponibles:**
```javascript
// Ver reporte en cualquier momento
window.inspectorReport()
```

---

### 2. `racefacer-websocket-analyzer.js`
**Script automatizado con Puppeteer** - Análisis completo sin intervención manual.

**Instalación:**
```bash
cd /Users/Ignacio\ Cabrera/Desktop/SAAS/cars/karteando-cl
npm install puppeteer
```

**Uso:**
```bash
node scripts/racefacer-websocket-analyzer.js
```

**Qué hace:**
- ✅ Abre navegador automáticamente
- ✅ Captura TODOS los WebSockets
- ✅ Intercepta HTTP requests/responses
- ✅ Analiza estructura de datos
- ✅ Guarda reporte JSON completo en `racefacer-analysis.json`
- ✅ Detecta API endpoints REST

**Duración:** 2 minutos por defecto (configurable en el código)

---

## 🎯 Objetivo

Determinar:

1. **¿RaceFacer usa WebSocket?**
   - Si sí → Capturar URL y estructura de mensajes
   - Si no → Identificar API REST alternativa

2. **Estructura de datos:**
   - Formato de mensajes (JSON, binary, etc.)
   - Frecuencia de actualizaciones
   - Campos disponibles (tiempos, posiciones, pilotos, etc.)

3. **Autenticación:**
   - ¿Requiere tokens?
   - ¿Headers especiales?
   - ¿Es público o privado?

---

## 📊 Resultados Esperados

### Si encuentran WebSocket:
```json
{
  "websockets": [
    {
      "url": "wss://example.racefacer.com/live/km42paine",
      "messages": [...]
    }
  ]
}
```

### Si usan API REST:
```json
{
  "httpRequests": [
    {
      "method": "GET",
      "url": "https://api.racefacer.com/v1/sessions/active",
      "resourceType": "xhr"
    }
  ]
}
```

---

## 🚀 Próximos Pasos

### Escenario A: WebSocket Detectado
```
1. ✅ Capturar URL exacta
2. ✅ Analizar estructura de mensajes
3. ✅ Implementar cliente en Karteando.cl
4. ⚠️  Solicitar autorización a KM42 Paine
```

### Escenario B: API REST Detectada
```
1. ✅ Documentar endpoints
2. ✅ Analizar rate limits
3. ✅ Implementar polling en Karteando.cl
4. ⚠️  Solicitar autorización a KM42 Paine
```

### Escenario C: Sin datos públicos
```
1. ❌ No hay conexión pública disponible
2. 📞 Contactar directamente a RaceFacer/KM42 Paine
3. 📋 Presentar propuesta de partnership
```

---

## 💡 Tips

### Para mejor captura:
- Ejecuta el script JUSTO ANTES de una carrera programada
- Mantén la pestaña activa (no minimizar)
- Si no hay carrera, puede que no se active el WebSocket

### Debugging:
```javascript
// En DevTools > Network
1. Filtrar por "WS" (WebSocket)
2. Ver frames en tiempo real
3. Click derecho > "Copy as cURL"
```

### Análisis de HTTP:
```javascript
// En DevTools > Network
1. Filtrar por "XHR" o "Fetch"
2. Buscar requests a dominios racefacer.com
3. Click en request > Preview/Response
```

---

## 🔐 Consideraciones Legales

⚠️ **IMPORTANTE:**
- Este análisis es SOLO para fines de investigación
- NO conectarse sin autorización explícita
- NO hacer scraping masivo
- NO vender/compartir datos capturados

✅ **Uso legítimo:**
- Entender tecnología para propuesta comercial
- Contactar a KM42 Paine con propuesta formal
- Solicitar partnership oficial

---

## 📞 Siguiente Acción

**Una vez captures los datos:**

1. **Revisar `racefacer-analysis.json`**
2. **Documentar hallazgos** en este README
3. **Adaptar propuesta SpeedPark** para KM42 Paine
4. **Contactar a KM42 Paine** con oferta win-win

---

## 📋 Hallazgos (✅ Ejecutado: 12 Enero 2026)

### ✅ WebSocket Detectado

```
URL: wss://live.racefacer.com:3123/socket.io/?EIO=4&transport=websocket&sid={session_id}
Protocolo: Socket.IO v4 (EIO=4)
Puerto: 3123 (WSS)
```

### 🔍 Análisis Técnico

**1. Tecnología:**
- ✅ Usa **Socket.IO v4** (no WebSocket nativo)
- ✅ Conexión WSS (segura) en puerto 3123
- ⚠️ Requiere session ID generado dinámicamente

**2. Mensajes Capturados:**
```
Handshake:
- Client → "2probe" (probe request)
- Server → "3probe" (probe response)
- Client → "5" (upgrade transport)

Keepalive (cada ~25 segundos):
- Server → "2" (ping)
- Client → "3" (pong)
```

**3. API REST Endpoints Detectados:**

```bash
# Settings del track
GET https://live.racefacer.com/ajax/settings?slug=km42paine
Headers:
  - x-csrf-token: {token}
  - x-xsrf-token: {token}
  - x-requested-with: XMLHttpRequest

# Live data (timing en tiempo real)
GET https://live.racefacer.com/ajax/live-data?slug=km42paine
Headers:
  - x-csrf-token: {token}
  - x-xsrf-token: {token}
  - x-requested-with: XMLHttpRequest
```

**4. Autenticación:**
- ✅ Requiere **CSRF Token** (generado al cargar página)
- ✅ Requiere **XSRF Token** (en cookies)
- ✅ Requiere **Session Cookie** (live_session)
- ⚠️ Tokens rotan por sesión

**5. Estructura de Datos (Preview):**

Respuesta de `/ajax/live-data`:
```json
{
  "data": {
    "type": "session",
    "status_string": "in_progress",
    "maps_data": [],
    "svg_path": null,
    "track_config": {...}
  }
}
```

Respuesta de `/ajax/settings`:
```json
{
  "data": {
    "number_of_sectors": 0,
    "has_endurances": false,
    "has_logo": false,
    "server_timestamp": 1768249147
  }
}
```

### 📊 Conclusiones

**¿Se puede usar directamente?**
❌ **NO** - Requiere autorización formal

**Razones:**
1. **CSRF Protection** - No puedes hacer requests sin token válido
2. **Session Cookies** - Requiere cookies de sesión legítimas
3. **Socket.IO SID** - Session ID dinámico, no reutilizable
4. **Rate Limiting** - Probablemente tienen límites anti-scraping

**Opciones disponibles:**

✅ **Opción A: API Oficial (Recomendado)**
- Contactar a RaceFacer/KM42 Paine
- Solicitar API key oficial
- Partnership como con SpeedPark

✅ **Opción B: Polling HTTP (Técnicamente posible)**
- Hacer requests a `/ajax/live-data` cada 2-3 segundos
- Manejar tokens CSRF dinámicamente
- ⚠️ Solo con autorización - podría ser bloqueado

❌ **Opción C: WebSocket directo**
- No viable sin session ID válido
- Socket.IO tiene handshake complejo

### 🎯 Recomendación Final

**Contactar a KM42 Paine con propuesta de partnership:**
1. Usar misma propuesta que SpeedPark
2. Ofrecer revenue share + marketing gratuito
3. Solicitar:
   - API key oficial
   - Endpoint público sin rate limits
   - O autorización para polling educado

---

**Creado:** Enero 2026
**Autor:** Karteando.cl Team
**Propósito:** Análisis técnico para partnership KM42 Paine
