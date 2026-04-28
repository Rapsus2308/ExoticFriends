/**
 * @fileoverview Rutas de registros de peso — ExoticFriends
 *
 * CRUD de mediciones de peso por mascota. El historial de pesos
 * es la fuente de datos para la Regresión Lineal del Módulo 2.
 * Los endpoints de escritura validan el cuerpo con Zod.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { crearPesoSchema } from "@shared/schema";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

const router = Router({ mergeParams: true });

function normalizarMascotaId(params: Request["params"]): string | null {
  const raw = params.mascotaId;
  const mascotaId = Array.isArray(raw) ? raw[0] : raw;
  return typeof mascotaId === "string" && mascotaId.trim().length > 0
    ? mascotaId
    : null;
}

/** GET /api/mascotas/:mascotaId/pesos — Lista pesos de una mascota */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const mascotaId = normalizarMascotaId(req.params);
  if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

  const mascota = await storage.obtenerMascotaPorId(
    mascotaId,
    req.session.perfilId!
  );
  if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });
  const pesos = await storage.obtenerPesosPorMascota(mascotaId);
  return res.json(pesos);
});

/** POST /api/mascotas/:mascotaId/pesos — Agrega un registro de peso */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascotaId = normalizarMascotaId(req.params);
    if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

    const mascota = await storage.obtenerMascotaPorId(
      mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    const datos = crearPesoSchema.parse(req.body);
    const registro = await storage.agregarPeso({
      mascotaId,
      peso: datos.peso,
      unidad: datos.unidad,
      fecha: datos.fecha,
    });
    return res.status(201).json(registro);
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error guardando peso:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
