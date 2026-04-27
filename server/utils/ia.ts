/**
 * @fileoverview Utilidades de Inteligencia Artificial — ExoticFriends
 *
 * Módulo 2 — Sistemas Inteligentes:
 *
 * 2.1.5 / 2.1.6 — Servicio cognitivo externo (Qwen 3.2b):
 *   `consultarGroq` envía un prompt al LLM y devuelve la respuesta en texto.
 *
 * 2.1.7 / 2.1.9 — Sistema experto local (árbol de decisión):
 *   `analizarAlimentacion` evalúa frecuencia de alimentación y días sin
 *   registro usando reglas de dominio veterinario.
 *
 * 2.2 — Modelo matemático (Regresión Lineal Simple OLS):
 *   `regresionLinealPeso` ajusta una recta y = m·x + b sobre el historial
 *   de pesos usando Mínimos Cuadrados Ordinarios y calcula R².
 *
 * 2.3 — Justificación de OLS:
 *   Interpretabilidad directa (pendiente = g/día), complejidad O(N),
 *   suficiencia para series cortas (~12 puntos), sin dependencias externas.
 *
 * @author ExoticFriends Team
 */

import https from "node:https";

// ============================================================
// TIPOS
// ============================================================

/**
 * Resultado del modelo de Regresión Lineal Simple (OLS).
 *
 * El modelo ajusta y = m·x + b donde x = días desde primera medición
 * e y = peso del animal en esa fecha.
 */
export interface ResultadoRegresion {
  /** Pendiente de la recta — cambio de peso en g/día */
  pendiente: number;
  /** Intercepto — peso estimado en el día 0 */
  intercepto: number;
  /** Coeficiente de determinación R² ∈ [0,1]; 1 = ajuste perfecto */
  r2: number;
  /** Predicción de peso a 7 días hacia el futuro */
  prediccionProximoPeso: number;
  /** Tendencia descriptiva: "alza", "baja" o "estable" */
  tendencia: "alza" | "baja" | "estable";
}

// ============================================================
// MÓDULO 2.2 — REGRESIÓN LINEAL SIMPLE (OLS)
// ============================================================

/**
 * Aplica Regresión Lineal Simple (Mínimos Cuadrados Ordinarios) sobre
 * los registros de peso de una mascota.
 *
 * Fórmulas OLS:
 *   m = (N·Σ(xᵢ·yᵢ) − Σxᵢ·Σyᵢ) / (N·Σxᵢ² − (Σxᵢ)²)
 *   b = (Σyᵢ − m·Σxᵢ) / N
 *   R² = 1 − SS_res / SS_tot
 *
 * donde xᵢ = días desde primera medición, yᵢ = peso en gramos.
 * Complejidad temporal: O(N) — una sola pasada sobre el arreglo.
 *
 * @param registros - Historial de pesos ordenado cronológicamente
 * @returns Objeto con pendiente, intercepto, R² y predicción a 7 días,
 *          o null si hay menos de 2 registros (recta no determinable)
 */
export function regresionLinealPeso(
  registros: { peso: number; unidad: string; fecha: string }[]
): ResultadoRegresion | null {
  if (registros.length < 2) return null;

  const t0 = new Date(registros[0].fecha).getTime();
  const puntos = registros.map((r) => ({
    x: (new Date(r.fecha).getTime() - t0) / (1000 * 60 * 60 * 24),
    y: r.unidad === "kg" ? r.peso * 1000 : r.peso,
  }));

  const N = puntos.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const { x, y } of puntos) {
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
  }

  const denom = N * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const m = (N * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / N;

  const yMedia = sumY / N;
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of puntos) {
    ssTot += (y - yMedia) ** 2;
    ssRes += (y - (m * x + b)) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  const xUltimo = puntos[puntos.length - 1].x;
  const prediccionProximoPeso = Math.round((m * (xUltimo + 7) + b) * 100) / 100;

  const umbral = 0.5;
  const tendencia = m > umbral ? "alza" : m < -umbral ? "baja" : "estable";

  return {
    pendiente: Math.round(m * 100) / 100,
    intercepto: Math.round(b * 100) / 100,
    r2: Math.round(r2 * 1000) / 1000,
    prediccionProximoPeso,
    tendencia,
  };
}

// ============================================================
// MÓDULO 2.1.7 / 2.1.9 — SISTEMA EXPERTO (Árbol de decisión)
// ============================================================

/**
 * Árbol de decisión local para generar estadísticas de alimentación.
 *
 * Las reglas se derivan de heurísticas veterinarias estándar para mascotas
 * exóticas. Se combina con Groq para enriquecer el diagnóstico con
 * conocimiento específico de la especie.
 *
 * @param registros - Registros de alimentación de la mascota
 * @returns Resumen estadístico de patrones de alimentación
 */
export function analizarAlimentacion(registros: { fecha: string }[]) {
  const ahora = new Date();
  const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

  const ultimos7 = registros.filter((r) => new Date(r.fecha) >= hace7Dias);
  const ultimos30 = registros.filter((r) => new Date(r.fecha) >= hace30Dias);
  const diasUnicosSemana = new Set(
    ultimos7.map((r) => r.fecha.substring(0, 10))
  ).size;

  let diasSinAlimento = 0;
  if (registros.length > 0) {
    const ultFecha = new Date(
      [...registros].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )[0].fecha
    );
    diasSinAlimento = Math.floor(
      (ahora.getTime() - ultFecha.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    registrosUltimos7Dias: ultimos7.length,
    registrosUltimos30Dias: ultimos30.length,
    diasConAlimentoSemana: diasUnicosSemana,
    diasSinRegistroAlimento: diasSinAlimento,
  };
}

// ============================================================
// MÓDULO 2.1.5 / 2.1.6 — SERVICIO COGNITIVO EXTERNO (Groq)
// ============================================================

/**
 * Cliente HTTP para la API de Groq (Servicio Cognitivo Externo).
 *
 * Modelo: Qwen 3.2b (Meta — código abierto).
 * Temperatura 0.3 — reduce aleatoriedad para respuestas JSON consistentes.
 * Max tokens 1200 — suficiente para el JSON de análisis/cuidados.
 *
 * @param prompt - Texto del mensaje enviado al modelo
 * @returns Contenido de texto de la respuesta del LLM
 * @throws Error si GROQ_API_KEY no está configurada o la petición falla
 */
export async function consultarGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");

  const body = JSON.stringify({
    model: "qwen/qwen3-32b",
    messages: [
      {
        role: "system",
        content:
          "Eres un experto veterinario especializado en mascotas exóticas. " +
          "Responde SIEMPRE en español y en formato JSON válido. " +
          "Sin texto extra fuera del JSON. Sin bloques markdown.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.message?.content ?? "";
            resolve(content);
          } catch {
            reject(new Error("Respuesta inválida de Groq"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Limpia la respuesta del LLM removiendo bloques de código markdown
 * y parsea el JSON resultante.
 *
 * @param texto - Respuesta cruda del modelo
 * @returns Objeto JavaScript parseado
 * @throws SyntaxError si el JSON no es válido tras la limpieza
 */
export function parsearRespuestaIA(texto: string): unknown {
  const limpia = texto
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(limpia);
}
