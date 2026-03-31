/**
 * @fileoverview Ensamblador de rutas — ExoticFriends
 *
 * Monta todos los routers modulares en la aplicación Express bajo
 * el prefijo /api. Cada archivo de rutas agrupa un recurso del dominio:
 *
 * /api/auth/*                 — Autenticación (registro, login, sesión)
 * /api/mascotas/*             — CRUD de mascotas
 * /api/mascotas/:id/pesos     — Registros de peso
 * /api/mascotas/:id/alimentacion — Registros de alimentación
 * /api/mascotas/:id/salud     — Notas de salud
 * /api/mascotas/:id/analisis  — Análisis IA (carga / genera / historial)
 * /api/mascotas/:id/cuidados  — Guía de cuidados (caché por especie)
 * /api/todos-pesos, /api/toda-alimentacion, /api/toda-salud — Vista global
 * /api/pesos/:id, /api/alimentacion/:id, /api/salud/:id — Eliminación
 */

import type { Application } from "express";
import authRouter from "./auth.routes";
import mascotasRouter from "./mascotas.routes";
import pesosRouter from "./pesos.routes";
import alimentacionRouter from "./alimentacion.routes";
import saludRouter from "./salud.routes";
import iaRouter from "./ia.routes";
import actividadRouter from "./actividad.routes";

/**
 * Registra todos los routers en la aplicación Express.
 *
 * @param app - Instancia de la aplicación Express
 */
export function registerRoutes(app: Application): void {
  // Autenticación
  app.use("/api/auth", authRouter);

  // Recursos de mascota con sub-rutas anidadas
  app.use("/api/mascotas", mascotasRouter);
  app.use("/api/mascotas/:mascotaId/pesos", pesosRouter);
  app.use("/api/mascotas/:mascotaId/alimentacion", alimentacionRouter);
  app.use("/api/mascotas/:mascotaId/salud", saludRouter);
  app.use("/api/mascotas/:mascotaId", iaRouter);

  // Vista global de actividad + eliminaciones individuales
  app.use("/api", actividadRouter);
}
