# ExoticFriends

Aplicación móvil para el cuidado, seguimiento de salud, control de peso y alimentación de mascotas exóticas. Soporta reptiles, aves, peces, mamíferos y artrópodos.

---

## Tabla de contenidos

1. [Descripción general](#descripción-general)
2. [Tecnologías](#tecnologías)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Requisitos previos](#requisitos-previos)
5. [Instalación y ejecución local](#instalación-y-ejecución-local)
6. [Variables de entorno](#variables-de-entorno)
7. [Base de datos](#base-de-datos)
8. [API REST](#api-rest)
9. [Seguridad del servidor](#seguridad-del-servidor)
10. [Protocolos y arquitectura distribuida](#protocolos-y-arquitectura-distribuida)
11. [Sistema de IA](#sistema-de-ia)
12. [Build para producción](#build-para-producción)

---

## Descripción general

ExoticFriends permite a los dueños de mascotas exóticas:

- Registrar múltiples mascotas con foto, especie, categoría y fecha de nacimiento
- Llevar historial de **peso** con gráfico de evolución y regresión lineal
- Registrar **alimentación** diaria (alimento, cantidad, notas) con gráfico de frecuencia (últimos 14 días)
- Anotar **notas de salud** (revisión, veterinario, medicamento, observación)
- Buscar y filtrar mascotas por nombre, especie o categoría
- Consultar un **Asistente IA** que analiza el estado de salud de cada mascota usando regresión lineal OLS, árbol de decisión y el modelo Llama 3.3 70B de Groq
- Ver la **actividad global** del perfil (todos los registros de todas las mascotas)
- Gestionar la **cuenta**: editar nombre y email, cambiar contraseña y eliminar la cuenta

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Mobile/Web | Expo SDK 54 + React Native + Expo Router v6 |
| Estado del servidor | TanStack React Query v5 |
| Backend | Express 5 + TypeScript (Node.js) |
| Base de datos | PostgreSQL (Neon) + Drizzle ORM |
| Autenticación | express-session + bcryptjs + connect-pg-simple |
| Seguridad | Helmet (cabeceras HTTP) + express-rate-limit (200 req/15 min) |
| IA | Groq API — modelo `llama-3.3-70b-versatile` |
| Fuentes | Nunito (Google Fonts via expo-google-fonts) |

---

## Estructura del proyecto

```
/
├── client/                    # Todo el frontend Expo
│   ├── app/                   # Rutas (Expo Router file-based routing)
│   │   ├── _layout.tsx        # Root layout: providers, fuentes, splash
│   │   ├── login.tsx          # Pantalla de login / registro
│   │   ├── agregar-mascota.tsx
│   │   ├── detalle-mascota.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx    # Tab bar
│   │       ├── index.tsx      # Inicio — resumen del perfil
│   │       ├── mascotas.tsx   # Listado de mascotas con búsqueda y filtros
│   │       ├── actividad.tsx  # Actividad global
│   │       └── perfil.tsx     # Perfil y configuración de cuenta
│   ├── components/
│   │   ├── mascotas/          # Sub-componentes del detalle
│   │   │   ├── PerfilMascota.tsx
│   │   │   ├── AccionesRapidas.tsx
│   │   │   ├── SeccionAlimentacion.tsx
│   │   │   ├── SeccionSalud.tsx
│   │   │   ├── ModalPeso.tsx
│   │   │   ├── ModalAlimentacion.tsx
│   │   │   ├── ModalSalud.tsx
│   │   │   └── ModalEditarMascota.tsx
│   │   ├── AsistenteIA.tsx        # Asistente IA (Alertas / Cuidados / Historial)
│   │   ├── GraficoPeso.tsx        # Gráfico de evolución de peso (línea + área SVG)
│   │   ├── GraficoAlimentacion.tsx # Gráfico de frecuencia de alimentación (barras SVG)
│   │   └── ...                    # Componentes reutilizables
│   ├── lib/
│   │   ├── auth-context.tsx   # AuthProvider + useAuth hook
│   │   ├── query-client.ts    # React Query config + apiRequest + getApiUrl()
│   │   ├── tipos.ts           # Interfaces TypeScript
│   │   └── imagenBase64.ts    # Conversión de imágenes a base64
│   ├── constants/colors.ts    # Paleta de colores
│   └── assets/images/         # Iconos e imágenes
├── server/                    # Todo el backend Express
│   ├── index.ts               # Entrada: crea servidor HTTP en puerto 5000
│   ├── app.ts                 # Factory Express + middlewares
│   ├── db.ts                  # Conexión PostgreSQL (Drizzle + pg pool)
│   ├── storage.ts             # Capa de acceso a datos
│   ├── config/sesion.ts       # Configuración de sesiones PgStore
│   ├── middleware/
│   │   ├── auth.ts            # requireAuth — protege rutas privadas
│   │   ├── cors.ts            # CORS dinámico (ALLOWED_ORIGINS + localhost)
│   │   ├── logging.ts         # Log de peticiones /api
│   │   ├── rateLimiting.ts    # limitadorApi (200 req/15 min) + limitadorAuth (20/15 min)
│   │   └── expo.ts            # Archivos estáticos Expo + landing page
│   ├── routes/
│   │   ├── index.ts           # Ensamblador de routers
│   │   ├── auth.routes.ts
│   │   ├── mascotas.routes.ts
│   │   ├── pesos.routes.ts
│   │   ├── alimentacion.routes.ts
│   │   ├── salud.routes.ts
│   │   ├── ia.routes.ts
│   │   └── actividad.routes.ts
│   └── utils/ia.ts            # Groq + regresión OLS + árbol de decisión
├── shared/schema.ts           # Drizzle schema compartido (7 tablas)
├── app.json                   # Config Expo (expo-router root: "client/app")
├── tsconfig.json              # @/* → client/*  |  @shared/* → shared/*
├── eas.json                   # Perfiles de build EAS
└── metro.config.js            # Metro config (default)
```

---

## Requisitos previos

- **Node.js** 18 o superior
- **npm** 9 o superior
- Cuenta en [Neon](https://neon.tech) con una base de datos PostgreSQL
- Cuenta en [Groq](https://console.groq.com) para obtener la API key
- (Opcional para build nativo) Cuenta en [Expo](https://expo.dev) y EAS CLI

---

## Instalación y ejecución local

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd exoticfriends

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (ver siguiente sección)
cp .env.example .env
# Editar .env con tus valores

# 4. Crear tablas en la base de datos
npm run db:push

# 5. Iniciar backend (puerto 5000)
npm run server:dev

# 6. En otra terminal, iniciar frontend (puerto 8081)
npm run expo:dev
```

Abre `http://localhost:8081` en el navegador, o escanea el QR con **Expo Go** desde tu dispositivo.

---

## Variables de entorno

### Backend (`server/`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | Secreto para firmar cookies de sesión | cadena larga aleatoria |
| `GROQ_API_KEY` | API key de Groq | `gsk_...` |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` |
| `ALLOWED_ORIGINS` | Orígenes CORS en producción (CSV) | `https://tu-dominio.com` |

### Frontend (`client/`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `EXPO_PUBLIC_DOMAIN` | Dominio del backend (sin protocolo) | `api.tu-dominio.com` |

En desarrollo local, `EXPO_PUBLIC_DOMAIN` se establece como `localhost:5000` al correr `npm run expo:dev`.

---

## Base de datos

Esquema definido en `shared/schema.ts` con Drizzle ORM:

| Tabla | Descripción |
|---|---|
| `perfiles` | Usuarios registrados (id, nombreUsuario, contraseña bcrypt, email, foto_base64) |
| `mascotas` | Mascotas del usuario (nombre, especie, categoría, foto base64) |
| `registros_peso` | Historial de peso por mascota |
| `registros_alimentacion` | Historial de alimentación por mascota |
| `notas_salud` | Notas clínicas (revisión, veterinario, medicamento, observación) |
| `analisis_ia` | Caché de análisis IA por mascota (alertas, puntuación, regresión) |
| `cuidados_especie` | Caché de guías de cuidados por mascota (personalizada con morfo/genética) |

### Migraciones

```bash
# Sincronizar schema con la base de datos
npm run db:push
```

---

## API REST

Todos los endpoints requieren autenticación (cookie de sesión) salvo `/api/auth/registro` y `/api/auth/login`.

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Crear cuenta (validación Zod + rate limit) |
| POST | `/api/auth/login` | Iniciar sesión (validación Zod + rate limit) |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/perfil` | Datos del usuario autenticado |
| PUT | `/api/auth/perfil` | Actualizar nombre completo, email y foto de perfil (base64) |
| POST | `/api/auth/cambiar-contrasena` | Cambiar contraseña (requiere contraseña actual) |
| DELETE | `/api/auth/cuenta` | Eliminar cuenta y todos los datos (requiere contraseña) |

### Mascotas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/mascotas` | Listar mascotas del usuario |
| POST | `/api/mascotas` | Crear mascota |
| GET | `/api/mascotas/:id` | Obtener mascota por ID |
| PUT | `/api/mascotas/:id` | Actualizar mascota |
| DELETE | `/api/mascotas/:id` | Eliminar mascota |

### Peso

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/mascotas/:id/pesos` | Historial de peso de una mascota |
| POST | `/api/mascotas/:id/pesos` | Registrar nuevo peso |
| DELETE | `/api/pesos/:id` | Eliminar registro de peso |

### Alimentación

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/mascotas/:id/alimentacion` | Historial de alimentación de una mascota |
| POST | `/api/mascotas/:id/alimentacion` | Registrar nueva alimentación |
| DELETE | `/api/alimentacion/:id` | Eliminar registro de alimentación |

### Salud

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/mascotas/:id/salud` | Notas de salud de una mascota |
| POST | `/api/mascotas/:id/salud` | Crear nota de salud |
| DELETE | `/api/salud/:id` | Eliminar nota de salud |

### Actividad global

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/todos-pesos` | Todos los pesos del usuario |
| GET | `/api/toda-alimentacion` | Toda la alimentación del usuario |
| GET | `/api/toda-salud` | Todas las notas de salud del usuario |

### IA

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/mascotas/:id/analisis` | Último análisis guardado (sin llamar a Groq) |
| POST | `/api/mascotas/:id/analizar` | Generar nuevo análisis y guardar en BD |
| GET | `/api/mascotas/:id/historial-analisis` | Historial clínico completo (máx 20) |
| GET | `/api/mascotas/:id/cuidados` | Guía de cuidados por especie (caché en BD) |

---

## Seguridad del servidor

### Cabeceras HTTP — Helmet

`helmet` aplica automáticamente las cabeceras HTTP recomendadas por OWASP (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, etc.). Se inicializa en `server/app.ts` como el primer middleware de la cadena, con `contentSecurityPolicy: false` para no bloquear los assets de Expo en desarrollo.

### Rate limiting — express-rate-limit

Definido en `server/middleware/rateLimiting.ts` con dos perfiles:

| Limitador | Ruta | Límite | Ventana | Observación |
|---|---|---|---|---|
| `limitadorApi` | `/api/*` | 200 peticiones | 15 min | Aplicado globalmente a la API |
| `limitadorAuth` | `/api/auth/login` y `/registro` | 20 intentos | 15 min | Solo cuenta peticiones fallidas (`skipSuccessfulRequests: true`) |

### Validación de entradas — Zod

Todos los endpoints que reciben cuerpo validan con schemas Zod definidos en `shared/schema.ts`:

| Schema | Endpoints que lo usan |
|---|---|
| `registroSchema` | POST `/api/auth/registro` |
| `loginSchema` | POST `/api/auth/login` |
| `actualizarPerfilSchema` | PUT `/api/auth/perfil` |
| `cambiarContrasenaSchema` | POST `/api/auth/cambiar-contrasena` |
| `crearMascotaSchema` | POST y PUT `/api/mascotas` |
| `crearPesoSchema` | POST `/api/mascotas/:id/pesos` |
| `crearAlimentacionSchema` | POST `/api/mascotas/:id/alimentacion` |
| `crearSaludSchema` | POST `/api/mascotas/:id/salud` |

Los errores de validación devuelven `HTTP 400` con el mensaje del primer campo inválido.

---

## Protocolos y arquitectura distribuida

ExoticFriends implementa un modelo cliente-servidor distribuido entre dos nodos independientes: la aplicación móvil (cliente) y el servidor API (backend). La comunicación entre ambos se realiza a través de protocolos estándar de Internet, cumpliendo los criterios de sistemas distribuidos.

### Arquitectura de dos nodos

```
┌──────────────────────────────┐        HTTP/HTTPS         ┌───────────────────────────────┐
│  Cliente (Expo / React Native)│ ◄──────────────────────► │  Servidor API (Express / Node) │
│  Puerto 8081                  │     JSON + Cookies        │  Puerto 5000                   │
│  Dispositivo del usuario       │                          │  Render (producción)           │
└──────────────────────────────┘                           └──────────────┬────────────────┘
                                                                          │ SQL (TLS)
                                                                          ▼
                                                           ┌──────────────────────────────┐
                                                           │  PostgreSQL (Neon Cloud)       │
                                                           │  Base de datos remota          │
                                                           └──────────────────────────────┘
```

El sistema involucra **tres nodos físicamente separados**: el dispositivo del usuario (cliente), el servidor Express en Render, y la base de datos PostgreSQL en Neon. Cada nodo puede estar en una red o región geográfica distinta.

### Protocolos involucrados

| Protocolo | Capa | Uso en el sistema | Justificación |
|---|---|---|---|
| **HTTP/HTTPS** | Aplicación | Transporte de la API REST entre cliente y servidor | Estándar universal para APIs web; HTTPS garantiza confidencialidad e integridad en producción |
| **REST** | Arquitectónico | Diseño de los endpoints (`/api/mascotas`, `/api/auth`, etc.) | Sin estado (*stateless*): cada petición es independiente y auto-contenida, lo que permite escalar horizontalmente el servidor |
| **JSON** | Datos | Serialización de todos los cuerpos de petición y respuesta | Formato ligero, legible y soportado nativamente en JavaScript/TypeScript en ambos extremos |
| **HTTP Cookies** | Sesión | Transporte del token de sesión firmado entre cliente y servidor | Manejo automático por el navegador/Expo; el servidor valida el token contra PostgreSQL en cada petición protegida |
| **CORS** | Seguridad HTTP | Política de origen cruzado configurada dinámicamente en `server/middleware/cors.ts` | Permite al cliente Expo (diferente origen/puerto) consumir la API, restringiendo otros orígenes no autorizados |
| **TLS/SSL** | Transporte | Cifrado de la conexión entre el servidor Express y Neon PostgreSQL | Requerido por Neon (`sslmode=require`); evita interceptación de datos en tránsito |
| **bcrypt** | Seguridad | Hash de contraseñas (12 rondas) almacenado en PostgreSQL | Algoritmo de hashing adaptativo; el coste computacional crece con hardware, dificultando ataques de fuerza bruta |

### Justificación del modelo cliente-servidor

Se eligió el modelo **cliente-servidor** (no punto a punto) porque:

- El servidor centraliza la lógica de negocio, validación (Zod) y seguridad (Helmet, rate-limit), evitando duplicación en el cliente.
- La API REST construida desde cero (no se utiliza un servicio externo ya creado) permite controlar completamente el contrato de comunicación.
- El cliente Expo puede ejecutarse en múltiples dispositivos simultáneamente (iOS, Android, web) comunicándose con el mismo servidor, demostrando comunicación real entre dispositivos físicamente diferentes.
- La sesión se gestiona en el servidor (PostgreSQL), no en el cliente, lo que permite invalidación centralizada de sesiones (logout seguro).

### Concurrencia en el servidor

El servidor Express maneja peticiones de forma **concurrente** gracias al event loop de Node.js. Múltiples clientes pueden realizar peticiones simultáneas (registrar pesos, consultar alimentación, analizar IA) y el servidor las atiende de forma no bloqueante. Las operaciones de base de datos usan el pool de conexiones de `pg`, permitiendo hasta 10 conexiones paralelas configuradas en `server/db.ts`.

---

## Sistema de IA

### Arquitectura del módulo inteligente

El análisis de salud combina **cinco fuentes de datos** y **tres técnicas de procesamiento**:

**1. Regresión Lineal Simple (OLS) — `server/utils/ia.ts`**

Calcula la tendencia de peso usando mínimos cuadrados ordinarios:

```
m  = (N·Σ(xᵢ·yᵢ) − Σxᵢ·Σyᵢ) / (N·Σxᵢ² − (Σxᵢ)²)
b  = (Σyᵢ − m·Σxᵢ) / N
R² = 1 − SS_res / SS_tot
```

- `xᵢ` = días desde primera medición  
- `yᵢ` = peso en gramos  
- Salida: pendiente (g/día), predicción a 7 días, coeficiente R²  
- Complejidad: O(N), sin dependencias externas

**2. Árbol de decisión — `analizarAlimentacion()`**

Evalúa frecuencia de alimentación y días sin registro para generar alertas categorizadas (crítica, advertencia, normal).

**3. LLM externo — Groq API**

Modelo `llama-3.3-70b-versatile` (Meta Llama 3.3, 70B parámetros), temperatura 0.3, max_tokens 1200. Recibe un prompt enriquecido con todas las fuentes de datos para generar:

- Resumen de salud narrativo
- Lista de alertas priorizadas
- Puntuación de salud (0–100)

### Fuentes de datos del análisis

El pipeline de análisis (`POST /api/mascotas/:id/analizar`) recopila y cruza cinco fuentes de información antes de consultar al LLM:

| # | Fuente | Origen | Datos que aporta |
|---|---|---|---|
| 1 | **Perfil de la mascota** | Tabla `mascotas` | Especie, categoría, género, fecha de nacimiento, edad calculada (días/meses), etapa de vida (cría/juvenil/adulto/senior) |
| 2 | **Notas del dueño** | Campo `notas` de la mascota | Información libre como genética/morfo (GIANT, RAPTOR, SNOW, PIED, etc.), condiciones especiales o historial previo |
| 3 | **Historial de peso** | Tabla `registros_peso` | Peso actual, tendencia OLS (pendiente g/día, R²), predicción a 7 días |
| 4 | **Historial de alimentación** | Tabla `registros_alimentacion` | Registros últimos 7 y 30 días, días con alimento por semana, días sin registro |
| 5 | **Notas de salud** | Tabla `notas_salud` | Últimas 10 notas: visitas al veterinario, medicamentos, revisiones y observaciones (tipo, fecha, título, descripción) |
| 6 | **Parámetros de referencia** | Tabla `cuidados_especie` (caché IA por mascota) | Rango de peso saludable, peso crítico bajo/alto, frecuencia de alimentación recomendada, alimentos recomendados/a evitar, frecuencia de chequeo veterinario |

### Comparación contra parámetros de referencia

El análisis no solo describe el estado actual, sino que **compara los datos reales contra los parámetros de la especie**:

- Si el peso actual está fuera del rango saludable de la especie → alerta de peso
- Si la frecuencia de alimentación registrada no coincide con la recomendada → alerta de alimentación
- Si hay medicamentos activos o visitas veterinarias recientes → se consideran en la evaluación
- Si las notas del dueño mencionan un morfo genético (ej: gecko GIANT), el LLM ajusta los rangos de peso y cuidados al morfo específico

Los parámetros de referencia se obtienen de la tabla `cuidados_especie`, que se genera la primera vez que el usuario consulta la sección de cuidados. Cada mascota tiene su propia guía personalizada (indexada por `mascotaId`), lo que permite que morfos genéticos (GIANT, RAPTOR, SNOW, etc.) mencionados en las notas influyan en los rangos de peso y cuidados.

### Pipeline de análisis

```
Perfil mascota (especie, género, edad, notas/morfo)
                    ↓
Historial de pesos → OLS → pendiente + R² + predicción
                    ↓
Historial alimentación → Árbol decisión → estadísticas
                    ↓
Notas de salud → últimas 10 (veterinario, medicamentos, observaciones)
                    ↓
Parámetros de referencia → cuidados_especie (rango peso, dieta, chequeos)
                    ↓
       ¿Notas de salud más recientes que el caché de cuidados?
           Sí → Auto-regenerar cuidados con datos del veterinario
           No → Usar caché existente
                    ↓
           Prompt enriquecido → Groq LLM (Llama 3.3 70B) → JSON estructurado
                    ↓
           Guardar en tabla analisis_ia (historial clínico)
```

### Guía de cuidados por especie

El endpoint `GET /api/mascotas/:id/cuidados` genera una guía personalizada **única por mascota**, considerando especie, género, etapa de vida, notas del dueño (morfo/genética) y notas de salud (historial veterinario). El prompt incluye 10 reglas estrictas:

1. Precisión taxonómica — no inventa nombres científicos
2. Respeta el tipo de dieta real (insectívora, herbívora, omnívora, etc.)
3. Alimentos en español con proporciones/cantidades recomendadas
4. Rangos de peso apropiados para la edad y género
5. Si la especie es ambigua, marca baja confianza
6. Ajusta recomendaciones a la etapa de vida (cría, juvenil, adulto, senior)
7. Si las notas del dueño mencionan morfo genético (GIANT, RAPTOR, SNOW, PIED), ajusta rangos de peso y cuidados al morfo específico
8. Si las notas veterinarias incluyen rangos de peso proporcionados por un profesional, esos rangos tienen prioridad sobre los genéricos de la especie

### Caché inteligente

- **`analisis_ia`**: Cada análisis generado se guarda con fecha. El frontend lo carga instantáneamente sin llamar a Groq. Si tiene más de 7 días, muestra badge "Desactualizado".
- **`cuidados_especie`**: La guía de cuidados se genera una vez por mascota (indexada por `mascotaId`), personalizada según especie, género, edad, morfo/genética y notas veterinarias. Caché de 15 días. **Se invalida automáticamente** si hay notas de salud más recientes que la última generación (ej: el veterinario reporta un rango de peso diferente para el morfo). Soporta `?force=true` para regenerar manualmente. Se elimina automáticamente al borrar la mascota (`ON DELETE CASCADE`). El endpoint `POST /analizar` también auto-regenera los cuidados si detecta notas más recientes, garantizando que el análisis siempre use parámetros actualizados.

---

## Build para producción

Ver **[DEPLOY.md](DEPLOY.md)** para instrucciones detalladas de despliegue de base de datos, servidor y app móvil.
