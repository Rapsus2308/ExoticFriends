/**
 * @fileoverview Middleware de registro de peticiones HTTP — ExoticFriends
 *
 * Registra en consola cada petición a /api con método, ruta,
 * código de estado, duración y (si cabe) un resumen del cuerpo
 * de la respuesta JSON.
 */

import type { Application, Request, Response, NextFunction } from "express";

/**
 * Agrega logging de peticiones a todos los endpoints /api.
 * El log se limita a 80 caracteres para facilitar la lectura.
 *
 * @param app - Instancia de la aplicación Express
 */
export function setupRequestLogging(app: Application): void {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    });

    next();
  });
}
