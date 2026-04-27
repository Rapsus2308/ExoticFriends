/**
 * @fileoverview Configuración de sesiones — ExoticFriends
 *
 * Usa `connect-pg-simple` para almacenar las sesiones en PostgreSQL,
 * garantizando persistencia entre reinicios del servidor.
 * La cookie de sesión dura 30 días y se configura como `httpOnly`
 * para prevenir acceso desde JavaScript del cliente.
 */

import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";

/**
 * Devuelve el middleware de sesión configurado con almacén PostgreSQL.
 *
 * @returns Middleware de express-session listo para usar con `app.use()`
 */
export function crearMiddlewareSesion() {
  const PgStore = connectPgSimple(session);

  return session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "exoticfriends-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // En producción (NODE_ENV=production) el backend corre detrás de Nginx/HTTPS.
      // Express confía en el proxy (trust proxy: 1) y activa cookies seguras.
      // En desarrollo se deja false porque no hay TLS en localhost.
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      // "none" permite cookies en peticiones cross-site (app nativa → API distinta).
      // "lax" es suficiente en desarrollo donde front y back comparten dominio.
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  });
}
