# 🏁 SpeedPark Live Race Viewer

Sistema completo de seguimiento en tiempo real para carreras de karting en SpeedPark con interfaz web moderna y sistema de autenticación automatizado.

![Screenshot](https://img.shields.io/badge/Status-Live-brightgreen) ![WebSocket](https://img.shields.io/badge/WebSocket-Connected-blue) ![AWS](https://img.shields.io/badge/AWS-Ready-orange)

## ✨ Características Principales

### 🌐 **Interfaz Web Moderna (NUEVO)**
- **live-race-viewer.html** - Aplicación web con diseño "Electric Underground"
- **Datos en tiempo real** con WebSocket
- **Panel de mejores tiempos del día** con persistencia local
- **Historial de sesiones** navegable
- **Completamente responsive** (desktop/mobile)

### 📊 **Scripts de Terminal**
- `race-tracker.js` - Dashboard principal con métricas completas
- `websocket-client.js` - Cliente básico WebSocket (logs únicamente)  
- `debug-json.js` - Herramienta de debug para analizar datos JSON

### 🔐 **Sistema de Autenticación SMS-Timing**
- `quick-account-creator.js` - Creación automática de cuentas
- `user-data-extractor.js` - Extracción masiva de datos de usuario
- `SMS_TIMING_AUTHENTICATION_SYSTEM.md` - Documentación completa

## 🚀 Instalación

```bash
npm install ws
```

## 📊 Uso Principal

### Race Tracker (Recomendado)
```bash
node race-tracker.js
```

**Características:**
- ✅ Dashboard en tiempo real con tabla de posiciones
- ✅ Métricas completas: posición, vuelta, mejor tiempo, última vuelta, promedio
- ✅ Detección automática de eventos (nuevas vueltas, mejores tiempos, cambios de posición)
- ✅ Pantalla que se actualiza automáticamente
- ✅ Logging completo en `race-log.txt`
- ✅ Conexión de 2 minutos

### Cliente Básico
```bash
node websocket-client.js
```
- Solo muestra mensajes JSON raw con timestamps
- Guarda todo en `log.txt`

### Debug de Datos
```bash
node debug-json.js
```
- Analiza estructura JSON
- Muestra todos los campos disponibles
- Útil para debugging

## 📈 Dashboard en Tiempo Real

```
🏁 SPEEDPARK LIVE TIMING 🏁
================================================================================
📊 [HEAT] 39 - Clasificacion
⏰ 2025-08-05T18:49:41.755Z
================================================================================
POS | PILOTO      | KART | VUELTA | MEJOR T. | ÚLT. VUELTA | PROMEDIO | GAP     
--------------------------------------------------------------------------------
 1  | Diego      | 17   |  14    | 0:42.943 | 0:51.515   | 0:46.386 |        
 2  | Constanza  | 10   |  13    | 0:47.214 | 0:51.184   | 0:51.027 | 04.271 
--------------------------------------------------------------------------------
```

## 🎯 Explicación de Columnas

| Columna | Descripción |
|---------|-------------|
| **POS** | Posición actual en la carrera |
| **PILOTO** | Nombre del piloto |
| **KART** | Número de kart |
| **VUELTA** | Número de vuelta actual |
| **MEJOR T.** | Mejor tiempo de vuelta logrado |
| **ÚLT. VUELTA** | Tiempo de la última vuelta completada |
| **PROMEDIO** | Tiempo promedio de todas las vueltas |
| **GAP** | Diferencia de tiempo con el líder |

## 🔔 Eventos Detectados

El sistema detecta y notifica automáticamente:

- `🔥 Diego SUBE a la posición 1!` - Cambio de posición hacia arriba
- `📉 Constanza baja a la posición 2` - Cambio de posición hacia abajo  
- `✅ Diego completa vuelta 12 - Tiempo: 0:46.186 (Promedio: 0:46.305)` - Nueva vuelta
- `⚡ Diego MEJOR TIEMPO! 0:42.943` - Nuevo mejor tiempo personal

## 🌐 Conexión WebSocket

- **URL:** `wss://webserver22.sms-timing.com:10015/`
- **Comando inicial:** `START 8501@speedpark`
- **Duración:** 2 minutos automáticos
- **Reconexión:** Manual (ejecutar nuevamente)

## 📝 Estructura de Datos JSON

Los datos llegan en formato JSON con la siguiente estructura clave:

```json
{
  "N": "[HEAT] 39 - Clasificacion",
  "D": [
    {
      "N": "Diego",        // Nombre piloto
      "K": "17",           // Número de kart  
      "P": 1,              // Posición
      "L": 14,             // Número de vuelta
      "T": 43657,          // Última vuelta (ms)
      "B": 42943,          // Mejor tiempo (ms)
      "A": 46386,          // Tiempo acumulado (ms)
      "G": "04.271"        // Gap con líder
    }
  ]
}
```

## 🛠️ Solución de Problemas

### Error de Conexión
```bash
Error de WebSocket: getaddrinfo ENOTFOUND
```
**Solución:** Verificar conexión a internet y que el servidor esté activo.

### No se muestran datos
**Solución:** El servidor puede estar sin carreras activas. Intentar más tarde.

### Tiempos incorrectos
**Solución:** Los tiempos se calculan automáticamente desde los datos del servidor en milisegundos.

## 📂 Archivos de Log

- `race-log.txt` - Log completo del race tracker
- `log.txt` - Log del cliente básico

## 🔧 Personalización

Para modificar la duración de conexión, editar en el archivo:
```javascript
setTimeout(() => {
    log('⏰ Cerrando conexión después de 2 minutos...');
    ws.close();
}, 2 * 60 * 1000); // Cambiar aquí (ms)
```

## 📱 Compatibilidad

- ✅ Node.js 12+
- ✅ Windows, macOS, Linux
- ✅ Terminal/CMD/PowerShell

## 🌐 Interfaz Web Live Race Viewer

### 🚀 Uso Rápido
```bash
# Abrir directamente en navegador
open live-race-viewer.html

# O servir con servidor local  
python -m http.server 8000
# Luego abrir http://localhost:8000/live-race-viewer.html
```

### ✨ Características de la Interfaz Web
- **🎯 Datos en tiempo real**: Conexión WebSocket directa con SMS-Timing
- **🏆 Sistema de ranking**: Posiciones dinámicas y medallas para top 3
- **📊 Mejores tiempos del día**: Panel lateral con persistencia local
- **📋 Historial navegable**: Hasta 50 sesiones guardadas automáticamente
- **🎨 Diseño Electric Underground**: Tipografías futuristas y efectos de brillo
- **📱 Completamente responsive**: Optimizado para desktop y mobile

### 🔧 Debugging Web
1. Abrir **DevTools** (F12)
2. Ir a **Console** para ver logs en tiempo real:
   - ✅ "WebSocket conectado"
   - 📨 "Datos recibidos" 
   - 🏆 "Datos procesados: X pilotos"

### 🚀 Deployment en AWS
El proyecto está listo para deployment en AWS con:
- **S3 Bucket** para hosting estático
- **CloudFront** para CDN global
- **GitHub Actions** para CI/CD automatizado

---
*SpeedPark Live Race Viewer v2.0 - Sistema completo de seguimiento de carreras de karting*