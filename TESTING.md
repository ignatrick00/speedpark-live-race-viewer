# 🧪 Guía de Testing - Sistema de Escuderías

## 🚀 Inicio Rápido

### Opción 1: Con usuarios automáticos (Recomendado)
```bash
npm run dev:seed
```
Esto inicia el servidor y crea automáticamente 4 usuarios de prueba.

### Opción 2: Sin seed automático
```bash
npm run dev
```
Luego en otra terminal:
```bash
npm run seed
```

---

## 👤 Usuarios de Prueba Creados

| Nombre | Email | Password |
|--------|-------|----------|
| **Ignacio Cabrera** | `ignacio@karteando.cl` | `test1234` |
| Carlos Ramirez | `piloto1@karteando.cl` | `test1234` |
| María González | `piloto2@karteando.cl` | `test1234` |
| Pedro López | `piloto3@karteando.cl` | `test1234` |

---

## 🏁 Flujo de Testing de Escuderías

### PASO 1: Login
1. Abre http://localhost:3000
2. Click **"Login"**
3. Usa: `ignacio@karteando.cl` / `test1234`

### PASO 2: Acceder a Squadron
1. Click **"🏁 Escuderías"** en el navbar
2. Verás el dashboard **SIN ESCUDERÍA**

### PASO 3: Crear Escudería
1. Click **"CREAR NUEVA ESCUDERÍA"**
2. Completa el formulario:
   - **Nombre**: `Velocity Racing`
   - **Descripción**: `Escudería de prueba`
   - **Color Primario**: `#00D4FF` (electric blue)
   - **Color Secundario**: `#0057B8` (rb blue)
   - **Modo**: `Abierta`
3. Click **"Crear Escudería"**

### PASO 4: Ver Dashboard con Escudería
- Deberías ver tu escudería con badge de **CAPITÁN**
- Stats: Ranking, Puntos, Fair Racing
- Lista de miembros (solo tú por ahora)

### PASO 5: Buscar Escuderías (con otro usuario)
1. Logout
2. Login con `piloto1@karteando.cl` / `test1234`
3. Ve a **"🏁 Escuderías"** → **"BUSCAR ESCUDERÍA"**
4. Busca "Velocity"
5. Click **"Unirse"**

### PASO 6: Verificar Miembros
1. Logout y vuelve a entrar con `ignacio@karteando.cl`
2. Ve a Squadron
3. Deberías ver 2 miembros ahora

---

## 🧪 Tests de API (con curl)

### Crear Escudería
```bash
# Login primero
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ignacio@karteando.cl","password":"test1234"}' \
  | jq -r '.token')

# Crear escudería
curl -X POST http://localhost:3000/api/squadron/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Thunder Drivers",
    "description": "Escudería de prueba",
    "colors": {
      "primary": "#FFD700",
      "secondary": "#87CEEB"
    },
    "recruitmentMode": "open"
  }'
```

### Buscar Escuderías
```bash
curl "http://localhost:3000/api/squadron/search?q=velocity"
```

### Ver Mi Escudería
```bash
curl http://localhost:3000/api/squadron/my-squadron \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Checklist de Funcionalidades

- [ ] Dashboard sin escudería muestra mensaje de alerta
- [ ] Crear escudería funciona con validaciones
- [ ] Dashboard con escudería muestra stats correctos
- [ ] Badge de CAPITÁN aparece correctamente
- [ ] Búsqueda de escuderías funciona con filtros
- [ ] Unirse a escudería funciona
- [ ] Fair Racing promedio se calcula automáticamente
- [ ] Salir de escudería funciona
- [ ] Transferir capitanía funciona
- [ ] Límite de 4 miembros se respeta

---

## 🎨 Elementos Visuales a Verificar

### Tema Tron/Electric Underground
- ✓ Colores: `#00D4FF` (electric blue), `#0057B8` (rb blue)
- ✓ Fondos: `#0A0B14` (midnight)
- ✓ Efectos glow en borders
- ✓ Fuentes: `font-racing`, `font-digital`
- ✓ Animaciones: `animate-glow`
- ✓ Gradientes con colores de escudería

### Componentes con Estilo
- Alert "SIN ESCUDERÍA" con glow azul
- Cards de acciones con hover effect
- Stats grid con borders neón
- Miembros con avatares circulares gradient
- Badge dorado para CAPITÁN

---

## 🐛 Troubleshooting

### No aparecen usuarios
```bash
# Ejecutar manualmente
npm run seed
```

### Error de conexión MongoDB
- Verificar `MONGODB_URI` en `.env`
- Verificar MongoDB Atlas permite conexiones

### WebSocket no conecta
- Verificar que `websocket-server.js` está corriendo
- Check `NEXT_PUBLIC_WS_URL` en `.env`

---

**Estado**: Sistema de escuderías FASE 1 completado ✅
**Siguiente**: Modal de crear escudería + búsqueda avanzada
