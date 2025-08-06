# 🏁 Karteando.cl - Proceso de Implementación Completo

## 📋 **Resumen Ejecutivo**

Plan arquitectónico y proceso de implementación para **karteando.cl**, plataforma completa de karting competitivo con sistema de registro, dashboard de actividad, inscripciones a carreras, rankings de habilidad/limpieza, y admin panel. Escalable a múltiples kartings con mapa de ubicaciones. Usa **S3 para datos raw** y **MongoDB para todo el sistema social/competitivo**.

---

## 🎯 **Funcionalidades Completas del Sistema**

### **🏠 Landing Page Pública**
```
┌─────────────────────────────────────────────────────────┐
│ Header: [Logo Karteando.cl] [Login] [Sign Up]           │
├─────────────────────────────────────────────────────────┤
│ 📺 LIVE RACE VIEWER (público, igual al actual)          │
│ ├── Tabla tiempo real carreras activas SpeedPark       │
│ └── Sidebar: Top 3 mejores tiempos del día             │
└─────────────────────────────────────────────────────────┘
```

**Rutas del Sistema**:
- `/` - Landing pública con live viewer
- `/login` - Modal/página login 
- `/signup` - Modal/página registro
- `/dashboard` - Dashboard corredor (protected)
- `/admin` - Dashboard admin (protected, role-based)

### **🔐 Sistema de Autenticación Híbrido**

#### **Flujo de Registro**:
```
1. Usuario ingresa email → Karteando.cl
2. "¿Tienes cuenta en SpeedPark?" → [SÍ] [NO]

Si NO (Usuario Nuevo):
3. Creamos cuenta SMS-Timing automática → Email SMS-Timing  
4. Usuario copia URL del email → Valida email real
5. Usuario crea contraseña → Cuenta Karteando.cl creada

Si SÍ (Usuario Existente):
3. Enviamos email SMS-Timing → Usuario copia URL → Valida email  
4. Usuario crea contraseña → Cuenta Karteando.cl creada
```

#### **Flujo de Login Posterior**:
```
LOGIN FUTURO:
1. Email + Contraseña → Karteando.cl (sistema propio)
2. Autenticado con JWT Karteando.cl
3. WebSocket automático usa tokens SMS-Timing guardados
```

#### **Ventajas del Sistema**:
- ✅ **Sin emails propios**: Usamos SMS-Timing para validación
- ✅ **Control total**: Contraseñas y autenticación nuestra
- ✅ **WebSocket automático**: Tokens SMS-Timing persistentes
- ✅ **Escalable**: Funciona con múltiples timing systems
- ✅ **Login rápido**: Email/contraseña normal después registro
- **Post-Login Routing**: Corredor → Dashboard / Admin → Panel Admin

### **📊 Dashboard del Corredor**
```
┌─────────────────────────────────────────────────────────┐
│ 📺 LIVE RACE VIEWER (igual al actual)                   │
│ ├── Tabla tiempo real carreras activas                  │
│ └── Sidebar: Top 3 mejores tiempos del día             │
├─────────────────────────────────────────────────────────┤
│ 📈 MI ACTIVIDAD                                        │
│ ├── Historial completo de sesiones                     │
│ ├── Click → Ver detalles: posiciones, vueltas, tiempos │
│ └── Progresión histórica de rendimiento                │
├─────────────────────────────────────────────────────────┤
│ 🏁 INSCRIPCIÓN A CARRERAS                              │
│ ├── Calendario por día                                 │
│ ├── Ver carreras de liga disponibles por fecha        │
│ ├── Filtros por nivel de experiencia/ranking           │
│ └── Sistema de fees de inscripción                     │
├─────────────────────────────────────────────────────────┤
│ 👤 MI PERFIL                                           │
│ ├── Datos personales + estadísticas                   │
│ ├── Mejores tiempos por fecha/carrera                 │
│ ├── Ranking de Habilidad (tiempos + experiencia)      │
│ └── Ranking de Limpieza (peer evaluation)             │
└─────────────────────────────────────────────────────────┘
```

### **⚙️ Panel de Administración**
- **Gestión de Carreras**: Crear carreras diarias con configuración
- **Configuración de Requisitos**: Nivel experiencia, ranking limpieza
- **Sistema de Fees**: Configurar costos de inscripción
- **Moderación**: Gestionar rankings de limpieza
- **Reportes**: Analytics de participación y rendimiento
- **Multi-Karting Management**: Configurar nuevos kartings

### **🏆 Sistema de Rankings Dual**

#### **Ranking de Habilidad** (Algorítmico)
```
Formula propuesta:
Skill Score = (Best Times Weight * 0.4) + 
              (Consistency Weight * 0.3) + 
              (Experience Weight * 0.3)

Best Times Weight: Promedio de mejores tiempos vs track record
Consistency Weight: Desviación estándar de tiempos
Experience Weight: Total carreras corridas (logarítmico)
```

#### **Ranking de Limpieza** (Social)
```
- Post-carrera: Evaluación peer-to-peer
- Sistema de reportes por comportamiento
- Validación cruzada anti-gaming
- Decay temporal para rehabilitación
```

### **🗺️ Escalabilidad Multi-Karting**
- **Mapa de Kartings**: Selección por ubicación
- **Datos Centralizados**: Un perfil para todos los kartings
- **Rankings Locales**: Por karting y globales
- **Sistema de Franquicia**: Admin por karting + super admin
- **APIs Modulares**: Support para múltiples sistemas de timing

---

## 🏗️ **Arquitectura del Sistema Expandida**

### **Database Schema MongoDB**

```javascript
// Collections principales
{
  // Users - Sistema de usuarios completo con autenticación híbrida
  users: {
    _id: ObjectId(),
    email: "icabreraquezada@gmail.com",
    
    // AUTENTICACIÓN KARTEANDO.CL
    password: "$2b$12$hashed_password", // Nuestra contraseña hasheada
    emailVerified: true,                // Validado por SMS-Timing token
    karteandoTokens: {
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      refreshToken: "refresh_token_here",
      expiresAt: ISODate()
    },
    
    // SMS-TIMING INTEGRATION
    smsTimingPersonId: "63000000000383541", // Link a SMS-Timing
    smsTimingTokens: {
      tag: "08087f9f-59ea-4221-8fcf-0aa67f2bcbb7",      // Para WebSocket
      loginCode: "asm8chtgfz1qh",                        // Para APIs
      fallbackTag: "2c23fa0f-d1c4-4000-96da-bc769ff27a17",
      lastRefresh: ISODate(),
      validUntil: ISODate()
    },
    
    // PERFIL USUARIO
    profile: {
      alias: "Break Pitt",
      firstName: "Ignacio", 
      lastName: "Cabrera",
      birthDate: "1990-05-15",
      photoUrl: "https://s3.../profile-photos/user123.jpg",
      registrationCompleted: true,
      registrationSource: "speedpark-existing|speedpark-new|manual" // Tracking origen
    },
    
    // RANKINGS Y STATS
    rankings: {
      skillScore: 1847,      // Calculado algorítmicamente
      skillRank: 15,         // Posición en ranking
      cleanlinessScore: 4.2, // 1-5 evaluación peer
      cleanlinessRank: 8
    },
    stats: {
      totalRaces: 578,
      bestTime: "31.376",
      avgTime: "35.2",
      firstPlaces: 259,
      podiums: 439
    },
    
    // MULTI-KARTING
    kartings: ["speedpark-chile"], // Array para multi-karting
    preferredKarting: "speedpark-chile",
    
    // SISTEMA
    role: "user|admin|super-admin",
    status: "active|suspended|banned",
    createdAt: ISODate(),
    lastActive: ISODate(),
    lastLogin: ISODate()
  },

  // Kartings - Configuración multi-karting
  kartings: {
    _id: ObjectId(),
    code: "speedpark-chile",        // Unique identifier
    name: "Speed Park Chile",
    location: {
      address: "Las Condes, Santiago",
      coordinates: [-33.4372, -70.5447],
      city: "Santiago",
      country: "Chile"
    },
    timingSystem: {
      provider: "sms-timing",       // sms-timing|mylaps|orbits|custom
      apiConfig: {
        baseUrl: "https://mobile-api22.sms-timing.com/api",
        websocketUrl: "wss://webserver22.sms-timing.com:10015/",
        clientKey: "speedpark",
        backendKey: "c3BlZWRwYXJrOmM3NzFlMzFmLTk5NTItNDBiMC1iOGU3LTZmZjlhZTI1MDhhYw=="
      }
    },
    trackRecord: "31.376",
    status: "active|maintenance|inactive",
    adminUsers: [ObjectId()],       // Local admins
    createdAt: ISODate()
  },

  // Races - Sistema de carreras programadas  
  races: {
    _id: ObjectId(),
    name: "Liga Nocturna - Nivel Intermedio",
    date: "2025-08-10",
    time: "20:00",
    kartingId: ObjectId(),          // Reference to kartings collection
    requirements: {
      minSkillRank: 20,        // Ranking mínimo habilidad  
      minCleanlinessScore: 3.0, // Puntaje limpieza mínimo
      maxParticipants: 12
    },
    fee: 15000,  // CLP
    status: "open|full|active|finished",
    participants: [
      {
        userId: ObjectId(),
        registeredAt: ISODate(),
        paymentStatus: "paid|pending"
      }
    ],
    results: {
      sessionId: "75",  // Link a sesión del timing system
      winner: ObjectId(),
      positions: [...],
      bestLap: "31.376"
    }
  },

  // Sessions - Datos históricos de sesiones
  sessions: {
    _id: ObjectId(),
    sessionId: "75",
    sessionName: "75", 
    date: ISODate("2025-08-06"),
    kartingId: ObjectId(),          // Reference to kartings collection
    type: "practice|qualifying|race",
    raceId: ObjectId(), // Si es carrera programada
    participants: [
      {
        userId: ObjectId(),
        personId: "63000000000383541", // External timing system ID
        alias: "Break Pitt",
        position: 1,
        bestLap: "31.376",
        avgLap: "33.2",
        totalLaps: 20,
        lapTimes: ["32.1", "31.8", "31.376", ...],
        cleanlinessReports: [] // Reportes de otros corredores
      }
    ],
    s3RawDataUrl: "s3://karteando-raw-data/sessions/...",
    processed: true
  },

  // Daily best times - Multi-karting aware
  dailyBestTimes: {
    _id: ObjectId(),
    date: "2025-08-06",
    kartingId: ObjectId(),          // Specific to karting
    bestTimes: [
      {
        rank: 1,
        time: "31.376",
        driver: {
          userId: ObjectId(),
          personId: "63000000000383541",
          alias: "Break Pitt",
          firstName: "Ignacio",
          lastName: "Cabrera"
        },
        sessionId: "75",
        timestamp: ISODate()
      }
    ]
  },
  
  // Cleanliness evaluations - Sistema de evaluación
  cleanlinessEvaluations: {
    _id: ObjectId(),
    sessionId: "75",
    kartingId: ObjectId(),
    evaluatorUserId: ObjectId(),
    evaluatedUserId: ObjectId(), 
    score: 4,  // 1-5
    comments: "Corrió limpio, respetó líneas",
    categories: {
      respectsLines: 5,
      fairOvertaking: 4,
      noAggression: 4
    },
    createdAt: ISODate()
  }
}
```

### **Arquitectura de Backend Multi-Karting**

```
karteando-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js         # Sistema híbrido: SMS-Timing + contraseñas
│   │   ├── userController.js         # Perfil y estadísticas  
│   │   ├── raceController.js         # CRUD carreras programadas
│   │   ├── sessionController.js      # Historial sesiones multi-karting
│   │   ├── rankingController.js      # Cálculos rankings locales/globales
│   │   ├── kartingController.js      # CRUD kartings y configuración
│   │   ├── adminController.js        # Panel administración
│   │   └── publicController.js       # Landing page data (sin auth)
│   ├── models/
│   │   ├── User.js
│   │   ├── Karting.js               # NEW: Multi-karting config
│   │   ├── Race.js
│   │   ├── Session.js
│   │   ├── CleanlinessEvaluation.js
│   │   └── DailyBestTime.js
│   ├── services/
│   │   ├── timingSystemService.js    # ABSTRACTION: Multiple timing systems
│   │   │   ├── smsTimingAdapter.js   # SMS-Timing specific
│   │   │   ├── mylapsAdapter.js      # MyLaps specific  
│   │   │   ├── orbitsAdapter.js      # Orbits specific
│   │   │   └── customAdapter.js      # Custom timing systems
│   │   ├── rankingService.js         # Algoritmos ranking multi-karting
│   │   ├── raceRegistrationService.js # Sistema inscripciones
│   │   ├── photoUploadService.js     # S3 fotos perfil
│   │   ├── notificationService.js    # Emails/push notifications
│   │   └── kartingManagementService.js # Gestión múltiples kartings
│   ├── utils/
│   │   ├── rankingAlgorithms.js      # Fórmulas ranking habilidad
│   │   ├── cleanlinessCalculator.js  # Procesamiento evaluaciones
│   │   └── timingSystemFactory.js    # Factory pattern para timing systems
│   └── routes/
│       ├── api/
│       │   ├── public.js             # Landing page endpoints (no auth)
│       │   ├── auth.js               # Authentication multi-karting
│       │   ├── users.js              # User management
│       │   ├── races.js              # Race management
│       │   ├── sessions.js           # Session history
│       │   ├── kartings.js           # Karting CRUD
│       │   └── admin.js              # Admin panel
│       └── websocket.js              # Multi-karting WebSocket handler
```

### **Sistema de Autenticación Híbrido - Implementación**

```javascript
// controllers/authController.js - Sistema híbrido completo
class AuthController {
  
  // REGISTRO: Paso 1 - Detectar si usuario tiene cuenta SMS-Timing
  async initiateRegistration(req, res) {
    const { email } = req.body;
    
    try {
      // Verificar si ya existe en nuestra DB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Usuario ya existe' });
      }
      
      return res.json({
        email,
        nextStep: 'check_sms_timing_account',
        message: '¿Tienes cuenta existente en SpeedPark?'
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // REGISTRO: Paso 2 - Procesar respuesta sobre cuenta existente
  async processRegistrationChoice(req, res) {
    const { email, hasSpeedParkAccount } = req.body;
    
    try {
      if (hasSpeedParkAccount) {
        // Usuario existente - solicitar email SMS-Timing
        const smsResult = await this.requestSMSTimingEmail(email);
        return res.json({
          step: 'existing_user_email_sent',
          message: 'Email enviado por SpeedPark. Copia la URL del email.'
        });
      } else {
        // Usuario nuevo - crear cuenta SMS-Timing automática
        const createResult = await this.createSMSTimingAccount(email);
        return res.json({
          step: 'new_user_email_sent', 
          message: 'Cuenta SpeedPark creada. Email enviado. Copia la URL del email.'
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // REGISTRO: Paso 3 - Validar URL y crear cuenta Karteando.cl
  async validateAndCreateAccount(req, res) {
    const { email, smsTimingUrl, password, confirmPassword, profile } = req.body;
    
    try {
      // Validar contraseña
      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden' });
      }
      
      // Extraer y validar token SMS-Timing
      const smsToken = this.extractTokenFromURL(smsTimingUrl);
      const smsData = await smsTimingService.confirmToken(smsToken);
      
      if (!smsData.success) {
        return res.status(400).json({ error: 'URL de SMS-Timing inválida' });
      }
      
      // Obtener datos del usuario desde SMS-Timing
      const userData = await smsTimingService.getUserData(smsData);
      
      // Crear usuario en nuestra base de datos
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const user = await User.create({
        email,
        password: hashedPassword,
        emailVerified: true, // Validado por SMS-Timing
        
        smsTimingPersonId: userData.personId,
        smsTimingTokens: {
          tag: smsData.tag,
          loginCode: smsData.loginCode,
          fallbackTag: smsData.fallbackTag,
          lastRefresh: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        },
        
        profile: {
          alias: profile.alias || userData.alias,
          firstName: profile.firstName || userData.firstName,
          lastName: profile.lastName || userData.lastName,
          birthDate: profile.birthDate,
          photoUrl: profile.photoUrl,
          registrationCompleted: true,
          registrationSource: profile.hasSpeedParkAccount ? 'speedpark-existing' : 'speedpark-new'
        },
        
        kartings: ['speedpark-chile'],
        preferredKarting: 'speedpark-chile',
        role: 'user',
        status: 'active'
      });
      
      // Generar JWT Karteando.cl
      const jwtToken = this.generateJWT(user);
      
      // Actualizar tokens en usuario
      user.karteandoTokens = {
        jwt: jwtToken,
        refreshToken: this.generateRefreshToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      await user.save();
      
      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role
        },
        token: jwtToken,
        message: 'Cuenta creada exitosamente'
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // LOGIN: Sistema propio con email/contraseña
  async login(req, res) {
    const { email, password } = req.body;
    
    try {
      // Buscar usuario
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      // Generar nuevo JWT
      const jwtToken = this.generateJWT(user);
      
      // Actualizar tokens y última conexión
      user.karteandoTokens = {
        jwt: jwtToken,
        refreshToken: this.generateRefreshToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      user.lastLogin = new Date();
      await user.save();
      
      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role
        },
        token: jwtToken
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // HELPERS
  async requestSMSTimingEmail(email) {
    return await smsTimingService.requestLogin(email);
  }
  
  async createSMSTimingAccount(email) {
    return await smsTimingService.createAccount(email);
  }
  
  extractTokenFromURL(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('value');
  }
  
  generateJWT(user) {
    return jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }
  
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }
}

// services/websocketService.js - Usa tokens guardados
class WebSocketService {
  async connectUserToLiveData(userId) {
    const user = await User.findById(userId);
    
    if (!user.smsTimingTokens || !user.smsTimingTokens.tag) {
      throw new Error('Usuario sin tokens SMS-Timing válidos');
    }
    
    // Conectar WebSocket con tokens guardados
    const websocket = new WebSocket('wss://webserver22.sms-timing.com:10015/', {
      headers: {
        'X-Fast-Tag': user.smsTimingTokens.tag,
        'X-Fast-LoginCode': user.smsTimingTokens.loginCode,
        'X-Fast-DeviceToken': '1111111134RBBD7010',
        'X-Fast-AccessToken': '30npoiqaqikpmykipnm'
      }
    });
    
    return websocket;
  }
}
```

### **Timing System Abstraction Layer**

```javascript
// services/timingSystemService.js - SCALABLE ARCHITECTURE
class TimingSystemService {
  constructor() {
    this.adapters = new Map();
    this.registerAdapters();
  }
  
  registerAdapters() {
    this.adapters.set('sms-timing', new SMSTimingAdapter());
    this.adapters.set('mylaps', new MyLapsAdapter());  
    this.adapters.set('orbits', new OrbitsAdapter());
    this.adapters.set('custom', new CustomAdapter());
  }
  
  // Factory method para crear conexiones por karting
  getAdapter(kartingConfig) {
    const adapter = this.adapters.get(kartingConfig.timingSystem.provider);
    if (!adapter) {
      throw new Error(`Unsupported timing system: ${kartingConfig.timingSystem.provider}`);
    }
    
    return adapter.configure(kartingConfig.timingSystem.apiConfig);
  }
  
  // Método unificado para todos los sistemas
  async connectToLiveData(kartingId) {
    const karting = await Karting.findById(kartingId);
    const adapter = this.getAdapter(karting);
    
    return adapter.connectWebSocket();
  }
  
  async authenticateUser(kartingId, email) {
    const karting = await Karting.findById(kartingId);
    const adapter = this.getAdapter(karting);
    
    return adapter.authenticate(email);
  }
  
  async getSessionData(kartingId, sessionId) {
    const karting = await Karting.findById(kartingId);
    const adapter = this.getAdapter(karting);
    
    return adapter.getSessionData(sessionId);
  }
}

// services/timingSystemService.js/smsTimingAdapter.js
class SMSTimingAdapter {
  configure(config) {
    this.baseUrl = config.baseUrl;
    this.websocketUrl = config.websocketUrl;
    this.clientKey = config.clientKey;
    this.backendKey = config.backendKey;
    return this;
  }
  
  async connectWebSocket() {
    this.websocket = new WebSocket(this.websocketUrl);
    return this.websocket;
  }
  
  async authenticate(email) {
    // SMS-Timing specific authentication
    const response = await fetch(`${this.baseUrl}/login/basiclogin/${this.clientKey}?defaultTemplate=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fallbackTag: this.generateFallbackTag(),
        userInput: email
      })
    });
    
    return response.json();
  }
  
  async getSessionData(sessionId) {
    // SMS-Timing specific session data retrieval
    // Implementation based on existing user-data-extractor.js
  }
}

// services/timingSystemService.js/mylapsAdapter.js  
class MyLapsAdapter {
  configure(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    return this;
  }
  
  async connectWebSocket() {
    // MyLaps WebSocket implementation
  }
  
  async authenticate(email) {
    // MyLaps specific authentication
  }
  
  async getSessionData(sessionId) {
    // MyLaps specific session data
  }
}
```

---

## 🚀 **Proceso de Implementación por Fases**

### **Fase 1: Backend Core + Authentication Híbrida (10-14 días)**
```
✅ Setup básico Express + MongoDB + S3
✅ Multi-karting database schema design
✅ Timing System abstraction layer
✅ SMS-Timing adapter (reutilizar código existente)
✅ Sistema de registro híbrido:
   - Email input → Detectar usuario existente/nuevo
   - Crear cuenta SMS-Timing si es necesario
   - URL SMS-Timing → Token extraction → Email validation
   - Contraseña Karteando.cl → JWT generation
   - Profile completion con foto upload S3
✅ Login flow con email/contraseña propio
✅ JWT authentication + refresh tokens
✅ Persistent SMS-Timing tokens para WebSocket
✅ User profile CRUD operations
✅ Karting management CRUD
```

### **Fase 2: Landing Page + Live Race Viewer (4-6 días)**  
```
✅ Landing page pública con header auth
✅ Port del live-race-viewer.html actual como componente
✅ WebSocket SMS-Timing integration (público)
✅ Daily best times sidebar (público)
✅ Login/Signup modals
✅ Post-login routing (dashboard vs admin)
```

### **Fase 3: Dashboard del Corredor (7-9 días)**
```
✅ Dashboard layout con sidebar navigation
✅ Live race viewer (igual a landing pero con features usuario)
✅ "Mi Actividad" - historial sesiones
✅ Session detail view (posiciones, tiempos, vueltas)
✅ User profile management
✅ Basic user stats and ranking display
```

### **Fase 4: Sistema de Rankings (7-10 días)**
```
✅ Algoritmo ranking de habilidad:
   - Best times analysis vs track records
   - Consistency scoring (desviación estándar)  
   - Experience points (logarithmic scale)
✅ Sistema evaluación limpieza post-carrera
✅ Anti-gaming measures para evaluaciones
✅ Ranking displays en perfil
✅ Historical ranking tracking
✅ Multi-karting ranking aggregation
```

### **Fase 5: Race Registration System (10-12 días)**
```
✅ Calendar component con carreras programadas
✅ Admin panel para crear carreras
✅ Sistema de requirements (skill/cleanliness)
✅ Fee payment integration (Webpay/Transbank)
✅ Registration flow completo
✅ Email notifications sistema
✅ Race status management (open→full→active→finished)
```

### **Fase 6: Admin Panel + Multi-Karting (8-10 días)**
```
✅ Dashboard administrativo
✅ Race management interface
✅ User management + moderation tools
✅ Rankings oversight + manual adjustments
✅ Multi-karting configuration panel
✅ Timing system adapter management
✅ Analytics and reporting per karting
✅ Fee management + payouts
```

### **Fase 7: Additional Adapters + Polish (7-10 días)**
```
✅ MyLaps adapter implementation
✅ Orbits adapter implementation  
✅ Custom timing system adapter
✅ Multi-karting map interface
✅ Cross-karting ranking views
✅ Performance optimization
✅ Mobile responsive design
✅ PWA features
```

### **Fase 8: Deployment + Infrastructure (5-7 días)**
```
✅ AWS infrastructure setup (multi-karting ready)
✅ CI/CD pipeline with environment management
✅ Multi-karting data migration tools
✅ Monitoring per karting
✅ Load balancing and scaling
✅ SSL certificates and DNS management
```

**TOTAL: 56-76 días desarrollo (2.5-3.5 meses)**

---

## 💡 **Funcionalidades Adicionales Sugeridas**

### **Sistema Social**
- **Follows/Friends**: Seguir a otros corredores cross-karting
- **Achievements**: Badges por logros (primer lugar, mejora tiempo, etc.)
- **Leaderboards**: Rankings semanales/mensuales por karting y globales
- **Racing Crews**: Teams de corredores cross-karting

### **Gamification**
- **XP System**: Puntos experiencia por participar
- **Seasonal Challenges**: Objetivos trimestrales
- **Streak Bonuses**: Bonos por participación constante
- **Title System**: Títulos desbloqueables (ej: "Speed Demon", "Clean Racer")
- **Passport System**: Badge por visitar múltiples kartings

### **Advanced Analytics**
- **Performance Trends**: Gráficos mejora tiempo por karting
- **Sector Analysis**: Tiempos por sector de pista (si disponible)
- **Weather Impact**: Correlación clima/performance
- **Kart Performance**: Estadísticas por kart específico
- **Cross-Karting Comparison**: Rendimiento vs diferentes pistas

### **Business Features**
- **Membership Tiers**: Diferentes niveles subscripción
- **Corporate Events**: Eventos empresariales multi-karting
- **Coaching Marketplace**: Conectar con instructores
- **Merchandise Store**: Venta productos karting branded
- **Franchise Management**: Tools para administrar múltiples ubicaciones

### **Multi-Karting Advanced**
- **Cross-Track Rankings**: Rankings globales vs locales
- **Track Ratings**: Reviews de diferentes kartings
- **Travel Planner**: Planificar visitas otros kartings
- **Unified Billing**: Sistema de pagos centralizado
- **Inter-Karting Competitions**: Carreras entre ubicaciones

---

## 📊 **Modelos de Ranking Multi-Karting**

### **Ranking de Habilidad - Fórmula Cross-Karting**

```javascript
// services/rankingService.js - Multi-karting aware
class RankingService {
  calculateGlobalSkillScore(userStats, allKartings) {
    let totalScore = 0;
    let kartingCount = 0;
    
    // Calculate skill score per karting
    for (const kartingId of userStats.kartings) {
      const kartingStats = userStats.byKarting[kartingId];
      const kartingData = allKartings.find(k => k._id === kartingId);
      
      if (kartingStats && kartingData) {
        const localScore = this.calculateLocalSkillScore(kartingStats, kartingData);
        totalScore += localScore.skillScore;
        kartingCount++;
      }
    }
    
    // Global score is average of all kartings with experience bonus
    const baseScore = kartingCount > 0 ? totalScore / kartingCount : 0;
    const diversityBonus = Math.min(200, kartingCount * 50); // Bonus por visitar múltiples kartings
    
    return {
      globalSkillScore: Math.round(baseScore + diversityBonus),
      kartingCount: kartingCount,
      diversityBonus: diversityBonus,
      byKarting: userStats.byKarting
    };
  }
  
  calculateLocalSkillScore(kartingStats, kartingData) {
    const bestTimesScore = this.calculateBestTimesScore(
      kartingStats.bestTime, 
      kartingData.trackRecord
    );
    const consistencyScore = this.calculateConsistencyScore(kartingStats.lapTimes);
    const experienceScore = this.calculateExperienceScore(kartingStats.totalRaces);
    
    return {
      skillScore: Math.round(
        (bestTimesScore * 0.4) + 
        (consistencyScore * 0.3) + 
        (experienceScore * 0.3)
      ),
      breakdown: {
        bestTimes: bestTimesScore,
        consistency: consistencyScore, 
        experience: experienceScore
      }
    };
  }
}
```

### **Sistema de Evaluación Cross-Karting**

```javascript
// Multi-karting cleanliness evaluation
const CrossKartingCleanlinessEvaluation = {
  calculateGlobalCleanlinessScore(userEvaluations) {
    // Group evaluations by karting
    const byKarting = {};
    userEvaluations.forEach(eval => {
      if (!byKarting[eval.kartingId]) {
        byKarting[eval.kartingId] = [];
      }
      byKarting[eval.kartingId].push(eval);
    });
    
    // Calculate average score per karting
    let totalScore = 0;
    let kartingCount = 0;
    
    Object.keys(byKarting).forEach(kartingId => {
      const kartingEvaluations = byKarting[kartingId];
      const kartingScore = this.calculateKartingCleanlinessScore(kartingEvaluations);
      
      totalScore += kartingScore;
      kartingCount++;
    });
    
    return {
      globalScore: kartingCount > 0 ? totalScore / kartingCount : 0,
      byKarting: byKarting,
      evaluationCount: userEvaluations.length
    };
  }
};
```

---

## 🛠️ **Tech Stack Final Multi-Karting**

### **Backend**
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js + TypeScript
- **Database**: MongoDB Atlas (M20+ para múltiples kartings)
- **File Storage**: AWS S3 + CloudFront CDN
- **Authentication**: JWT + bcrypt
- **Payments**: Transbank WebPay Plus (Chile) + Stripe (international)
- **Email**: AWS SES + templates
- **WebSocket**: Socket.io with namespacing per karting
- **Image Processing**: Sharp (resize/optimize fotos perfil)
- **Caching**: Redis for cross-karting data

### **Frontend** 
- **Framework**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS + Electric Underground theme
- **State Management**: Zustand + React Query
- **Calendar**: FullCalendar.js
- **Charts**: Chart.js (performance trends)
- **Maps**: Google Maps API (karting locations)
- **PWA**: Next.js PWA plugin
- **Internationalization**: next-i18next (multi-country support)

### **Infrastructure**
- **Hosting**: AWS EC2 Auto Scaling Group (backend) + S3/CloudFront (frontend)
- **Database**: MongoDB Atlas with regional clusters
- **CDN**: CloudFront global with regional edge locations
- **Monitoring**: CloudWatch + LogRocket + Sentry
- **CI/CD**: GitHub Actions with environment promotion
- **Domain**: Route 53 + Certificate Manager
- **Load Balancing**: Application Load Balancer with health checks

---

## 💰 **Modelo de Monetización Multi-Karting**

### **Revenue Streams**
1. **Race Registration Fees**: 5-10% comisión por inscripción
2. **Karting Partnership Fees**: Licencia mensual por karting ($50-200/mes)
3. **Membership Premium**: Features adicionales ($9.990/mes Chile, $12.99/mes international)
4. **Corporate Events**: Packages empresariales multi-ubicación
5. **Coaching Marketplace**: Comisión instructores (15%)
6. **Merchandise**: Productos branded
7. **Data Analytics**: Reports premium para kartings
8. **White Label Solutions**: Licencias customizadas

### **Costos Operacionales Multi-Karting**
```
AWS Infrastructure: $200-800/mes (escalable por karting)
MongoDB Atlas: $100-400/mes (según kartings activos)
Transbank/Stripe fees: 2.95% + fees por transacción
Google Maps API: $500-1500/mes (según usage)
Email/SMS services: $50-200/mes
Monitoring tools: $100-300/mes
Redis caching: $50-150/mes

TOTAL: $1000-3350/mes (dependiendo escala)
```

### **Pricing Tiers por Karting**
```
Starter (1-3 kartings): $50/mes por karting
Professional (4-10 kartings): $35/mes por karting  
Enterprise (11+ kartings): $25/mes por karting + revenue share
Custom/White Label: Negociable
```

---

## 🎯 **Métricas de Éxito Multi-Karting**

### **KPIs Técnicos**
- **Uptime per Karting**: >99.5%
- **Cross-Karting Load Time**: <2s first paint
- **WebSocket Latency**: <100ms per timing system
- **Mobile Performance**: >90 Lighthouse score
- **API Response Time**: <200ms for cross-karting queries

### **KPIs de Negocio**
- **Karting Adoption Rate**: >60% conversion rate para nuevos kartings
- **User Registration Rate**: >60% completion cross-karting
- **Race Participation**: >40% registered users/week per karting
- **Cross-Karting Usage**: >20% users visitando múltiples ubicaciones
- **User Retention**: >70% MAU after 3 months
- **Revenue per Karting**: >$500/month per location
- **Cleanliness Score Impact**: <5% toxic behavior reports

### **KPIs de Escalabilidad**
- **Time to Onboard New Karting**: <2 weeks
- **Adapter Development Time**: <1 week para nuevo timing system
- **Cross-Karting Data Sync**: <5 minutes delay
- **Multi-Karting Query Performance**: <500ms for complex aggregations

---

## 📋 **Next Steps Inmediatos**

### **Preparación Técnica**
1. **Crear carpeta `karteando-backend/`** con estructura multi-karting
2. **Setup package.json** con dependencies para múltiples timing systems
3. **Configurar MongoDB Atlas** con schema multi-karting
4. **Diseñar timing system abstraction layer**
5. **Implementar SMS-Timing adapter** (reutilizar código existente)
6. **Crear landing page** con live viewer público

### **Investigación Pre-Development**
1. **Research MyLaps API** - Timing system alternativo popular
2. **Research Orbits API** - Otro timing system común
3. **Analizar competidores** multi-karting existentes
4. **Definir partnerships** con kartings piloto
5. **Legal research** para operación multi-país

### **Business Preparation**
1. **Business model validation** con kartings locales
2. **Pricing strategy** por región/país
3. **Partnership agreements** templates
4. **Marketing strategy** multi-karting
5. **Investor pitch deck** con escalabilidad global

---

## 🌍 **Roadmap de Expansión Global**

### **Fase 1: Chile (Meses 1-6)**
- SpeedPark Chile (live)
- 2-3 kartings adicionales Santiago
- MVP completo con SMS-Timing

### **Fase 2: LATAM (Meses 6-12)**  
- Argentina: Buenos Aires kartings
- Perú: Lima locations
- MyLaps adapter development
- Multi-currency support

### **Fase 3: Europa/USA (Meses 12-24)**
- USA: Karting chains partnership
- Europa: UK/Spain locations  
- Orbits adapter development
- Multi-language support

### **Fase 4: Global (Meses 24+)**
- Asia-Pacific expansion
- White-label solutions
- Franchise model
- IPO preparation

---

**Documento creado**: Agosto 2025  
**Proyecto**: karteando.cl  
**Status**: Proceso de implementación multi-karting definido - Listo para desarrollo escalable  
**Arquitectura**: Backend-first con S3 + MongoDB + Multi-timing system support