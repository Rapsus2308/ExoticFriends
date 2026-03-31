/**
 * @fileoverview Middlewares de rate limiting — ExoticFriends
 *
 * Define dos limitadores:
 *   - limitadorApi   → 200 req / 15 min por IP (aplicado a toda la API)
 *   - limitadorAuth  → 20 intentos / 15 min por IP (login y registro),
 *                      solo cuenta peticiones fallidas
 */

import rateLimit from "express-rate-limit";

/**
 * Límite general de la API: 200 peticiones por IP en 15 minutos.
 * Protege contra scraping y uso abusivo de los endpoints.
 */
export const limitadorApi = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiadas peticiones, intenta de nuevo en 15 minutos" },
});

/**
 * Límite estricto para autenticación: 20 intentos fallidos por IP en 15 min.
 * skipSuccessfulRequests: true evita penalizar a usuarios con sesiones activas
 * que hacen consultas frecuentes al perfil.
 */
export const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos de autenticación, intenta más tarde" },
  skipSuccessfulRequests: true,
});
