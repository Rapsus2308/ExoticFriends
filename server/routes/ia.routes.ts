/**
 * @fileoverview Rutas del Asistente IA — ExoticFriends
 *
 * Implementa el pipeline de análisis inteligente de salud (Módulo 2):
 *
 * GET  /api/mascotas/:mascotaId/analisis          — Carga último análisis desde BD
 * GET  /api/mascotas/:mascotaId/historial-analisis — Historial clínico completo
 * POST /api/mascotas/:mascotaId/analizar           — Genera nuevo análisis con Groq
 * GET  /api/mascotas/:mascotaId/cuidados           — Guía de cuidados (caché por especie)
 *
 * Pipeline de POST /analizar:
 *   1. Regresión Lineal Simple OLS sobre historial de pesos (Módulo 2.2)
 *   2. Árbol de decisión sobre frecuencia de alimentación (Módulo 2.1.7 / 2.1.9)
 *   3. Prompt enriquecido con datos pre-procesados → Groq LLM (Módulo 2.1.5 / 2.1.6)
 *   4. Persistencia del resultado en tabla `analisis_ia`
 */

import { Router } from "express";
import type { Request, Response } from "express";
import * as storage from "../storage";
import { requireAuth } from "../middleware/auth";
import {
  consultarGroq,
  parsearRespuestaIA,
  regresionLinealPeso,
  analizarAlimentacion,
} from "../utils/ia";

const router = Router({ mergeParams: true });

// ──────────────────────────────────────────────────────────────
// GET /analisis — Carga el último análisis guardado (sin Groq)
// ──────────────────────────────────────────────────────────────
/**
 * Devuelve el último análisis de la mascota desde la BD de forma instantánea.
 * Incluye `diasDesdeGeneracion` para que el cliente muestre badge "Desactualizado"
 * si el análisis tiene más de 7 días.
 *
 * @route GET /api/mascotas/:mascotaId/analisis
 * @access Privado
 */
router.get("/analisis", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascota = await storage.obtenerMascotaPorId(
      req.params.mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    const ultimo = await storage.obtenerUltimoAnalisis(req.params.mascotaId);
    if (!ultimo) return res.status(404).json({ message: "Sin análisis previo" });

    const diasDesdeGeneracion = Math.floor(
      (Date.now() - new Date(ultimo.fechaGeneracion).getTime()) / (1000 * 60 * 60 * 24)
    );

    return res.json({
      id: ultimo.id,
      fechaGeneracion: ultimo.fechaGeneracion,
      diasDesdeGeneracion,
      alertas: JSON.parse(ultimo.alertas),
      resumenSalud: ultimo.resumenSalud,
      puntuacion: ultimo.puntuacion,
      regresion: ultimo.regresion ? JSON.parse(ultimo.regresion) : null,
      cuidados: ultimo.cuidados ? JSON.parse(ultimo.cuidados) : null,
    });
  } catch (err: any) {
    console.error("Error al obtener análisis guardado:", err);
    return res.status(500).json({ message: "Error al cargar análisis" });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /historial-analisis — Historial clínico completo
// ──────────────────────────────────────────────────────────────
/**
 * Devuelve el historial de análisis de la mascota (máx. 20 registros),
 * ordenado del más reciente al más antiguo. Permite ver la evolución
 * de la puntuación de salud y las alertas a lo largo del tiempo.
 *
 * @route GET /api/mascotas/:mascotaId/historial-analisis
 * @access Privado
 */
router.get("/historial-analisis", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascota = await storage.obtenerMascotaPorId(
      req.params.mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    const historial = await storage.obtenerHistorialAnalisis(req.params.mascotaId);
    return res.json(
      historial.map((a) => ({
        id: a.id,
        fechaGeneracion: a.fechaGeneracion,
        resumenSalud: a.resumenSalud,
        puntuacion: a.puntuacion,
        totalAlertas: JSON.parse(a.alertas).length,
        regresion: a.regresion ? JSON.parse(a.regresion) : null,
      }))
    );
  } catch (err: any) {
    console.error("Error al obtener historial:", err);
    return res.status(500).json({ message: "Error al cargar historial" });
  }
});

// ──────────────────────────────────────────────────────────────
// GET /cuidados — Guía de cuidados con caché por especie (15 días)
// ──────────────────────────────────────────────────────────────
/**
 * Devuelve la guía de cuidados de la especie de la mascota.
 *
 * Flujo de caché:
 *   1. Buscar por especie o nombre científico en tabla `cuidados_especie`.
 *      Si existe y tiene < 15 días → devolver inmediatamente (sin Groq).
 *   2. Si no existe o expiró → consultar Groq, guardar con nombre científico
 *      y devolver el resultado.
 *
 * @route GET /api/mascotas/:mascotaId/cuidados
 * @access Privado
 */
router.get("/cuidados", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascota = await storage.obtenerMascotaPorId(
      req.params.mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    // 1. Caché por especie (15 días)
    const cuidadosCache = await storage.obtenerCuidadosPorEspecie(mascota.especie);
    if (cuidadosCache) return res.json(cuidadosCache);

    // 2. Solicitar a Groq incluyendo el nombre científico en el JSON de respuesta
    const prompt =
      `Eres experto veterinario en mascotas exóticas. Perfil de la mascota:\n` +
      `- Nombre: ${mascota.nombre}\n` +
      `- Especie: ${mascota.especie}\n` +
      `- Categoría: ${mascota.categoria}\n\n` +
      `Responde ÚNICAMENTE con JSON (sin markdown, sin texto extra):\n` +
      `{\n` +
      `  "nombreCientifico": "nombre científico latino de la especie",\n` +
      `  "resumen": "descripción breve de la especie en 1-2 oraciones",\n` +
      `  "alimentacion": {\n` +
      `    "frecuencia": "cada cuánto debe comer",\n` +
      `    "alimentos": ["alimento1", "alimento2", "alimento3"],\n` +
      `    "evitar": ["alimento peligroso 1", "alimento peligroso 2"]\n` +
      `  },\n` +
      `  "peso": {\n` +
      `    "rangoNormal": "rango saludable (ej: 40-60 g)",\n` +
      `    "alertaBajo": 0,\n` +
      `    "alertaAlto": 0\n` +
      `  },\n` +
      `  "salud": {\n` +
      `    "checkupFrecuencia": "cada cuánto ir al veterinario",\n` +
      `    "signosAlerta": ["signo1", "signo2", "signo3"]\n` +
      `  },\n` +
      `  "cuidados": ["cuidado1", "cuidado2", "cuidado3", "cuidado4"]\n` +
      `}`;

    const respuesta = await consultarGroq(prompt);
    try {
      const cuidados = parsearRespuestaIA(respuesta) as Record<string, unknown>;
      const nombreCientifico =
        typeof cuidados.nombreCientifico === "string" ? cuidados.nombreCientifico : null;
      await storage.guardarCuidadosEspecie(
        mascota.especie,
        mascota.categoria,
        cuidados,
        nombreCientifico
      );
      return res.json(cuidados);
    } catch {
      return res.status(500).json({ message: "No se pudo procesar la respuesta de IA" });
    }
  } catch (err: any) {
    console.error("Error en cuidados IA:", err);
    return res.status(500).json({ message: err.message || "Error al consultar IA" });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /analizar — Pipeline completo de análisis inteligente
// ──────────────────────────────────────────────────────────────
/**
 * Ejecuta el pipeline completo de análisis de salud de la mascota:
 *   1. Regresión Lineal Simple OLS sobre historial de pesos (Módulo 2.2)
 *   2. Árbol de decisión sobre frecuencia de alimentación (Módulo 2.1.9)
 *   3. Prompt enriquecido + Groq LLM (Módulo 2.1.5 / 2.1.6)
 *   4. Persistencia del resultado en `analisis_ia` (historial clínico)
 *
 * @route POST /api/mascotas/:mascotaId/analizar
 * @access Privado
 */
router.post("/analizar", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascota = await storage.obtenerMascotaPorId(
      req.params.mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    // Obtener datos históricos en paralelo para optimizar latencia
    const [pesos, alimentacion] = await Promise.all([
      storage.obtenerPesosPorMascota(req.params.mascotaId),
      storage.obtenerAlimentacionPorMascota(req.params.mascotaId),
    ]);

    // PASO 1 — Regresión Lineal (Módulo 2.2)
    const pesosOrdenados = [...pesos].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
    const regresion = regresionLinealPeso(pesosOrdenados);
    const ultimoPeso = pesosOrdenados[pesosOrdenados.length - 1];

    // PASO 2 — Árbol de decisión sobre alimentación (Módulo 2.1.9)
    const statsAlim = analizarAlimentacion(alimentacion);

    // PASO 3 — Construcción del prompt con datos pre-procesados como contexto
    const contextoRegresion = regresion
      ? `- Tendencia de peso (regresión lineal): ${regresion.tendencia} ` +
        `(pendiente: ${regresion.pendiente} g/día, R²: ${regresion.r2})\n` +
        `- Predicción próximos 7 días: ${regresion.prediccionProximoPeso} g`
      : "- Tendencia de peso: insuficientes datos para calcular regresión";

    const prompt =
      `Analiza el estado de salud de esta mascota con los datos proporcionados.\n\n` +
      `Mascota:\n` +
      `- Nombre: ${mascota.nombre}\n` +
      `- Especie: ${mascota.especie}\n` +
      `- Categoría: ${mascota.categoria}\n\n` +
      `Métricas calculadas:\n` +
      `- Peso actual: ${ultimoPeso ? `${ultimoPeso.peso} ${ultimoPeso.unidad} (${ultimoPeso.fecha})` : "Sin registros"}\n` +
      `${contextoRegresion}\n` +
      `- Registros alimentación últimos 7 días: ${statsAlim.registrosUltimos7Dias} en ${statsAlim.diasConAlimentoSemana} días distintos\n` +
      `- Registros alimentación últimos 30 días: ${statsAlim.registrosUltimos30Dias}\n` +
      `- Días sin registro de alimentación: ${statsAlim.diasSinRegistroAlimento}\n\n` +
      `Responde ÚNICAMENTE con JSON (sin markdown, sin texto extra):\n` +
      `{\n` +
      `  "alertas": [\n` +
      `    {\n` +
      `      "nivel": "critico|advertencia|info",\n` +
      `      "categoria": "peso|alimentacion|salud",\n` +
      `      "titulo": "título corto",\n` +
      `      "mensaje": "descripción del problema o recomendación",\n` +
      `      "accion": "acción sugerida"\n` +
      `    }\n` +
      `  ],\n` +
      `  "resumenSalud": "evaluación general en 1-2 oraciones",\n` +
      `  "puntuacion": <número 0-100 de salud general>\n` +
      `}\n\n` +
      `Genera mínimo 2 alertas/recomendaciones específicas para la especie.`;

    const respuesta = await consultarGroq(prompt);
    try {
      const analisis = parsearRespuestaIA(respuesta) as Record<string, unknown>;
      const alertas = Array.isArray(analisis.alertas) ? analisis.alertas : [];
      const resumenSalud = typeof analisis.resumenSalud === "string" ? analisis.resumenSalud : "";
      const puntuacion = typeof analisis.puntuacion === "number" ? analisis.puntuacion : 0;

      // PASO 4 — Persistir en BD (historial clínico)
      const guardado = await storage.guardarAnalisis({
        mascotaId: req.params.mascotaId,
        alertas,
        resumenSalud,
        puntuacion,
        regresion,
      });

      return res.json({
        id: guardado.id,
        fechaGeneracion: guardado.fechaGeneracion,
        diasDesdeGeneracion: 0,
        alertas,
        resumenSalud,
        puntuacion,
        regresion,
      });
    } catch {
      return res.status(500).json({ message: "No se pudo procesar el análisis de IA" });
    }
  } catch (err: any) {
    console.error("Error en análisis IA:", err);
    return res.status(500).json({ message: err.message || "Error al analizar" });
  }
});

export default router;
