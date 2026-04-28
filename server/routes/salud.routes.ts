/**
 * @fileoverview Rutas de notas de salud — ExoticFriends
 *
 * CRUD de notas clínicas por mascota: revisiones, visitas al veterinario,
 * medicamentos y observaciones generales. Los endpoints de escritura
 * validan el cuerpo con Zod.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { crearSaludSchema } from "@shared/schema";
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

/** GET /api/mascotas/:mascotaId/salud — Lista notas de salud */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const mascotaId = normalizarMascotaId(req.params);
  if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

  const mascota = await storage.obtenerMascotaPorId(
    mascotaId,
    req.session.perfilId!
  );
  if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });
  const notas = await storage.obtenerSaludPorMascota(mascotaId);
  return res.json(notas);
});

/** POST /api/mascotas/:mascotaId/salud — Agrega una nota de salud */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascotaId = normalizarMascotaId(req.params);
    if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

    const mascota = await storage.obtenerMascotaPorId(
      mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    const datos = crearSaludSchema.parse(req.body);
    const nota = await storage.agregarSalud({
      mascotaId,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      tipo: datos.tipo,
      fecha: datos.fecha,
    });
    return res.status(201).json(nota);
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error guardando nota de salud:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
