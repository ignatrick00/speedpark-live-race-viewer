# 🚀 Production Setup - Karteando.cl

## 📋 Estado Actual del Deployment

### ✅ Completado

- [x] **Dominio**: karteando.cl
- [x] **DNS Provider**: Cloudflare (migrado desde Route 53)
  - Nameservers: `anton.ns.cloudflare.com`, `malavika.ns.cloudflare.com`
  - Estado: ⏳ Pendiente propagación (2-24 horas)
- [x] **Código**: Sistema de escuderías completo en GitHub
  - Branch: `main`
  - Commits: 5 commits adelante de origin/main
  - Listo para push

---

## 🔄 En Proceso

### 1. **Cloudflare DNS** ⏳
- **Status**: Esperando activación
- **Tiempo estimado**: 2-6 horas
- **Verificar en**: https://www.whatsmydns.net/#NS/karteando.cl
- **Email**: Cloudflare enviará confirmación cuando active

---

## ⏹️ Pendiente de Configurar

### 2. **MongoDB**
- **Opción elegida**: Usar configuración existente
- **Pendiente**:
  - [ ] Verificar si es MongoDB Atlas (producción) o local (desarrollo)
  - [ ] Obtener connection string actual
  - [ ] Si es local → migrar a MongoDB Atlas
  - [ ] Si es Atlas → copiar `MONGODB_URI`

### 3. **Vercel (Hosting)**
- **Plan**: Free tier
- **Pendiente**:
  - [ ] Crear cuenta / Login en https://vercel.com
  - [ ] Conectar repositorio GitHub
  - [ ] Configurar variables de entorno
  - [ ] Deploy inicial
  - [ ] Conectar dominio `karteando.cl`
  - [ ] Configurar `www.karteando.cl` redirect

### 4. **Cloudflare R2 (Storage)** ☁️ NUEVO
- **Decision**: Usar Cloudflare R2 (reemplaza AWS S3)
- **Plan**: Pay-as-you-go (10GB gratis/mes)
- **Uso**: Almacenamiento de videos de incidentes
- **Ventajas**: Sin costos de egreso, API S3-compatible, misma cuenta Cloudflare
- **Pendiente**:
  - [ ] Crear bucket R2 en Cloudflare dashboard
  - [ ] Bucket name: `karteando-videos`
  - [ ] Generar R2 API tokens
  - [ ] Obtener `R2_ACCESS_KEY_ID`
  - [ ] Obtener `R2_SECRET_ACCESS_KEY`
  - [ ] Obtener `R2_ENDPOINT` (ej: `https://[account-id].r2.cloudflarestorage.com`)
  - [ ] Configurar CORS para dominio producción
  - [ ] Opcional: Configurar dominio custom para URLs públicas

### 5. **Railway (WebSocket Server)**
- **Plan**: Hobby ($5/mes) o Free trial
- **Uso**: WebSocket para timing en vivo
- **Pendiente**:
  - [ ] Crear cuenta en https://railway.app
  - [ ] Crear nuevo proyecto
  - [ ] Conectar repositorio o subir `websocket-server.js`
  - [ ] Configurar variables de entorno
  - [ ] Deploy WebSocket server
  - [ ] Obtener URL pública (ej: `wss://karteando-ws.up.railway.app`)

### 6. **Zoho Mail (Email Service)** 📧 NUEVO
- **Decision**: Usar Zoho Mail para emails
- **Plan**: Free tier (5 usuarios, 5GB/usuario)
- **Uso**: Emails transaccionales (registro, recuperación contraseña, notificaciones)
- **Pendiente**:
  - [ ] Crear cuenta en https://www.zoho.com/mail/
  - [ ] Verificar dominio `karteando.cl`
  - [ ] Configurar DNS records (MX, SPF, DKIM)
  - [ ] Crear email: `noreply@karteando.cl`
  - [ ] Obtener credenciales SMTP:
    - Host: `smtp.zoho.com`
    - Port: `465` (SSL) o `587` (TLS)
    - Username: `noreply@karteando.cl`
    - Password: [generar app password]
  - [ ] Integrar con Next.js (nodemailer)

---

## 🔐 Variables de Entorno Requeridas

### Para Vercel (Producción):

```bash
# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/karteando?retryWrites=true&w=majority

# JWT
JWT_SECRET=tu_secreto_super_seguro_minimo_32_caracteres

# Cloudflare R2 (S3-compatible)
R2_ACCESS_KEY_ID=tu_r2_access_key
R2_SECRET_ACCESS_KEY=tu_r2_secret_key
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_BUCKET_NAME=karteando-videos
R2_PUBLIC_URL=https://videos.karteando.cl (opcional)

# WebSocket
NEXT_PUBLIC_WS_URL=wss://karteando-ws.up.railway.app

# Zoho Mail
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=noreply@karteando.cl
SMTP_PASSWORD=tu_app_password_zoho
SMTP_FROM=noreply@karteando.cl
SMTP_FROM_NAME=Karteando Chile

# URLs
NEXT_PUBLIC_BASE_URL=https://karteando.cl
```

### Para Railway (WebSocket Server):

```bash
PORT=8080
NODE_ENV=production
```

---

## 📝 Archivos Actuales

### Configuración existente:
- ✅ `vercel.json` - Configuración Vercel (creado)
- ✅ `railway.json` - Configuración Railway (creado)
- ⚠️ `.env.local` - Variables locales (NO commitear)
- ⚠️ `.env.production` - Variables producción (crear si necesario)

### Archivos deployment:
- ✅ `TESTING.md` - Guía de testing
- ✅ `DEPLOYMENT.md` - Guía deployment anterior (actualizar)
- ✅ `scripts/seed-squadrons.ts` - Seed para desarrollo

---

## 🎯 Próximos Pasos (En Orden)

### Paso 1: Push código a GitHub ⏭️ AHORA
```bash
git push origin main
```

### Paso 2: Verificar MongoDB
- Revisar `.env.local`
- Confirmar si es Atlas o local

### Paso 3: Configurar Zoho Mail (mientras DNS propaga)
- Crear cuenta Zoho
- Configurar DNS en Cloudflare (MX records)
- Crear email `noreply@karteando.cl`
- Obtener credenciales SMTP

### Paso 4: Deploy a Vercel (cuando DNS esté listo)
- Conectar repo GitHub
- Configurar variables de entorno
- Deploy automático
- Conectar dominio `karteando.cl`

### Paso 5: Deploy WebSocket a Railway
- Subir `websocket-server.js`
- Deploy y obtener URL
- Actualizar `NEXT_PUBLIC_WS_URL` en Vercel

### Paso 6: Configurar Cloudflare R2 para producción
- Crear bucket R2 `karteando-videos`
- Generar API tokens
- Configurar CORS
- Actualizar variables en Vercel

### Paso 7: Configurar DNS final en Cloudflare
```
Type  | Name | Content                    | Proxy
------|------|----------------------------|-------
A     | @    | [Vercel IP]               | ✅ Proxied
CNAME | www  | karteando.cl              | ✅ Proxied
CNAME | ws   | railway-ws-url            | ⚠️ DNS only
MX    | @    | mx.zoho.com (priority 10) | ⚠️ DNS only
MX    | @    | mx2.zoho.com (priority 20)| ⚠️ DNS only
TXT   | @    | v=spf1 include:zoho.com ~all | -
```

---

## 📊 Costos Mensuales Estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Cloudflare DNS | Free | $0 |
| MongoDB Atlas | M0 Free | $0 |
| Vercel | Hobby | $0 |
| Railway WebSocket | Hobby | ~$5 |
| Cloudflare R2 | Pay-as-you-go | ~$0-2 |
| Zoho Mail | Free | $0 |
| **Total** | | **~$5-7/mes** |

---

## 🔍 Verificación Post-Deploy

- [ ] `https://karteando.cl` carga correctamente
- [ ] `https://www.karteando.cl` redirige a `karteando.cl`
- [ ] SSL activo (candado verde)
- [ ] Login/Register funcionando
- [ ] WebSocket conecta (Live Timing)
- [ ] Crear escudería funciona
- [ ] Buscar escuderías funciona
- [ ] Envío de emails funciona
- [ ] Upload de videos S3 funciona

---

## 📞 Soporte y Recursos

- **Cloudflare**: https://dash.cloudflare.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Vercel**: https://vercel.com/dashboard
- **Railway**: https://railway.app/dashboard
- **AWS Console**: https://console.aws.amazon.com
- **Zoho Mail**: https://mail.zoho.com

---

**Última actualización**: 2025-10-27
**Estado**: 🟡 En configuración
