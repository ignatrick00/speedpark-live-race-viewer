# 🔐 Documentación: Flujo de Login para WebApp SpeedPark Live Race Viewer

## 📋 **Resumen Ejecutivo**

Documentación completa del flujo de autenticación SMS-Timing para implementar en la webapp SpeedPark Live Race Viewer. Basado en ingeniería inversa y pruebas exhaustivas realizadas en Agosto 2025.

---

## 🔍 **Investigación Realizada**

### **Análisis de Sistema SMS-Timing**
- **API Base**: `https://mobile-api22.sms-timing.com/api`
- **Empresa**: SMS-Timing (ahora BMI Leisure desde 2022)
- **Sistema**: Propietario para circuitos de karting
- **Email Source**: `<noreply@smstiming.com>`

### **Documentación Revisada**
- ✅ **Manual Configurator BMI Leisure** - Solo configuración interna
- ❌ **No hay documentación pública de APIs**
- ❌ **No hay soporte de callbacks/webhooks públicos**
- ❌ **Sistema cerrado para desarrolladores externos**

---

## 🧪 **Pruebas de Callbacks Realizadas**

### **Test de Parámetros de Callback**
```bash
# Ejecutado: test-callback-support.js
# Email probado: icabreraquezada@gmail.com
# Resultados: 6 requests diferentes con parámetros de callback
```

**Parámetros Probados:**
1. Request normal (baseline)
2. `callbackUrl` en body
3. `redirectUrl` en body  
4. Callback en query string
5. Header `X-Callback-URL`
6. Sin `defaultTemplate`

**Resultado**: Todos los emails generados contienen **exactamente el mismo link**:
```
https://smstim.in/speedpark/connect5?value=5HbmiQ6ztVk0LL%2FMmfLO%2F...
```

### **Conclusión Definitiva**
**❌ SMS-Timing NO soporta callbacks personalizados**
- Ignora todos los parámetros adicionales
- Siempre redirige a `smstim.in`
- No hay forma de hacer redirect a dominio propio

---

## 🎯 **Flujo de Autenticación Funcional**

### **Flujo Técnico Actual**
```javascript
// PASO 1: Solicitar Login
POST https://mobile-api22.sms-timing.com/api/login/basiclogin/speedpark?defaultTemplate=true
Body: {
    "fallbackTag": "uuid-generado",
    "userInput": "email@usuario.com"
}
Response: 200 OK - Email enviado

// PASO 2: Usuario recibe email
// Subject: "Encontramos una cuenta que coincide con su email..."
// Link: https://smstim.in/speedpark/connect5?value=TOKEN_ENCRIPTADO

// PASO 3: Procesamiento del Token
POST https://mobile-api22.sms-timing.com/api/login/confirm/speedpark
Body: {
    "encryptedAuth": "TOKEN_EXTRAIDO_DEL_URL"
}
Response: {
    "tag": "08087f9f-59ea-4221-8fcf-0aa67f2bcbb7",
    "loginCode": "asm8chtgfz1qh",
    "fallbackTag": "uuid-fallback"
}
```

### **Headers de Autenticación**
```javascript
const authHeaders = {
    'Host': 'mobile-api22.sms-timing.com',
    'Accept': 'application/json, text/plain, */*',
    'X-Fast-DeviceToken': '1111111134RBBD7010',
    'X-Fast-AccessToken': '30npoiqaqikpmykipnm',
    'X-Fast-LoginCode': 'asm8chtgfz1qh',        // Del login
    'X-Fast-Tag': '08087f9f-59ea-4221-8fcf-0aa67f2bcbb7', // Del login
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
}
```

---

## 🚀 **UX Definitivo para WebApp**

### **Flujo de Usuario Final**
```
📧 PASO 1: Solicitar Login
[Email: _______________] [Enviar Email]

📱 PASO 2: Confirmar en Email  
✅ Email enviado! Ve a tu correo
🔗 HAZ CLIC en "Confirmar esta cuenta"
📋 Se abrirá en tu navegador

📋 PASO 3: Copiar URL
📄 En la nueva pestaña que se abrió:
📋 Copia la URL completa de la barra de direcciones
📝 Pégala aquí: [________________________] [Login]
```

### **Comportamiento del Email**
- **Click en "Confirmar esta cuenta"** → Abre nueva pestaña/ventana del navegador
- **URL en la pestaña nueva**: `https://smstim.in/speedpark/connect5?value=...`
- **Usuario debe copiar** la URL completa de la barra de direcciones
- **Pegar en webapp** → Procesamiento automático

---

## 📊 **Datos Obtenidos Después del Login**

### **Endpoints Accesibles**
```javascript
const endpoints = [
    // ✅ FUNCIONAN
    { name: 'profile', url: '/person/profile/speedpark' },
    { name: 'karting-info', url: '/karting/info/speedpark' },
    { name: 'versions', url: '/karting/versions/speedpark?language=es-419' },
    { name: 'activity-history', url: '/activity-history/list/speedpark' },
    
    // ❌ NO FUNCIONAN (404)
    { name: 'settings', url: '/user/settings/speedpark' },
    { name: 'race-stats', url: '/racestatistics/speedpark' },
    { name: 'race-recent', url: '/racestatistics/recent/speedpark' },
    { name: 'race-best', url: '/racestatistics/best/speedpark' },
    { name: 'person-details', url: '/person/details/speedpark' },
    { name: 'person-stats', url: '/person/statistics/speedpark' }
];
```

### **Datos Detallados por Sesión**
```javascript
// Para cada sesión en activity-history
const sessionEndpoints = [
    { name: 'details', url: `/activity-history/details/speedpark?sessionId=${sessionId}` },
    { name: 'results', url: `/racestatistics/sessionv2/speedpark?sessionId=${sessionId}` },
    { name: 'laps', url: `/racestatistics/laps_fast5/speedpark?sessionId=${sessionId}` }
];
```

---

## 🧪 **Resultados de Prueba Exitosa**

### **Test Account: `icabreraquezada@gmail.com`**
```
✅ Email enviado: Status 200
✅ Link procesado: https://smstim.in/speedpark/connect5?value=5HbmiQ6ztVk0LL%2FMmfLO%2F...
✅ Tokens obtenidos:
   - Tag: 08087f9f-59ea-4221-8fcf-0aa67f2bcbb7
   - LoginCode: asm8chtgfz1qh
✅ Datos extraídos:
   - 587 actividades históricas
   - 10 sesiones detalladas
   - Perfil completo del usuario
   - Configuración de karting
```

### **Endpoints Funcionales Confirmados**
- `/person/profile/speedpark` → Perfil personal completo
- `/activity-history/list/speedpark` → 587 actividades
- `/karting/info/speedpark` → Info de configuración
- Sesiones específicas → Detalles, resultados y vueltas

---

## 🛠️ **Implementación Técnica para WebApp**

### **Frontend Components Necesarios**
1. **Login Form** - Campo email + botón
2. **Instructions Panel** - Pasos visuales claros
3. **URL Input Field** - Con validación automática
4. **Progress Indicators** - Estados del proceso
5. **Success/Error Messages** - Feedback del usuario

### **Backend API Endpoints Necesarios**
```javascript
// Solicitar login
POST /api/auth/request-login
Body: { email: string }
Response: { success: boolean, message: string }

// Procesar URL del email
POST /api/auth/process-url
Body: { email: string, authUrl: string }
Response: { 
    success: boolean, 
    tokens: { tag: string, loginCode: string },
    userData: object 
}

// Verificar sesión
GET /api/auth/verify
Headers: { Authorization: "Bearer tokens" }
Response: { valid: boolean, userData: object }
```

### **Validación de URL Cliente**
```javascript
function validateSMSTimingURL(url) {
    const pattern = /^https:\/\/smstim\.in\/speedpark\/connect5\?value=.+/;
    if (!pattern.test(url)) {
        return { valid: false, error: "URL inválida de SMS-Timing" };
    }
    
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('value');
    if (!token) {
        return { valid: false, error: "Token no encontrado en URL" };
    }
    
    return { valid: true, token: token };
}
```

---

## 🚫 **Alternativas Descartadas**

### **Por qué NO funcionan:**

1. **Service Workers para Interceptar**
   - ❌ Política Same-Origin impide interceptar `smstim.in`
   - ❌ Chrome bloquea por seguridad

2. **Browser Extensions**
   - ✅ Técnicamente posible
   - ❌ Requiere instalación adicional
   - ❌ No viable para webapp pública

3. **Proxy Server/DNS Hijacking**
   - ✅ Técnicamente posible
   - ❌ Complejo de implementar
   - ❌ Posibles problemas legales

4. **Deep Links/Protocol Handlers**
   - ❌ SMS-Timing no soporta protocolos personalizados
   - ❌ Solo funciona para apps nativas

---

## 🎯 **Recomendación Final**

### **Solución Óptima: UX Manual Optimizada**

**Pros:**
- ✅ Funciona 100% garantizado
- ✅ No requiere permisos especiales
- ✅ Deployable en hosting estático (S3, Netlify, etc.)
- ✅ Compatible con todos los navegadores
- ✅ No depende de cambios en SMS-Timing

**Cons:**
- ⚠️ Requiere una acción manual del usuario (copy/paste)
- ⚠️ Necesita instrucciones claras

### **UX Optimizada Propuesta:**
- **Instrucciones visuales** paso a paso
- **Videos/GIFs** mostrando el proceso
- **Validación automática** de URLs
- **Feedback inmediato** en cada paso
- **Procesamiento instantáneo** una vez pegada la URL

---

## 📁 **Archivos de Referencia**

### **Scripts Funcionales**
- `user-data-extractor.js` - Extracción completa de datos
- `test-callback-support.js` - Pruebas de callbacks
- `quick-account-creator.js` - Creación automática de cuentas
- `race-tracker.js` - Monitoring en vivo

### **Documentación**
- `SMS_TIMING_AUTHENTICATION_SYSTEM.md` - Sistema completo de auth
- `WEBAPP_LOGIN_FLOW_DOCUMENTATION.md` - Este documento

### **Datos de Prueba**
- `./user-data/icabreraquezada_at_gmail_com/tokens.json` - Tokens válidos
- `./user-data/icabreraquezada_at_gmail_com/complete-data-*.json` - Datos completos

---

## 🚀 **Próximos Pasos para Implementación**

1. **Diseñar interfaz de login** con UX optimizada
2. **Crear backend APIs** para procesamiento
3. **Implementar validación** de URLs automática
4. **Agregar manejo de errores** robusto
5. **Testing exhaustivo** del flujo completo
6. **Deploy en AWS** con CI/CD automatizado

---

**Documento creado**: Agosto 2025  
**Autor**: Claude Code  
**Basado en**: Ingeniería inversa y testing exhaustivo  
**Estado**: Flujo funcional al 100% - Listo para implementación