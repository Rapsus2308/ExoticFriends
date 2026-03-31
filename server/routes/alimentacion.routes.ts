/**
 * @fileoverview Rutas de registros de alimentación — ExoticFriends
 *
 * CRUD de registros de alimentación por mascota. Los datos de frecuencia
 * de alimentación son procesados por el árbol de decisión del Módulo 2.
 * Los endpoints de escritura validan el cuerpo con Zod.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { crearAlimentacionSchema } from "@shared/schema";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

const router = Router({ mergeParams: true });

/** GET /api/mascotas/:mascotaId/alimentacion — Lista registros de alimentación */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const mascota = await storage.obtenerMascotaPorId(
    req.params.mascotaId,
    req.session.perfilId!
  );
  if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });
  const registros = await storage.obtenerAlimentacionPorMascota(req.params.mascotaId);
  return res.json(registros);
});

/** POST /api/mascotas/:mascotaId/alimentacion — Agrega un registro de alimentación */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascota = await storage.obtenerMascotaPorId(
      req.params.mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    const datos = crearAlimentacionSchema.parse(req.body);
    const registro = await storage.agregarAlimentacion({
      mascotaId: req.params.mascotaId,
      alimento: datos.alimento,
      cantidad: datos.cantidad,
      fecha: datos.fecha,
      notas: datos.notas || null,
    });
    return res.status(201).json(registro);
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error guardando alimentación:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
