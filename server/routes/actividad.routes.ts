/**
 * @fileoverview Rutas de actividad global del perfil — ExoticFriends
 *
 * Endpoints para obtener registros de todas las mascotas del usuario,
 * utilizados en la pantalla "Actividad" para una vista consolidada.
 *
 * También expone los endpoints de eliminación individuales que se
 * montan fuera del prefijo /mascotas/:id.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

function normalizarRegistroId(params: Request["params"]): string | null {
  const raw = params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

/** GET /api/todos-pesos — Todos los pesos del perfil agrupados */
router.get("/todos-pesos", requireAuth, async (req: Request, res: Response) => {
  const pesos = await storage.obtenerTodosPesosPerfil(req.session.perfilId!);
  return res.json(pesos);
});

/** GET /api/toda-alimentacion — Todos los registros de alimentación del perfil */
router.get("/toda-alimentacion", requireAuth, async (req: Request, res: Response) => {
  const alimentacion = await storage.obtenerTodaAlimentacionPerfil(req.session.perfilId!);
  return res.json(alimentacion);
});

/** GET /api/toda-salud — Todas las notas de salud del perfil */
router.get("/toda-salud", requireAuth, async (req: Request, res: Response) => {
  const salud = await storage.obtenerTodaSaludPerfil(req.session.perfilId!);
  return res.json(salud);
});

/** DELETE /api/pesos/:id — Elimina un registro de peso */
router.delete("/pesos/:id", requireAuth, async (req: Request, res: Response) => {
  const id = normalizarRegistroId(req.params);
  if (!id) return res.status(400).json({ message: "id inválido" });
  await storage.eliminarPeso(id);
  return res.json({ message: "Registro eliminado" });
});

/** DELETE /api/alimentacion/:id — Elimina un registro de alimentación */
router.delete("/alimentacion/:id", requireAuth, async (req: Request, res: Response) => {
  const id = normalizarRegistroId(req.params);
  if (!id) return res.status(400).json({ message: "id inválido" });
  await storage.eliminarAlimentacionDb(id);
  return res.json({ message: "Registro eliminado" });
});

/** DELETE /api/salud/:id — Elimina una nota de salud */
router.delete("/salud/:id", requireAuth, async (req: Request, res: Response) => {
  const id = normalizarRegistroId(req.params);
  if (!id) return res.status(400).json({ message: "id inválido" });
  await storage.eliminarSaludDb(id);
  return res.json({ message: "Registro eliminado" });
});

export default router;
