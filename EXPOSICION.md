# ExoticFriends — Guía de Exposición

> Documento de apoyo para la presentación del proyecto. Cubre arquitectura, tecnologías, IA y escenarios de uso con posibles preguntas y respuestas.

---

## 1. ¿Qué es ExoticFriends?

**ExoticFriends** es una aplicación móvil (y web) para dueños de mascotas exóticas: reptiles, aves, peces, mamíferos pequeños y artrópodos.

Los dueños de este tipo de animales no tienen herramientas digitales especializadas. Una app de perros o gatos no sirve para un gecko leopardo o una tarántula, porque los ciclos de alimentación, el seguimiento de peso en gramos y las alertas de salud son completamente distintos.

La app permite:
- Registrar varias mascotas con foto, especie y fecha de nacimiento
- Llevar historial de **peso** con gráfico de evolución
- Registrar **alimentación** diaria (qué comió, cuánto y observaciones)
- Anotar **notas de salud** (revisión, visita al veterinario, medicamento)
- Consultar un **Asistente IA** que analiza el estado del animal
- Ver toda la **actividad** del perfil de un vistazo

---

## 2. Distribución del sistema (Arquitectura)

El proyecto está dividido en **tres capas** bien separadas:

```
┌────────────────────────────────────────────┐
│           DISPOSITIVO DEL USUARIO          │
│  App móvil (iOS / Android) o navegador web │
│  ─────────────────────────────────────────│
│  React Native + Expo (cliente/app/)        │
└──────────────┬─────────────────────────────┘
               │  HTTPS / REST API
               │  JSON en cada petición
               ▼
┌────────────────────────────────────────────┐
│           SERVIDOR (Render.com)            │
│  Node.js + Express (server/)               │
│  Puerto 5000 — Express 5 + TypeScript      │
│  ─────────────────────────────────────────│
│  — Autenticación con sesiones              │
│  — Seguridad: CORS, Helmet, Rate Limiting  │
│  — Lógica de IA: regresión + árbol + Groq  │
└──────────────┬─────────────────────────────┘
               │  SQL / TLS
               ▼
┌────────────────────────────────────────────┐
│         BASE DE DATOS (Neon.tech)          │
│  PostgreSQL serverless                     │
│  — 7 tablas (mascotas, pesos, salud…)      │
│  — Sesiones almacenadas en BD              │
└────────────────────────────────────────────┘
               │
               ▼  (solo para IA)
┌────────────────────────────────────────────┐
│          SERVICIO COGNITIVO (Groq)         │
│  Modelo: Llama 3.3 70B (Meta, open-source) │
│  Especializado en veterinaria exótica      │
└────────────────────────────────────────────┘
```

**¿Por qué esta arquitectura?**
- El **frontend** es solo pantallas y llamadas HTTP. No tiene lógica de negocio.
- El **backend** centraliza todo: seguridad, base de datos, IA. Así si hay un bug en la lógica, se corrige en un solo lugar.
- La **base de datos en la nube** (Neon) se conecta al servidor con SSL. El cliente nunca toca la base de datos directamente.

---

## 3. Tecnologías y por qué se eligieron

### Frontend

| Tecnología | Para qué sirve | Por qué esta y no otra |
|---|---|---|
| **React Native + Expo SDK 54** | Construir la app móvil y web desde un solo código | Con un solo proyecto se genera iOS, Android y Web. Expo simplifica todo el tooling |
| **Expo Router v6** | Navegación entre pantallas | Basado en archivos, igual que Next.js. Cada archivo en `app/` es una pantalla |
| **TanStack React Query v5** | Manejo de datos del servidor (caché, recargas) | Evita escribir `useEffect` para cada petición. Sincroniza automáticamente los datos |
| **react-native-keyboard-controller** | Que el teclado no tape los formularios | Librería de bajo nivel más precisa que el `KeyboardAvoidingView` nativo |

### Backend

| Tecnología | Para qué sirve | Por qué esta y no otra |
|---|---|---|
| **Express 5 + TypeScript** | Servidor HTTP y API REST | Estándar del ecosistema Node.js. TypeScript añade tipos para evitar errores |
| **Drizzle ORM** | Hablar con la base de datos sin escribir SQL raw | Type-safe: si cambias el esquema, TypeScript avisa dónde se rompe |
| **PostgreSQL en Neon** | Base de datos relacional en la nube | Neon es serverless (escala a cero), gratis para proyectos pequeños, latencia baja |
| **express-session + connect-pg-simple** | Mantener al usuario logeado | Las sesiones se guardan en la misma base de datos, no se pierden si el servidor reinicia |
| **bcryptjs** | Cifrar contraseñas | Hashing con salt. Nunca se guarda la contraseña en texto plano |

### IA

| Tecnología | Para qué sirve | Por qué esta y no otra |
|---|---|---|
| **Groq API** | Enviar preguntas a un modelo de lenguaje | La respuesta de Groq es 10-20x más rápida que OpenAI gracias a su hardware LPU |
| **Llama 3.3 70B** | El modelo que responde | Es open-source (Meta), 70 mil millones de parámetros, muy bueno en seguir instrucciones JSON |
| **OLS (Regresión Lineal)** | Detectar tendencia de peso | Algoritmo con fórmula directa, 0 dependencias, resultado interpretable en gramos/día |
| **Árbol de decisión (reglas)** | Analizar frecuencia de alimentación | Reglas simples de dominio veterinario, no se necesita entrenar ningún modelo |

---

## 4. Base de datos — Las 7 tablas

```
perfiles ──┬──< mascotas ──┬──< registros_peso
           │               ├──< registros_alimentacion
           │               ├──< notas_salud
           │               ├──< analisis_ia
           │               └──< cuidados_especie
session (tabla interna de sesiones de Express)
```

| Tabla | Qué guarda |
|---|---|
| `perfiles` | Email, nombre, contraseña (bcrypt), foto |
| `mascotas` | Nombre, especie, categoría, género, fecha de nacimiento |
| `registros_peso` | Peso (g o kg), fecha |
| `registros_alimentacion` | Alimento, cantidad, notas, fecha |
| `notas_salud` | Título, descripción, tipo (revisión / vet / medicamento / observación), fecha |
| `analisis_ia` | Resultado completo del último análisis IA (JSON), caché 7 días |
| `cuidados_especie` | Guía de cuidados generada por Groq (JSON), caché 15 días |

**Relaciones importantes:**
- Cada mascota pertenece a un perfil → si borras tu cuenta, se borran tus mascotas en cascada
- Cada registro de peso/alimentación/salud pertenece a una mascota → si borras la mascota, se borra todo su historial
- Esto se llama **DELETE CASCADE** y lo configura Drizzle automáticamente

---

## 5. API REST — Comunicación cliente-servidor

Toda la comunicación es HTTP con JSON. Ejemplo del flujo de registrar peso:

```
App (cliente)                           Servidor
    │                                       │
    │── POST /api/mascotas/123/pesos ──────>│
    │   Body: { peso: 250, unidad: "g" }    │
    │                                       │── requireAuth (¿hay sesión activa?)
    │                                       │── Insertar en registros_peso
    │                                       │── Invalidar caché de análisis IA
    │<── 201 Created { id, peso, fecha } ───│
```

**Endpoints principales:**

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/login` | Inicia sesión |
| POST | `/api/auth/register` | Crea cuenta |
| GET | `/api/mascotas` | Lista tus mascotas |
| POST | `/api/mascotas` | Crea mascota |
| GET | `/api/mascotas/:id/pesos` | Historial de peso |
| POST | `/api/mascotas/:id/pesos` | Registrar peso |
| POST | `/api/mascotas/:id/analizar` | Genera análisis IA |
| GET | `/api/mascotas/:id/cuidados` | Guía de cuidados |
| GET | `/api/actividad` | Toda la actividad del perfil |

---

## 6. Seguridad

Hay cuatro capas de seguridad en el servidor:

### 6.1 Autenticación — `requireAuth`
Cada ruta privada pasa por un middleware que revisa si existe sesión activa. Si no hay sesión → responde 401 Unauthorized. El cliente detecta ese 401 y redirige al login.

### 6.2 Contraseñas — `bcryptjs`
Las contraseñas nunca se almacenan en texto plano. Se aplica un hash con **salt** (valor aleatorio único por usuario). Aunque alguien robe la base de datos, no puede recuperar las contraseñas.

### 6.3 Rate Limiting — Protección contra ataques
- **API general**: máximo 200 peticiones por IP cada 15 minutos → protege contra scraping
- **Login/Registro**: máximo 20 intentos fallidos por IP cada 15 minutos → protege contra ataques de fuerza bruta (adivinación de contraseñas)

### 6.4 Cabeceras HTTP — `Helmet`
Helmet agrega automáticamente cabeceras de seguridad en cada respuesta:
- Impide que el navegador cargue recursos de otros dominios sin permiso
- Previene ataques de tipo clickjacking (incrustar la app en un iframe malicioso)

### 6.5 CORS
El servidor solo acepta peticiones desde orígenes conocidos (el dominio de producción y localhost en desarrollo). Las apps nativas iOS/Android no envían cabecera `Origin`, por lo que CORS no las bloquea — solo aplica para la versión web.

---

## 7. El Sistema de IA — El componente más importante

El Asistente IA es un **pipeline de 3 pasos** que se ejecuta cuando el usuario presiona "Analizar":

```
Historial de la mascota
        │
        ▼
┌─────────────────────────────────┐
│  PASO 1 — Regresión Lineal OLS  │  (matemático)
│  Calcula tendencia de peso      │
│  Resultado: pendiente, R², pred.│
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  PASO 2 — Árbol de Decisión     │  (lógica de reglas)
│  Evalúa frecuencia alimentación │
│  ¿Cuántos días sin comer?       │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│  PASO 3 — Groq (Llama 3.3 70B)                     │  (IA generativa)
│  Recibe: resultados de pasos 1 y 2 + datos completos│
│  de la mascota (especie, edad, notas, morfología)   │
│  Devuelve JSON con: alertas, puntuación, cuidados   │
└─────────────────────────────────────────────────────┘
                │
                ▼
        Guardado en BD (caché 7 días)
```

### 7.1 Regresión Lineal Simple (OLS)

**¿Qué hace?** Dibuja la línea recta que mejor se ajusta al historial de pesos del animal.

**Fórmula:**
```
y = m·x + b

donde:
  x = días desde la primera medición
  y = peso en gramos
  m = pendiente (cuántos gramos sube o baja por día)
  b = intercepto (peso estimado al inicio)
```

**¿Qué nos dice?**
- Si `m > 0.5 g/día` → tendencia en **alza** (engordando)
- Si `m < -0.5 g/día` → tendencia en **baja** (adelgazando) ⚠️
- Si está entre -0.5 y 0.5 → **estable**
- También calcula `R²`: qué tan "limpia" es la tendencia. R²=1 es perfecta, R²=0 es ruido puro
- Predice el peso en **7 días** siguientes

**¿Por qué OLS y no otra cosa?** Porque con 5-15 registros (historial típico), una red neuronal o gradient boosting sería overkill. OLS es exacto, O(N) de complejidad y su resultado es directamente interpretable ("tu gecko pierde 0.3 g/día").

### 7.2 Árbol de Decisión (Sistema Experto)

Analiza el historial de alimentación con reglas de dominio veterinario:

```
¿Cuántos días sin alimentar?
├── 0-1 días → Normal ✓
├── 2-3 días → Revisar (muchas especies ayunan, pero hay que observar)
└── 4+ días → Alerta ⚠️

¿Cuántas veces comió en los últimos 7 días?
├── >= 5 veces → Consistente ✓
├── 2-4 veces  → Irregular, depende de la especie
└── 0-1 vez    → Posible inapetencia ⚠️
```

Estos resultados **no los muestra directamente** al usuario; los pasa al siguiente paso como contexto para Groq.

### 7.3 Groq / Llama 3.3 70B

El modelo recibe un prompt que incluye:
- Especie, categoría, género, edad calculada (cría / juvenil / adulto / senior)
- Notas del dueño (aquí viene info como "morfo RAPTOR", "GIANT bloodline", etc.)
- Resultados de la regresión (pendiente, R², predicción)
- Resultados del árbol (días sin comer, registros últimos 7 días)
- Los últimos 5 pesos y las últimas 5 alimentaciones

El modelo responde **siempre en JSON** con:
```json
{
  "puntuacion": 85,
  "alertas": ["Adelgazamiento gradual detectado", "Revisar suministro de UVB"],
  "recomendaciones": ["Aumentar frecuencia de alimentación", "..."],
  "resumen": "Tu gecko está en buen estado general, pero..."
}
```

### 7.4 Caché de análisis e inteligencia de invalidación

- El análisis se guarda en la tabla `analisis_ia` con timestamp
- Si tienes análisis de hace **menos de 7 días**, se devuelve el guardado (no llama a Groq)
- Si registras un nuevo peso o alimentación después del último análisis, **el caché se invalida** y la próxima consulta genera uno nuevo
- Los **cuidados por especie** tienen caché de 15 días (cambian menos)

---

## 8. Escenarios de uso completos

### Escenario A — Usuario nuevo
1. Abre la app → pantalla de login
2. Presiona "Crear cuenta" → llena nombre, usuario, contraseña
3. El servidor hashea la contraseña con bcryptjs → guarda en `perfiles`
4. Sesión creada → redirige a pantalla de inicio
5. Ve una pantalla vacía con un botón "+" → agrega su primera mascota
6. Llena nombre, especie ("gecko leopardo"), categoría (reptil), fecha de nacimiento y foto
7. La foto se convierte a Base64 y se guarda directamente en la base de datos

### Escenario B — Registro de peso
1. Usuario entra al detalle de su mascota
2. Presiona "Peso" en acciones rápidas → abre modal
3. Escribe "245" gramos → guarda
4. El gráfico de evolución se actualiza en tiempo real (React Query invalida su caché)
5. Si hay 2+ registros, el gráfico muestra la línea de regresión

### Escenario C — Consultar el Asistente IA
1. Usuario abre la pestaña IA en el detalle de la mascota
2. Ve el último análisis guardado o un botón "Nuevo análisis"
3. Presiona analizar → el servidor corre el pipeline de 3 pasos
4. Se muestra: puntuación de salud, alertas, recomendaciones y resumen
5. El usuario también puede ver la pestaña "Cuidados" con la guía personalizada de su especie

### Escenario D — Usuario con varias mascotas
1. El usuario tiene un gecko, una tarántula y un pez betta
2. En la pantalla "Mascotas" puede buscar por nombre o filtrar por categoría
3. En "Actividad" ve todos los registros de todos sus animales en orden cronológico
4. Cada animal tiene su propio análisis IA con contexto específico de su especie

### Escenario E — Seguridad: intento de acceso no autorizado
1. Alguien intenta acceder a `GET /api/mascotas` sin sesión
2. El middleware `requireAuth` detecta que no hay sesión → devuelve 401
3. La app en el cliente detecta el 401 → redirige al login
4. Si alguien hace 21 intentos fallidos de login → rate limiter bloquea esa IP por 15 minutos

---

## 9. Despliegue (cómo la app llega al usuario final)

### Servidor — Render.com
- El servidor Express se despliega en Render como un **Web Service**
- Render detecta el repositorio de GitHub y hace deploy automático en cada push
- Variables de entorno configuradas en el dashboard de Render (DATABASE_URL, SESSION_SECRET, GROQ_API_KEY)
- URL pública: `https://exoticfriends.onrender.com`

### Base de datos — Neon.tech
- PostgreSQL serverless: escala a cero cuando no hay actividad
- Conectada al servidor vía `DATABASE_URL` con TLS/SSL obligatorio
- Las tablas se crean con `npm run db:push` (Drizzle sincroniza el esquema)

### App móvil — EAS Build (Expo Application Services)
- `eas build` compila la app en servidores de Expo y genera:
  - `.apk` / `.aab` para Android
  - `.ipa` para iOS
- La configuración está en `eas.json` con perfiles de `development`, `preview` y `production`
- Las apps nativas apuntan a `https://exoticfriends.onrender.com` como backend

### App web — Estática desde el servidor Express
- El frontend Expo también exporta una versión web estática
- El servidor Express sirve esos archivos directamente desde la misma URL
- Así el servidor y el web app comparten dominio → sin problemas de CORS

---

## 10. Preguntas frecuentes y respuestas

### Sobre la arquitectura

**¿Por qué no usar Firebase o Supabase en vez de hacer tu propio backend?**
> Firebase y Supabase son excelentes pero son soluciones "todo en uno" que limitan el control. Aquí el backend es nuestro: podemos agregar cualquier lógica, integrar la IA de la manera que queremos, y tenemos control total sobre la seguridad. Además, la integración con Groq requería un backend propio para no exponer la API key en el cliente.

**¿Por qué TypeScript en ambos lados (front y back)?**
> Porque el esquema de la base de datos (`shared/schema.ts`) se comparte entre cliente y servidor. Con TypeScript, si cambias un campo en la base de datos, el compilador te avisa en todos los archivos que usan ese campo. Sin TypeScript tendrías bugs en producción que son difíciles de rastrear.

**¿Qué pasa si el servidor de Render se cae?**
> Render tiene reinicio automático. Las sesiones están en PostgreSQL (no en memoria del servidor), así que cuando el servidor vuelve, los usuarios siguen logeados.

### Sobre la base de datos

**¿Por qué guardar fotos en Base64 en la base de datos y no en un servicio de archivos (S3)?**
> Para este proyecto fue la decisión más simple. Base64 aumenta el tamaño de la imagen ~33%, pero evita configurar un bucket S3, manejar URLs y permisos. Para una app de producción con miles de usuarios, se migraría a S3 o Cloudinary.

**¿Qué es Drizzle ORM y por qué no Prisma?**
> Ambos hacen lo mismo (hablar con la BD con tipos TypeScript). Elegimos Drizzle porque es más ligero, más rápido en runtime y su API es más cercana al SQL real. Prisma tiene más magia, lo que puede dificultar el debugging.

### Sobre la IA

**¿La IA siempre llama a Groq o hay algún límite?**
> Hay caché de 7 días. Si el análisis tiene menos de 7 días y no hubo nuevos registros desde entonces, se devuelve el guardado. Esto reduce costos y tiempo de respuesta. Solo se llama a Groq cuando realmente hay datos nuevos que analizar.

**¿Por qué Groq y no OpenAI?**
> Groq usa hardware especializado (LPU — Language Processing Unit) que hace inferencia 10-20x más rápida que GPU estándar. Para una app móvil donde el usuario espera resultado, la velocidad de respuesta importa. Además Llama 3.3 70B es completamente open-source.

**¿Qué tan preciso es el análisis de IA?**
> El análisis combina matemáticas exactas (OLS no "adivina", calcula la recta óptima) con el conocimiento veterinario del LLM. El LLM puede cometer errores, por eso el sistema siempre aclara que no reemplaza al veterinario. La puntuación es una guía orientativa, no un diagnóstico clínico.

**¿Qué es R² y cómo interpretarlo?**
> R² (R cuadrado) mide qué tan bien se ajusta la línea de regresión a los datos reales. Va de 0 a 1. R²=1 significa que todos los pesos caen perfectamente sobre la línea (tendencia muy clara). R²=0.2 significa que los pesos fluctúan mucho y la tendencia no es clara. Con pocos registros es normal tener R² bajo.

**¿Qué pasa si la mascota no tiene historial de peso?**
> La regresión devuelve `null` (necesita mínimo 2 puntos para calcular una recta). Groq ajusta su respuesta según los datos disponibles. La puntuación de salud se basa entonces principalmente en las notas de salud y la alimentación.

### Sobre la app móvil

**¿Cómo funciona con un solo código para iOS, Android y Web?**
> React Native compila los componentes a elementos nativos de cada plataforma. En iOS, un `<View>` se convierte en `UIView`. En Android, en `android.view.View`. En Web, en un `<div>`. Expo maneja toda esa capa de compilación. Expo Router añade la navegación basada en archivos igual que Next.js.

**¿Cómo se maneja la sesión en la app móvil si no hay "cookies" en apps nativas?**
> Las apps nativas sí soportan cookies HTTP. `expo/fetch` (wrapper de la fetch API de Expo) envía automáticamente las cookies al servidor con `credentials: "include"`. El servidor de Express maneja esa cookie de sesión igual que lo haría con un navegador.

**¿Por qué la orientación está bloqueada solo a vertical (portrait)?**
> Los formularios y gráficos están diseñados para pantalla vertical. En horizontal, los modales del teclado y los gráficos de peso requeriría rediseño completo del layout. Para una v2 se podría añadir soporte landscape.

### Sobre seguridad

**¿Qué es bcrypt y por qué es mejor que MD5 o SHA-256 para contraseñas?**
> MD5 y SHA-256 son rápidos — un atacante puede probar millones de contraseñas por segundo. bcrypt es intencionalmente lento y tiene un "costo" configurable que puede incrementarse con el tiempo. Además añade un salt único por usuario, así dos usuarios con la misma contraseña tienen hashes diferentes.

**¿Pueden ver las mascotas de otro usuario?**
> No. Cada endpoint privado verifica la sesión y luego verifica que la mascota pertenece al perfil autenticado. Si el usuario A intenta acceder a `/api/mascotas/ID_del_usuarioB`, el servidor responde 403 Forbidden.

---

## 11. Datos curiosos para cerrar la presentación

- El modelo Llama 3.3 70B tiene **70 mil millones de parámetros** — para referencia, el cerebro humano tiene ~86 mil millones de neuronas
- La regresión lineal OLS fue inventada por Gauss y Legendre a principios del siglo XIX y sigue siendo uno de los algoritmos más usados en ciencia de datos
- Con `DELETE CASCADE`, borrar una cuenta borra en cadena: perfil → mascotas → pesos + alimentaciones + salud + análisis IA. Todo limpio en 1 operación SQL
- Los análisis IA y las guías de cuidados tienen caché independiente porque la biología de una especie cambia menos que el estado de salud del animal individual
- El servidor sirve tanto la API REST como el frontend web desde el mismo proceso Node.js. Un solo servicio en Render, un solo costo
