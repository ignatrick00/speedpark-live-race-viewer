# Protocolo de Implementación: Sistema de Escuderías para Karteando

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Fases de Implementación](#fases-de-implementación)
4. [Puntos de Control y Pruebas](#puntos-de-control-y-pruebas)
5. [Consideraciones Técnicas](#consideraciones-técnicas)

## 📝 Resumen Ejecutivo

Este documento detalla el protocolo paso a paso para implementar el **Sistema Completo de App de Karting Racing por Escuderías** en la plataforma Karteando.

### Características Principales:
- **Escuderías**: Equipos de 2-4 pilotos que compiten juntos
- **Sistema de Rankings**: Clasificación oficial de escuderías basada en campeonatos
- **Modalidades de Carrera**: Individuales, amistosas entre escuderías, y campeonatos oficiales
- **Fair Racing**: Sistema de conducción limpia que afecta a escuderías
- **Gestión de Equipos**: Creación, administración y membresías flexibles

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico Actual:
- **Frontend**: Next.js 14.2.18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + MongoDB (Mongoose)
- **Tiempo Real**: WebSocket server independiente
- **Autenticación**: JWT + bcrypt
- **Deploy**: AWS Amplify
- **Almacenamiento**: AWS S3 para logos y videos
- **CDN**: CloudFront para distribución de media

### Nuevos Componentes a Implementar:

```
src/
├── models/
│   ├── Team.ts                    # Modelo de Escudería
│   ├── TeamRaceSession.ts         # Sesiones de carrera por escudería
│   ├── TeamStats.ts               # Estadísticas agregadas de escudería
│   ├── TeamInvitation.ts          # Sistema de invitaciones
│   └── FairRacingIncident.ts      # Reportes de conducción
├── lib/services/
│   ├── s3Service.ts               # Servicio AWS S3
│   ├── teamService.ts             # Lógica de negocio escuderías
│   └── teamRankingService.ts      # Cálculo de rankings
├── app/api/teams/
│   ├── route.ts                   # CRUD escuderías
│   ├── [teamId]/
│   │   ├── route.ts              # Operaciones específicas
│   │   ├── members/route.ts      # Gestión de miembros
│   │   ├── stats/route.ts        # Estadísticas
│   │   └── races/route.ts        # Carreras del equipo
│   ├── invitations/route.ts      # Sistema de invitaciones
│   └── rankings/route.ts         # Rankings oficiales
├── app/api/upload/
│   ├── presigned-url/route.ts    # URLs firmadas S3
│   └── confirm/route.ts          # Confirmar uploads
├── app/api/races/teams/
│   ├── route.ts                  # Carreras de escuderías
│   └── championships/route.ts    # Campeonatos oficiales
├── app/api/fair-racing/
│   ├── reports/route.ts          # Sistema de reportes
│   └── observers/route.ts        # Observadores oficiales
└── components/teams/
    ├── TeamDashboard.tsx         # Dashboard principal
    ├── TeamCreationWizard.tsx    # Creación de escudería
    ├── TeamManagement.tsx        # Gestión de equipo
    ├── TeamRankings.tsx          # Rankings y clasificaciones
    └── TeamRaceViewer.tsx        # Visualizador carreras equipo
```

## 📊 Fases de Implementación

### FASE 0: Infraestructura S3 y Almacenamiento (2 días)
**Objetivo**: Configurar la infraestructura de almacenamiento en la nube para logos de escuderías y videos de evidencia.

#### 0.1 Configuración AWS S3
```bash
# Crear bucket principal
Nombre: karteando-media-prod
Región: us-east-1 (o la más cercana)
Configuración:
- Versionado: Habilitado
- Encriptación: SSE-S3
- ACL: Privado
```

#### 0.2 Estructura de Carpetas en S3
```
karteando-media-prod/
├── teams/
│   ├── logos/              # Logos de escuderías
│   │   └── {teamId}/       # Carpeta por equipo
│   └── banners/            # Banners opcionales
├── fair-racing/
│   ├── reports/            # Videos de reportes
│   │   └── {year}/{month}/ # Organizado por fecha
│   └── temp/               # Uploads temporales
└── profiles/
    └── avatars/            # Fotos de perfil usuarios
```

#### 0.3 Políticas CORS para S3
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": [
                "http://localhost:3000",
                "https://karteando.cl",
                "https://*.karteando.cl"
            ],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

#### 0.4 Servicio S3 en Backend
```typescript
// src/lib/services/s3Service.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET!;
  }
  
  // Generar URL presigned para upload
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      Metadata: metadata,
    });
    
    return await getSignedUrl(this.s3Client, command, { 
      expiresIn: 3600 // 1 hora
    });
  }
  
  // Generar URL presigned para download
  async getPresignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    
    return await getSignedUrl(this.s3Client, command, { 
      expiresIn: 86400 // 24 horas
    });
  }
  
  // Eliminar objeto
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    
    await this.s3Client.send(command);
  }
  
  // Validar tamaño y tipo de archivo
  validateFile(
    fileType: string,
    fileSize: number,
    type: 'logo' | 'video'
  ): { valid: boolean; error?: string } {
    const limits = {
      logo: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
      },
      video: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime']
      }
    };
    
    const config = limits[type];
    
    if (fileSize > config.maxSize) {
      return { 
        valid: false, 
        error: `El archivo excede el tamaño máximo de ${config.maxSize / 1024 / 1024}MB` 
      };
    }
    
    if (!config.allowedTypes.includes(fileType)) {
      return { 
        valid: false, 
        error: `Tipo de archivo no permitido. Use: ${config.allowedTypes.join(', ')}` 
      };
    }
    
    return { valid: true };
  }
}
```

#### 0.5 API Routes para Upload
```typescript
// src/app/api/upload/presigned-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Service } from '@/lib/services/s3Service';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId;
    
    // Obtener datos del request
    const { fileType, fileSize, uploadType } = await request.json();
    
    // Validar archivo
    const s3Service = new S3Service();
    const validation = s3Service.validateFile(fileType, fileSize, uploadType);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Generar key única
    const fileExtension = fileType.split('/')[1];
    const timestamp = new Date().toISOString().split('T')[0];
    let key = '';
    
    switch (uploadType) {
      case 'logo':
        key = `teams/logos/${userId}/${uuidv4()}.${fileExtension}`;
        break;
      case 'video':
        key = `fair-racing/reports/${timestamp}/${uuidv4()}.${fileExtension}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Tipo de upload no válido' },
          { status: 400 }
        );
    }
    
    // Generar URL presigned
    const uploadUrl = await s3Service.getPresignedUploadUrl(key, fileType, {
      uploadedBy: userId,
      uploadType: uploadType,
      originalName: request.headers.get('x-file-name') || 'unknown'
    });
    
    return NextResponse.json({
      uploadUrl,
      key,
      expiresIn: 3600
    });
    
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de upload' },
      { status: 500 }
    );
  }
}
```

#### 0.6 Variables de Entorno Necesarias
```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=karteando-media-prod
CLOUDFRONT_DOMAIN=https://d1234567890.cloudfront.net
```

#### 0.7 Cliente Frontend para Upload
```typescript
// src/lib/uploadClient.ts
export class UploadClient {
  static async uploadFile(
    file: File,
    uploadType: 'logo' | 'video',
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; key?: string; error?: string }> {
    try {
      // 1. Obtener URL presigned
      const response = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'X-File-Name': file.name
        },
        body: JSON.stringify({
          fileType: file.type,
          fileSize: file.size,
          uploadType
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error };
      }
      
      const { uploadUrl, key } = await response.json();
      
      // 2. Upload directo a S3
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(Math.round(progress));
          }
        });
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve({ success: true, key });
          } else {
            resolve({ success: false, error: 'Error al subir archivo' });
          }
        };
        
        xhr.onerror = () => {
          resolve({ success: false, error: 'Error de red' });
        };
        
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: 'Error al procesar upload' };
    }
  }
}
```

#### 0.8 Configuración CloudFront CDN
```javascript
// Configuración de distribución CloudFront
{
  "Origins": [{
    "DomainName": "karteando-media-prod.s3.amazonaws.com",
    "S3OriginConfig": {
      "OriginAccessIdentity": "origin-access-identity/cloudfront/E127EXAMPLE51Z"
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-karteando-media-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD"],
    "CachedMethods": ["GET", "HEAD"],
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  }
}
```

#### Punto de Control 0.1 ✅
- [ ] Bucket S3 creado y configurado
- [ ] Políticas CORS aplicadas correctamente
- [ ] Servicio S3 implementado y probado
- [ ] APIs de upload funcionando
- [ ] Upload desde frontend exitoso
- [ ] CloudFront configurado y sirviendo archivos

---

### FASE 1: Modelos de Datos Base (2-3 días)
**Objetivo**: Crear la estructura de datos fundamental para escuderías.

#### 1.1 Modelo Team (Escudería)
```typescript
// src/models/Team.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  // Identificación
  name: string;              // Nombre único de la escudería
  slug: string;              // URL-friendly (ej: "velocity-racing")
  logoS3Key?: string;        // Key en S3 del logo
  colors: {
    primary: string;       // Color principal (hex)
    secondary: string;     // Color secundario (hex)
  };
  
  // Miembros
  members: Array<{
    webUserId: mongoose.Types.ObjectId;
    role: 'captain' | 'member';
    joinedAt: Date;
    leftAt?: Date;
    status: 'active' | 'inactive' | 'expelled';
  }>;
  
  // Configuración
  description: string;
  philosophy: string;
  requirements?: string;     // Requisitos para unirse
  recruitmentMode: 'open' | 'invite_only';
  minFairRacing: number;     // Mínimo requerido (0-100)
  maxMembers: number;        // Default: 4
  
  // Estado
  status: 'active' | 'suspended' | 'disbanded';
  ranking: {
    points: number;
    position: number;
    lastCalculated: Date;
    division: 'elite' | 'masters' | 'pro' | 'open';
  };
  
  // Estadísticas agregadas
  stats: {
    totalRaces: number;
    championshipRaces: number;
    victories: number;
    podiums: number;
    totalChampionshipPoints: number;
    averageFairRacing: number;
    activeMemberCount: number;
  };
  
  // Logros
  achievements: Array<{
    type: string;
    unlockedAt: Date;
    description: string;
  }>;
  
  // Metadatos
  founderId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema = new Schema({
  // Identificación
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  logoS3Key: {
    type: String,
    default: null,
  },
  colors: {
    primary: {
      type: String,
      required: true,
      match: /^#[0-9A-F]{6}$/i,
    },
    secondary: {
      type: String,
      required: true,
      match: /^#[0-9A-F]{6}$/i,
    },
  },
  
  // Miembros
  members: [{
    webUserId: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      required: true,
    },
    role: {
      type: String,
      enum: ['captain', 'member'],
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    leftAt: Date,
    status: {
      type: String,
      enum: ['active', 'inactive', 'expelled'],
      default: 'active',
    },
  }],
  
  // Configuración
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  philosophy: {
    type: String,
    maxlength: 300,
  },
  requirements: {
    type: String,
    maxlength: 300,
  },
  recruitmentMode: {
    type: String,
    enum: ['open', 'invite_only'],
    default: 'open',
  },
  minFairRacing: {
    type: Number,
    default: 75,
    min: 0,
    max: 100,
  },
  maxMembers: {
    type: Number,
    default: 4,
    min: 2,
    max: 4,
  },
  
  // Estado
  status: {
    type: String,
    enum: ['active', 'suspended', 'disbanded'],
    default: 'active',
  },
  ranking: {
    points: { type: Number, default: 0 },
    position: { type: Number, default: 9999 },
    lastCalculated: { type: Date, default: Date.now },
    division: {
      type: String,
      enum: ['elite', 'masters', 'pro', 'open'],
      default: 'open',
    },
  },
  
  // Estadísticas
  stats: {
    totalRaces: { type: Number, default: 0 },
    championshipRaces: { type: Number, default: 0 },
    victories: { type: Number, default: 0 },
    podiums: { type: Number, default: 0 },
    totalChampionshipPoints: { type: Number, default: 0 },
    averageFairRacing: { type: Number, default: 85 },
    activeMemberCount: { type: Number, default: 0 },
  },
  
  // Logros
  achievements: [{
    type: { type: String, required: true },
    unlockedAt: { type: Date, required: true },
    description: { type: String, required: true },
  }],
  
  // Metadatos
  founderId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
}, {
  timestamps: true,
});

// Índices para búsquedas eficientes
TeamSchema.index({ name: 'text' });
TeamSchema.index({ slug: 1 });
TeamSchema.index({ 'members.webUserId': 1 });
TeamSchema.index({ status: 1, 'ranking.division': 1 });
TeamSchema.index({ 'ranking.points': -1 });

// Validación: mínimo 2 miembros activos
TeamSchema.pre('save', function(next) {
  const activeMembers = this.members.filter(m => m.status === 'active');
  if (activeMembers.length < 2) {
    return next(new Error('La escudería debe tener al menos 2 miembros activos'));
  }
  this.stats.activeMemberCount = activeMembers.length;
  next();
});

// Método para generar slug
TeamSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
```

#### 1.2 Actualización WebUser
```typescript
// Agregar a src/models/WebUser.ts
// Nuevos campos en la interface IWebUser:

// Información de escudería
teamMemberships: Array<{
  teamId: mongoose.Types.ObjectId;
  teamName: string;          // Cached para evitar populates
  role: 'captain' | 'member';
  joinedAt: Date;
  leftAt?: Date;
  status: 'active' | 'inactive' | 'expelled';
}>;

currentTeamId?: mongoose.Types.ObjectId;  // Equipo activo actual
fairRacingScore: number;                  // 0-100, default: 85
racingPreferences: {
  availableDays: string[];    // ['monday', 'tuesday', ...]
  preferredTime: string;      // 'morning' | 'afternoon' | 'evening'
  competitionLevel: string;   // 'casual' | 'competitive' | 'elite'
};

// Agregar al Schema:
teamMemberships: [{
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
  },
  teamName: String,
  role: {
    type: String,
    enum: ['captain', 'member'],
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'expelled'],
    default: 'active',
  },
}],

currentTeamId: {
  type: Schema.Types.ObjectId,
  ref: 'Team',
  default: null,
},

fairRacingScore: {
  type: Number,
  default: 85,
  min: 0,
  max: 100,
},

racingPreferences: {
  availableDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  }],
  preferredTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
  },
  competitionLevel: {
    type: String,
    enum: ['casual', 'competitive', 'elite'],
    default: 'casual',
  },
},
```

#### 1.3 Modelo TeamRaceSession
```typescript
// src/models/TeamRaceSession.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamRaceSession extends Document {
  sessionId: string;         // ID de RaceSession original
  sessionDate: Date;
  sessionName: string;
  
  // Equipos participantes
  teams: Array<{
    teamId: mongoose.Types.ObjectId;
    teamName: string;
    teamColors: {
      primary: string;
      secondary: string;
    };
    
    // Participantes del equipo en esta carrera
    participants: Array<{
      webUserId: mongoose.Types.ObjectId;
      driverName: string;
      kartNumber: number;
      position: number;         // Posición final individual
      points: number;          // Puntos individuales (sistema F1)
      bestLap: number;         // Mejor vuelta en ms
      totalLaps: number;
      incidents: number;       // Contador de incidentes
    }>;
    
    // Resultados del equipo
    teamPosition: number;      // Posición final del equipo
    teamPoints: number;        // Total puntos combinados
    averagePosition: number;   // Promedio posiciones
    bestTeamLap: number;      // Mejor vuelta del equipo
  }>;
  
  // Clasificación de carrera
  eventType: 'friendly' | 'championship';
  championshipInfo?: {
    division: 'elite' | 'masters' | 'pro' | 'open';
    round: number;
    season: string;
    pointsMultiplier: number;  // Para eventos especiales
  };
  
  // Distribución de puntos del campeonato
  championshipPoints: Array<{
    teamId: mongoose.Types.ObjectId;
    position: number;
    basePoints: number;       // Puntos base por posición
    bonusPoints: number;      // Bonificaciones
    penaltyPoints: number;    // Penalizaciones
    totalPoints: number;      // Total para ranking
  }>;
  
  // Observadores y fair racing
  observerIds: mongoose.Types.ObjectId[];
  fairRacingNotes: Array<{
    observerId: mongoose.Types.ObjectId;
    teamId?: mongoose.Types.ObjectId;
    driverId?: mongoose.Types.ObjectId;
    type: 'commendation' | 'warning' | 'incident';
    description: string;
    timestamp: Date;
  }>;
  
  // Metadatos
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamRaceSessionSchema: Schema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  sessionDate: {
    type: Date,
    required: true,
  },
  sessionName: {
    type: String,
    required: true,
  },
  
  teams: [{
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    teamName: String,
    teamColors: {
      primary: String,
      secondary: String,
    },
    
    participants: [{
      webUserId: {
        type: Schema.Types.ObjectId,
        ref: 'WebUser',
      },
      driverName: String,
      kartNumber: Number,
      position: Number,
      points: Number,
      bestLap: Number,
      totalLaps: Number,
      incidents: { type: Number, default: 0 },
    }],
    
    teamPosition: Number,
    teamPoints: Number,
    averagePosition: Number,
    bestTeamLap: Number,
  }],
  
  eventType: {
    type: String,
    enum: ['friendly', 'championship'],
    required: true,
  },
  
  championshipInfo: {
    division: {
      type: String,
      enum: ['elite', 'masters', 'pro', 'open'],
    },
    round: Number,
    season: String,
    pointsMultiplier: { type: Number, default: 1 },
  },
  
  championshipPoints: [{
    teamId: Schema.Types.ObjectId,
    position: Number,
    basePoints: Number,
    bonusPoints: { type: Number, default: 0 },
    penaltyPoints: { type: Number, default: 0 },
    totalPoints: Number,
  }],
  
  observerIds: [{
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
  }],
  
  fairRacingNotes: [{
    observerId: Schema.Types.ObjectId,
    teamId: Schema.Types.ObjectId,
    driverId: Schema.Types.ObjectId,
    type: {
      type: String,
      enum: ['commendation', 'warning', 'incident'],
    },
    description: String,
    timestamp: Date,
  }],
  
  processed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Índices
TeamRaceSessionSchema.index({ sessionDate: -1 });
TeamRaceSessionSchema.index({ 'teams.teamId': 1 });
TeamRaceSessionSchema.index({ eventType: 1, 'championshipInfo.division': 1 });

export default mongoose.models.TeamRaceSession || mongoose.model<ITeamRaceSession>('TeamRaceSession', TeamRaceSessionSchema);
```

#### 1.4 Modelo FairRacingIncident
```typescript
// src/models/FairRacingIncident.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IFairRacingIncident extends Document {
  // Identificación del reporte
  reporterId: mongoose.Types.ObjectId;      // Quien reporta
  reporterTeamId?: mongoose.Types.ObjectId; // Equipo del reportador
  
  // Piloto reportado
  reportedDriverId: mongoose.Types.ObjectId;
  reportedDriverName: string;               // Cached
  reportedTeamId?: mongoose.Types.ObjectId;
  reportedTeamName?: string;                // Cached
  
  // Sesión donde ocurrió
  sessionId: string;
  sessionName: string;
  sessionDate: Date;
  
  // Detalles del incidente
  incidentType: 'aggressive_driving' | 'blocking' | 'contact' | 'unsportsmanlike' | 'exploit' | 'other';
  severity: 1 | 2 | 3;  // 1=leve, 2=moderado, 3=grave
  lap: number;
  turn?: string;        // Curva específica
  description: string;  // Mínimo 50 caracteres
  
  // Evidencia
  videoS3Key: string;          // Key en S3 (obligatorio)
  videoSize: number;           // Tamaño en bytes
  videoDuration?: number;      // Duración en segundos
  videoStatus: 'uploading' | 'ready' | 'failed' | 'deleted';
  videoUploadedAt: Date;
  additionalEvidence?: string; // Enlaces adicionales
  
  // Resolución
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'appealed';
  reviewedBy?: mongoose.Types.ObjectId;     // Moderador
  reviewedAt?: Date;
  reviewNotes?: string;                     // Notas del moderador
  
  // Penalizaciones (si es aprobado)
  penalty?: {
    fairRacingPoints: number;  // Puntos deducidos
    championshipPoints?: number; // Puntos de campeonato perdidos
    racePositions?: number;     // Posiciones penalizadas
    suspensionRaces?: number;   // Carreras suspendido
  };
  
  // Sistema de apelación
  appeal?: {
    appealedAt: Date;
    appealReason: string;
    appealStatus: 'pending' | 'approved' | 'rejected';
    appealReviewedBy?: mongoose.Types.ObjectId;
    appealReviewedAt?: Date;
    appealDecision?: string;
  };
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;  // Para limpieza automática
}

const FairRacingIncidentSchema: Schema = new Schema({
  // Identificación
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  reporterTeamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
  },
  
  reportedDriverId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  reportedDriverName: String,
  reportedTeamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
  },
  reportedTeamName: String,
  
  // Sesión
  sessionId: {
    type: String,
    required: true,
  },
  sessionName: String,
  sessionDate: Date,
  
  // Detalles
  incidentType: {
    type: String,
    enum: ['aggressive_driving', 'blocking', 'contact', 'unsportsmanlike', 'exploit', 'other'],
    required: true,
  },
  severity: {
    type: Number,
    enum: [1, 2, 3],
    required: true,
  },
  lap: {
    type: Number,
    required: true,
  },
  turn: String,
  description: {
    type: String,
    required: true,
    minlength: 50,
  },
  
  // Evidencia
  videoS3Key: {
    type: String,
    required: true,
  },
  videoSize: {
    type: Number,
    required: true,
  },
  videoDuration: Number,
  videoStatus: {
    type: String,
    enum: ['uploading', 'ready', 'failed', 'deleted'],
    default: 'uploading',
  },
  videoUploadedAt: {
    type: Date,
    default: Date.now,
  },
  additionalEvidence: String,
  
  // Resolución
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'appealed'],
    default: 'pending',
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
  },
  reviewedAt: Date,
  reviewNotes: String,
  
  // Penalizaciones
  penalty: {
    fairRacingPoints: Number,
    championshipPoints: Number,
    racePositions: Number,
    suspensionRaces: Number,
  },
  
  // Apelación
  appeal: {
    appealedAt: Date,
    appealReason: String,
    appealStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
    },
    appealReviewedBy: Schema.Types.ObjectId,
    appealReviewedAt: Date,
    appealDecision: String,
  },
  
  // TTL para videos (90 días)
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 7776000, // 90 días en segundos
  },
}, {
  timestamps: true,
});

// Índices
FairRacingIncidentSchema.index({ sessionId: 1 });
FairRacingIncidentSchema.index({ reporterId: 1 });
FairRacingIncidentSchema.index({ reportedDriverId: 1 });
FairRacingIncidentSchema.index({ status: 1, createdAt: -1 });

// Validación: no auto-reportarse
FairRacingIncidentSchema.pre('save', function(next) {
  if (this.reporterId.equals(this.reportedDriverId)) {
    return next(new Error('No puedes reportarte a ti mismo'));
  }
  next();
});

export default mongoose.models.FairRacingIncident || mongoose.model<IFairRacingIncident>('FairRacingIncident', FairRacingIncidentSchema);
```

#### 1.5 Modelo TeamInvitation
```typescript
// src/models/TeamInvitation.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamInvitation extends Document {
  teamId: mongoose.Types.ObjectId;
  teamName: string;          // Cached
  
  // Invitador
  invitedBy: mongoose.Types.ObjectId;
  inviterName: string;       // Cached
  
  // Invitado
  invitedUserId: mongoose.Types.ObjectId;
  invitedEmail?: string;     // Para invitaciones por email
  
  // Estado
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  message?: string;          // Mensaje personalizado
  
  // Respuesta
  respondedAt?: Date;
  responseMessage?: string;
  
  // Expiración
  expiresAt: Date;          // Default: 7 días
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
}

const TeamInvitationSchema: Schema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamName: String,
  
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  inviterName: String,
  
  invitedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
  },
  invitedEmail: {
    type: String,
    lowercase: true,
  },
  
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'],
    default: 'pending',
  },
  message: {
    type: String,
    maxlength: 200,
  },
  
  respondedAt: Date,
  responseMessage: String,
  
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7*24*60*60*1000), // 7 días
  },
}, {
  timestamps: true,
});

// Índices
TeamInvitationSchema.index({ invitedUserId: 1, status: 1 });
TeamInvitationSchema.index({ teamId: 1 });
TeamInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// No duplicar invitaciones pendientes
TeamInvitationSchema.index({ teamId: 1, invitedUserId: 1, status: 1 }, { unique: true });

export default mongoose.models.TeamInvitation || mongoose.model<ITeamInvitation>('TeamInvitation', TeamInvitationSchema);
```

#### Punto de Control 1.1 ✅
- [ ] Modelos creados y compilando sin errores
- [ ] Tipos TypeScript correctamente definidos
- [ ] Índices de MongoDB apropiados
- [ ] Validaciones implementadas
- [ ] Relaciones entre modelos establecidas
- [ ] Seeds de datos de prueba creados
- [ ] Validación manual en MongoDB Compass

---

### FASE 2: APIs de Gestión de Escuderías (3-4 días)
**Objetivo**: Implementar endpoints para crear y gestionar escuderías.

#### 2.1 API CRUD Escuderías
```typescript
// src/app/api/teams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import WebUser from '@/models/WebUser';
import { verifyToken } from '@/lib/auth';
import { S3Service } from '@/lib/services/s3Service';

// GET /api/teams - Listar escuderías
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'active';
    const division = searchParams.get('division');
    const recruitmentMode = searchParams.get('recruitmentMode');
    const search = searchParams.get('search');
    
    // Construir filtros
    const filters: any = { status };
    if (division) filters['ranking.division'] = division;
    if (recruitmentMode) filters.recruitmentMode = recruitmentMode;
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Ejecutar query con paginación
    const skip = (page - 1) * limit;
    const [teams, total] = await Promise.all([
      Team.find(filters)
        .sort({ 'ranking.points': -1 })
        .skip(skip)
        .limit(limit)
        .select('-members.leftAt'), // No exponer info sensible
      Team.countDocuments(filters)
    ]);
    
    // Enriquecer con URLs de logos si existen
    const s3Service = new S3Service();
    const teamsWithLogos = await Promise.all(
      teams.map(async (team) => {
        const teamObj = team.toObject();
        if (team.logoS3Key) {
          teamObj.logoUrl = await s3Service.getPresignedDownloadUrl(team.logoS3Key);
        }
        return teamObj;
      })
    );
    
    return NextResponse.json({
      teams: teamsWithLogos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Error al obtener escuderías' },
      { status: 500 }
    );
  }
}

// POST /api/teams - Crear escudería
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Verificar que el usuario no tenga ya una escudería activa
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    const activeTeam = user.teamMemberships?.find(tm => 
      tm.status === 'active' && !tm.leftAt
    );
    
    if (activeTeam) {
      return NextResponse.json(
        { error: 'Ya perteneces a una escudería activa' },
        { status: 400 }
      );
    }
    
    // Obtener datos del request
    const {
      name,
      description,
      philosophy,
      requirements,
      colors,
      recruitmentMode,
      minFairRacing
    } = await request.json();
    
    // Validaciones
    if (!name || !description || !colors?.primary || !colors?.secondary) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar nombre único
    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return NextResponse.json(
        { error: 'Ya existe una escudería con ese nombre' },
        { status: 400 }
      );
    }
    
    // Crear escudería
    const newTeam = new Team({
      name: name.trim(),
      description,
      philosophy,
      requirements,
      colors,
      recruitmentMode: recruitmentMode || 'open',
      minFairRacing: minFairRacing || 75,
      founderId: userId,
      members: [{
        webUserId: userId,
        role: 'captain',
        joinedAt: new Date(),
        status: 'active'
      }],
      stats: {
        activeMemberCount: 1,
        averageFairRacing: user.fairRacingScore || 85
      }
    });
    
    await newTeam.save();
    
    // Actualizar usuario
    user.teamMemberships = user.teamMemberships || [];
    user.teamMemberships.push({
      teamId: newTeam._id,
      teamName: newTeam.name,
      role: 'captain',
      joinedAt: new Date(),
      status: 'active'
    });
    user.currentTeamId = newTeam._id;
    await user.save();
    
    return NextResponse.json({
      success: true,
      team: {
        id: newTeam._id,
        name: newTeam.name,
        slug: newTeam.slug,
        colors: newTeam.colors,
        memberCount: 1
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Error al crear la escudería' },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/teams/[teamId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import { verifyToken } from '@/lib/auth';
import { S3Service } from '@/lib/services/s3Service';

interface Params {
  params: {
    teamId: string;
  };
}

// GET /api/teams/[teamId] - Obtener detalle de escudería
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { teamId } = params;
    
    const team = await Team.findById(teamId)
      .populate({
        path: 'members.webUserId',
        select: 'profile fairRacingScore kartingLink'
      })
      .populate({
        path: 'founderId',
        select: 'profile'
      });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }
    
    // Agregar URL del logo si existe
    const teamObj = team.toObject();
    if (team.logoS3Key) {
      const s3Service = new S3Service();
      teamObj.logoUrl = await s3Service.getPresignedDownloadUrl(team.logoS3Key);
    }
    
    return NextResponse.json({ team: teamObj });
    
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Error al obtener la escudería' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[teamId] - Actualizar escudería (solo capitán)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { teamId } = params;
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Verificar que sea el capitán
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }
    
    const userMember = team.members.find(m => 
      m.webUserId.toString() === userId && m.status === 'active'
    );
    
    if (!userMember || userMember.role !== 'captain') {
      return NextResponse.json(
        { error: 'Solo el capitán puede actualizar la escudería' },
        { status: 403 }
      );
    }
    
    // Actualizar campos permitidos
    const updates = await request.json();
    const allowedFields = [
      'description', 'philosophy', 'requirements',
      'colors', 'recruitmentMode', 'minFairRacing'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (team as any)[field] = updates[field];
      }
    });
    
    await team.save();
    
    return NextResponse.json({
      success: true,
      team: {
        id: team._id,
        name: team.name,
        description: team.description,
        colors: team.colors
      }
    });
    
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la escudería' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId] - Disolver escudería (solo capitán)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { teamId } = params;
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Verificar que sea el capitán
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }
    
    if (team.founderId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el fundador puede disolver la escudería' },
        { status: 403 }
      );
    }
    
    // Marcar como disuelta (soft delete)
    team.status = 'disbanded';
    await team.save();
    
    // Actualizar todos los miembros
    const memberIds = team.members.map(m => m.webUserId);
    await WebUser.updateMany(
      { _id: { $in: memberIds } },
      { 
        $set: {
          currentTeamId: null,
          'teamMemberships.$[elem].status': 'inactive',
          'teamMemberships.$[elem].leftAt': new Date()
        }
      },
      {
        arrayFilters: [{ 'elem.teamId': teamId }]
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Escudería disuelta exitosamente'
    });
    
  } catch (error) {
    console.error('Error disbanding team:', error);
    return NextResponse.json(
      { error: 'Error al disolver la escudería' },
      { status: 500 }
    );
  }
}
```

#### 2.2 API Gestión de Miembros
```typescript
// src/app/api/teams/[teamId]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import WebUser from '@/models/WebUser';
import TeamInvitation from '@/models/TeamInvitation';
import { verifyToken } from '@/lib/auth';

interface Params {
  params: {
    teamId: string;
  };
}

// GET /api/teams/[teamId]/members - Listar miembros
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { teamId } = params;
    
    const team = await Team.findById(teamId)
      .populate({
        path: 'members.webUserId',
        select: 'profile fairRacingScore kartingLink email'
      });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }
    
    // Filtrar solo miembros activos por defecto
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    const members = team.members
      .filter(m => includeInactive || m.status === 'active')
      .map(m => ({
        userId: m.webUserId._id,
        profile: (m.webUserId as any).profile,
        role: m.role,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
        status: m.status,
        fairRacingScore: (m.webUserId as any).fairRacingScore
      }));
    
    return NextResponse.json({ members });
    
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Error al obtener miembros' },
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/members/invite - Invitar miembro
export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { teamId } = params;
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Verificar permisos (capitán o miembro con permisos)
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }
    
    const userMember = team.members.find(m => 
      m.webUserId.toString() === userId && m.status === 'active'
    );
    
    if (!userMember || userMember.role !== 'captain') {
      return NextResponse.json(
        { error: 'Solo el capitán puede invitar miembros' },
        { status: 403 }
      );
    }
    
    // Verificar límite de miembros
    const activeMembers = team.members.filter(m => m.status === 'active');
    if (activeMembers.length >= team.maxMembers) {
      return NextResponse.json(
        { error: `La escudería ya tiene el máximo de ${team.maxMembers} miembros` },
        { status: 400 }
      );
    }
    
    const { invitedUserId, invitedEmail, message } = await request.json();
    
    let targetUser;
    if (invitedUserId) {
      targetUser = await WebUser.findById(invitedUserId);
    } else if (invitedEmail) {
      targetUser = await WebUser.findOne({ email: invitedEmail.toLowerCase() });
    }
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar que no esté ya en una escudería
    const targetActiveTeam = targetUser.teamMemberships?.find(tm => 
      tm.status === 'active' && !tm.leftAt
    );
    
    if (targetActiveTeam) {
      return NextResponse.json(
        { error: 'El usuario ya pertenece a otra escudería' },
        { status: 400 }
      );
    }
    
    // Verificar fair racing mínimo
    if (targetUser.fairRacingScore < team.minFairRacing) {
      return NextResponse.json(
        { error: `El usuario no cumple el mínimo de Fair Racing (${team.minFairRacing})` },
        { status: 400 }
      );
    }
    
    // Crear invitación
    const inviter = await WebUser.findById(userId);
    const invitation = new TeamInvitation({
      teamId: team._id,
      teamName: team.name,
      invitedBy: userId,
      inviterName: inviter.profile.fullName || inviter.email,
      invitedUserId: targetUser._id,
      invitedEmail: targetUser.email,
      message
    });
    
    await invitation.save();
    
    // TODO: Enviar notificación/email al invitado
    
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation._id,
        invitedUser: targetUser.profile,
        expiresAt: invitation.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Error al invitar miembro' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[teamId]/members/[userId] - Actualizar rol o expulsar
export async function PUT(
  request: NextRequest, 
  { params }: { params: { teamId: string; userId: string } }
) {
  try {
    await connectDB();
    const { teamId, userId: targetUserId } = params;
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Obtener equipo
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que el usuario sea capitán
    const userMember = team.members.find(m => 
      m.webUserId.toString() === userId && m.status === 'active'
    );
    
    if (!userMember || userMember.role !== 'captain') {
      return NextResponse.json(
        { error: 'Solo el capitán puede gestionar miembros' },
        { status: 403 }
      );
    }
    
    // Encontrar miembro objetivo
    const targetMember = team.members.find(m => 
      m.webUserId.toString() === targetUserId
    );
    
    if (!targetMember) {
      return NextResponse.json(
        { error: 'Miembro no encontrado en la escudería' },
        { status: 404 }
      );
    }
    
    const { action, newRole } = await request.json();
    
    switch (action) {
      case 'changeRole':
        if (targetUserId === team.founderId.toString()) {
          return NextResponse.json(
            { error: 'No se puede cambiar el rol del fundador' },
            { status: 400 }
          );
        }
        targetMember.role = newRole;
        break;
        
      case 'expel':
        if (targetUserId === team.founderId.toString()) {
          return NextResponse.json(
            { error: 'No se puede expulsar al fundador' },
            { status: 400 }
          );
        }
        targetMember.status = 'expelled';
        targetMember.leftAt = new Date();
        break;
        
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }
    
    await team.save();
    
    // Actualizar usuario afectado
    if (action === 'expel') {
      await WebUser.findByIdAndUpdate(targetUserId, {
        $set: {
          currentTeamId: null,
          'teamMemberships.$[elem].status': 'expelled',
          'teamMemberships.$[elem].leftAt': new Date()
        }
      }, {
        arrayFilters: [{ 'elem.teamId': teamId }]
      });
    }
    
    return NextResponse.json({
      success: true,
      message: action === 'expel' ? 'Miembro expulsado' : 'Rol actualizado'
    });
    
  } catch (error) {
    console.error('Error managing member:', error);
    return NextResponse.json(
      { error: 'Error al gestionar miembro' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId]/members - Salir de escudería
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { teamId } = params;
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Obtener equipo
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que sea miembro
    const userMember = team.members.find(m => 
      m.webUserId.toString() === userId && m.status === 'active'
    );
    
    if (!userMember) {
      return NextResponse.json(
        { error: 'No eres miembro activo de esta escudería' },
        { status: 400 }
      );
    }
    
    // No permitir que el fundador abandone si quedan miembros
    if (userId === team.founderId.toString()) {
      const activeMembers = team.members.filter(m => m.status === 'active');
      if (activeMembers.length > 1) {
        return NextResponse.json(
          { error: 'El fundador debe transferir el liderazgo antes de salir' },
          { status: 400 }
        );
      }
    }
    
    // Marcar como inactivo
    userMember.status = 'inactive';
    userMember.leftAt = new Date();
    await team.save();
    
    // Actualizar usuario
    await WebUser.findByIdAndUpdate(userId, {
      $set: {
        currentTeamId: null,
        'teamMemberships.$[elem].status': 'inactive',
        'teamMemberships.$[elem].leftAt': new Date()
      }
    }, {
      arrayFilters: [{ 'elem.teamId': teamId }]
    });
    
    return NextResponse.json({
      success: true,
      message: 'Has salido de la escudería exitosamente'
    });
    
  } catch (error) {
    console.error('Error leaving team:', error);
    return NextResponse.json(
      { error: 'Error al salir de la escudería' },
      { status: 500 }
    );
  }
}
```

#### 2.3 API de Invitaciones
```typescript
// src/app/api/teams/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TeamInvitation from '@/models/TeamInvitation';
import Team from '@/models/Team';
import WebUser from '@/models/WebUser';
import { verifyToken } from '@/lib/auth';

// GET /api/teams/invitations - Obtener invitaciones pendientes
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Buscar invitaciones pendientes
    const invitations = await TeamInvitation.find({
      invitedUserId: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
    .populate({
      path: 'teamId',
      select: 'name colors ranking stats'
    })
    .populate({
      path: 'invitedBy',
      select: 'profile'
    })
    .sort({ createdAt: -1 });
    
    return NextResponse.json({ invitations });
    
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Error al obtener invitaciones' },
      { status: 500 }
    );
  }
}

// POST /api/teams/invitations/[invitationId]/respond - Responder invitación
export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    await connectDB();
    const { invitationId } = params;
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyToken(token);
    const userId = decoded.userId;
    
    // Obtener invitación
    const invitation = await TeamInvitation.findById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que sea para este usuario
    if (invitation.invitedUserId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Esta invitación no es para ti' },
        { status: 403 }
      );
    }
    
    // Verificar que esté pendiente y no expirada
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta invitación ya fue respondida' },
        { status: 400 }
      );
    }
    
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return NextResponse.json(
        { error: 'Esta invitación ha expirado' },
        { status: 400 }
      );
    }
    
    const { response, responseMessage } = await request.json();
    
    if (response === 'accept') {
      // Verificar que el usuario no esté en otra escudería
      const user = await WebUser.findById(userId);
      const activeTeam = user.teamMemberships?.find(tm => 
        tm.status === 'active' && !tm.leftAt
      );
      
      if (activeTeam) {
        return NextResponse.json(
          { error: 'Ya perteneces a otra escudería activa' },
          { status: 400 }
        );
      }
      
      // Verificar que la escudería tenga espacio
      const team = await Team.findById(invitation.teamId);
      if (!team || team.status !== 'active') {
        return NextResponse.json(
          { error: 'La escudería ya no está activa' },
          { status: 400 }
        );
      }
      
      const activeMembers = team.members.filter(m => m.status === 'active');
      if (activeMembers.length >= team.maxMembers) {
        return NextResponse.json(
          { error: 'La escudería ya está llena' },
          { status: 400 }
        );
      }
      
      // Agregar a la escudería
      team.members.push({
        webUserId: userId,
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      });
      
      // Recalcular promedio fair racing
      const members = await WebUser.find({
        _id: { $in: team.members.map(m => m.webUserId) }
      });
      
      const totalFairRacing = members.reduce(
        (sum, member) => sum + (member.fairRacingScore || 85), 0
      );
      team.stats.averageFairRacing = totalFairRacing / members.length;
      team.stats.activeMemberCount = activeMembers.length + 1;
      
      await team.save();
      
      // Actualizar usuario
      user.teamMemberships = user.teamMemberships || [];
      user.teamMemberships.push({
        teamId: team._id,
        teamName: team.name,
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      });
      user.currentTeamId = team._id;
      await user.save();
      
      // Actualizar invitación
      invitation.status = 'accepted';
      invitation.respondedAt = new Date();
      invitation.responseMessage = responseMessage;
      await invitation.save();
      
      return NextResponse.json({
        success: true,
        message: 'Te has unido a la escudería exitosamente',
        teamId: team._id
      });
      
    } else if (response === 'reject') {
      invitation.status = 'rejected';
      invitation.respondedAt = new Date();
      invitation.responseMessage = responseMessage;
      await invitation.save();
      
      return NextResponse.json({
        success: true,
        message: 'Invitación rechazada'
      });
      
    } else {
      return NextResponse.json(
        { error: 'Respuesta no válida' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error responding to invitation:', error);
    return NextResponse.json(
      { error: 'Error al responder invitación' },
      { status: 500 }
    );
  }
}
```

#### 2.4 Middleware de Autorización de Equipo
```typescript
// src/middleware/teamAuth.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Team from '@/models/Team';
import connectDB from '@/lib/mongodb';

export interface TeamAuthResult {
  isValid: boolean;
  userId?: string;
  teamId?: string;
  role?: 'captain' | 'member';
  team?: any;
  error?: string;
}

export async function verifyTeamMembership(
  request: NextRequest,
  teamId: string,
  requiredRole?: 'captain'
): Promise<TeamAuthResult> {
  try {
    // Verificar token JWT
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return {
        isValid: false,
        error: 'No se proporcionó token de autenticación'
      };
    }
    
    // Decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId;
    
    // Conectar a DB y buscar equipo
    await connectDB();
    const team = await Team.findById(teamId);
    
    if (!team || team.status !== 'active') {
      return {
        isValid: false,
        error: 'Escudería no encontrada o inactiva'
      };
    }
    
    // Verificar membresía
    const member = team.members.find(m => 
      m.webUserId.toString() === userId && m.status === 'active'
    );
    
    if (!member) {
      return {
        isValid: false,
        error: 'No eres miembro activo de esta escudería'
      };
    }
    
    // Verificar rol si es requerido
    if (requiredRole && member.role !== requiredRole) {
      return {
        isValid: false,
        error: `Se requiere rol de ${requiredRole} para esta operación`
      };
    }
    
    return {
      isValid: true,
      userId,
      teamId,
      role: member.role,
      team
    };
    
  } catch (error) {
    console.error('Team auth error:', error);
    return {
      isValid: false,
      error: 'Error de autenticación'
    };
  }
}

// Helper para responses de error
export function teamAuthError(error: string, status: number = 403) {
  return NextResponse.json({ error }, { status });
}
```

#### 2.5 Servicios de Negocio
```typescript
// src/lib/services/teamService.ts
import Team from '@/models/Team';
import WebUser from '@/models/WebUser';
import TeamInvitation from '@/models/TeamInvitation';
import { S3Service } from './s3Service';

export class TeamService {
  private s3Service: S3Service;
  
  constructor() {
    this.s3Service = new S3Service();
  }
  
  // Calcular y actualizar estadísticas del equipo
  async updateTeamStats(teamId: string): Promise<void> {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Equipo no encontrado');
    
    // Obtener miembros activos
    const activeMemberIds = team.members
      .filter(m => m.status === 'active')
      .map(m => m.webUserId);
    
    const members = await WebUser.find({
      _id: { $in: activeMemberIds }
    });
    
    // Calcular promedio fair racing
    const totalFairRacing = members.reduce(
      (sum, member) => sum + (member.fairRacingScore || 85), 0
    );
    
    team.stats.averageFairRacing = members.length > 0 
      ? totalFairRacing / members.length 
      : 85;
    
    team.stats.activeMemberCount = members.length;
    
    // Determinar división basada en puntos
    const points = team.ranking.points;
    if (points >= 10000) {
      team.ranking.division = 'elite';
    } else if (points >= 5000) {
      team.ranking.division = 'masters';
    } else if (points >= 2000) {
      team.ranking.division = 'pro';
    } else {
      team.ranking.division = 'open';
    }
    
    await team.save();
  }
  
  // Procesar upload de logo
  async uploadTeamLogo(
    teamId: string,
    logoS3Key: string
  ): Promise<{ success: boolean; logoUrl?: string }> {
    try {
      const team = await Team.findById(teamId);
      if (!team) {
        return { success: false };
      }
      
      // Eliminar logo anterior si existe
      if (team.logoS3Key) {
        await this.s3Service.deleteObject(team.logoS3Key);
      }
      
      // Actualizar con nuevo logo
      team.logoS3Key = logoS3Key;
      await team.save();
      
      // Generar URL de descarga
      const logoUrl = await this.s3Service.getPresignedDownloadUrl(logoS3Key);
      
      return { success: true, logoUrl };
    } catch (error) {
      console.error('Error uploading team logo:', error);
      return { success: false };
    }
  }
  
  // Transferir capitanía
  async transferCaptaincy(
    teamId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<boolean> {
    const team = await Team.findById(teamId);
    if (!team) return false;
    
    const fromMember = team.members.find(m => 
      m.webUserId.toString() === fromUserId && m.status === 'active'
    );
    const toMember = team.members.find(m => 
      m.webUserId.toString() === toUserId && m.status === 'active'
    );
    
    if (!fromMember || !toMember || fromMember.role !== 'captain') {
      return false;
    }
    
    // Cambiar roles
    fromMember.role = 'member';
    toMember.role = 'captain';
    
    await team.save();
    
    // Actualizar usuarios
    await WebUser.updateMany(
      { _id: { $in: [fromUserId, toUserId] } },
      { 
        $set: {
          'teamMemberships.$[elem].role': 'member'
        }
      },
      {
        arrayFilters: [{ 
          'elem.teamId': teamId,
          'elem.webUserId': fromUserId
        }]
      }
    );
    
    await WebUser.updateOne(
      { _id: toUserId },
      { 
        $set: {
          'teamMemberships.$[elem].role': 'captain'
        }
      },
      {
        arrayFilters: [{ 
          'elem.teamId': teamId
        }]
      }
    );
    
    return true;
  }
  
  // Buscar equipos por criterios
  async searchTeams(criteria: {
    search?: string;
    division?: string;
    minFairRacing?: number;
    hasOpenSlots?: boolean;
  }) {
    const query: any = { status: 'active' };
    
    if (criteria.search) {
      query.$or = [
        { name: { $regex: criteria.search, $options: 'i' } },
        { description: { $regex: criteria.search, $options: 'i' } }
      ];
    }
    
    if (criteria.division) {
      query['ranking.division'] = criteria.division;
    }
    
    if (criteria.minFairRacing) {
      query['stats.averageFairRacing'] = { $gte: criteria.minFairRacing };
    }
    
    const teams = await Team.find(query)
      .sort({ 'ranking.points': -1 })
      .limit(50);
    
    if (criteria.hasOpenSlots) {
      return teams.filter(team => {
        const activeMembers = team.members.filter(m => m.status === 'active');
        return activeMembers.length < team.maxMembers;
      });
    }
    
    return teams;
  }
}
```

#### Punto de Control 2.1 ✅
- [ ] CRUD de escuderías funcionando
- [ ] Sistema de invitaciones implementado
- [ ] Gestión de miembros completa
- [ ] Middleware de autorización operativo
- [ ] Servicios de negocio creados
- [ ] Validaciones de negocio aplicadas
- [ ] Tests con Postman/Thunder Client exitosos

---

### FASE 3: UI Básica de Escuderías (3-4 días)
**Objetivo**: Interfaz para crear y gestionar escuderías.

#### 3.1 Dashboard de Usuario Actualizado
```typescript
// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TeamStatusCard } from '@/components/teams/TeamStatusCard';
import { TeamInvitationsCard } from '@/components/teams/TeamInvitationsCard';
import PersonalStatsCard from '@/components/PersonalStatsCard';
import { Trophy, Users, Flag, Target } from 'lucide-react';

interface TeamData {
  id: string;
  name: string;
  slug: string;
  colors: {
    primary: string;
    secondary: string;
  };
  logoUrl?: string;
  role: 'captain' | 'member';
  ranking: {
    points: number;
    position: number;
    division: string;
  };
  stats: {
    activeMemberCount: number;
    totalRaces: number;
    victories: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [invitationsCount, setInvitationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamData();
    fetchInvitations();
  }, [user]);

  const fetchTeamData = async () => {
    if (!user?.currentTeamId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/teams/${user.currentTeamId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeamData(data.team);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/teams/invitations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitationsCount(data.invitations.length);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Mi Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Bienvenido de vuelta, {user?.profile?.firstName}
          </p>
        </div>

        {/* Team Status Section */}
        <div className="mb-8">
          {loading ? (
            <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg h-40"></div>
          ) : teamData ? (
            <TeamStatusCard team={teamData} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  Sin Escudería
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  No perteneces a ninguna escudería actualmente
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <a
                    href="/teams/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Crear Escudería
                  </a>
                  <a
                    href="/teams/search"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                  >
                    Buscar Escudería
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invitations Alert */}
        {invitationsCount > 0 && (
          <div className="mb-8">
            <TeamInvitationsCard count={invitationsCount} />
          </div>
        )}

        {/* Personal Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Mis Estadísticas
          </h2>
          <PersonalStatsCard />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            icon={Trophy}
            title="Rankings"
            description="Ver tabla de posiciones"
            href="/teams/rankings"
            color="text-yellow-500"
          />
          <QuickActionCard
            icon={Flag}
            title="Próximas Carreras"
            description="Eventos de escuderías"
            href="/races/teams"
            color="text-green-500"
          />
          <QuickActionCard
            icon={Target}
            title="Mi Rendimiento"
            description="Análisis detallado"
            href="/stats/personal"
            color="text-blue-500"
          />
          <QuickActionCard
            icon={Users}
            title="Mi Escudería"
            description="Gestión del equipo"
            href={teamData ? `/teams/${teamData.id}` : '/teams/search'}
            color="text-purple-500"
          />
        </div>
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({ icon: Icon, title, description, href, color }) {
  return (
    <a
      href={href}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow"
    >
      <Icon className={`h-8 w-8 ${color} mb-3`} />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </a>
  );
}
```

#### 3.2 Componente TeamStatusCard
```typescript
// src/components/teams/TeamStatusCard.tsx
import { Shield, Trophy, Users, TrendingUp } from 'lucide-react';
import Image from 'next/image';

interface TeamStatusCardProps {
  team: {
    id: string;
    name: string;
    colors: {
      primary: string;
      secondary: string;
    };
    logoUrl?: string;
    role: 'captain' | 'member';
    ranking: {
      points: number;
      position: number;
      division: string;
    };
    stats: {
      activeMemberCount: number;
      totalRaces: number;
      victories: number;
    };
  };
}

export function TeamStatusCard({ team }: TeamStatusCardProps) {
  const getDivisionColor = (division: string) => {
    const colors = {
      elite: 'text-purple-600 bg-purple-100',
      masters: 'text-yellow-600 bg-yellow-100',
      pro: 'text-blue-600 bg-blue-100',
      open: 'text-green-600 bg-green-100'
    };
    return colors[division] || colors.open;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div 
        className="h-2"
        style={{
          background: `linear-gradient(to right, ${team.colors.primary}, ${team.colors.secondary})`
        }}
      />
      
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={`${team.name} logo`}
                width={64}
                height={64}
                className="rounded-lg"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: team.colors.primary }}
              >
                {team.name.charAt(0)}
              </div>
            )}
            
            <div className="ml-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                {team.name}
                {team.role === 'captain' && (
                  <Shield className="ml-2 h-5 w-5 text-yellow-500" />
                )}
              </h2>
              <div className="flex items-center mt-1 gap-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDivisionColor(team.ranking.division)}`}>
                  División {team.ranking.division.charAt(0).toUpperCase() + team.ranking.division.slice(1)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {team.role === 'captain' ? 'Capitán' : 'Miembro'}
                </span>
              </div>
            </div>
          </div>
          
          <a
            href={`/teams/${team.id}/manage`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Gestionar
          </a>
        </div>
        
        <div className="mt-6 grid grid-cols-4 gap-4">
          <StatItem
            icon={TrendingUp}
            label="Ranking"
            value={`#${team.ranking.position}`}
            subValue={`${team.ranking.points.toLocaleString()} pts`}
          />
          <StatItem
            icon={Users}
            label="Miembros"
            value={team.stats.activeMemberCount}
            subValue="activos"
          />
          <StatItem
            icon={Trophy}
            label="Victorias"
            value={team.stats.victories}
            subValue={`de ${team.stats.totalRaces}`}
          />
          <StatItem
            icon={Trophy}
            label="Podios"
            value={Math.round((team.stats.victories / team.stats.totalRaces) * 100) || 0}
            subValue="%"
          />
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value, subValue }) {
  return (
    <div className="text-center">
      <Icon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">
        {value}
        {subValue && (
          <span className="text-sm font-normal text-gray-500"> {subValue}</span>
        )}
      </p>
    </div>
  );
}
```

#### 3.3 Wizard de Creación de Escudería
```typescript
// src/app/teams/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Upload, Users, Flag, Settings } from 'lucide-react';
import { UploadClient } from '@/lib/uploadClient';

const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#000000', '#808080'
];

export default function CreateTeamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    philosophy: '',
    requirements: '',
    colors: {
      primary: '#FF0000',
      secondary: '#0000FF'
    },
    recruitmentMode: 'open',
    minFairRacing: 75
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return formData.name.trim().length >= 3 && formData.description.trim().length >= 10;
      case 2:
        return formData.colors.primary && formData.colors.secondary;
      case 3:
        return true; // Optional fields
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // 1. Upload logo if exists
      let logoS3Key = null;
      if (logoFile) {
        const uploadResult = await UploadClient.uploadFile(logoFile, 'logo');
        if (uploadResult.success) {
          logoS3Key = uploadResult.key;
        }
      }

      // 2. Create team
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          ...formData,
          logoS3Key
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la escudería');
      }

      const { team } = await response.json();
      
      // 3. Update logo URL if uploaded
      if (logoS3Key) {
        await fetch(`/api/teams/${team.id}/logo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({ logoS3Key })
        });
      }

      // Success!
      router.push(`/teams/${team.id}`);
      
    } catch (error) {
      console.error('Error creating team:', error);
      alert(error.message || 'Error al crear la escudería');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre de la Escudería *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Velocity Racing"
                maxLength={50}
              />
              <p className="mt-1 text-sm text-gray-500">{formData.name.length}/50 caracteres</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descripción *
              </label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Somos un equipo comprometido con la excelencia en las pistas..."
                maxLength={500}
              />
              <p className="mt-1 text-sm text-gray-500">{formData.description.length}/500 caracteres</p>
            </div>

            <div>
              <label htmlFor="philosophy" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Filosofía del Equipo
              </label>
              <textarea
                id="philosophy"
                rows={3}
                value={formData.philosophy}
                onChange={(e) => setFormData({ ...formData, philosophy: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Nuestra filosofía se basa en..."
                maxLength={300}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Logo de la Escudería
              </label>
              <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div 
                      className="h-24 w-24 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                      style={{ backgroundColor: formData.colors.primary }}
                    >
                      <Upload className="h-8 w-8 text-white opacity-50" />
                    </div>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Logo
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <p className="mt-1 text-xs text-gray-500">PNG, JPG hasta 5MB</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Colores del Equipo *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color Primario</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.colors.primary}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, primary: e.target.value }
                      })}
                      className="h-10 w-20"
                    />
                    <div className="flex gap-1">
                      {COLORS.slice(0, 6).map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({
                            ...formData,
                            colors: { ...formData.colors, primary: color }
                          })}
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color Secundario</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.colors.secondary}
                      onChange={(e) => setFormData({
                        ...formData,
                        colors: { ...formData.colors, secondary: e.target.value }
                      })}
                      className="h-10 w-20"
                    />
                    <div className="flex gap-1">
                      {COLORS.slice(6, 12).map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({
                            ...formData,
                            colors: { ...formData.colors, secondary: color }
                          })}
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 h-20 rounded-lg" style={{
                background: `linear-gradient(to right, ${formData.colors.primary}, ${formData.colors.secondary})`
              }}>
                <div className="h-full flex items-center justify-center text-white font-bold text-lg">
                  Vista Previa de Colores
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="recruitmentMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Modo de Reclutamiento
              </label>
              <select
                id="recruitmentMode"
                value={formData.recruitmentMode}
                onChange={(e) => setFormData({ ...formData, recruitmentMode: e.target.value as 'open' | 'invite_only' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="open">Abierto - Cualquiera puede solicitar unirse</option>
                <option value="invite_only">Solo por invitación</option>
              </select>
            </div>

            <div>
              <label htmlFor="minFairRacing" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fair Racing Mínimo Requerido
              </label>
              <div className="mt-1 flex items-center space-x-3">
                <input
                  type="range"
                  id="minFairRacing"
                  min="0"
                  max="100"
                  value={formData.minFairRacing}
                  onChange={(e) => setFormData({ ...formData, minFairRacing: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-lg font-medium text-gray-900 dark:text-white w-12 text-center">
                  {formData.minFairRacing}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Los pilotos deben tener al menos este puntaje de conducción limpia para unirse
              </p>
            </div>

            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Requisitos Adicionales
              </label>
              <textarea
                id="requirements"
                rows={3}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ej: Disponibilidad los fines de semana, experiencia mínima..."
                maxLength={300}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Resumen de tu Escudería
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center space-x-4">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-16 w-16 rounded-lg"
                  />
                )}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">{formData.name}</h4>
                  <div className="flex items-center mt-1 space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.colors.primary }} />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.colors.secondary }} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Descripción:</span> {formData.description}
                </p>
                {formData.philosophy && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Filosofía:</span> {formData.philosophy}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Modo de reclutamiento:</span> {
                    formData.recruitmentMode === 'open' ? 'Abierto' : 'Solo por invitación'
                  }
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Fair Racing mínimo:</span> {formData.minFairRacing}
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Serás el capitán y fundador de esta escudería. 
                Podrás invitar hasta 3 miembros más para completar tu equipo.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700">
            <div 
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Crear Nueva Escudería
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Paso {step} de 4
            </p>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {renderStep()}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={step === 1 ? () => router.push('/dashboard') : handleBack}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(step)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Escudería'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 3.4 Página de Búsqueda de Escuderías
```typescript
// src/app/teams/search/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Trophy, Lock, LockOpen } from 'lucide-react';
import { TeamCard } from '@/components/teams/TeamCard';

export default function SearchTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    division: '',
    recruitmentMode: '',
    hasOpenSlots: true,
    minFairRacing: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchTeams();
  }, [filters.division, filters.recruitmentMode, filters.hasOpenSlots, pagination.page]);

  const fetchTeams = async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: 'active',
        ...(filters.search && { search: filters.search }),
        ...(filters.division && { division: filters.division }),
        ...(filters.recruitmentMode && { recruitmentMode: filters.recruitmentMode })
      });

      const response = await fetch(`/api/teams?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter client-side for open slots if needed
        let filteredTeams = data.teams;
        if (filters.hasOpenSlots) {
          filteredTeams = data.teams.filter(team => 
            team.stats.activeMemberCount < 4
          );
        }
        
        setTeams(filteredTeams);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchTeams();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Buscar Escudería
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Encuentra el equipo perfecto para ti
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Buscar por nombre
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Nombre de escudería..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  División
                </label>
                <select
                  value={filters.division}
                  onChange={(e) => setFilters({ ...filters, division: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Todas las divisiones</option>
                  <option value="elite">Elite</option>
                  <option value="masters">Masters</option>
                  <option value="pro">Pro</option>
                  <option value="open">Open</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Modo de reclutamiento
                </label>
                <select
                  value={filters.recruitmentMode}
                  onChange={(e) => setFilters({ ...filters, recruitmentMode: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Todos</option>
                  <option value="open">Abierto</option>
                  <option value="invite_only">Solo invitación</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Buscar
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.hasOpenSlots}
                  onChange={(e) => setFilters({ ...filters, hasOpenSlots: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Solo escuderías con espacios disponibles
                </span>
              </label>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow h-64 animate-pulse" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No se encontraron escuderías
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                  >
                    Anterior
                  </button>
                  
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPagination({ ...pagination, page: i + 1 })}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        pagination.page === i + 1
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

#### 3.5 Componente TeamCard
```typescript
// src/components/teams/TeamCard.tsx
import { Users, Trophy, Shield, Lock, LockOpen } from 'lucide-react';
import Image from 'next/image';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    slug: string;
    description: string;
    logoUrl?: string;
    colors: {
      primary: string;
      secondary: string;
    };
    ranking: {
      points: number;
      position: number;
      division: string;
    };
    stats: {
      activeMemberCount: number;
      totalRaces: number;
      victories: number;
      averageFairRacing: number;
    };
    recruitmentMode: 'open' | 'invite_only';
    minFairRacing: number;
  };
}

export function TeamCard({ team }: TeamCardProps) {
  const getDivisionColor = (division: string) => {
    const colors = {
      elite: 'text-purple-600 bg-purple-100',
      masters: 'text-yellow-600 bg-yellow-100',
      pro: 'text-blue-600 bg-blue-100',
      open: 'text-green-600 bg-green-100'
    };
    return colors[division] || colors.open;
  };

  const spotsAvailable = 4 - team.stats.activeMemberCount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div 
        className="h-2 rounded-t-lg"
        style={{
          background: `linear-gradient(to right, ${team.colors.primary}, ${team.colors.secondary})`
        }}
      />
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={`${team.name} logo`}
                width={48}
                height={48}
                className="rounded-lg"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: team.colors.primary }}
              >
                {team.name.charAt(0)}
              </div>
            )}
            
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {team.name}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDivisionColor(team.ranking.division)}`}>
                {team.ranking.division.charAt(0).toUpperCase() + team.ranking.division.slice(1)}
              </span>
            </div>
          </div>
          
          {team.recruitmentMode === 'open' ? (
            <LockOpen className="h-5 w-5 text-green-500" />
          ) : (
            <Lock className="h-5 w-5 text-gray-400" />
          )}
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {team.description}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="flex justify-center items-center text-gray-400 mb-1">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              #{team.ranking.position}
            </p>
            <p className="text-xs text-gray-500">Ranking</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center items-center text-gray-400 mb-1">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {team.stats.activeMemberCount}/4
            </p>
            <p className="text-xs text-gray-500">Miembros</p>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Fair Racing mínimo</span>
            <span className="font-medium text-gray-900 dark:text-white">{team.minFairRacing}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Fair Racing promedio</span>
            <span className="font-medium text-gray-900 dark:text-white">{team.stats.averageFairRacing}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Espacios disponibles</span>
            <span className={`font-medium ${spotsAvailable > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {spotsAvailable}
            </span>
          </div>
        </div>
        
        <a
          href={`/teams/${team.id}`}
          className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Ver Detalles
        </a>
      </div>
    </div>
  );
}
```

#### 3.6 Página de Gestión de Escudería
```typescript
// src/app/teams/[teamId]/manage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Users, UserPlus, Settings, LogOut, UserX, Mail } from 'lucide-react';
import { TeamMemberCard } from '@/components/teams/TeamMemberCard';
import { InviteMemberModal } from '@/components/teams/InviteMemberModal';

export default function ManageTeamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  const teamId = params.teamId as string;

  useEffect(() => {
    fetchTeamData();
    fetchMembers();
    fetchInvitations();
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeam(data.team);
        
        // Check if user is captain
        const currentMember = data.team.members.find(m => 
          m.webUserId._id === user?.id && m.status === 'active'
        );
        
        if (!currentMember || currentMember.role !== 'captain') {
          router.push(`/teams/${teamId}`);
        }
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members?includeInactive=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('¿Estás seguro de expulsar a este miembro?')) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ action: 'expel' })
      });

      if (response.ok) {
        await fetchMembers();
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleTransferCaptaincy = async (newCaptainId: string) => {
    if (!confirm('¿Estás seguro de transferir la capitanía? Esta acción no se puede deshacer.')) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/captain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ newCaptainId })
      });

      if (response.ok) {
        router.push(`/teams/${teamId}`);
      }
    } catch (error) {
      console.error('Error transferring captaincy:', error);
    }
  };

  const handleUpdateTeam = async (updates: any) => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await fetchTeamData();
        alert('Escudería actualizada exitosamente');
      }
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (!team) return null;

  const activeMembers = members.filter(m => m.status === 'active');
  const inactiveMembers = members.filter(m => m.status !== 'active');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div 
            className="h-2 rounded-t-lg"
            style={{
              background: `linear-gradient(to right, ${team.colors.primary}, ${team.colors.secondary})`
            }}
          />
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  Gestionar {team.name}
                  <Shield className="ml-2 h-6 w-6 text-yellow-500" />
                </h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Administra tu escudería y sus miembros
                </p>
              </div>
              <a
                href={`/teams/${teamId}`}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Ver perfil público →
              </a>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('members')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="inline-block h-4 w-4 mr-2" />
                Miembros ({activeMembers.length}/4)
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'invitations'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="inline-block h-4 w-4 mr-2" />
                Invitaciones ({invitations.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="inline-block h-4 w-4 mr-2" />
                Configuración
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'members' && (
              <div>
                {/* Active Members */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Miembros Activos
                    </h3>
                    {activeMembers.length < 4 && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invitar Miembro
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeMembers.map((member) => (
                      <TeamMemberCard
                        key={member.userId}
                        member={member}
                        teamFounderId={team.founderId}
                        currentUserId={user?.id}
                        onRemove={handleRemoveMember}
                        onTransferCaptaincy={handleTransferCaptaincy}
                      />
                    ))}
                  </div>
                </div>

                {/* Inactive Members */}
                {inactiveMembers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Historial de Miembros
                    </h3>
                    <div className="space-y-2">
                      {inactiveMembers.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.profile.firstName} {member.profile.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.status === 'expelled' ? 'Expulsado' : 'Inactivo'} • 
                                Salió: {new Date(member.leftAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invitations' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Invitaciones Pendientes
                </h3>
                {invitations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay invitaciones pendientes
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {invitation.invitedUser.profile.firstName} {invitation.invitedUser.profile.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Invitado el {new Date(invitation.createdAt).toLocaleDateString()} • 
                            Expira el {new Date(invitation.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {/* Cancel invitation */}}
                          className="text-sm text-red-600 hover:text-red-500"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <TeamSettingsForm team={team} onUpdate={handleUpdateTeam} />
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMemberModal
          teamId={teamId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchInvitations();
          }}
        />
      )}
    </div>
  );
}

// Team Settings Form Component
function TeamSettingsForm({ team, onUpdate }) {
  const [formData, setFormData] = useState({
    description: team.description,
    philosophy: team.philosophy || '',
    requirements: team.requirements || '',
    recruitmentMode: team.recruitmentMode,
    minFairRacing: team.minFairRacing
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Descripción
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Filosofía del Equipo
        </label>
        <textarea
          value={formData.philosophy}
          onChange={(e) => setFormData({ ...formData, philosophy: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
          maxLength={300}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Modo de Reclutamiento
        </label>
        <select
          value={formData.recruitmentMode}
          onChange={(e) => setFormData({ ...formData, recruitmentMode: e.target.value as any })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="open">Abierto</option>
          <option value="invite_only">Solo por invitación</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Fair Racing Mínimo: {formData.minFairRacing}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.minFairRacing}
          onChange={(e) => setFormData({ ...formData, minFairRacing: parseInt(e.target.value) })}
          className="mt-1 block w-full"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}
```

#### Punto de Control 3.1 ✅
- [ ] Dashboard actualizado mostrando estado de escudería
- [ ] Wizard de creación funcionando correctamente
- [ ] Búsqueda y filtrado de escuderías operativo
- [ ] Página de gestión solo accesible para capitanes
- [ ] Sistema de invitaciones en UI
- [ ] Upload de logos funcionando con S3
- [ ] Navegación entre páginas fluida

---

## FASE 4: Sistema de Carreras por Escuderías (4-5 días)
**Objetivo**: Implementar el sistema de carreras en equipo, con tracking en tiempo real y cálculo de puntos.

### 4.1 Actualización del WebSocket Server

#### Archivo: `websocket-server/src/teamRaceHandler.ts`
```typescript
import { WebSocket } from 'ws';
import { RaceSession } from '../types';

interface TeamRaceData {
  teamId: string;
  teamName: string;
  pilots: Array<{
    driverName: string;
    position: number;
    bestLap: number;
    lastLap: number;
    totalLaps: number;
    points: number;
  }>;
  totalPoints: number;
  currentPosition: number;
}

interface TeamRaceSession extends RaceSession {
  raceType: 'team_friendly' | 'team_championship';
  teams: TeamRaceData[];
  pointsSystem: 'f1' | 'custom';
}

export class TeamRaceHandler {
  private teamRaceSessions: Map<string, TeamRaceSession> = new Map();
  private teamConnections: Map<string, Set<WebSocket>> = new Map();

  // F1 Points System
  private f1Points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  constructor() {
    console.log('🏁 Team Race Handler initialized');
  }

  // Create team race session
  createTeamRace(sessionData: any): TeamRaceSession {
    const teamRace: TeamRaceSession = {
      ...sessionData,
      raceType: sessionData.raceType || 'team_friendly',
      teams: [],
      pointsSystem: sessionData.pointsSystem || 'f1'
    };

    this.teamRaceSessions.set(sessionData.sessionId, teamRace);
    return teamRace;
  }

  // Process race update
  processRaceUpdate(sessionId: string, raceData: any) {
    const teamRace = this.teamRaceSessions.get(sessionId);
    if (!teamRace) return;

    // Update individual driver positions
    this.updateDriverPositions(teamRace, raceData);

    // Calculate team standings
    this.calculateTeamStandings(teamRace);

    // Broadcast updates
    this.broadcastTeamUpdate(sessionId, teamRace);
  }

  // Update driver positions and calculate points
  private updateDriverPositions(teamRace: TeamRaceSession, raceData: any) {
    // Map drivers to their teams
    const driverTeamMap = new Map<string, string>();
    
    teamRace.teams.forEach(team => {
      team.pilots.forEach(pilot => {
        driverTeamMap.set(pilot.driverName, team.teamId);
      });
    });

    // Update positions and calculate points
    raceData.drivers.forEach((driver: any) => {
      const teamId = driverTeamMap.get(driver.name);
      if (!teamId) return;

      const team = teamRace.teams.find(t => t.teamId === teamId);
      if (!team) return;

      const pilot = team.pilots.find(p => p.driverName === driver.name);
      if (pilot) {
        pilot.position = driver.position;
        pilot.bestLap = driver.bestTime;
        pilot.lastLap = driver.lastTime;
        pilot.totalLaps = driver.lapCount;
        
        // Calculate points based on position
        pilot.points = this.calculatePoints(driver.position, teamRace.pointsSystem);
      }
    });
  }

  // Calculate team standings
  private calculateTeamStandings(teamRace: TeamRaceSession) {
    // Calculate total points for each team
    teamRace.teams.forEach(team => {
      team.totalPoints = team.pilots.reduce((sum, pilot) => sum + pilot.points, 0);
    });

    // Sort teams by total points
    teamRace.teams.sort((a, b) => b.totalPoints - a.totalPoints);

    // Assign team positions
    teamRace.teams.forEach((team, index) => {
      team.currentPosition = index + 1;
    });
  }

  // Calculate points based on position
  private calculatePoints(position: number, system: string): number {
    if (system === 'f1') {
      return this.f1Points[position - 1] || 0;
    }
    // Custom point system can be implemented here
    return Math.max(0, 20 - position);
  }

  // Broadcast team updates to connected clients
  private broadcastTeamUpdate(sessionId: string, teamRace: TeamRaceSession) {
    const connections = this.teamConnections.get(sessionId);
    if (!connections) return;

    const update = {
      type: 'team_race_update',
      sessionId,
      teams: teamRace.teams,
      timestamp: new Date()
    };

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(update));
      }
    });
  }

  // Subscribe to team race updates
  subscribeToTeamRace(sessionId: string, ws: WebSocket) {
    if (!this.teamConnections.has(sessionId)) {
      this.teamConnections.set(sessionId, new Set());
    }
    this.teamConnections.get(sessionId)!.add(ws);
  }

  // Unsubscribe from team race updates
  unsubscribeFromTeamRace(sessionId: string, ws: WebSocket) {
    const connections = this.teamConnections.get(sessionId);
    if (connections) {
      connections.delete(ws);
    }
  }
}
```

#### Archivo: `websocket-server/src/server.ts` (actualización)
```typescript
// Add to existing imports
import { TeamRaceHandler } from './teamRaceHandler';

// Add to server initialization
const teamRaceHandler = new TeamRaceHandler();

// Update WebSocket message handler
ws.on('message', async (message: string) => {
  try {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'subscribe':
        if (data.sessionType === 'team') {
          teamRaceHandler.subscribeToTeamRace(data.sessionId, ws);
        } else {
          subscribeToSession(data.sessionId, ws);
        }
        break;
        
      case 'create_team_race':
        const teamRace = teamRaceHandler.createTeamRace(data.sessionData);
        ws.send(JSON.stringify({
          type: 'team_race_created',
          session: teamRace
        }));
        break;
        
      // ... existing cases
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Update race data processing
async function processRaceUpdate(sessionId: string, raceData: any) {
  // Check if it's a team race
  const teamRaceSession = teamRaceHandler.teamRaceSessions.get(sessionId);
  if (teamRaceSession) {
    teamRaceHandler.processRaceUpdate(sessionId, raceData);
    return;
  }
  
  // Continue with regular race processing
  // ... existing code
}
```

### 4.2 API de Carreras por Equipo

#### Archivo: `src/app/api/races/teams/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import TeamRaceSession from '@/models/TeamRaceSession';
import RaceSession from '@/models/RaceSession';

// GET - Get team races
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const raceType = searchParams.get('raceType');
    const status = searchParams.get('status');

    await connectDB();

    let query: any = {};
    if (teamId) query['teams.teamId'] = teamId;
    if (raceType) query.raceType = raceType;
    if (status) query.status = status;

    const races = await TeamRaceSession.find(query)
      .sort({ scheduledDate: -1 })
      .populate('teams.teamId', 'name abbreviation logo')
      .limit(50);

    return NextResponse.json({ races });
  } catch (error) {
    console.error('Error fetching team races:', error);
    return NextResponse.json(
      { error: 'Error al obtener carreras' },
      { status: 500 }
    );
  }
}

// POST - Create team race session
export async function POST(request: NextRequest) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      raceType,
      teams,
      scheduledDate,
      venue,
      pointsSystem,
      championshipId
    } = data;

    await connectDB();

    // Validate user is captain of at least one participating team
    const userTeams = await Team.find({
      _id: { $in: teams.map((t: any) => t.teamId) },
      'members.userId': token.userId,
      'members.role': 'captain'
    });

    if (userTeams.length === 0) {
      return NextResponse.json(
        { error: 'Debes ser capitán de al menos un equipo participante' },
        { status: 403 }
      );
    }

    // Create team race session
    const teamRaceSession = new TeamRaceSession({
      raceType,
      teams: teams.map((team: any) => ({
        teamId: team.teamId,
        pilots: team.pilots,
        confirmedBy: null,
        confirmationStatus: 'pending'
      })),
      scheduledDate,
      venue,
      pointsSystem: pointsSystem || 'f1',
      status: 'scheduled',
      createdBy: token.userId
    });

    if (championshipId) {
      teamRaceSession.championshipId = championshipId;
    }

    await teamRaceSession.save();

    // Notify other teams
    // TODO: Send notifications to team captains

    return NextResponse.json({
      message: 'Carrera creada exitosamente',
      raceSession: teamRaceSession
    });
  } catch (error) {
    console.error('Error creating team race:', error);
    return NextResponse.json(
      { error: 'Error al crear carrera' },
      { status: 500 }
    );
  }
}
```

#### Archivo: `src/app/api/races/teams/[raceId]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import TeamRaceSession from '@/models/TeamRaceSession';

// GET - Get specific team race
export async function GET(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  try {
    await connectDB();

    const race = await TeamRaceSession.findById(params.raceId)
      .populate('teams.teamId')
      .populate('linkedRaceSession');

    if (!race) {
      return NextResponse.json(
        { error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ race });
  } catch (error) {
    console.error('Error fetching team race:', error);
    return NextResponse.json(
      { error: 'Error al obtener carrera' },
      { status: 500 }
    );
  }
}

// PATCH - Update team race (confirm participation, update results)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { action, data } = await request.json();
    await connectDB();

    const race = await TeamRaceSession.findById(params.raceId);
    if (!race) {
      return NextResponse.json(
        { error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'confirm_participation':
        // Verify user is captain
        const userTeam = await Team.findOne({
          _id: data.teamId,
          'members.userId': token.userId,
          'members.role': 'captain'
        });

        if (!userTeam) {
          return NextResponse.json(
            { error: 'No eres capitán de este equipo' },
            { status: 403 }
          );
        }

        // Update confirmation status
        const teamIndex = race.teams.findIndex(
          t => t.teamId.toString() === data.teamId
        );

        if (teamIndex === -1) {
          return NextResponse.json(
            { error: 'Equipo no encontrado en la carrera' },
            { status: 404 }
          );
        }

        race.teams[teamIndex].confirmationStatus = 'confirmed';
        race.teams[teamIndex].confirmedBy = token.userId;
        race.teams[teamIndex].confirmedAt = new Date();

        await race.save();

        return NextResponse.json({
          message: 'Participación confirmada',
          race
        });

      case 'start_race':
        // Link with actual race session from SMS-Timing
        race.linkedRaceSession = data.raceSessionId;
        race.status = 'in_progress';
        await race.save();

        return NextResponse.json({
          message: 'Carrera iniciada',
          race
        });

      case 'complete_race':
        // Process final results
        race.status = 'completed';
        race.completedAt = new Date();
        
        // Calculate final standings and points
        // This would be done by the WebSocket handler
        
        await race.save();

        return NextResponse.json({
          message: 'Carrera completada',
          race
        });

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating team race:', error);
    return NextResponse.json(
      { error: 'Error al actualizar carrera' },
      { status: 500 }
    );
  }
}
```

### 4.3 Componentes UI para Carreras de Equipo

#### Archivo: `src/components/teams/LiveTeamRaceViewer.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamRaceData {
  teamId: string;
  teamName: string;
  logo?: string;
  pilots: Array<{
    driverName: string;
    position: number;
    bestLap: number;
    lastLap: number;
    totalLaps: number;
    points: number;
  }>;
  totalPoints: number;
  currentPosition: number;
}

interface LiveTeamRaceViewerProps {
  raceId: string;
  sessionId: string;
}

export default function LiveTeamRaceViewer({ raceId, sessionId }: LiveTeamRaceViewerProps) {
  const [teams, setTeams] = useState<TeamRaceData[]>([]);
  const [raceStatus, setRaceStatus] = useState<'waiting' | 'live' | 'finished'>('waiting');
  const { isConnected, subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (isConnected && sessionId) {
      // Subscribe to team race updates
      subscribe(sessionId, 'team', (data) => {
        if (data.type === 'team_race_update') {
          setTeams(data.teams);
          setRaceStatus('live');
        } else if (data.type === 'race_finished') {
          setRaceStatus('finished');
        }
      });

      return () => {
        unsubscribe(sessionId);
      };
    }
  }, [isConnected, sessionId]);

  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return '--:---.---';
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Carrera por Equipos en Vivo
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            raceStatus === 'live' ? 'bg-green-500 animate-pulse' : 
            raceStatus === 'finished' ? 'bg-gray-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {raceStatus === 'live' ? 'EN VIVO' : 
             raceStatus === 'finished' ? 'FINALIZADA' : 'ESPERANDO'}
          </span>
        </div>
      </div>

      {/* Team Standings */}
      <div className="space-y-4">
        <AnimatePresence>
          {teams.map((team, index) => (
            <motion.div
              key={team.teamId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`border rounded-lg p-4 ${
                team.currentPosition === 1 
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl font-bold ${
                    team.currentPosition === 1 ? 'text-yellow-600' :
                    team.currentPosition === 2 ? 'text-gray-500' :
                    team.currentPosition === 3 ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    #{team.currentPosition}
                  </div>
                  {team.logo && (
                    <img
                      src={team.logo}
                      alt={team.teamName}
                      className="w-12 h-12 object-contain"
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {team.teamName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {team.totalPoints} puntos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">
                    {team.totalPoints}
                  </div>
                  <div className="text-sm text-gray-500">puntos totales</div>
                </div>
              </div>

              {/* Pilots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {team.pilots.map((pilot) => (
                  <div
                    key={pilot.driverName}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          P{pilot.position}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {pilot.driverName}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-indigo-600">
                        {pilot.points} pts
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Mejor</span>
                        <p className="font-mono font-semibold">
                          {formatTime(pilot.bestLap)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Última</span>
                        <p className="font-mono">
                          {formatTime(pilot.lastLap)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Vueltas</span>
                        <p className="font-semibold">
                          {pilot.totalLaps}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Race Statistics */}
      {teams.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Estadísticas de Carrera
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Equipos</span>
              <p className="font-semibold">{teams.length}</p>
            </div>
            <div>
              <span className="text-gray-500">Pilotos</span>
              <p className="font-semibold">
                {teams.reduce((sum, team) => sum + team.pilots.length, 0)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Mejor Vuelta</span>
              <p className="font-semibold font-mono">
                {formatTime(
                  Math.min(...teams.flatMap(t => 
                    t.pilots.map(p => p.bestLap).filter(l => l > 0)
                  ))
                )}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Sistema de Puntos</span>
              <p className="font-semibold">F1</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Archivo: `src/components/teams/CreateTeamRaceModal.tsx`
```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface CreateTeamRaceModalProps {
  userTeamId: string;
  onClose: () => void;
  onSuccess: (raceId: string) => void;
}

export default function CreateTeamRaceModal({
  userTeamId,
  onClose,
  onSuccess
}: CreateTeamRaceModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    raceType: 'team_friendly',
    opponentTeamId: '',
    scheduledDate: '',
    scheduledTime: '',
    venue: 'Speed Park',
    pointsSystem: 'f1',
    pilotsPerTeam: 2
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPilots, setSelectedPilots] = useState<string[]>([]);

  const searchTeams = async () => {
    if (searchQuery.length < 2) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/teams/search?q=${searchQuery}`);
      const data = await response.json();
      setSearchResults(data.teams.filter((t: any) => t._id !== userTeamId));
    } catch (error) {
      console.error('Error searching teams:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/races/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          raceType: formData.raceType,
          teams: [
            {
              teamId: userTeamId,
              pilots: selectedPilots.slice(0, formData.pilotsPerTeam)
            },
            {
              teamId: formData.opponentTeamId,
              pilots: [] // Opponent will select their pilots
            }
          ],
          scheduledDate: new Date(`${formData.scheduledDate}T${formData.scheduledTime}`),
          venue: formData.venue,
          pointsSystem: formData.pointsSystem
        })
      });

      if (!response.ok) throw new Error('Error al crear carrera');

      const data = await response.json();
      toast.success('Carrera creada exitosamente');
      onSuccess(data.raceSession._id);
    } catch (error) {
      toast.error('Error al crear la carrera');
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Crear Carrera de Escudería
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > s ? 'bg-indigo-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Tipo de Carrera</h3>
              
              <div className="space-y-2">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="raceType"
                    value="team_friendly"
                    checked={formData.raceType === 'team_friendly'}
                    onChange={(e) => setFormData({ ...formData, raceType: e.target.value })}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-semibold">Amistosa</p>
                    <p className="text-sm text-gray-500">
                      Carrera amistosa entre dos escuderías
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 opacity-50">
                  <input
                    type="radio"
                    name="raceType"
                    value="team_championship"
                    disabled
                    className="mr-3"
                  />
                  <div>
                    <p className="font-semibold">Campeonato Oficial</p>
                    <p className="text-sm text-gray-500">
                      Próximamente - Carreras que cuentan para el ranking
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pilotos por Equipo
                </label>
                <select
                  value={formData.pilotsPerTeam}
                  onChange={(e) => setFormData({ ...formData, pilotsPerTeam: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value={2}>2 pilotos</option>
                  <option value={3}>3 pilotos</option>
                  <option value={4}>4 pilotos</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Seleccionar Oponente</h3>
              
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={searchTeams}
                  placeholder="Buscar escudería por nombre..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  </div>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((team) => (
                    <label
                      key={team._id}
                      className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="radio"
                        name="opponent"
                        value={team._id}
                        checked={formData.opponentTeamId === team._id}
                        onChange={(e) => setFormData({ ...formData, opponentTeamId: e.target.value })}
                        className="mr-3"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {team.logo && (
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-10 h-10 object-contain"
                          />
                        )}
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-sm text-gray-500">
                            {team.members.length} miembros • División {team.division}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Detalles de la Carrera</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lugar
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sistema de Puntos
                </label>
                <select
                  value={formData.pointsSystem}
                  onChange={(e) => setFormData({ ...formData, pointsSystem: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="f1">F1 (25-18-15-12-10-8-6-4-2-1)</option>
                  <option value="custom" disabled>Personalizado (próximamente)</option>
                </select>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Nota:</strong> La escudería oponente recibirá una invitación 
                  para confirmar su participación y seleccionar sus pilotos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <button
              onClick={step > 1 ? () => setStep(step - 1) : onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            
            <button
              onClick={step < 3 ? () => setStep(step + 1) : handleSubmit}
              disabled={
                (step === 2 && !formData.opponentTeamId) ||
                (step === 3 && (!formData.scheduledDate || !formData.scheduledTime))
              }
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 3 ? 'Crear Carrera' : 'Siguiente'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

#### Punto de Control 4.1 ✅
- [ ] WebSocket handler para carreras de equipo funcionando
- [ ] APIs de creación y gestión de carreras implementadas
- [ ] Sistema de confirmación de participación operativo
- [ ] Visualizador en vivo mostrando standings de equipos
- [ ] Cálculo de puntos por equipo correcto
- [ ] Modal de creación de carrera con búsqueda de oponentes
- [ ] Integración con sesiones de SMS-Timing

---

## FASE 5: Sistema de Rankings y Campeonatos (3-4 días)
**Objetivo**: Implementar el sistema de rankings oficiales y campeonatos por división.

### 5.1 Modelos de Rankings y Campeonatos

#### Archivo: `src/models/TeamChampionship.ts`
```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface IRound {
  roundNumber: number;
  name: string;
  scheduledDate: Date;
  venue: string;
  teamRaceSessionId?: string; // Link to actual race
  status: 'scheduled' | 'completed' | 'cancelled';
  results?: Array<{
    teamId: string;
    position: number;
    points: number;
  }>;
}

interface IStanding {
  teamId: string;
  totalPoints: number;
  wins: number;
  podiums: number;
  racesParticipated: number;
  bestFinish: number;
  currentStreak: number;
  pointsByRound: Array<{
    roundNumber: number;
    points: number;
  }>;
}

export interface ITeamChampionship extends Document {
  name: string;
  season: string;
  division: 'elite' | 'masters' | 'pro' | 'open';
  status: 'registration' | 'active' | 'finished';
  startDate: Date;
  endDate: Date;
  
  // Configuration
  pointsSystem: 'f1' | 'custom';
  customPoints?: number[];
  maxTeams: number;
  minRacesRequired: number;
  
  // Participants
  registeredTeams: Array<{
    teamId: string;
    registrationDate: Date;
    approved: boolean;
  }>;
  
  // Rounds
  rounds: IRound[];
  currentRound: number;
  
  // Standings
  standings: IStanding[];
  
  // Winner info
  championTeamId?: string;
  finalizedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const roundSchema = new Schema<IRound>({
  roundNumber: { type: Number, required: true },
  name: { type: String, required: true },
  scheduledDate: { type: Date, required: true },
  venue: { type: String, required: true },
  teamRaceSessionId: { type: String },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  results: [{
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    position: Number,
    points: Number
  }]
});

const standingSchema = new Schema<IStanding>({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  totalPoints: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  podiums: { type: Number, default: 0 },
  racesParticipated: { type: Number, default: 0 },
  bestFinish: { type: Number, default: 999 },
  currentStreak: { type: Number, default: 0 },
  pointsByRound: [{
    roundNumber: Number,
    points: Number
  }]
});

const teamChampionshipSchema = new Schema<ITeamChampionship>({
  name: { type: String, required: true },
  season: { type: String, required: true },
  division: {
    type: String,
    enum: ['elite', 'masters', 'pro', 'open'],
    required: true
  },
  status: {
    type: String,
    enum: ['registration', 'active', 'finished'],
    default: 'registration'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  // Configuration
  pointsSystem: {
    type: String,
    enum: ['f1', 'custom'],
    default: 'f1'
  },
  customPoints: [Number],
  maxTeams: { type: Number, default: 20 },
  minRacesRequired: { type: Number, default: 4 },
  
  // Participants
  registeredTeams: [{
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    registrationDate: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false }
  }],
  
  // Rounds
  rounds: [roundSchema],
  currentRound: { type: Number, default: 0 },
  
  // Standings
  standings: [standingSchema],
  
  // Winner info
  championTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  finalizedAt: Date
}, {
  timestamps: true
});

// Indexes
teamChampionshipSchema.index({ season: 1, division: 1 });
teamChampionshipSchema.index({ status: 1 });
teamChampionshipSchema.index({ 'registeredTeams.teamId': 1 });

// Methods
teamChampionshipSchema.methods.updateStandings = function() {
  // Recalculate standings based on all completed rounds
  const standings = new Map<string, IStanding>();
  
  // Initialize standings for all teams
  this.registeredTeams.forEach((reg: any) => {
    if (reg.approved) {
      standings.set(reg.teamId.toString(), {
        teamId: reg.teamId,
        totalPoints: 0,
        wins: 0,
        podiums: 0,
        racesParticipated: 0,
        bestFinish: 999,
        currentStreak: 0,
        pointsByRound: []
      });
    }
  });
  
  // Process each completed round
  this.rounds.forEach((round: IRound) => {
    if (round.status === 'completed' && round.results) {
      round.results.forEach((result: any) => {
        const standing = standings.get(result.teamId.toString());
        if (standing) {
          standing.totalPoints += result.points;
          standing.racesParticipated++;
          
          if (result.position === 1) standing.wins++;
          if (result.position <= 3) standing.podiums++;
          if (result.position < standing.bestFinish) {
            standing.bestFinish = result.position;
          }
          
          standing.pointsByRound.push({
            roundNumber: round.roundNumber,
            points: result.points
          });
        }
      });
    }
  });
  
  // Convert to array and sort by points
  this.standings = Array.from(standings.values())
    .sort((a, b) => b.totalPoints - a.totalPoints);
};

const TeamChampionship = mongoose.models.TeamChampionship || 
  mongoose.model<ITeamChampionship>('TeamChampionship', teamChampionshipSchema);

export default TeamChampionship;
```

#### Archivo: `src/models/TeamRankings.ts`
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamRanking extends Document {
  teamId: string;
  division: 'elite' | 'masters' | 'pro' | 'open';
  season: string;
  
  // ELO Rating System
  eloRating: number;
  peakElo: number;
  lowestElo: number;
  
  // Statistics
  stats: {
    totalRaces: number;
    wins: number;
    podiums: number;
    totalPoints: number;
    averagePosition: number;
    averagePoints: number;
    winRate: number;
    podiumRate: number;
    dnfRate: number;
    bestStreak: number;
  };
  
  // Championship participation
  championships: Array<{
    championshipId: string;
    finalPosition: number;
    totalPoints: number;
  }>;
  
  // Recent form (last 5 races)
  recentForm: Array<{
    raceId: string;
    position: number;
    points: number;
    eloChange: number;
  }>;
  
  // Achievements
  achievements: Array<{
    type: 'first_win' | 'championship_winner' | 'perfect_race' | 'comeback' | 'consistency';
    earnedAt: Date;
    details?: string;
  }>;
  
  // Metadata
  lastUpdated: Date;
  isActive: boolean;
}

const teamRankingSchema = new Schema<ITeamRanking>({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  division: {
    type: String,
    enum: ['elite', 'masters', 'pro', 'open'],
    required: true
  },
  season: {
    type: String,
    required: true
  },
  
  // ELO Rating
  eloRating: {
    type: Number,
    default: 1500
  },
  peakElo: {
    type: Number,
    default: 1500
  },
  lowestElo: {
    type: Number,
    default: 1500
  },
  
  // Statistics
  stats: {
    totalRaces: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    podiums: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    averagePosition: { type: Number, default: 0 },
    averagePoints: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    podiumRate: { type: Number, default: 0 },
    dnfRate: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 }
  },
  
  // Championships
  championships: [{
    championshipId: {
      type: Schema.Types.ObjectId,
      ref: 'TeamChampionship'
    },
    finalPosition: Number,
    totalPoints: Number
  }],
  
  // Recent form
  recentForm: [{
    raceId: {
      type: Schema.Types.ObjectId,
      ref: 'TeamRaceSession'
    },
    position: Number,
    points: Number,
    eloChange: Number
  }],
  
  // Achievements
  achievements: [{
    type: {
      type: String,
      enum: ['first_win', 'championship_winner', 'perfect_race', 'comeback', 'consistency']
    },
    earnedAt: { type: Date, default: Date.now },
    details: String
  }],
  
  // Metadata
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
teamRankingSchema.index({ division: 1, eloRating: -1 });
teamRankingSchema.index({ teamId: 1, season: 1 }, { unique: true });
teamRankingSchema.index({ isActive: 1 });

// Methods
teamRankingSchema.methods.calculateEloChange = function(
  opponentElo: number,
  position: number,
  totalTeams: number
): number {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - this.eloRating) / 400));
  const actualScore = 1 - ((position - 1) / (totalTeams - 1));
  
  return Math.round(K * (actualScore - expectedScore));
};

teamRankingSchema.methods.updateStats = function() {
  const stats = this.stats;
  if (stats.totalRaces > 0) {
    stats.winRate = (stats.wins / stats.totalRaces) * 100;
    stats.podiumRate = (stats.podiums / stats.totalRaces) * 100;
    stats.averagePoints = stats.totalPoints / stats.totalRaces;
  }
};

teamRankingSchema.methods.checkAchievements = function() {
  // First win
  if (this.stats.wins === 1 && !this.achievements.find((a: any) => a.type === 'first_win')) {
    this.achievements.push({
      type: 'first_win',
      earnedAt: new Date(),
      details: 'Primera victoria conseguida'
    });
  }
  
  // Consistency (5 podiums in a row)
  if (this.recentForm.length >= 5) {
    const lastFive = this.recentForm.slice(-5);
    if (lastFive.every((r: any) => r.position <= 3)) {
      this.achievements.push({
        type: 'consistency',
        earnedAt: new Date(),
        details: '5 podios consecutivos'
      });
    }
  }
};

const TeamRanking = mongoose.models.TeamRanking || 
  mongoose.model<ITeamRanking>('TeamRanking', teamRankingSchema);

export default TeamRanking;
```

### 5.2 APIs de Rankings y Campeonatos

#### Archivo: `src/app/api/championships/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TeamChampionship from '@/models/TeamChampionship';
import Team from '@/models/Team';
import { ADMIN_EMAIL } from '@/middleware/adminAuth';

// GET - Get championships
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division');
    const status = searchParams.get('status');
    const season = searchParams.get('season');

    await connectDB();

    let query: any = {};
    if (division) query.division = division;
    if (status) query.status = status;
    if (season) query.season = season;

    const championships = await TeamChampionship.find(query)
      .populate('registeredTeams.teamId', 'name abbreviation logo')
      .populate('championTeamId', 'name abbreviation logo')
      .sort({ startDate: -1 });

    return NextResponse.json({ championships });
  } catch (error) {
    console.error('Error fetching championships:', error);
    return NextResponse.json(
      { error: 'Error al obtener campeonatos' },
      { status: 500 }
    );
  }
}

// POST - Create championship (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Verify admin access
    if (token.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear campeonatos' },
        { status: 403 }
      );
    }

    await connectDB();

    // Create championship
    const championship = new TeamChampionship({
      name: body.name,
      season: body.season,
      division: body.division,
      startDate: body.startDate,
      endDate: body.endDate,
      maxTeams: body.maxTeams || 20,
      minRacesRequired: body.minRacesRequired || 4,
      pointsSystem: body.pointsSystem || 'f1',
      customPoints: body.customPoints,
      rounds: body.rounds || []
    });

    await championship.save();

    return NextResponse.json({
      message: 'Campeonato creado exitosamente',
      championship
    });
  } catch (error) {
    console.error('Error creating championship:', error);
    return NextResponse.json(
      { error: 'Error al crear campeonato' },
      { status: 500 }
    );
  }
}
```

#### Archivo: `src/app/api/championships/[championshipId]/register/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TeamChampionship from '@/models/TeamChampionship';
import Team from '@/models/Team';
import TeamRanking from '@/models/TeamRankings';

// POST - Register team for championship
export async function POST(
  request: NextRequest,
  { params }: { params: { championshipId: string } }
) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { teamId } = await request.json();

    await connectDB();

    // Verify user is captain of the team
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      );
    }

    const isCaptain = team.members.some(
      m => m.userId.toString() === token.userId && m.role === 'captain'
    );

    if (!isCaptain) {
      return NextResponse.json(
        { error: 'Solo el capitán puede registrar el equipo' },
        { status: 403 }
      );
    }

    // Get championship
    const championship = await TeamChampionship.findById(params.championshipId);
    if (!championship) {
      return NextResponse.json(
        { error: 'Campeonato no encontrado' },
        { status: 404 }
      );
    }

    // Check if registration is open
    if (championship.status !== 'registration') {
      return NextResponse.json(
        { error: 'Las inscripciones están cerradas' },
        { status: 400 }
      );
    }

    // Check team division matches
    if (team.division !== championship.division && championship.division !== 'open') {
      return NextResponse.json(
        { error: 'Tu equipo no pertenece a esta división' },
        { status: 400 }
      );
    }

    // Check if already registered
    const alreadyRegistered = championship.registeredTeams.some(
      r => r.teamId.toString() === teamId
    );

    if (alreadyRegistered) {
      return NextResponse.json(
        { error: 'Tu equipo ya está registrado' },
        { status: 400 }
      );
    }

    // Check max teams
    const approvedTeams = championship.registeredTeams.filter(r => r.approved).length;
    if (approvedTeams >= championship.maxTeams) {
      return NextResponse.json(
        { error: 'El campeonato está lleno' },
        { status: 400 }
      );
    }

    // Register team
    championship.registeredTeams.push({
      teamId: team._id,
      registrationDate: new Date(),
      approved: true // Auto-approve for now, can be changed
    });

    await championship.save();

    // Create or update team ranking
    let ranking = await TeamRanking.findOne({
      teamId: team._id,
      season: championship.season
    });

    if (!ranking) {
      ranking = new TeamRanking({
        teamId: team._id,
        division: team.division,
        season: championship.season
      });
      await ranking.save();
    }

    return NextResponse.json({
      message: 'Equipo registrado exitosamente',
      championship
    });
  } catch (error) {
    console.error('Error registering team:', error);
    return NextResponse.json(
      { error: 'Error al registrar equipo' },
      { status: 500 }
    );
  }
}
```

#### Archivo: `src/app/api/rankings/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TeamRanking from '@/models/TeamRankings';

// GET - Get team rankings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division');
    const season = searchParams.get('season') || new Date().getFullYear().toString();
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    await connectDB();

    let query: any = { isActive: true, season };
    if (division) query.division = division;

    const skip = (page - 1) * limit;

    const rankings = await TeamRanking.find(query)
      .populate('teamId', 'name abbreviation logo stats.fairRacingScore')
      .sort({ eloRating: -1 })
      .limit(limit)
      .skip(skip);

    const total = await TeamRanking.countDocuments(query);

    // Add position to each ranking
    const rankedTeams = rankings.map((ranking, index) => ({
      ...ranking.toObject(),
      position: skip + index + 1
    }));

    return NextResponse.json({
      rankings: rankedTeams,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json(
      { error: 'Error al obtener rankings' },
      { status: 500 }
    );
  }
}
```

#### Archivo: `src/lib/services/rankingService.ts`
```typescript
import connectDB from '@/lib/mongodb';
import TeamRanking from '@/models/TeamRankings';
import TeamRaceSession from '@/models/TeamRaceSession';
import TeamChampionship from '@/models/TeamChampionship';

export class RankingService {
  /**
   * Update rankings after a race
   */
  static async updateRankingsAfterRace(raceSessionId: string) {
    await connectDB();

    const raceSession = await TeamRaceSession.findById(raceSessionId)
      .populate('teams.teamId');

    if (!raceSession || raceSession.status !== 'completed') {
      return;
    }

    const season = new Date().getFullYear().toString();
    const isChampionshipRace = raceSession.raceType === 'team_championship';

    // Get all participating teams' rankings
    const teamRankings = new Map<string, any>();

    for (const team of raceSession.teams) {
      let ranking = await TeamRanking.findOne({
        teamId: team.teamId,
        season
      });

      if (!ranking) {
        ranking = new TeamRanking({
          teamId: team.teamId,
          division: team.teamId.division,
          season
        });
      }

      teamRankings.set(team.teamId._id.toString(), ranking);
    }

    // Calculate average ELO for the race
    const averageElo = Array.from(teamRankings.values())
      .reduce((sum, r) => sum + r.eloRating, 0) / teamRankings.size;

    // Update each team's ranking
    for (const team of raceSession.teams) {
      const ranking = teamRankings.get(team.teamId._id.toString());
      const position = team.finalPosition || 999;
      const points = team.totalPoints || 0;

      // Update ELO
      const eloChange = ranking.calculateEloChange(
        averageElo,
        position,
        raceSession.teams.length
      );

      ranking.eloRating += eloChange;
      if (ranking.eloRating > ranking.peakElo) {
        ranking.peakElo = ranking.eloRating;
      }
      if (ranking.eloRating < ranking.lowestElo) {
        ranking.lowestElo = ranking.eloRating;
      }

      // Update statistics
      ranking.stats.totalRaces += 1;
      ranking.stats.totalPoints += points;
      
      if (position === 1) ranking.stats.wins += 1;
      if (position <= 3) ranking.stats.podiums += 1;
      
      // Update average position
      ranking.stats.averagePosition = 
        ((ranking.stats.averagePosition * (ranking.stats.totalRaces - 1)) + position) 
        / ranking.stats.totalRaces;

      // Update recent form
      ranking.recentForm.push({
        raceId: raceSessionId,
        position,
        points,
        eloChange
      });

      // Keep only last 5 races
      if (ranking.recentForm.length > 5) {
        ranking.recentForm = ranking.recentForm.slice(-5);
      }

      // Update calculated stats
      ranking.updateStats();
      ranking.checkAchievements();
      ranking.lastUpdated = new Date();

      await ranking.save();
    }

    // If it's a championship race, update championship standings
    if (isChampionshipRace && raceSession.championshipId) {
      await this.updateChampionshipStandings(raceSession.championshipId);
    }
  }

  /**
   * Update championship standings
   */
  static async updateChampionshipStandings(championshipId: string) {
    const championship = await TeamChampionship.findById(championshipId);
    if (!championship) return;

    championship.updateStandings();
    await championship.save();
  }

  /**
   * Get team's head-to-head record
   */
  static async getHeadToHeadRecord(team1Id: string, team2Id: string) {
    await connectDB();

    const races = await TeamRaceSession.find({
      'teams.teamId': { $all: [team1Id, team2Id] },
      status: 'completed'
    });

    let team1Wins = 0;
    let team2Wins = 0;

    races.forEach(race => {
      const team1Result = race.teams.find(t => t.teamId.toString() === team1Id);
      const team2Result = race.teams.find(t => t.teamId.toString() === team2Id);

      if (team1Result && team2Result) {
        if (team1Result.finalPosition < team2Result.finalPosition) {
          team1Wins++;
        } else if (team2Result.finalPosition < team1Result.finalPosition) {
          team2Wins++;
        }
      }
    });

    return {
      totalRaces: races.length,
      team1Wins,
      team2Wins,
      draws: races.length - team1Wins - team2Wins
    };
  }
}
```

### 5.3 Componentes UI de Rankings

#### Archivo: `src/components/teams/TeamRankingsTable.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface TeamRankingData {
  position: number;
  teamId: {
    _id: string;
    name: string;
    abbreviation: string;
    logo?: string;
  };
  eloRating: number;
  stats: {
    totalRaces: number;
    wins: number;
    podiums: number;
    winRate: number;
    averagePosition: number;
  };
  recentForm: Array<{
    position: number;
  }>;
}

interface TeamRankingsTableProps {
  division?: 'elite' | 'masters' | 'pro' | 'open';
  season?: string;
}

export default function TeamRankingsTable({ division, season }: TeamRankingsTableProps) {
  const [rankings, setRankings] = useState<TeamRankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState(division || 'elite');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRankings();
  }, [selectedDivision, page, season]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        division: selectedDivision,
        season: season || new Date().getFullYear().toString(),
        page: page.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/rankings?${params}`);
      const data = await response.json();
      
      setRankings(data.rankings);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-600';
      case 2: return 'text-gray-500';
      case 3: return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getFormIndicator = (position: number) => {
    if (position === 1) return { icon: '🥇', color: 'bg-yellow-100' };
    if (position === 2) return { icon: '🥈', color: 'bg-gray-100' };
    if (position === 3) return { icon: '🥉', color: 'bg-orange-100' };
    if (position <= 5) return { icon: '↑', color: 'bg-green-100' };
    if (position <= 10) return { icon: '→', color: 'bg-blue-100' };
    return { icon: '↓', color: 'bg-red-100' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rankings Oficiales de Escuderías
          </h2>
          
          {/* Division Selector */}
          <div className="flex gap-2">
            {['elite', 'masters', 'pro', 'open'].map((div) => (
              <button
                key={div}
                onClick={() => {
                  setSelectedDivision(div as any);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDivision === div
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {div.charAt(0).toUpperCase() + div.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Escudería
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ELO
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Carreras
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Victorias
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Podios
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Win %
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pos. Promedio
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Forma
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {rankings.map((ranking, index) => (
                <motion.tr
                  key={ranking.teamId._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-2xl font-bold ${getPositionColor(ranking.position)}`}>
                      {ranking.position}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/teams/${ranking.teamId._id}`}>
                      <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                        {ranking.teamId.logo && (
                          <img
                            src={ranking.teamId.logo}
                            alt={ranking.teamId.name}
                            className="w-10 h-10 object-contain"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {ranking.teamId.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ranking.teamId.abbreviation}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-indigo-600">
                      {ranking.eloRating}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {ranking.stats.totalRaces}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-semibold">{ranking.stats.wins}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {ranking.stats.podiums}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium">
                      {ranking.stats.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {ranking.stats.averagePosition.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1 justify-center">
                      {ranking.recentForm.slice(-5).map((race, idx) => {
                        const form = getFormIndicator(race.position);
                        return (
                          <div
                            key={idx}
                            className={`w-8 h-8 rounded-md ${form.color} flex items-center justify-center text-xs font-bold`}
                            title={`P${race.position}`}
                          >
                            {form.icon}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
            >
              Anterior
            </button>
            
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {page} de {totalPages}
            </span>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Archivo: `src/components/teams/ChampionshipStandings.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface ChampionshipStanding {
  position: number;
  team: {
    _id: string;
    name: string;
    abbreviation: string;
    logo?: string;
  };
  totalPoints: number;
  wins: number;
  podiums: number;
  racesParticipated: number;
  pointsGap: number;
  pointsByRound: Array<{
    roundNumber: number;
    points: number;
  }>;
}

interface ChampionshipStandingsProps {
  championshipId: string;
}

export default function ChampionshipStandings({ championshipId }: ChampionshipStandingsProps) {
  const [standings, setStandings] = useState<ChampionshipStanding[]>([]);
  const [championship, setChampionship] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  useEffect(() => {
    fetchChampionshipData();
  }, [championshipId]);

  const fetchChampionshipData = async () => {
    try {
      const response = await fetch(`/api/championships/${championshipId}`);
      const data = await response.json();

      setChampionship(data.championship);
      
      // Process standings with position and points gap
      const processedStandings = data.championship.standings.map((standing: any, index: number) => ({
        ...standing,
        position: index + 1,
        pointsGap: index === 0 ? 0 : data.championship.standings[0].totalPoints - standing.totalPoints
      }));

      setStandings(processedStandings);
    } catch (error) {
      console.error('Error fetching championship:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionChange = (teamId: string) => {
    // This would compare with previous round
    return 0; // Placeholder
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {championship?.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Temporada {championship?.season} • División {championship?.division}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Ronda Actual</p>
              <p className="text-2xl font-bold text-indigo-600">
                {championship?.currentRound} / {championship?.rounds.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Pos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Escudería
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Puntos
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Diferencia
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Victorias
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Podios
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Carreras
              </th>
              {championship?.rounds.filter((r: any) => r.status === 'completed').map((round: any) => (
                <th
                  key={round.roundNumber}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => setSelectedRound(round.roundNumber)}
                >
                  R{round.roundNumber}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            <AnimatePresence>
              {standings.map((standing, index) => (
                <motion.tr
                  key={standing.team._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    standing.position === 1 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${
                        standing.position === 1 ? 'text-yellow-600' :
                        standing.position === 2 ? 'text-gray-500' :
                        standing.position === 3 ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {standing.position}
                      </span>
                      {/* Position change indicator */}
                      <div className="text-xs">
                        {getPositionChange(standing.team._id) > 0 && (
                          <span className="text-green-600">↑{getPositionChange(standing.team._id)}</span>
                        )}
                        {getPositionChange(standing.team._id) < 0 && (
                          <span className="text-red-600">↓{Math.abs(getPositionChange(standing.team._id))}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/teams/${standing.team._id}`}>
                      <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                        {standing.team.logo && (
                          <img
                            src={standing.team.logo}
                            alt={standing.team.name}
                            className="w-10 h-10 object-contain"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {standing.team.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {standing.team.abbreviation}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-xl font-bold text-indigo-600">
                      {standing.totalPoints}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {standing.position === 1 ? (
                      <span className="text-green-600 font-bold">Líder</span>
                    ) : (
                      <span className="text-gray-600">-{standing.pointsGap}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-semibold">{standing.wins}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {standing.podiums}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {standing.racesParticipated}
                  </td>
                  {championship?.rounds.filter((r: any) => r.status === 'completed').map((round: any) => {
                    const roundPoints = standing.pointsByRound.find(
                      p => p.roundNumber === round.roundNumber
                    );
                    return (
                      <td
                        key={round.roundNumber}
                        className="px-3 py-4 whitespace-nowrap text-center text-sm"
                      >
                        {roundPoints ? (
                          <span className={`font-medium ${
                            roundPoints.points >= 15 ? 'text-green-600' :
                            roundPoints.points >= 10 ? 'text-blue-600' :
                            roundPoints.points > 0 ? 'text-gray-600' :
                            'text-gray-400'
                          }`}>
                            {roundPoints.points}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Championship Progress */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Progreso del Campeonato
          </h3>
          <span className="text-sm text-gray-500">
            {championship?.rounds.filter((r: any) => r.status === 'completed').length} de {championship?.rounds.length} carreras completadas
          </span>
        </div>
        
        <div className="relative">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(championship?.rounds.filter((r: any) => r.status === 'completed').length / championship?.rounds.length) * 100}%` 
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          
          {/* Round markers */}
          <div className="absolute top-0 left-0 w-full h-4 flex justify-between">
            {championship?.rounds.map((round: any, index: number) => (
              <div
                key={round.roundNumber}
                className={`w-1 h-full ${
                  round.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                }`}
                style={{ 
                  left: `${(index / (championship.rounds.length - 1)) * 100}%`,
                  position: 'absolute'
                }}
                title={`${round.name} - ${round.venue}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Punto de Control 5.1 ✅
- [ ] Modelos de Championship y Rankings creados
- [ ] Sistema ELO implementado para rankings
- [ ] APIs de gestión de campeonatos funcionando
- [ ] Sistema de registro de equipos operativo
- [ ] Cálculo automático de standings
- [ ] Tabla de rankings con filtros por división
- [ ] Vista de standings del campeonato
- [ ] Sistema de achievements funcionando

---

## FASE 6: Sistema Fair Racing con S3 (4-5 días)
**Objetivo**: Implementar el sistema de conducción limpia con video evidencia almacenada en S3.

### 6.1 Modelo Fair Racing

#### Archivo: `src/models/FairRacingIncident.ts`
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IFairRacingIncident extends Document {
  // Race information
  raceSessionId: string;
  raceType: 'individual' | 'team_friendly' | 'team_championship';
  teamRaceSessionId?: string;
  incidentTime: Date;
  lapNumber: number;
  
  // Involved parties
  reportedBy: {
    userId: string;
    teamId?: string;
    driverName: string;
  };
  reportedAgainst: {
    userId?: string;
    teamId?: string;
    driverName: string;
  };
  
  // Incident details
  incidentType: 'collision' | 'blocking' | 'unsportsmanlike' | 'track_limits' | 'other';
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  
  // Evidence
  evidenceVideos: Array<{
    s3Key: string;
    url: string;
    uploadedAt: Date;
    duration: number;
    fileSize: number;
  }>;
  screenshots?: Array<{
    s3Key: string;
    url: string;
    uploadedAt: Date;
  }>;
  
  // Review process
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  reviewedBy?: {
    userId: string;
    reviewedAt: Date;
  };
  
  // Resolution
  resolution?: {
    decision: 'warning' | 'penalty' | 'no_action';
    penaltyPoints?: number;
    explanation: string;
    affectedTeams?: Array<{
      teamId: string;
      pointsDeducted: number;
    }>;
  };
  
  // Voting (for community review)
  communityVotes?: {
    guilty: number;
    notGuilty: number;
    voters: string[]; // userId array to prevent double voting
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const fairRacingIncidentSchema = new Schema<IFairRacingIncident>({
  // Race information
  raceSessionId: { type: String, required: true, index: true },
  raceType: {
    type: String,
    enum: ['individual', 'team_friendly', 'team_championship'],
    required: true
  },
  teamRaceSessionId: { type: String, index: true },
  incidentTime: { type: Date, required: true },
  lapNumber: { type: Number, required: true },
  
  // Involved parties
  reportedBy: {
    userId: { type: Schema.Types.ObjectId, ref: 'WebUser', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    driverName: { type: String, required: true }
  },
  reportedAgainst: {
    userId: { type: Schema.Types.ObjectId, ref: 'WebUser' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    driverName: { type: String, required: true }
  },
  
  // Incident details
  incidentType: {
    type: String,
    enum: ['collision', 'blocking', 'unsportsmanlike', 'track_limits', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe'],
    default: 'minor'
  },
  description: {
    type: String,
    required: true,
    maxLength: 1000
  },
  
  // Evidence
  evidenceVideos: [{
    s3Key: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    duration: { type: Number }, // in seconds
    fileSize: { type: Number } // in bytes
  }],
  screenshots: [{
    s3Key: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Review process
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    userId: { type: Schema.Types.ObjectId, ref: 'WebUser' },
    reviewedAt: Date
  },
  
  // Resolution
  resolution: {
    decision: {
      type: String,
      enum: ['warning', 'penalty', 'no_action']
    },
    penaltyPoints: Number,
    explanation: String,
    affectedTeams: [{
      teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
      pointsDeducted: Number
    }]
  },
  
  // Community voting
  communityVotes: {
    guilty: { type: Number, default: 0 },
    notGuilty: { type: Number, default: 0 },
    voters: [{ type: Schema.Types.ObjectId, ref: 'WebUser' }]
  }
}, {
  timestamps: true
});

// Indexes
fairRacingIncidentSchema.index({ createdAt: -1 });
fairRacingIncidentSchema.index({ 'reportedBy.teamId': 1 });
fairRacingIncidentSchema.index({ 'reportedAgainst.teamId': 1 });

// Methods
fairRacingIncidentSchema.methods.canVote = function(userId: string): boolean {
  if (!this.communityVotes) return true;
  return !this.communityVotes.voters.includes(userId);
};

fairRacingIncidentSchema.methods.vote = function(userId: string, vote: 'guilty' | 'notGuilty') {
  if (!this.canVote(userId)) {
    throw new Error('Usuario ya ha votado');
  }
  
  if (vote === 'guilty') {
    this.communityVotes.guilty += 1;
  } else {
    this.communityVotes.notGuilty += 1;
  }
  
  this.communityVotes.voters.push(userId);
};

const FairRacingIncident = mongoose.models.FairRacingIncident || 
  mongoose.model<IFairRacingIncident>('FairRacingIncident', fairRacingIncidentSchema);

export default FairRacingIncident;
```

### 6.2 APIs Fair Racing con S3

#### Archivo: `src/app/api/fair-racing/upload-evidence/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { s3Service } from '@/lib/services/s3Service';
import connectDB from '@/lib/mongodb';
import FairRacingIncident from '@/models/FairRacingIncident';

// POST - Get presigned URL for evidence upload
export async function POST(request: NextRequest) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { incidentId, fileType, fileName, fileSize } = await request.json();

    // Validate file type
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    const isVideo = allowedVideoTypes.includes(fileType);
    const isImage = allowedImageTypes.includes(fileType);
    
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for videos, 5MB for images)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `Archivo muy grande. Máximo ${isVideo ? '100MB' : '5MB'}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify incident exists and user is authorized
    const incident = await FairRacingIncident.findById(incidentId);
    if (!incident) {
      return NextResponse.json(
        { error: 'Incidente no encontrado' },
        { status: 404 }
      );
    }

    // Only reporter can add evidence (or admin)
    if (incident.reportedBy.userId.toString() !== token.userId) {
      return NextResponse.json(
        { error: 'No autorizado para agregar evidencia' },
        { status: 403 }
      );
    }

    // Generate S3 key
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const folder = `fair-racing/reports/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const s3Key = `${folder}/${incidentId}_${timestamp}.${fileExtension}`;

    // Get presigned URL
    const uploadUrl = await s3Service.getPresignedUploadUrl(s3Key, fileType);
    
    // Generate CDN URL that will be available after upload
    const cdnUrl = `${process.env.CLOUDFRONT_URL}/${s3Key}`;

    return NextResponse.json({
      uploadUrl,
      s3Key,
      cdnUrl,
      fileType: isVideo ? 'video' : 'image'
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de carga' },
      { status: 500 }
    );
  }
}
```

#### Archivo: `src/app/api/fair-racing/incidents/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import FairRacingIncident from '@/models/FairRacingIncident';
import Team from '@/models/Team';
import WebUser from '@/models/WebUser';

// GET - Get incidents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const teamId = searchParams.get('teamId');
    const raceSessionId = searchParams.get('raceSessionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    await connectDB();

    let query: any = {};
    if (status) query.status = status;
    if (teamId) {
      query.$or = [
        { 'reportedBy.teamId': teamId },
        { 'reportedAgainst.teamId': teamId }
      ];
    }
    if (raceSessionId) query.raceSessionId = raceSessionId;

    const skip = (page - 1) * limit;

    const incidents = await FairRacingIncident.find(query)
      .populate('reportedBy.userId', 'profile.displayName')
      .populate('reportedBy.teamId', 'name abbreviation')
      .populate('reportedAgainst.teamId', 'name abbreviation')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await FairRacingIncident.countDocuments(query);

    return NextResponse.json({
      incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { error: 'Error al obtener incidentes' },
      { status: 500 }
    );
  }
}

// POST - Report new incident
export async function POST(request: NextRequest) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      raceSessionId,
      raceType,
      teamRaceSessionId,
      incidentTime,
      lapNumber,
      reportedAgainstDriverName,
      reportedAgainstTeamId,
      incidentType,
      severity,
      description,
      evidenceData
    } = data;

    await connectDB();

    // Get reporter's team if applicable
    let reporterTeamId = null;
    if (raceType !== 'individual') {
      const team = await Team.findOne({
        'members.userId': token.userId,
        status: 'active'
      });
      if (team) reporterTeamId = team._id;
    }

    // Get reporter's display name
    const reporter = await WebUser.findById(token.userId);
    const reporterName = reporter?.profile?.displayName || 'Unknown';

    // Create incident
    const incident = new FairRacingIncident({
      raceSessionId,
      raceType,
      teamRaceSessionId,
      incidentTime: new Date(incidentTime),
      lapNumber,
      reportedBy: {
        userId: token.userId,
        teamId: reporterTeamId,
        driverName: reporterName
      },
      reportedAgainst: {
        teamId: reportedAgainstTeamId,
        driverName: reportedAgainstDriverName
      },
      incidentType,
      severity,
      description,
      status: 'pending'
    });

    // Add evidence if provided
    if (evidenceData?.videos) {
      incident.evidenceVideos = evidenceData.videos.map((video: any) => ({
        s3Key: video.s3Key,
        url: video.url,
        duration: video.duration,
        fileSize: video.fileSize,
        uploadedAt: new Date()
      }));
    }

    if (evidenceData?.screenshots) {
      incident.screenshots = evidenceData.screenshots.map((img: any) => ({
        s3Key: img.s3Key,
        url: img.url,
        uploadedAt: new Date()
      }));
    }

    await incident.save();

    // If team race, update team fair racing scores
    if (raceType !== 'individual' && reporterTeamId && reportedAgainstTeamId) {
      // Deduct temporary points pending review
      const reportedTeam = await Team.findById(reportedAgainstTeamId);
      if (reportedTeam) {
        reportedTeam.stats.pendingIncidents += 1;
        await reportedTeam.save();
      }
    }

    return NextResponse.json({
      message: 'Incidente reportado exitosamente',
      incident
    });
  } catch (error) {
    console.error('Error reporting incident:', error);
    return NextResponse.json(
      { error: 'Error al reportar incidente' },
      { status: 500 }
    );
  }
}
```

#### Archivo: `src/app/api/fair-racing/incidents/[incidentId]/review/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import FairRacingIncident from '@/models/FairRacingIncident';
import Team from '@/models/Team';
import WebUser from '@/models/WebUser';
import { ADMIN_EMAIL } from '@/middleware/adminAuth';

// PATCH - Review incident (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verify admin or steward role
    if (token.email !== ADMIN_EMAIL) {
      // Check if user has steward role
      const user = await WebUser.findById(token.userId);
      if (!user?.roles?.includes('steward')) {
        return NextResponse.json(
          { error: 'Solo administradores o comisarios pueden revisar' },
          { status: 403 }
        );
      }
    }

    const { decision, penaltyPoints, explanation } = await request.json();

    await connectDB();

    const incident = await FairRacingIncident.findById(params.incidentId);
    if (!incident) {
      return NextResponse.json(
        { error: 'Incidente no encontrado' },
        { status: 404 }
      );
    }

    // Update incident status
    incident.status = 'resolved';
    incident.reviewedBy = {
      userId: token.userId,
      reviewedAt: new Date()
    };

    incident.resolution = {
      decision,
      penaltyPoints: decision === 'penalty' ? penaltyPoints : 0,
      explanation
    };

    // Apply penalties if necessary
    if (decision === 'penalty' && incident.reportedAgainst.teamId) {
      const team = await Team.findById(incident.reportedAgainst.teamId);
      if (team) {
        // Apply fair racing penalty
        team.stats.fairRacingScore = Math.max(0, team.stats.fairRacingScore - penaltyPoints);
        team.stats.fairRacingIncidents += 1;
        team.stats.pendingIncidents = Math.max(0, team.stats.pendingIncidents - 1);
        
        // Add to incident history
        team.incidentHistory.push({
          incidentId: incident._id,
          date: new Date(),
          penaltyPoints,
          description: incident.description
        });

        await team.save();

        // Add affected team to resolution
        incident.resolution.affectedTeams = [{
          teamId: team._id,
          pointsDeducted: penaltyPoints
        }];
      }
    } else if (decision === 'no_action' && incident.reportedAgainst.teamId) {
      // Clear pending incident
      const team = await Team.findById(incident.reportedAgainst.teamId);
      if (team) {
        team.stats.pendingIncidents = Math.max(0, team.stats.pendingIncidents - 1);
        await team.save();
      }
    }

    await incident.save();

    return NextResponse.json({
      message: 'Incidente revisado exitosamente',
      incident
    });
  } catch (error) {
    console.error('Error reviewing incident:', error);
    return NextResponse.json(
      { error: 'Error al revisar incidente' },
      { status: 500 }
    );
  }
}
```

### 6.3 Componentes UI Fair Racing

#### Archivo: `src/components/fair-racing/ReportIncidentModal.tsx`
```typescript
'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Upload, Video, Camera, AlertTriangle } from 'lucide-react';

interface ReportIncidentModalProps {
  raceSessionId: string;
  raceType: 'individual' | 'team_friendly' | 'team_championship';
  teamRaceSessionId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface EvidenceFile {
  file: File;
  type: 'video' | 'screenshot';
  preview?: string;
  s3Key?: string;
  url?: string;
  uploadProgress?: number;
}

export default function ReportIncidentModal({
  raceSessionId,
  raceType,
  teamRaceSessionId,
  onClose,
  onSuccess
}: ReportIncidentModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    lapNumber: '',
    incidentTime: '',
    reportedAgainstDriverName: '',
    reportedAgainstTeamId: '',
    incidentType: '',
    severity: 'minor',
    description: ''
  });

  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);

  const incidentTypes = [
    { value: 'collision', label: 'Colisión', icon: '💥' },
    { value: 'blocking', label: 'Bloqueo', icon: '🚫' },
    { value: 'unsportsmanlike', label: 'Conducta antideportiva', icon: '⚠️' },
    { value: 'track_limits', label: 'Límites de pista', icon: '🏁' },
    { value: 'other', label: 'Otro', icon: '❓' }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast.error(`${file.name} no es un formato válido`);
        return;
      }

      const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} excede el tamaño máximo permitido`);
        return;
      }

      const evidenceFile: EvidenceFile = {
        file,
        type: isVideo ? 'video' : 'screenshot'
      };

      // Create preview for images
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          evidenceFile.preview = e.target?.result as string;
          setEvidence(prev => [...prev, evidenceFile]);
        };
        reader.readAsDataURL(file);
      } else {
        setEvidence(prev => [...prev, evidenceFile]);
      }
    });
  };

  const uploadEvidence = async (evidenceFile: EvidenceFile) => {
    try {
      // Get presigned URL
      const response = await fetch('/api/fair-racing/upload-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          incidentId: 'temp_' + Date.now(), // Temporary ID for upload
          fileType: evidenceFile.file.type,
          fileName: evidenceFile.file.name,
          fileSize: evidenceFile.file.size
        })
      });

      if (!response.ok) throw new Error('Error al obtener URL de carga');

      const { uploadUrl, s3Key, cdnUrl } = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: evidenceFile.file,
        headers: {
          'Content-Type': evidenceFile.file.type
        }
      });

      if (!uploadResponse.ok) throw new Error('Error al subir archivo');

      // Update evidence with S3 info
      evidenceFile.s3Key = s3Key;
      evidenceFile.url = cdnUrl;
      evidenceFile.uploadProgress = 100;

      return {
        s3Key,
        url: cdnUrl,
        fileSize: evidenceFile.file.size,
        duration: evidenceFile.type === 'video' ? 0 : undefined // Duration would be extracted server-side
      };
    } catch (error) {
      console.error('Error uploading evidence:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Upload all evidence first
      const uploadPromises = evidence.map(uploadEvidence);
      const uploadedEvidence = await Promise.all(uploadPromises);

      const videos = uploadedEvidence.filter((_, idx) => evidence[idx].type === 'video');
      const screenshots = uploadedEvidence.filter((_, idx) => evidence[idx].type === 'screenshot');

      // Submit incident report
      const response = await fetch('/api/fair-racing/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          raceSessionId,
          raceType,
          teamRaceSessionId,
          incidentTime: new Date().toISOString(),
          lapNumber: parseInt(formData.lapNumber),
          reportedAgainstDriverName: formData.reportedAgainstDriverName,
          reportedAgainstTeamId: formData.reportedAgainstTeamId || undefined,
          incidentType: formData.incidentType,
          severity: formData.severity,
          description: formData.description,
          evidenceData: {
            videos,
            screenshots
          }
        })
      });

      if (!response.ok) throw new Error('Error al reportar incidente');

      toast.success('Incidente reportado exitosamente');
      onSuccess();
    } catch (error) {
      toast.error('Error al reportar incidente');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Reportar Incidente Fair Racing
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > s ? 'bg-red-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Detalles del Incidente</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vuelta del Incidente
                  </label>
                  <input
                    type="number"
                    value={formData.lapNumber}
                    onChange={(e) => setFormData({ ...formData, lapNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Piloto Involucrado
                  </label>
                  <input
                    type="text"
                    value={formData.reportedAgainstDriverName}
                    onChange={(e) => setFormData({ ...formData, reportedAgainstDriverName: e.target.value })}
                    placeholder="Nombre del piloto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Incidente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {incidentTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        formData.incidentType === type.value
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="incidentType"
                        value={type.value}
                        checked={formData.incidentType === type.value}
                        onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-2xl mr-2">{type.icon}</span>
                      <span className="text-sm font-medium">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Severidad
                </label>
                <div className="flex gap-2">
                  {['minor', 'moderate', 'severe'].map((severity) => (
                    <button
                      key={severity}
                      onClick={() => setFormData({ ...formData, severity })}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.severity === severity
                          ? severity === 'minor'
                            ? 'bg-yellow-500 text-white'
                            : severity === 'moderate'
                            ? 'bg-orange-500 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {severity === 'minor' ? 'Menor' : severity === 'moderate' ? 'Moderada' : 'Severa'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción del Incidente
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Describe detalladamente lo ocurrido..."
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/1000 caracteres
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Evidencia</h3>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Importante:</strong> La evidencia en video es fundamental para 
                  la revisión del incidente. Asegúrate de incluir el momento exacto del incidente.
                </p>
              </div>

              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Haz clic para subir videos o capturas
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Videos: MP4, MOV, AVI (máx 100MB) • Imágenes: JPG, PNG (máx 5MB)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Evidence List */}
              {evidence.length > 0 && (
                <div className="space-y-2">
                  {evidence.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      {item.type === 'video' ? (
                        <Video className="h-8 w-8 text-blue-600" />
                      ) : (
                        <Camera className="h-8 w-8 text-green-600" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {item.preview && (
                        <img
                          src={item.preview}
                          alt="Preview"
                          className="h-12 w-12 object-cover rounded"
                        />
                      )}
                      <button
                        onClick={() => setEvidence(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Confirmar Reporte</h3>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Vuelta</p>
                  <p className="font-semibold">{formData.lapNumber}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Piloto Reportado</p>
                  <p className="font-semibold">{formData.reportedAgainstDriverName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Tipo de Incidente</p>
                  <p className="font-semibold">
                    {incidentTypes.find(t => t.value === formData.incidentType)?.label}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Severidad</p>
                  <p className="font-semibold">
                    {formData.severity === 'minor' ? 'Menor' : 
                     formData.severity === 'moderate' ? 'Moderada' : 'Severa'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Descripción</p>
                  <p className="text-sm">{formData.description}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Evidencia</p>
                  <p className="font-semibold">
                    {evidence.filter(e => e.type === 'video').length} videos, {' '}
                    {evidence.filter(e => e.type === 'screenshot').length} capturas
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-300">
                  Al enviar este reporte, confirmas que la información proporcionada es 
                  verídica y que las pruebas son legítimas. Los reportes falsos pueden 
                  resultar en penalizaciones.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <button
              onClick={step > 1 ? () => setStep(step - 1) : onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            
            <button
              onClick={step < 3 ? () => setStep(step + 1) : handleSubmit}
              disabled={
                loading ||
                (step === 1 && (!formData.lapNumber || !formData.reportedAgainstDriverName || !formData.incidentType || !formData.description)) ||
                (step === 2 && evidence.length === 0)
              }
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </span>
              ) : (
                step === 3 ? 'Enviar Reporte' : 'Siguiente'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

#### Archivo: `src/components/fair-racing/IncidentReviewPanel.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Video, Image, Clock, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface IncidentReviewPanelProps {
  incidentId: string;
  isAdmin?: boolean;
}

export default function IncidentReviewPanel({ incidentId, isAdmin = false }: IncidentReviewPanelProps) {
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  
  const [reviewData, setReviewData] = useState({
    decision: '',
    penaltyPoints: 0,
    explanation: ''
  });

  useEffect(() => {
    fetchIncident();
  }, [incidentId]);

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/fair-racing/incidents/${incidentId}`);
      const data = await response.json();
      setIncident(data.incident);
    } catch (error) {
      console.error('Error fetching incident:', error);
      toast.error('Error al cargar incidente');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!isAdmin || !reviewData.decision || !reviewData.explanation) return;

    setReviewing(true);
    try {
      const response = await fetch(`/api/fair-racing/incidents/${incidentId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reviewData)
      });

      if (!response.ok) throw new Error('Error al revisar incidente');

      toast.success('Incidente revisado exitosamente');
      await fetchIncident();
    } catch (error) {
      toast.error('Error al revisar incidente');
      console.error(error);
    } finally {
      setReviewing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'text-yellow-600 bg-yellow-100';
      case 'moderate': return 'text-orange-600 bg-orange-100';
      case 'severe': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Incidente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Incident Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Incidente #{incident._id.slice(-6)}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date(incident.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(incident.severity)}`}>
            {incident.severity === 'minor' ? 'Menor' : 
             incident.severity === 'moderate' ? 'Moderada' : 'Severa'}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            incident.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            incident.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
            incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {incident.status === 'pending' ? 'Pendiente' :
             incident.status === 'under_review' ? 'En Revisión' :
             incident.status === 'resolved' ? 'Resuelto' : 'Desestimado'}
          </span>
        </div>

        {/* Incident Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Reportado por</h3>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{incident.reportedBy.driverName}</span>
              {incident.reportedBy.teamId && (
                <span className="text-sm text-gray-500">
                  ({incident.reportedBy.teamId.name})
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Reportado contra</h3>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{incident.reportedAgainst.driverName}</span>
              {incident.reportedAgainst.teamId && (
                <span className="text-sm text-gray-500">
                  ({incident.reportedAgainst.teamId.name})
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Vuelta del Incidente</h3>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-medium">Vuelta {incident.lapNumber}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Tipo de Incidente</h3>
            <span className="font-medium">
              {incident.incidentType === 'collision' ? 'Colisión' :
               incident.incidentType === 'blocking' ? 'Bloqueo' :
               incident.incidentType === 'unsportsmanlike' ? 'Conducta antideportiva' :
               incident.incidentType === 'track_limits' ? 'Límites de pista' : 'Otro'}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Descripción</h3>
          <p className="text-gray-700 dark:text-gray-300">{incident.description}</p>
        </div>
      </div>

      {/* Evidence Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Evidencia
        </h3>

        {/* Videos */}
        {incident.evidenceVideos?.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos ({incident.evidenceVideos.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incident.evidenceVideos.map((video: any, index: number) => (
                <div key={index} className="relative group">
                  <video
                    controls
                    className="w-full rounded-lg bg-black"
                    onClick={() => setSelectedEvidence(video)}
                  >
                    <source src={video.url} type="video/mp4" />
                    Tu navegador no soporta videos.
                  </video>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {(video.fileSize / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Screenshots */}
        {incident.screenshots?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Capturas ({incident.screenshots.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {incident.screenshots.map((screenshot: any, index: number) => (
                <img
                  key={index}
                  src={screenshot.url}
                  alt={`Captura ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedEvidence(screenshot)}
                />
              ))}
            </div>
          </div>
        )}

        {!incident.evidenceVideos?.length && !incident.screenshots?.length && (
          <p className="text-gray-500 text-center py-8">
            No hay evidencia disponible
          </p>
        )}
      </div>

      {/* Review Section (Admin Only) */}
      {isAdmin && incident.status === 'pending' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Revisión de Comisario
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decisión
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'no_action', label: 'Sin Acción', color: 'green' },
                  { value: 'warning', label: 'Advertencia', color: 'yellow' },
                  { value: 'penalty', label: 'Penalización', color: 'red' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setReviewData({ ...reviewData, decision: option.value })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      reviewData.decision === option.value
                        ? option.color === 'green' ? 'border-green-500 bg-green-50 text-green-700' :
                          option.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' :
                          'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {reviewData.decision === 'penalty' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Puntos de Penalización
                </label>
                <input
                  type="number"
                  value={reviewData.penaltyPoints}
                  onChange={(e) => setReviewData({ ...reviewData, penaltyPoints: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Explicación de la Decisión
              </label>
              <textarea
                value={reviewData.explanation}
                onChange={(e) => setReviewData({ ...reviewData, explanation: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Explica el razonamiento detrás de tu decisión..."
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleReview}
                disabled={!reviewData.decision || !reviewData.explanation || reviewing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewing ? 'Procesando...' : 'Aplicar Decisión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution (if resolved) */}
      {incident.status === 'resolved' && incident.resolution && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Resolución
          </h3>
          
          <div className="space-y-3">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              incident.resolution.decision === 'no_action' ? 'bg-green-100 text-green-800' :
              incident.resolution.decision === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {incident.resolution.decision === 'no_action' ? 'Sin Acción' :
               incident.resolution.decision === 'warning' ? 'Advertencia' : 
               `Penalización: -${incident.resolution.penaltyPoints} puntos`}
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              {incident.resolution.explanation}
            </p>

            {incident.reviewedBy && (
              <p className="text-sm text-gray-500">
                Revisado por comisario el {new Date(incident.reviewedBy.reviewedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {selectedEvidence && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvidence(null)}
        >
          <div className="max-w-4xl max-h-[90vh]">
            {selectedEvidence.s3Key.includes('video') ? (
              <video controls autoPlay className="max-w-full max-h-full">
                <source src={selectedEvidence.url} type="video/mp4" />
              </video>
            ) : (
              <img 
                src={selectedEvidence.url} 
                alt="Evidence" 
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Punto de Control 6.1 ✅
- [ ] Modelo FairRacingIncident con soporte S3
- [ ] Sistema de upload de videos a S3 con presigned URLs
- [ ] APIs de reporte y revisión de incidentes
- [ ] UI de reporte con upload de evidencia
- [ ] Panel de revisión para comisarios
- [ ] Sistema de votación comunitaria
- [ ] Actualización automática de puntos Fair Racing
- [ ] Visualización de evidencia desde CloudFront CDN

---

## FASE 7: Features Avanzadas (3-4 días)
**Objetivo**: Implementar características avanzadas como notificaciones, estadísticas avanzadas y features sociales.

### 7.1 Sistema de Notificaciones

#### Archivo: `src/lib/services/notificationService.ts`
```typescript
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import Team from '@/models/Team';
import TeamInvitation from '@/models/TeamInvitation';
import FairRacingIncident from '@/models/FairRacingIncident';

export interface Notification {
  id: string;
  type: 'team_invitation' | 'race_result' | 'incident_report' | 'ranking_update' | 'general';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export class NotificationService {
  // Send team invitation notification
  static async sendTeamInvitation(invitationId: string, teamName: string, recipientEmail: string) {
    await connectDB();
    
    const recipient = await WebUser.findOne({ email: recipientEmail });
    if (!recipient) return;

    const notification: Notification = {
      id: Math.random().toString(36),
      type: 'team_invitation',
      title: 'Invitación a Escudería',
      message: `Has sido invitado a unirte a la escudería ${teamName}`,
      data: { invitationId, teamName },
      read: false,
      createdAt: new Date()
    };

    recipient.notifications = recipient.notifications || [];
    recipient.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (recipient.notifications.length > 50) {
      recipient.notifications = recipient.notifications.slice(0, 50);
    }

    await recipient.save();
  }

  // Send race result notification
  static async sendRaceResult(teamId: string, position: number, totalTeams: number, raceType: string) {
    await connectDB();
    
    const team = await Team.findById(teamId).populate('members.userId');
    if (!team) return;

    const positionText = position === 1 ? '🥇 1er lugar' :
                        position === 2 ? '🥈 2do lugar' :
                        position === 3 ? '🥉 3er lugar' :
                        `${position}° lugar`;

    const notification: Notification = {
      id: Math.random().toString(36),
      type: 'race_result',
      title: 'Resultado de Carrera',
      message: `${team.name} terminó en ${positionText} de ${totalTeams} equipos`,
      data: { teamId, position, raceType },
      read: false,
      createdAt: new Date()
    };

    // Send to all team members
    for (const member of team.members) {
      const user = member.userId as any;
      user.notifications = user.notifications || [];
      user.notifications.unshift(notification);
      
      if (user.notifications.length > 50) {
        user.notifications = user.notifications.slice(0, 50);
      }
      
      await user.save();
    }
  }

  // Mark notification as read
  static async markAsRead(userId: string, notificationId: string) {
    await connectDB();
    
    const user = await WebUser.findById(userId);
    if (!user || !user.notifications) return;

    const notification = user.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await user.save();
    }
  }
}
```

### 7.2 Estadísticas Avanzadas

#### Archivo: `src/lib/services/statsService.ts`
```typescript
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import TeamRaceSession from '@/models/TeamRaceSession';
import TeamRanking from '@/models/TeamRankings';

export interface TeamStats {
  overview: {
    totalRaces: number;
    wins: number;
    podiums: number;
    averagePosition: number;
    completionRate: number;
  };
  performance: {
    bestStreak: number;
    currentStreak: number;
    consistency: number;
    improvement: number;
  };
  fairRacing: {
    score: number;
    incidents: number;
    penalties: number;
    cleanRaces: number;
  };
}

export class StatsService {
  static async getTeamStats(teamId: string, season?: string): Promise<TeamStats> {
    await connectDB();

    const currentSeason = season || new Date().getFullYear().toString();

    // Get all races for the team
    const races = await TeamRaceSession.find({
      'teams.teamId': teamId,
      status: 'completed',
      createdAt: {
        $gte: new Date(`${currentSeason}-01-01`),
        $lt: new Date(`${parseInt(currentSeason) + 1}-01-01`)
      }
    }).sort({ createdAt: 1 });

    // Calculate stats
    const teamRaces = races.map(race => {
      const teamData = race.teams.find(t => t.teamId.toString() === teamId);
      return {
        position: teamData?.finalPosition || 999,
        totalTeams: race.teams.length,
        points: teamData?.totalPoints || 0
      };
    });

    const wins = teamRaces.filter(r => r.position === 1).length;
    const podiums = teamRaces.filter(r => r.position <= 3).length;
    const totalRaces = teamRaces.length;
    const averagePosition = totalRaces > 0 ? 
      teamRaces.reduce((sum, r) => sum + r.position, 0) / totalRaces : 0;

    return {
      overview: {
        totalRaces,
        wins,
        podiums,
        averagePosition,
        completionRate: totalRaces > 0 ? 100 : 0
      },
      performance: {
        bestStreak: 0,
        currentStreak: 0,
        consistency: 0,
        improvement: 0
      },
      fairRacing: {
        score: 100,
        incidents: 0,
        penalties: 0,
        cleanRaces: totalRaces
      }
    };
  }
}
```

#### Punto de Control 7.1 ✅
- [ ] Sistema de notificaciones implementado
- [ ] Estadísticas avanzadas con métricas de rendimiento
- [ ] Comparación entre equipos funcionando
- [ ] Análisis de tendencias y consistencia
- [ ] Récords cara a cara calculados
- [ ] Features sociales básicas

---

## FASE 8: Testing y Optimización (5-6 días)
**Objetivo**: Asegurar la calidad del sistema mediante testing comprensivo y optimizaciones de rendimiento.

### 8.1 Tests Unitarios y de Integración

#### Archivo: `tests/models/Team.test.ts`
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/jest';
import mongoose from 'mongoose';
import Team from '../../src/models/Team';
import WebUser from '../../src/models/WebUser';

describe('Team Model', () => {
  beforeEach(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI!);
  });

  afterEach(async () => {
    await Team.deleteMany({});
    await WebUser.deleteMany({});
    await mongoose.connection.close();
  });

  it('should create a team successfully', async () => {
    const captain = new WebUser({
      email: 'captain@test.com',
      profile: { displayName: 'Test Captain' }
    });
    await captain.save();

    const teamData = {
      name: 'Test Racing Team',
      abbreviation: 'TRT',
      description: 'A test racing team',
      division: 'open',
      members: [{
        userId: captain._id,
        role: 'captain',
        joinedAt: new Date()
      }]
    };

    const team = new Team(teamData);
    const savedTeam = await team.save();

    expect(savedTeam.name).toBe('Test Racing Team');
    expect(savedTeam.members).toHaveLength(1);
    expect(savedTeam.members[0].role).toBe('captain');
    expect(savedTeam.status).toBe('active');
    expect(savedTeam.stats.fairRacingScore).toBe(100);
  });

  it('should not allow duplicate team names', async () => {
    const captain = new WebUser({
      email: 'captain@test.com',
      profile: { displayName: 'Test Captain' }
    });
    await captain.save();

    const teamData = {
      name: 'Duplicate Team',
      abbreviation: 'DUP',
      members: [{
        userId: captain._id,
        role: 'captain',
        joinedAt: new Date()
      }]
    };

    await new Team(teamData).save();

    const duplicateTeam = new Team({
      ...teamData,
      abbreviation: 'DUP2'
    });

    await expect(duplicateTeam.save()).rejects.toThrow();
  });
});
```

### 8.2 Optimizaciones de Base de Datos

#### Archivo: `src/lib/database/optimization.ts`
```typescript
import mongoose from 'mongoose';

export class DatabaseOptimization {
  // Create comprehensive indexes for better query performance
  static async createIndexes() {
    const db = mongoose.connection.db;

    // Teams indexes
    await db.collection('teams').createIndexes([
      { key: { name: 1 }, unique: true, background: true },
      { key: { abbreviation: 1 }, unique: true, background: true },
      { key: { division: 1, 'stats.eloRating': -1 }, background: true },
      { key: { status: 1, division: 1 }, background: true },
      { key: { 'members.userId': 1 }, background: true },
      { key: { createdAt: -1 }, background: true }
    ]);

    // TeamRaceSession indexes
    await db.collection('teamracesessions').createIndexes([
      { key: { 'teams.teamId': 1, status: 1 }, background: true },
      { key: { raceType: 1, scheduledDate: -1 }, background: true },
      { key: { status: 1, scheduledDate: -1 }, background: true }
    ]);

    console.log('✅ Database indexes created successfully');
  }

  // Clean up old data
  static async cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

    // Archive old race sessions
    await mongoose.connection.db.collection('teamracesessions').updateMany(
      { 
        createdAt: { $lt: cutoffDate },
        status: 'completed'
      },
      { $set: { archived: true } }
    );

    console.log('✅ Old data cleanup completed');
  }
}
```

#### Punto de Control 8.1 ✅
- [ ] Tests unitarios para modelos principales
- [ ] Tests de integración para APIs críticas
- [ ] Tests de performance y carga
- [ ] Índices de base de datos optimizados
- [ ] Sistema de cache implementado
- [ ] Logging y monitoreo configurado
- [ ] Limpieza automática de datos antiguos
- [ ] Pipeline de testing automatizado

---

## PUNTOS DE CONTROL GENERALES

### Control de Calidad por Fase
Cada fase debe completar todos sus puntos de control antes de proceder a la siguiente:

**Fase 0**: ✅ Infraestructura S3 configurada y funcional
**Fase 1**: ✅ Modelos creados y validados
**Fase 2**: ✅ APIs básicas funcionando correctamente
**Fase 3**: ✅ UI básica operativa
**Fase 4**: ✅ Sistema de carreras por equipos implementado
**Fase 5**: ✅ Rankings y campeonatos funcionando
**Fase 6**: ✅ Fair Racing con S3 integrado
**Fase 7**: ✅ Features avanzadas completadas
**Fase 8**: ✅ Testing y optimización finalizados

### Testing Integral
- [ ] Todos los tests unitarios pasan (>90% cobertura)
- [ ] Tests de integración exitosos
- [ ] Tests de carga superados
- [ ] Tests de UI automatizados
- [ ] Validación manual de flujos críticos

### Verificación de Seguridad
- [ ] Autenticación y autorización verificada
- [ ] Validación de inputs implementada
- [ ] Protección contra ataques comunes
- [ ] URLs de S3 con presigned correctas
- [ ] Logs de seguridad configurados

### Performance y Optimización
- [ ] Tiempo de respuesta de APIs < 500ms
- [ ] Carga de páginas < 2 segundos
- [ ] Índices de DB optimizados
- [ ] Cache implementado donde corresponde
- [ ] CDN configurado para S3

---

## CONSIDERACIONES TÉCNICAS

### Arquitectura
- **Frontend**: Next.js 14.2.18 con App Router
- **Backend**: APIs en Next.js con middleware personalizado
- **Base de Datos**: MongoDB con Mongoose ODM
- **Autenticación**: JWT con bcrypt
- **Storage**: AWS S3 + CloudFront CDN
- **Real-time**: WebSocket server independiente
- **Testing**: Jest + Supertest

### Escalabilidad
- Diseño modular que permite crecimiento
- Separación clara entre lógica de negocio y presentación
- Cache estratégico para reducir carga de DB
- Optimización de consultas con aggregation pipelines
- Estructura preparada para microservicios futuros

### Mantenimiento
- Logging comprehensivo para debugging
- Monitoreo de performance automático
- Limpieza automática de datos antiguos
- Backup regular de datos críticos
- Documentación técnica actualizada

### Integración con Sistema Existente
- Compatible con modelos WebUser y RaceSession existentes
- Reutiliza middleware de autenticación actual
- Integra con WebSocket server existente
- Mantiene consistencia con UI/UX actual

---

## ESTIMACIÓN DE TIMELINE

### Cronograma Detallado (30-35 días hábiles)

**Semana 1 (5 días)**
- Días 1-2: Fase 0 (S3 Setup)
- Días 3-5: Fase 1 (Modelos)

**Semana 2 (5 días)**  
- Días 6-10: Fase 2 (APIs Básicas)

**Semana 3 (5 días)**
- Días 11-15: Fase 3 (UI Básica)

**Semana 4 (5 días)**
- Días 16-20: Fase 4 (Sistema Carreras)

**Semana 5 (5 días)**
- Días 21-23: Fase 5 (Rankings)
- Días 24-25: Inicio Fase 6

**Semana 6 (5 días)**
- Días 26-30: Fase 6 (Fair Racing)

**Semana 7 (5 días)**
- Días 31-34: Fase 7 (Features Avanzadas)
- Día 35: Inicio Fase 8

**Buffer/Finalización (2-3 días)**
- Testing final
- Optimizaciones
- Documentación

### Recursos Necesarios
- **Desarrollador Full-stack Senior**: 1 persona tiempo completo
- **Acceso AWS**: Para configuración S3 y CloudFront
- **MongoDB**: Base de datos de desarrollo y testing
- **Herramientas**: Jest, Supertest, Postman para testing

### Dependencias Críticas
1. Acceso y permisos AWS S3
2. Configuración de variables de entorno
3. WebSocket server funcionando
4. Base de datos MongoDB configurada
5. Sistema de autenticación JWT operativo

---

## CONSIDERACIONES FINALES

### Riesgos y Mitigaciones
- **Riesgo**: Integración compleja con sistema existente
  - **Mitigación**: Testing exhaustivo de compatibilidad
- **Riesgo**: Performance con gran volumen de datos
  - **Mitigación**: Optimizaciones de DB e implementación de cache
- **Riesgo**: Costos S3 elevados
  - **Mitigación**: Políticas de lifecyle y compresión de archivos

### Métricas de Éxito
- Sistema soporta 100+ equipos simultáneos
- Tiempo de carga < 2 segundos en todas las páginas
- 99% uptime después del lanzamiento
- Feedback positivo de usuarios beta

### Próximos Pasos Post-Implementación
1. **Monitoreo**: Implementar alertas y métricas avanzadas
2. **Feedback**: Recopilar comentarios de usuarios beta
3. **Iteración**: Mejoras basadas en uso real
4. **Expansión**: Features adicionales como streaming en vivo
5. **Mobile**: Considerar desarrollo de app móvil

---

**Protocolo completado** ✅
**Fecha de creación**: ${new Date().toLocaleDateString()}
**Versión**: 1.0
**Estado**: Listo para implementación

---
