# 🏁 Karteando.cl - Plataforma de Karting Competitivo

## 📋 Descripción del Proyecto

Karteando.cl es una plataforma completa de karting competitivo que integra datos en tiempo real, sistema de rankings, inscripciones a carreras y gestión de múltiples kartings. Construida sobre la investigación y desarrollo previo del sistema SMS-Timing.

## 📁 Estructura del Proyecto

```
karteando-cl/
├── README.md                    # Este archivo
├── docs/                        # Documentación completa
│   ├── KARTEANDO_CL_IMPLEMENTATION_PROCESS_COMPLETE.md  # Plan maestro
│   ├── SMS_TIMING_AUTHENTICATION_SYSTEM.md             # Sistema auth SMS-Timing
│   └── WEBAPP_LOGIN_FLOW_DOCUMENTATION.md              # Flujo login investigado
├── reference-code/              # Código base reutilizable
│   ├── user-data-extractor.js   # APIs SMS-Timing funcionales
│   ├── quick-account-creator.js # Creación automática cuentas
│   ├── test-callback-support.js # Pruebas realizadas
│   └── live-race-viewer.html    # UI base + Electric Underground theme
├── test-data/                   # Datos reales para testing
│   └── user-data/              # Perfiles y tokens SMS-Timing reales
├── backend/                     # Backend Node.js (próximo)
└── frontend/                    # Frontend Next.js (próximo)
```

## 🎯 Funcionalidades Principales

### 🏠 **Landing Page Pública**
- Live race viewer tiempo real (público)
- Top 3 mejores tiempos del día  
- Header con Login/Signup

### 🔐 **Sistema de Autenticación Híbrido**
- Validación email via SMS-Timing (sin emails propios)
- Contraseñas propias Karteando.cl
- JWT authentication independiente
- WebSocket automático con tokens persistentes

### 📊 **Dashboard del Corredor**
- Live race viewer (con funciones usuario)
- Mi actividad: historial completo sesiones
- Inscripción a carreras con calendario
- Perfil con rankings de habilidad/limpieza

### ⚙️ **Panel de Administración**
- Gestión de carreras diarias
- Configuración requisitos (nivel/ranking)
- Sistema de fees de inscripción
- Moderación y analytics

### 🏆 **Sistema de Rankings Dual**
- **Habilidad**: Algorítmico (tiempos + consistencia + experiencia)
- **Limpieza**: Social (evaluación peer-to-peer)

### 🗺️ **Multi-Karting Escalable**
- Soporte múltiples sistemas timing (SMS-Timing, MyLaps, Orbits)
- Rankings locales y globales
- Mapa de ubicaciones
- Admin por karting + super admin

## 🛠️ Tech Stack

### Backend
- Node.js 20 + Express + TypeScript
- MongoDB Atlas (multi-karting schema)
- AWS S3 (datos raw) + CloudFront CDN
- JWT authentication + bcrypt
- Socket.io (WebSocket multi-karting)
- Timing System Abstraction Layer

### Frontend  
- Next.js 14 + TypeScript
- Tailwind CSS + Electric Underground theme
- Zustand + React Query
- Google Maps API
- PWA capabilities

## 📊 Datos de Referencia

### Tokens SMS-Timing Reales
```
test-data/user-data/icabreraquezada_at_gmail_com/
├── tokens.json          # Tokens válidos para testing
├── summary.txt          # Perfil: Break Pitt, 578 carreras, 31.376s best
└── complete-data-*.json # 587 actividades históricas
```

### APIs SMS-Timing Funcionales
- `user-data-extractor.js`: Todos los endpoints validados
- `quick-account-creator.js`: Creación automática 9-step process  
- WebSocket: `wss://webserver22.sms-timing.com:10015/`

## 🚀 Plan de Desarrollo

1. **Fase 1**: Backend Core + Auth Híbrida (10-14 días)
2. **Fase 2**: Landing + Live Viewer (4-6 días)  
3. **Fase 3**: Dashboard Corredor (7-9 días)
4. **Fase 4**: Rankings (7-10 días)
5. **Fase 5**: Race Registration (10-12 días)
6. **Fase 6**: Admin Panel (8-10 días)
7. **Fase 7**: Multi-Karting (7-10 días)
8. **Fase 8**: Deployment (5-7 días)

**Total**: 58-78 días (2.5-3.5 meses)

## 💰 Modelo de Negocio

- Race registration fees: 5-10% comisión
- Karting partnership: $50-200/mes por location  
- Membership premium: $9.990/mes
- Corporate events
- Multi-karting expansion

## 🔗 Referencias

- Proyecto origen: `/speed park scraper/`
- Investigación SMS-Timing: 4 meses desarrollo
- Live viewer funcional: `reference-code/live-race-viewer.html`
- Sistema auth completo: `docs/SMS_TIMING_AUTHENTICATION_SYSTEM.md`

---

**Estado**: Listo para desarrollo  
**Arquitectura**: Definida y documentada  
**Código base**: SMS-Timing integration 100% funcional  
**Datos de prueba**: Perfiles reales disponibles