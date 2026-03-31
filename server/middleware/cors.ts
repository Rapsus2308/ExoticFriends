/**
 * @fileoverview Middleware de CORS para ExoticFriends
 *
 * Acepta peticiones de tres fuentes:
 *   1. Dominios de Replit (desarrollo en Replit) — REPLIT_DEV_DOMAIN, REPLIT_DOMAINS
 *   2. Orígenes de producción personalizados   — ALLOWED_ORIGINS (CSV)
 *   3. localhost (desarrollo local / simulador) — siempre permitido
 *
 * Nota: Las apps nativas (iOS/Android) NO envían cabecera Origin,
 * por lo que CORS no las bloquea. Solo es relevante para la versión web.
 *
 * Para producción en tu servidor, establece:
 *   ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
 */

import type { Application, Request, Response, NextFunction } from "express";

/**
 * Construye el conjunto de orígenes permitidos a partir de variables de entorno.
 */
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Entorno Replit (desarrollo)
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(",").forEach((d) =>
      origins.add(`https://${d.trim()}`)
    );
  }

  // Producción: dominio(s) propios separados por coma
  // Ejemplo: ALLOWED_ORIGINS=https://exoticfriends.com,https://www.exoticfriends.com
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(",").forEach((o) =>
      origins.add(o.trim())
    );
  }

  return origins;
}

/**
 * Configura los encabezados CORS dinámicamente según el origen de la petición.
 *
 * @param app - Instancia de la aplicación Express
 */
export function setupCors(app: Application): void {
  const origins = buildAllowedOrigins();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.header("origin");
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}
