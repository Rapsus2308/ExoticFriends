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

/** GET /api/mascotas/:mascotaId/pesos — Lista pesos de una mascota */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const mascota = await storage.obtenerMascotaPorId(
    req.params.mascotaId,
    req.session.perfilId!
  );
  if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });
  const pesos = await storage.obtenerPesosPorMascota(req.params.mascotaId);
  return res.json(pesos);
});

/** POST /api/mascotas/:mascotaId/pesos — Agrega un registro de peso */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascota = await storage.obtenerMascotaPorId(
      req.params.mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    const datos = crearPesoSchema.parse(req.body);
    const registro = await storage.agregarPeso({
      mascotaId: req.params.mascotaId,
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
