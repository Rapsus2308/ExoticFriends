/**
 * @fileoverview Factory de la aplicación Express — ExoticFriends
 *
 * Crea y configura la instancia de Express aplicando todos los
 * middlewares y registrando los routers. Separado del punto de
 * entrada (index.ts) para facilitar pruebas unitarias.
 *
 * Orden de middleware (importante):
 *   1. Helmet     — cabeceras HTTP de seguridad (CSP, X-Frame-Options, etc.)
 *   2. CORS       — debe ir antes del rate limiter para manejar preflight OPTIONS
 *   3. Rate limit — límite de peticiones por IP
 *   4. Body parsing — JSON + URL-encoded
 *   5. Sesiones   — requiere que el body ya esté parseado
 *   6. Logging    — registra todas las peticiones /api
 *   7. Expo + landing page — sirve archivos estáticos
 *   8. Rutas API  — lógica de negocio
 *   9. Error handler — captura cualquier error no manejado
 */

import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { setupCors } from "./middleware/cors";
import { setupRequestLogging } from "./middleware/logging";
import { setupExpoAndLanding } from "./middleware/expo";
import { crearMiddlewareSesion } from "./config/sesion";
import { registerRoutes } from "./routes/index";
import { limitadorApi } from "./middleware/rateLimiting";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    perfilId: string;
  }
}

/**
 * Crea y configura la aplicación Express con todos los middlewares y rutas.
 *
 * @returns Instancia de Express lista para iniciar el servidor
 */
export function crearApp(): express.Application {
  const app = express();

  // Confiar en el primer proxy inverso (Nginx, Render, etc.).
  // Necesario para que req.protocol sea "https" y las cookies seguras funcionen.
  app.set("trust proxy", 1);

  // 1. Helmet — añade cabeceras HTTP de seguridad recomendadas por OWASP.
  //    contentSecurityPolicy: false para no bloquear assets de Expo en dev.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS — debe ir antes del rate limiter para responder preflight OPTIONS
  setupCors(app);

  // 3. Rate limiting — aplicado solo a rutas /api para no afectar assets estáticos
  app.use("/api", limitadorApi);

  // 4. Body parsing (límite 10 MB para fotos base64)
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: false }));

  // 5. Sesiones con almacén PostgreSQL
  app.use(crearMiddlewareSesion());

  // 6. Logging de peticiones
  setupRequestLogging(app);

  // 7. Archivos estáticos de Expo + landing page
  setupExpoAndLanding(app);

  // 8. Rutas API
  registerRoutes(app);

  // 9. Manejador global de errores
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as { status?: number; statusCode?: number; message?: string };
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) return next(err);
    res.status(status).json({ message });
  });

  return app;
}
