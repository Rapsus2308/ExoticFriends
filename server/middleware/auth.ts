/**
 * @fileoverview Middleware de autenticación — ExoticFriends
 *
 * Protege los endpoints privados verificando que la sesión
 * activa tenga un `perfilId` válido.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware que bloquea peticiones sin sesión activa.
 * Se aplica a todos los endpoints que requieren autenticación.
 *
 * @param req  - Objeto de petición con datos de sesión
 * @param res  - Objeto de respuesta
 * @param next - Función para continuar al siguiente middleware/handler
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session.perfilId) {
    res.status(401).json({ message: "No autenticado" });
    return;
  }
  next();
}
