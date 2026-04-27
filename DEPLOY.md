# ExoticFriends — Guía de Despliegue

Arquitectura: **APK (Expo EAS)** + **API REST (Render)** + **PostgreSQL (Neon)**

---

## 1. Desarrollo local

### Backend (puerto 5000)

```bash
# Requiere: .env con DATABASE_URL, SESSION_SECRET, GROQ_API_KEY
npm run server:dev
```

### Frontend (puerto 8081)

```bash
# En otra terminal — apunta automáticamente a localhost:5000
npm run expo:dev
```

Abre Expo Go en tu dispositivo y escanea el QR, o usa el simulador Android/iOS.

---

## 2. Base de datos — sincronizar schema

Ejecutar **una vez** al crear el proyecto o cuando cambies `shared/schema.ts`:

```bash
# Requiere DATABASE_URL en .env apuntando a Neon
npm run db:push
```

---

## 3. Build de producción

### Backend (compilar para Render)

```bash
npm run server:build
# Genera: server_dist/index.js
```

Render ejecuta este build automáticamente con cada deploy (ver sección 5).

### Frontend — APK Android (EAS)

```bash
npx eas build --platform android --profile preview
```

- Genera un APK descargable desde [expo.dev](https://expo.dev)
- La URL del backend ya está fija en `eas.json` → `EXPO_PUBLIC_API_URL`
- No requiere correr el backend localmente

---

## 4. Flujo git — merge a main

```bash

#  1. Commitear cambios pendientes
git add .
git commit -m "descripción del cambio"

# 2. Cambiar a main y mergear
git checkout main
git merge dev

# 3. Subir a GitHub
git push origin main

# 4. Volver a dev para seguir trabajando
git checkout dev
```

---

## 5. Redeploy en Render (solo si se modifico el backend)

Render puede desplegarse automáticamente con cada push a `main` (si está configurado el auto-deploy) o de forma manual:

1. Ir a [dashboard.render.com](https://dashboard.render.com)
2. Seleccionar el servicio **ExoticFriends API**
3. Clic en **Manual Deploy → Deploy latest commit**
4. Esperar que el build termine (~1-2 min)
5. Verificar en: `https://exoticfriends.onrender.com/api/health`

```json
{ "ok": true, "service": "ExoticFriends API" }
```

> **Variables de entorno requeridas en Render:**
> - `DATABASE_URL` — URL de Neon con `sslmode=require`
> - `SESSION_SECRET` — cadena larga y aleatoria
> - `GROQ_API_KEY` — key de Groq
> - `NODE_ENV` — `production`
> - `ALLOWED_ORIGINS` — (opcional) orígenes web permitidos

---

## 6. Rebuild de APK (solo si tocaste el frontend)

```bash
npx eas build --platform android --profile preview
```

- Descargar el nuevo APK desde [expo.dev](https://expo.dev) → proyecto → Builds
- Instalar en dispositivo desinstalando el anterior si hay conflicto de firma

> Si solo cambiaste el backend, **no necesitas rebuildar el APK**.  
> El APK consume la API remota en Render y el cambio aplica inmediatamente.

---

## 7. Resumen de cuándo hacer qué

| Cambio realizado | ¿Rebuild APK? | ¿Redeploy Render? |
|---|:---:|:---:|
| Solo backend (`server/`) | No | **Sí** |
| Solo frontend (`client/`) | **Sí** | No |
| Schema de BD (`shared/schema.ts`) | No | **Sí** + `db:push` |
| Ambos | **Sí** | **Sí** |
