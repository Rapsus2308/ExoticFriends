/**
 * @fileoverview Rutas CRUD de mascotas — ExoticFriends
 *
 * Permite listar, crear, actualizar y eliminar mascotas del perfil
 * autenticado. Las fotos se almacenan en formato base64 en PostgreSQL.
 * Todos los endpoints de escritura validan el cuerpo con Zod.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { crearMascotaSchema } from "@shared/schema";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";

const router = Router();

/** GET /api/mascotas — Lista todas las mascotas del perfil */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const mascotas = await storage.obtenerMascotasPorPerfil(req.session.perfilId!);
  return res.json(mascotas);
});

/** GET /api/mascotas/:id — Obtiene una mascota por ID */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const mascota = await storage.obtenerMascotaPorId(req.params.id, req.session.perfilId!);
  if (!mascota) {
    return res.status(404).json({ message: "Mascota no encontrada" });
  }
  return res.json(mascota);
});

/** POST /api/mascotas — Crea una nueva mascota */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const datos = crearMascotaSchema.parse(req.body);
    const mascota = await storage.agregarMascota({
      perfilId: req.session.perfilId!,
      nombre: datos.nombre,
      especie: datos.especie,
      categoria: datos.categoria,
      fechaNacimiento: datos.fechaNacimiento,
      fotoBase64: datos.fotoBase64?.startsWith("data:") ? datos.fotoBase64 : null,
      notas: datos.notas || null,
      creadoEn: new Date().toISOString(),
    });
    return res.status(201).json(mascota);
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error creando mascota:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/** PUT /api/mascotas/:id — Actualiza datos de una mascota */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    // Validación parcial: todos los campos son opcionales en la edición
    const datos = crearMascotaSchema.partial().parse(req.body);
    if (datos.fotoBase64 !== undefined && !datos.fotoBase64?.startsWith("data:")) {
      datos.fotoBase64 = null;
    }
    const mascota = await storage.actualizarMascota(req.params.id, req.session.perfilId!, datos);
    if (!mascota) {
      return res.status(404).json({ message: "Mascota no encontrada" });
    }
    return res.json(mascota);
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error actualizando mascota:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/** DELETE /api/mascotas/:id — Elimina una mascota y todos sus registros */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  await storage.eliminarMascotaDb(req.params.id, req.session.perfilId!);
  return res.json({ message: "Mascota eliminada" });
});

export default router;
