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

function normalizarMascotaId(params: Request["params"]): string | null {
  const raw = params.mascotaId;
  const mascotaId = Array.isArray(raw) ? raw[0] : raw;
  return typeof mascotaId === "string" && mascotaId.trim().length > 0
    ? mascotaId
    : null;
}

type EtapaVida = "cria" | "juvenil" | "adulto" | "senior" | "desconocida";

function calcularEdadMascota(fechaNacimiento: string): {
  edadDias: number | null;
  edadMeses: number | null;
  etapaVida: EtapaVida;
} {
  const tNacimiento = new Date(fechaNacimiento).getTime();
  if (Number.isNaN(tNacimiento)) {
    return { edadDias: null, edadMeses: null, etapaVida: "desconocida" };
  }

  const now = Date.now();
  if (tNacimiento > now) {
    return { edadDias: null, edadMeses: null, etapaVida: "desconocida" };
  }

  const edadDias = Math.floor((now - tNacimiento) / (1000 * 60 * 60 * 24));
  const edadMeses = Math.floor(edadDias / 30.44);

  let etapaVida: EtapaVida = "adulto";
  if (edadMeses < 2) etapaVida = "cria";
  else if (edadMeses < 12) etapaVida = "juvenil";
  else if (edadMeses >= 84) etapaVida = "senior";

  return { edadDias, edadMeses, etapaVida };
}

function obtenerRangoEdadAproximada(edadMeses: number | null): string {
  if (edadMeses == null) return "desconocida";
  if (edadMeses < 12) return "<1 año";
  if (edadMeses < 24) return "1 año";
  if (edadMeses < 36) return "2 años";
  if (edadMeses < 48) return "3 años";
  if (edadMeses < 60) return "4 años";
  if (edadMeses < 72) return "5 años";
  return ">5 años";
}

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
    const mascotaId = normalizarMascotaId(req.params);
    if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

    const mascota = await storage.obtenerMascotaPorId(
      mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });
    const edad = calcularEdadMascota(mascota.fechaNacimiento);

    const ultimo = await storage.obtenerUltimoAnalisis(mascotaId);
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
    const mascotaId = normalizarMascotaId(req.params);
    if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

    const mascota = await storage.obtenerMascotaPorId(
      mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });

    const historial = await storage.obtenerHistorialAnalisis(mascotaId);
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
/**
 * Devuelve la guía de cuidados personalizada para la mascota.
 *
 * Flujo de caché:
 *   1. Buscar por mascotaId en tabla `cuidados_especie`.
 *      Si existe y tiene < 15 días → devolver inmediatamente (sin Groq).
 *   2. Si no existe o expiró → consultar Groq, guardar y devolver.
 *
 * @route GET /api/mascotas/:mascotaId/cuidados
 * @access Privado
 */
router.get("/cuidados", requireAuth, async (req: Request, res: Response) => {
  try {
    const mascotaId = normalizarMascotaId(req.params);
    if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

    const mascota = await storage.obtenerMascotaPorId(
      mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });
    const edad = calcularEdadMascota(mascota.fechaNacimiento);
    const edadAproximada = obtenerRangoEdadAproximada(edad.edadMeses);

    // 1. Obtener notas de salud (se usan para verificar frescura del caché y para el prompt)
    const salud = await storage.obtenerSaludPorMascota(mascotaId);

    // 2. Caché por mascota (15 días), con invalidación si hay notas más recientes.
    const forceRefresh = req.query.force === "true";
    if (!forceRefresh) {
      const cacheFecha = await storage.obtenerFechaCuidadosMascota(mascotaId);
      const cuidadosCache = await storage.obtenerCuidadosPorMascota(mascotaId);
      // Invalidar caché si hay notas de salud más recientes que la última generación
      const tieneNotasNuevas = cacheFecha && salud.length > 0 && salud.some(
        (n) => new Date(n.fecha).getTime() > cacheFecha.getTime()
      );
      if (cuidadosCache && !tieneNotasNuevas) return res.json(cuidadosCache);
    }

    // 3. Construir contexto de notas de salud para el prompt
    const contextoSalud = salud.length > 0
      ? salud
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .slice(0, 10)
          .map((n) => `  · [${n.tipo}] ${n.fecha} — ${n.titulo}: ${n.descripcion}`)
          .join("\n")
      : "";

    // 4. Solicitar a Groq con datos completos de la mascota + notas de salud
    const prompt =
      `Eres veterinario especializado en mascotas exóticas y taxonomía animal.\n` +
      `Tu prioridad es precisión de especie y evitar inventar datos.\n` +
      `- Nombre: ${mascota.nombre}\n` +
      `- Especie: ${mascota.especie}\n` +
      `- Categoría: ${mascota.categoria}\n` +
      `- Género: ${mascota.genero}\n` +
      `- Fecha nacimiento: ${mascota.fechaNacimiento}\n` +
      `- Edad aproximada (rango): ${edadAproximada}\n` +
      `- Edad estimada: ${edad.edadMeses ?? "desconocida"} meses (${edad.edadDias ?? "desconocida"} días)\n` +
      `- Etapa de vida: ${edad.etapaVida}\n` +
      `- Notas del dueño: ${mascota.notas?.trim() || "Sin notas"}\n` +
      (contextoSalud
        ? `\nHistorial de salud (notas veterinarias recientes):\n${contextoSalud}\n\n`
        : "\n") +
      `Reglas estrictas:\n` +
      `1) Si el nombre de especie es ambiguo o insuficiente, indícalo en nombreCientifico como "desconocido".\n` +
      `2) No inventes nombres científicos ni rangos fisiológicos.\n` +
      `3) Ajusta recomendaciones al tipo real de animal según categoría, especie y etapa de vida.\n` +
      `4) Alimentación y rango de peso deben ser apropiados para la edad del animal y su género.\n` +
      `5) Si tienes duda, devuelve recomendaciones conservadoras y marca baja confianza.\n` +
      `6) TODOS los textos deben estar en español. Nombres de alimentos en español (ej: "grillos" no "crickets").\n` +
      `7) Los alimentos deben incluir proporción o cantidad recomendada (ej: "grillos — 3 a 5 diarios").\n` +
      `8) Solo recomienda alimentos que la especie come en su dieta real. Si es insectívora, NO incluyas vegetales. Si es herbívora, NO incluyas insectos. Respeta el tipo de dieta (insectívora, herbívora, omnívora, carnívora, frugívora, nectarívora, etc.).\n` +
      `9) Si las notas del dueño o las notas veterinarias mencionan morfo o genética (ej: GIANT, SUPER GIANT, RAPTOR, SNOW, PIED, SUPER, HET, etc.), AJUSTA los rangos de peso y cuidados al morfo específico. El rango de peso en "peso.rangoNormal" DEBE reflejar el morfo, no la especie base.\n` +
      `10) Si las notas veterinarias incluyen rangos de peso proporcionados por un profesional, ESOS RANGOS tienen prioridad sobre los rangos genéricos de la especie.\n\n` +
      `Responde ÚNICAMENTE con JSON (sin markdown, sin texto extra):\n` +
      `{\n` +
      `  "nombreCientifico": "nombre científico latino de la especie",\n` +
      `  "confianzaEspecie": "alta|media|baja",\n` +
      `  "etapaVidaTomada": "cria|juvenil|adulto|senior|desconocida",\n` +
      `  "resumen": "descripción breve de la especie en 1-2 oraciones",\n` +
      `  "alimentacion": {\n` +
      `    "frecuencia": "cada cuánto debe comer según su etapa de vida",\n` +
      `    "alimentos": ["alimento en español — proporción o cantidad recomendada"],\n` +
      `    "evitar": ["alimento peligroso en español — razón breve"]\n` +
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
      await storage.guardarCuidadosMascota(
        mascotaId,
        mascota.especie,
        mascota.categoria,
        mascota.genero,
        edadAproximada,
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
    const mascotaId = normalizarMascotaId(req.params);
    if (!mascotaId) return res.status(400).json({ message: "mascotaId inválido" });

    const mascota = await storage.obtenerMascotaPorId(
      mascotaId,
      req.session.perfilId!
    );
    if (!mascota) return res.status(404).json({ message: "Mascota no encontrada" });
    const edad = calcularEdadMascota(mascota.fechaNacimiento);

    // Obtener datos históricos y cuidados de referencia en paralelo
    // Obtener datos históricos en paralelo
    const [pesos, alimentacion, salud, cacheFecha] = await Promise.all([
      storage.obtenerPesosPorMascota(mascotaId),
      storage.obtenerAlimentacionPorMascota(mascotaId),
      storage.obtenerSaludPorMascota(mascotaId),
      storage.obtenerFechaCuidadosMascota(mascotaId),
    ]);

    // Verificar si los cuidados necesitan regenerarse (notas de salud más recientes que el caché)
    const tieneNotasNuevas = cacheFecha && salud.length > 0 && salud.some(
      (n) => new Date(n.fecha).getTime() > cacheFecha.getTime()
    );
    // Obtener cuidados de referencia, regenerando si hay notas más recientes
    let cuidadosRef = tieneNotasNuevas ? null : await storage.obtenerCuidadosPorMascota(mascotaId);
    if (!cuidadosRef) {
      // Auto-regenerar cuidados con datos actualizados (notas de salud incluidas)
      try {
        const edadAprox = obtenerRangoEdadAproximada(edad.edadMeses);
        const contextoSaludCuidados = salud.length > 0
          ? salud
              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
              .slice(0, 10)
              .map((n) => `  · [${n.tipo}] ${n.fecha} — ${n.titulo}: ${n.descripcion}`)
              .join("\n")
          : "";
        const promptCuidados =
          `Eres veterinario especializado en mascotas exóticas y taxonomía animal.\n` +
          `Tu prioridad es precisión de especie y evitar inventar datos.\n` +
          `- Nombre: ${mascota.nombre}\n` +
          `- Especie: ${mascota.especie}\n` +
          `- Categoría: ${mascota.categoria}\n` +
          `- Género: ${mascota.genero}\n` +
          `- Fecha nacimiento: ${mascota.fechaNacimiento}\n` +
          `- Edad aproximada (rango): ${edadAprox}\n` +
          `- Edad estimada: ${edad.edadMeses ?? "desconocida"} meses (${edad.edadDias ?? "desconocida"} días)\n` +
          `- Etapa de vida: ${edad.etapaVida}\n` +
          `- Notas del dueño: ${mascota.notas?.trim() || "Sin notas"}\n` +
          (contextoSaludCuidados
            ? `\nHistorial de salud (notas veterinarias recientes):\n${contextoSaludCuidados}\n\n`
            : "\n") +
          `Reglas estrictas:\n` +
          `1) No inventes nombres científicos ni rangos fisiológicos.\n` +
          `2) Ajusta recomendaciones al tipo real de animal según categoría, especie y etapa de vida.\n` +
          `3) TODOS los textos en español. Alimentos con proporción recomendada.\n` +
          `4) Solo recomienda alimentos de la dieta real de la especie.\n` +
          `5) Si las notas del dueño o veterinarias mencionan morfo/genética, AJUSTA los rangos de peso al morfo específico.\n` +
          `6) Si las notas veterinarias incluyen rangos de peso de un profesional, ESOS RANGOS tienen prioridad.\n\n` +
          `Responde ÚNICAMENTE con JSON:\n` +
          `{"nombreCientifico":"","confianzaEspecie":"alta|media|baja","etapaVidaTomada":"","resumen":"","alimentacion":{"frecuencia":"","alimentos":[""],"evitar":[""]},"peso":{"rangoNormal":"","alertaBajo":0,"alertaAlto":0},"salud":{"checkupFrecuencia":"","signosAlerta":[""]},"cuidados":[""]}`;
        const respCuidados = await consultarGroq(promptCuidados);
        const cuidadosParsed = parsearRespuestaIA(respCuidados) as Record<string, unknown>;
        const nombreCientifico =
          typeof cuidadosParsed.nombreCientifico === "string" ? cuidadosParsed.nombreCientifico : null;
        await storage.guardarCuidadosMascota(
          mascotaId, mascota.especie, mascota.categoria, mascota.genero,
          edadAprox, cuidadosParsed, nombreCientifico
        );
        cuidadosRef = cuidadosParsed;
      } catch (errCuidados) {
        console.warn("No se pudieron regenerar cuidados durante análisis:", errCuidados);
      }
    }

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

    // Construir contexto de referencia desde cuidados cacheados (si existen)
    let contextoCuidados = "";
    if (cuidadosRef) {
      const c = cuidadosRef as Record<string, any>;
      const partes: string[] = [];
      if (c.peso?.rangoNormal) partes.push(`- Rango de peso saludable para la especie: ${c.peso.rangoNormal}`);
      if (c.peso?.alertaBajo) partes.push(`- Peso crítico bajo: ${c.peso.alertaBajo} g`);
      if (c.peso?.alertaAlto) partes.push(`- Peso crítico alto: ${c.peso.alertaAlto} g`);
      if (c.alimentacion?.frecuencia) partes.push(`- Frecuencia de alimentación recomendada: ${c.alimentacion.frecuencia}`);
      if (Array.isArray(c.alimentacion?.alimentos) && c.alimentacion.alimentos.length > 0) {
        partes.push(`- Alimentos recomendados: ${c.alimentacion.alimentos.join(", ")}`);
      }
      if (Array.isArray(c.alimentacion?.evitar) && c.alimentacion.evitar.length > 0) {
        partes.push(`- Alimentos a evitar: ${c.alimentacion.evitar.join(", ")}`);
      }
      if (c.salud?.checkupFrecuencia) partes.push(`- Frecuencia de chequeo veterinario: ${c.salud.checkupFrecuencia}`);
      if (partes.length > 0) {
        contextoCuidados = `\nParámetros de referencia para ${mascota.nombre} (${mascota.especie}):\n${partes.join("\n")}\n`;
      }
    }

    const prompt =
      `Analiza el estado de salud de esta mascota comparando sus datos reales contra los parámetros de referencia de su especie.\n\n` +
      `Mascota:\n` +
      `- Nombre: ${mascota.nombre}\n` +
      `- Especie: ${mascota.especie}\n` +
      `- Categoría: ${mascota.categoria}\n` +
      `- Género: ${mascota.genero}\n` +
      `- Fecha nacimiento: ${mascota.fechaNacimiento}\n` +
      `- Edad estimada: ${edad.edadMeses ?? "desconocida"} meses (${edad.edadDias ?? "desconocida"} días)\n` +
      `- Etapa de vida: ${edad.etapaVida}\n` +
      `- Notas del dueño: ${mascota.notas?.trim() || "Sin notas"}\n\n` +
      `Métricas calculadas:\n` +
      `- Peso actual: ${ultimoPeso ? `${ultimoPeso.peso} ${ultimoPeso.unidad} (${ultimoPeso.fecha})` : "Sin registros"}\n` +
      `${contextoRegresion}\n` +
      `- Registros alimentación últimos 7 días: ${statsAlim.registrosUltimos7Dias} en ${statsAlim.diasConAlimentoSemana} días distintos\n` +
      `- Registros alimentación últimos 30 días: ${statsAlim.registrosUltimos30Dias}\n` +
      `- Días sin registro de alimentación: ${statsAlim.diasSinRegistroAlimento}\n` +
      // Notas de salud recientes (últimas 10)
      (() => {
        if (salud.length === 0) return `\nHistorial de salud: Sin notas registradas.\n`;
        const recientes = salud
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .slice(0, 10);
        const lineas = recientes.map(
          (n) => `  · [${n.tipo}] ${n.fecha} — ${n.titulo}: ${n.descripcion}`
        );
        return `\nHistorial de salud (últimas ${recientes.length} notas):\n${lineas.join("\n")}\n`;
      })() +
      `${contextoCuidados}\n` +
      `Reglas obligatorias:\n` +
      `- Compara el peso actual contra el rango de referencia de la especie. Si está fuera del rango, genera alerta.\n` +
      `- Compara la frecuencia de alimentación registrada contra la frecuencia recomendada.\n` +
      `- Considera las notas de salud: medicamentos activos, visitas veterinarias recientes y observaciones.\n` +
      `- Si las notas del dueño mencionan morfo/genética (ej: GIANT, RAPTOR, SNOW, PIED), ajusta los rangos de peso y cuidados al morfo específico.\n` +
      `- Evalúa todo según la edad/etapa de vida indicada y el género.\n` +
      `- Si no hay parámetros de referencia, usa tu conocimiento veterinario de la especie.\n` +
      `- Si falta edad válida, indícalo explícitamente en alertas con nivel info.\n` +
      `- Responde siempre en español.\n\n` +
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
        mascotaId,
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
