# 🚀 Deployment Guide - Karteando.cl

## Stack de Deployment

- **Frontend/Backend**: Vercel (Next.js 14)
- **WebSocket**: Railway.app (Node.js WS server)
- **Database**: MongoDB Atlas
- **Video Storage**: Cloudflare R2 + Workers
- **CDN**: Cloudflare

---

## 1️⃣ MongoDB Atlas Setup

1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crear cluster (Free tier M0 funciona para desarrollo)
3. Configurar Network Access: `0.0.0.0/0` (permite conexiones desde Vercel)
4. Crear Database User con permisos
5. Copiar Connection String → `MONGODB_URI`

---

## 2️⃣ Vercel Deployment (Next.js)

### Setup Inicial

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd /path/to/karteando-cl
vercel
```

### Variables de Entorno en Vercel

Dashboard → Settings → Environment Variables:

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://karteando.cl
ADMIN_EMAIL=admin@karteando.cl
ADMIN_PASSWORD=secure-password
NEXT_PUBLIC_WS_URL=wss://karteando-ws.railway.app
NEXT_PUBLIC_UPLOAD_URL=https://upload.karteando.cl/video
```

### Dominios Personalizados

1. Vercel Dashboard → Domains
2. Agregar: `karteando.cl` y `www.karteando.cl`
3. Configurar DNS según instrucciones

---

## 3️⃣ Railway Deployment (WebSocket Server)

### Setup

1. Crear cuenta en [Railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Seleccionar repositorio `karteando-cl`
4. Configurar:
   - **Root Directory**: `/`
   - **Start Command**: `node websocket-server.js`

### Variables de Entorno en Railway

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=same-as-vercel
PORT=10015
```

### Custom Domain

1. Railway → Settings → Networking
2. Generate Domain → `karteando-ws.railway.app`
3. O configurar dominio personalizado: `ws.karteando.cl`

---

## 4️⃣ Cloudflare R2 Setup

### Crear Bucket

1. Cloudflare Dashboard → R2 Object Storage
2. Create Bucket → Nombre: `karteando-evidence`
3. Configurar Public Access (solo lectura si quieres URLs públicas)

### Custom Domain para R2

1. R2 Bucket → Settings → Public Access
2. Connect Domain → `cdn.karteando.cl`
3. Cloudflare configurará automáticamente

### Deploy Cloudflare Worker

```bash
# Instalar Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Deploy worker
cd cloudflare-worker
wrangler deploy

# Set secrets
wrangler secret put JWT_SECRET
# Pegar el mismo JWT_SECRET de Vercel/Railway
```

### Configurar Custom Domain para Worker

1. Cloudflare Dashboard → Workers & Pages
2. Seleccionar worker `karteando-video-upload`
3. Settings → Triggers → Custom Domains
4. Agregar: `upload.karteando.cl`

---

## 5️⃣ DNS Configuration (Cloudflare)

Configuración en Cloudflare DNS:

```
# Main site (apunta a Vercel)
A     karteando.cl        → 76.76.21.21 (Vercel IP)
CNAME www.karteando.cl    → cname.vercel-dns.com

# WebSocket (apunta a Railway)
CNAME ws.karteando.cl     → karteando-ws.railway.app

# CDN para videos R2 (configurado automáticamente por R2)
CNAME cdn.karteando.cl    → [R2 auto-configured]

# Upload Worker (configurado automáticamente)
CNAME upload.karteando.cl → [Worker auto-configured]
```

---

## 6️⃣ Verificación Post-Deployment

### Tests

```bash
# 1. Test Next.js
curl https://karteando.cl

# 2. Test WebSocket
wscat -c wss://ws.karteando.cl

# 3. Test Upload Worker
curl -X OPTIONS https://upload.karteando.cl/video

# 4. Test MongoDB connection
curl https://karteando.cl/api/test-db
```

### Checklist

- [ ] Next.js carga correctamente
- [ ] Login/Register funciona
- [ ] WebSocket conecta (live race viewer)
- [ ] MongoDB responde
- [ ] Upload de videos funciona
- [ ] CORS configurado correctamente
- [ ] SSL activo en todos los dominios

---

## 7️⃣ Monitoring & Logs

### Vercel Logs
```bash
vercel logs
```

### Railway Logs
Dashboard → View Logs

### Cloudflare Worker Logs
Dashboard → Workers → karteando-video-upload → Logs

### MongoDB Monitoring
Atlas Dashboard → Metrics

---

## 8️⃣ Costos Mensuales Estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Vercel | Pro (opcional) | $0 - $20/mes |
| Railway | Hobby | $5/mes |
| MongoDB Atlas | M0 Free → M2 Shared | $0 - $9/mes |
| Cloudflare R2 | Pay-as-you-go | ~$1-3/mes |
| Cloudflare Workers | Free tier | $0 (hasta 100k requests/día) |
| **Total** | | **$6-37/mes** |

### Escalamiento

Para producción con tráfico alto:
- Vercel Pro: $20/mes
- Railway: $5-20/mes (según uso)
- MongoDB M10: $57/mes (dedicado)
- R2: ~$10-50/mes (según storage + requests)

---

## 🔧 Scripts de Deployment

### Deploy Everything
```bash
# Deploy Next.js a Vercel
npm run deploy:vercel

# Deploy Worker a Cloudflare
npm run deploy:worker

# Railway se auto-deploys con git push
git push origin main
```

Agregar a `package.json`:
```json
"scripts": {
  "deploy:vercel": "vercel --prod",
  "deploy:worker": "cd cloudflare-worker && wrangler deploy"
}
```

---

## 🚨 Troubleshooting

### Error: WebSocket no conecta
- Verificar `NEXT_PUBLIC_WS_URL` en Vercel
- Verificar Railway está corriendo
- Check CORS en websocket-server.js

### Error: Upload de video falla
- Verificar JWT_SECRET igual en Vercel y Worker
- Check R2 bucket existe y tiene permisos
- Verificar CORS en Worker

### Error: MongoDB connection timeout
- Network Access en Atlas permite IPs de Vercel
- Connection string correcto en variables de entorno

---

**Estado**: Ready for deployment ✅
**Última actualización**: 2025-10-26
