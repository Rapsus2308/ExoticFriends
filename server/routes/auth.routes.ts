/**
 * @fileoverview Rutas de autenticación — ExoticFriends
 *
 * Maneja registro, inicio de sesión, cierre de sesión,
 * consulta y edición de perfil, cambio de contraseña y
 * eliminación de cuenta.
 *
 * Seguridad:
 *   - bcrypt (12 rounds) para hashing de contraseñas
 *   - Sesiones en PostgreSQL con express-session
 *   - limitadorAuth aplicado a las rutas login y registro
 *   - Validación Zod en todos los endpoints que reciben cuerpo
 */

import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  registroSchema,
  loginSchema,
  cambiarContrasenaSchema,
  actualizarPerfilSchema,
} from "@shared/schema";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";
import { limitadorAuth } from "../middleware/rateLimiting";

const router = Router();

/** POST /api/auth/registro — Crea un nuevo perfil de usuario */
router.post("/registro", limitadorAuth, async (req: Request, res: Response) => {
  try {
    const datos = registroSchema.parse(req.body);
    const existente = await storage.obtenerPerfilPorUsuario(datos.nombreUsuario);
    if (existente) {
      return res.status(409).json({ message: "El nombre de usuario ya existe" });
    }
    const hash = await bcrypt.hash(datos.contrasena, 12);
    const perfil = await storage.crearPerfil({
      nombreUsuario: datos.nombreUsuario,
      contrasena: hash,
      nombreCompleto: datos.nombreCompleto,
      email: datos.email || undefined,
    });
    req.session.perfilId = perfil.id;
    return res.status(201).json({
      id: perfil.id,
      nombreUsuario: perfil.nombreUsuario,
      nombreCompleto: perfil.nombreCompleto,
      email: perfil.email,
    });
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error en registro:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/** POST /api/auth/login — Inicia sesión con usuario y contraseña */
router.post("/login", limitadorAuth, async (req: Request, res: Response) => {
  try {
    const datos = loginSchema.parse(req.body);
    const perfil = await storage.obtenerPerfilPorUsuario(datos.nombreUsuario);
    if (!perfil) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }
    const coincide = await bcrypt.compare(datos.contrasena, perfil.contrasena);
    if (!coincide) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }
    req.session.perfilId = perfil.id;
    return res.json({
      id: perfil.id,
      nombreUsuario: perfil.nombreUsuario,
      nombreCompleto: perfil.nombreCompleto,
      email: perfil.email,
    });
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error en login:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/** POST /api/auth/logout — Destruye la sesión activa */
router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ message: "Sesión cerrada" });
  });
});

/** GET /api/auth/perfil — Devuelve el perfil del usuario autenticado */
router.get("/perfil", requireAuth, async (req: Request, res: Response) => {
  const perfil = await storage.obtenerPerfilPorId(req.session.perfilId!);
  if (!perfil) {
    return res.status(404).json({ message: "Perfil no encontrado" });
  }
  return res.json({
    id: perfil.id,
    nombreUsuario: perfil.nombreUsuario,
    nombreCompleto: perfil.nombreCompleto,
    email: perfil.email,
    fotoBase64: perfil.fotoBase64 ?? null,
  });
});

/**
 * PUT /api/auth/perfil — Actualiza nombre completo y email del usuario.
 * No permite cambiar el nombreUsuario (es el identificador único del perfil).
 */
router.put("/perfil", requireAuth, async (req: Request, res: Response) => {
  try {
    const datos = actualizarPerfilSchema.parse(req.body);
    const perfil = await storage.actualizarPerfil(req.session.perfilId!, {
      nombreCompleto: datos.nombreCompleto,
      email: datos.email || null,
      fotoBase64: datos.fotoBase64 ?? null,
    });
    return res.json({
      id: perfil.id,
      nombreUsuario: perfil.nombreUsuario,
      nombreCompleto: perfil.nombreCompleto,
      email: perfil.email,
      fotoBase64: perfil.fotoBase64 ?? null,
    });
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error actualizando perfil:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/** POST /api/auth/cambiar-contrasena — Actualiza la contraseña del usuario */
router.post("/cambiar-contrasena", requireAuth, async (req: Request, res: Response) => {
  try {
    const datos = cambiarContrasenaSchema.parse(req.body);
    const perfil = await storage.obtenerPerfilPorId(req.session.perfilId!);
    if (!perfil) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }
    const coincide = await bcrypt.compare(datos.contrasenaActual, perfil.contrasena);
    if (!coincide) {
      return res.status(401).json({ message: "La contraseña actual es incorrecta" });
    }
    const nuevoHash = await bcrypt.hash(datos.contrasenaNueva, 12);
    await storage.actualizarContrasena(perfil.id, nuevoHash);
    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err: any) {
    if (err.issues) {
      return res.status(400).json({ message: err.issues[0]?.message || "Datos inválidos" });
    }
    console.error("Error cambiando contraseña:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * DELETE /api/auth/cuenta — Elimina la cuenta y todos los datos del usuario.
 *
 * Requiere que el usuario confirme su contraseña actual para evitar
 * eliminaciones accidentales o ataques CSRF. La eliminación es permanente
 * y en cascada (mascotas, pesos, alimentación, salud, análisis IA).
 */
router.delete("/cuenta", requireAuth, async (req: Request, res: Response) => {
  try {
    const { contrasena } = req.body;
    if (!contrasena || typeof contrasena !== "string") {
      return res.status(400).json({ message: "La contraseña es requerida para confirmar la eliminación" });
    }
    const perfil = await storage.obtenerPerfilPorId(req.session.perfilId!);
    if (!perfil) {
      return res.status(404).json({ message: "Perfil no encontrado" });
    }
    const coincide = await bcrypt.compare(contrasena, perfil.contrasena);
    if (!coincide) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }
    // Destruir sesión antes de eliminar para evitar queries post-delete
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    await storage.eliminarPerfil(perfil.id);
    return res.json({ message: "Cuenta eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando cuenta:", err);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

export default router;
