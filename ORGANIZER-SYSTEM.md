# 🎯 Sistema de Organizadores - Karteando.cl

## ✅ Completado

### 1. Modelo de Usuario Actualizado
**Archivo**: `src/models/WebUser.ts`

Se agregó sistema de roles con tres niveles:
- `user`: Usuario normal
- `organizer`: Puede crear y gestionar campeonatos
- `admin`: Acceso total (tu cuenta personal)

```typescript
role: 'user' | 'organizer' | 'admin';

organizerProfile?: {
  approvedBy?: mongoose.Types.ObjectId; // Admin que aprobó
  approvedAt?: Date;
  permissions: {
    canCreateChampionships: boolean;    // Crear campeonatos
    canApproveSquadrons: boolean;       // Aprobar equipos
    canLinkRaces: boolean;              // Vincular carreras
    canModifyStandings: boolean;        // Modificar clasificaciones
  };
  organizationName?: string;            // Nombre opcional de organización
  notes?: string;                       // Notas del admin
};
```

### 2. APIs de Gestión de Organizadores

#### **POST /api/users/request-organizer**
Usuario solicita ser organizador.

**Body**:
```json
{
  "organizationName": "Mi Organización (opcional)",
  "reason": "Quiero organizar campeonatos porque..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Solicitud enviada. Un administrador la revisará pronto."
}
```

#### **GET /api/users/request-organizer**
Ver estado de solicitud del usuario actual.

**Response**:
```json
{
  "success": true,
  "role": "user",
  "hasPendingRequest": true,
  "organizerProfile": { ... }
}
```

#### **POST /api/admin/organizers/approve**
Admin aprueba un usuario como organizador.

**Body**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "permissions": {
    "canCreateChampionships": true,
    "canApproveSquadrons": false,
    "canLinkRaces": true,
    "canModifyStandings": false
  },
  "organizationName": "Speed Demons Chile",
  "notes": "Aprobado para organizar campeonatos Elite"
}
```

#### **GET /api/admin/organizers/approve**
Admin ve todas las solicitudes pendientes y organizadores actuales.

**Response**:
```json
{
  "success": true,
  "pendingRequests": [ ... ],
  "currentOrganizers": [ ... ]
}
```

### 3. Sistema de Autenticación de Organizadores

**Archivo**: `src/lib/auth/organizerAuth.ts`

Dos funciones principales:

#### `verifyOrganizer(request, requiredPermission?)`
Verifica que el usuario sea organizador o admin, opcionalmente chequea un permiso específico.

```typescript
const authResult = await verifyOrganizer(request, 'canCreateChampionships');
if (!authResult.success) {
  return NextResponse.json(
    { error: authResult.error },
    { status: authResult.status }
  );
}
```

**Permisos disponibles**:
- `canCreateChampionships`
- `canApproveSquadrons`
- `canLinkRaces`
- `canModifyStandings`

#### `verifyAdmin(request)`
Verifica que el usuario sea el admin (tu cuenta).

### 4. API de Campeonatos con Permisos

**Archivo**: `src/app/api/championships/route.ts`

#### **POST /api/championships**
Crear campeonato (requiere `canCreateChampionships`).

**Body**:
```json
{
  "name": "Campeonato Elite Verano 2025",
  "season": "2025-1",
  "division": "Elite",
  "pointsSystem": "f1",
  "maxSquadrons": 20,
  "registrationDeadline": "2025-02-01T00:00:00Z"
}
```

Sistema de puntos:
- `"f1"`: Sistema F1 estándar (25-18-15-12-10-8-6-4-2-1)
- `"custom"`: Array personalizado (ej: `[30, 25, 20, 15, 10, 5]`)

#### **GET /api/championships**
Listar campeonatos (público).

**Query params**:
- `status`: 'registration' | 'active' | 'finished' | 'cancelled'
- `division`: 'Elite' | 'Masters' | 'Pro' | 'Open'
- `season`: '2025-1'

### 5. Modelo Championship Actualizado

**Archivo**: `src/models/Championship.ts`

Campos de fecha ahora son opcionales (se configuran después de crear):
```typescript
startDate?: Date;
endDate?: Date;
registrationDeadline?: Date;
```

---

## 🎯 Flujo Completo

### Para Usuarios que Quieren Ser Organizadores:

1. **Solicitar rol** → `POST /api/users/request-organizer`
   - Proporcionar razón y opcionalmente nombre de organización
   - Estado queda como "SOLICITUD PENDIENTE" en `organizerProfile.notes`

2. **Esperar aprobación** → `GET /api/users/request-organizer`
   - Ver si la solicitud fue aprobada
   - Ver permisos otorgados

3. **Crear campeonatos** → `POST /api/championships`
   - Una vez aprobado con permiso `canCreateChampionships`
   - Puede crear campeonatos en cualquier división

### Para Admin (Tu Cuenta):

1. **Ver solicitudes** → `GET /api/admin/organizers/approve`
   - Ver lista de usuarios que solicitaron ser organizadores
   - Ver organizadores actuales

2. **Aprobar organizador** → `POST /api/admin/organizers/approve`
   - Seleccionar qué permisos otorgar
   - Agregar notas si es necesario

3. **Admin bypassa todo**
   - El rol `admin` automáticamente tiene todos los permisos
   - No necesita `organizerProfile` configurado

---

## 🔐 Niveles de Acceso

### Usuario (`user`)
- Ver campeonatos públicos
- Inscribir su equipo en campeonatos
- Ver clasificaciones

### Organizador (`organizer`)
- **Con `canCreateChampionships`**: Crear nuevos campeonatos
- **Con `canApproveSquadrons`**: Aprobar inscripciones de equipos
- **Con `canLinkRaces`**: Vincular sesiones de SMS-Timing a rondas
- **Con `canModifyStandings`**: Ajustar clasificaciones manualmente

### Admin (`admin`)
- Todo lo anterior automáticamente
- Aprobar/rechazar solicitudes de organizadores
- Gestionar permisos de organizadores
- Acceso completo a toda la plataforma

---

## 🚀 Próximos Pasos

### Interfaces de Usuario Pendientes:
1. **Página de solicitud de organizador** (`/request-organizer`)
   - Formulario para solicitar rol
   - Ver estado de solicitud

2. **Panel de admin** (`/admin/organizers`)
   - Lista de solicitudes pendientes
   - Aprobar/rechazar con permisos granulares

3. **Panel de organizador** (`/organizer/dashboard`)
   - Crear campeonatos
   - Gestionar campeonatos propios
   - Ver estadísticas

4. **Página de creación de campeonato** (`/championships/create`)
   - Formulario completo de campeonato
   - Configuración de rondas
   - Sistema de puntos

### APIs Pendientes:
1. **Gestión de rondas**:
   - `POST /api/championships/[id]/rounds` - Crear ronda
   - `PATCH /api/championships/[id]/rounds/[roundId]` - Vincular RaceSession
   - `POST /api/championships/[id]/rounds/[roundId]/results` - Calcular resultados

2. **Inscripciones**:
   - `POST /api/championships/[id]/register` - Inscribir equipo
   - `PATCH /api/championships/[id]/register/[squadronId]` - Aprobar inscripción

3. **Gestión de campeonato**:
   - `PATCH /api/championships/[id]` - Editar campeonato
   - `POST /api/championships/[id]/finalize` - Finalizar campeonato

---

*Sistema completado: 2025-12-01*
