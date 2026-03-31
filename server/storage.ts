import { eq, and, desc, or } from "drizzle-orm";
import { db } from "./db";
import {
  perfiles, mascotas, registrosPeso, registrosAlimentacion, notasSalud,
  analisisIa, cuidadosEspecie,
  type Perfil, type InsertMascota, type InsertRegistroPeso,
  type InsertRegistroAlimentacion, type InsertNotaSalud, type AnalisisIa,
} from "@shared/schema";

/** Obtiene un perfil por ID */
export async function obtenerPerfilPorId(id: string): Promise<Perfil | undefined> {
  const [perfil] = await db.select().from(perfiles).where(eq(perfiles.id, id));
  return perfil;
}

/** Obtiene un perfil por nombre de usuario */
export async function obtenerPerfilPorUsuario(nombreUsuario: string): Promise<Perfil | undefined> {
  const [perfil] = await db.select().from(perfiles).where(eq(perfiles.nombreUsuario, nombreUsuario));
  return perfil;
}

/** Crea un nuevo perfil */
export async function crearPerfil(datos: { nombreUsuario: string; contrasena: string; nombreCompleto: string; email?: string }): Promise<Perfil> {
  const [perfil] = await db.insert(perfiles).values(datos).returning();
  return perfil;
}

/** Actualiza la contrasena de un perfil */
export async function actualizarContrasena(id: string, nuevaContrasena: string): Promise<void> {
  await db.update(perfiles).set({ contrasena: nuevaContrasena }).where(eq(perfiles.id, id));
}

/** Actualiza el nombre completo, email y foto de perfil */
export async function actualizarPerfil(
  id: string,
  datos: { nombreCompleto: string; email?: string | null; fotoBase64?: string | null }
): Promise<Perfil> {
  const [perfil] = await db
    .update(perfiles)
    .set(datos)
    .where(eq(perfiles.id, id))
    .returning();
  return perfil;
}

/**
 * Elimina un perfil y todos sus datos asociados en cascada.
 * Las FK con onDelete: "cascade" en mascotas, pesos, alimentación,
 * salud y análisis IA se eliminan automáticamente.
 */
export async function eliminarPerfil(id: string): Promise<void> {
  await db.delete(perfiles).where(eq(perfiles.id, id));
}

/** Obtiene mascotas de un perfil */
export async function obtenerMascotasPorPerfil(perfilId: string) {
  return db.select().from(mascotas).where(eq(mascotas.perfilId, perfilId));
}

/** Obtiene una mascota por ID verificando que pertenezca al perfil */
export async function obtenerMascotaPorId(id: string, perfilId: string) {
  const [mascota] = await db.select().from(mascotas).where(and(eq(mascotas.id, id), eq(mascotas.perfilId, perfilId)));
  return mascota;
}

/** Agrega una mascota */
export async function agregarMascota(datos: InsertMascota) {
  const [mascota] = await db.insert(mascotas).values(datos).returning();
  return mascota;
}

/** Actualiza una mascota */
export async function actualizarMascota(id: string, perfilId: string, datos: Partial<InsertMascota>) {
  const [mascota] = await db.update(mascotas).set(datos).where(and(eq(mascotas.id, id), eq(mascotas.perfilId, perfilId))).returning();
  return mascota;
}

/** Elimina una mascota */
export async function eliminarMascotaDb(id: string, perfilId: string) {
  await db.delete(mascotas).where(and(eq(mascotas.id, id), eq(mascotas.perfilId, perfilId)));
}

/** Obtiene registros de peso de una mascota */
export async function obtenerPesosPorMascota(mascotaId: string) {
  return db.select().from(registrosPeso).where(eq(registrosPeso.mascotaId, mascotaId));
}

/** Agrega un registro de peso */
export async function agregarPeso(datos: InsertRegistroPeso) {
  const [registro] = await db.insert(registrosPeso).values(datos).returning();
  return registro;
}

/** Elimina un registro de peso */
export async function eliminarPeso(id: string) {
  await db.delete(registrosPeso).where(eq(registrosPeso.id, id));
}

/** Obtiene registros de alimentacion de una mascota */
export async function obtenerAlimentacionPorMascota(mascotaId: string) {
  return db.select().from(registrosAlimentacion).where(eq(registrosAlimentacion.mascotaId, mascotaId));
}

/** Agrega un registro de alimentacion */
export async function agregarAlimentacion(datos: InsertRegistroAlimentacion) {
  const [registro] = await db.insert(registrosAlimentacion).values(datos).returning();
  return registro;
}

/** Elimina un registro de alimentacion */
export async function eliminarAlimentacionDb(id: string) {
  await db.delete(registrosAlimentacion).where(eq(registrosAlimentacion.id, id));
}

/** Obtiene notas de salud de una mascota */
export async function obtenerSaludPorMascota(mascotaId: string) {
  return db.select().from(notasSalud).where(eq(notasSalud.mascotaId, mascotaId));
}

/** Agrega una nota de salud */
export async function agregarSalud(datos: InsertNotaSalud) {
  const [nota] = await db.insert(notasSalud).values(datos).returning();
  return nota;
}

/** Elimina una nota de salud */
export async function eliminarSaludDb(id: string) {
  await db.delete(notasSalud).where(eq(notasSalud.id, id));
}

/** Obtiene todos los pesos de todas las mascotas de un perfil */
export async function obtenerTodosPesosPerfil(perfilId: string) {
  const mascotasPerfil = await obtenerMascotasPorPerfil(perfilId);
  const ids = mascotasPerfil.map(m => m.id);
  if (ids.length === 0) return [];
  const todos: any[] = [];
  for (const mid of ids) {
    const pesos = await obtenerPesosPorMascota(mid);
    todos.push(...pesos);
  }
  return todos;
}

/** Obtiene toda la alimentacion de un perfil */
export async function obtenerTodaAlimentacionPerfil(perfilId: string) {
  const mascotasPerfil = await obtenerMascotasPorPerfil(perfilId);
  const ids = mascotasPerfil.map(m => m.id);
  if (ids.length === 0) return [];
  const todos: any[] = [];
  for (const mid of ids) {
    const alim = await obtenerAlimentacionPorMascota(mid);
    todos.push(...alim);
  }
  return todos;
}

/** Obtiene todas las notas de salud de un perfil */
export async function obtenerTodaSaludPerfil(perfilId: string) {
  const mascotasPerfil = await obtenerMascotasPorPerfil(perfilId);
  const ids = mascotasPerfil.map(m => m.id);
  if (ids.length === 0) return [];
  const todos: any[] = [];
  for (const mid of ids) {
    const notas = await obtenerSaludPorMascota(mid);
    todos.push(...notas);
  }
  return todos;
}

// ============================================================
// ANÁLISIS IA — historial clínico persistente
// ============================================================

/**
 * Guarda un nuevo análisis IA en la base de datos.
 * Los objetos JS se serializan a JSON para almacenamiento en texto.
 *
 * @param datos - Resultado del pipeline de análisis (alertas, puntuación, regresión)
 * @returns Registro guardado incluyendo el ID y fechaGeneracion asignados por la BD
 */
export async function guardarAnalisis(datos: {
  mascotaId: string;
  alertas: unknown[];
  resumenSalud: string;
  puntuacion: number;
  regresion: unknown | null;
  cuidados?: unknown | null;
}): Promise<AnalisisIa> {
  const [registro] = await db.insert(analisisIa).values({
    mascotaId: datos.mascotaId,
    alertas: JSON.stringify(datos.alertas),
    resumenSalud: datos.resumenSalud,
    puntuacion: datos.puntuacion,
    regresion: datos.regresion ? JSON.stringify(datos.regresion) : null,
    cuidados: datos.cuidados ? JSON.stringify(datos.cuidados) : null,
  }).returning();
  return registro;
}

/**
 * Obtiene el análisis más reciente de una mascota.
 * Usado para cargar el último estado sin invocar al servicio de IA.
 *
 * @returns Análisis más reciente o undefined si no existe ninguno
 */
export async function obtenerUltimoAnalisis(mascotaId: string): Promise<AnalisisIa | undefined> {
  const [ultimo] = await db
    .select()
    .from(analisisIa)
    .where(eq(analisisIa.mascotaId, mascotaId))
    .orderBy(desc(analisisIa.fechaGeneracion))
    .limit(1);
  return ultimo;
}

/**
 * Obtiene el historial completo de análisis de una mascota,
 * ordenado del más reciente al más antiguo.
 * Permite visualizar la evolución clínica a lo largo del tiempo.
 *
 * @returns Lista de análisis históricos (máximo 20)
 */
export async function obtenerHistorialAnalisis(mascotaId: string): Promise<AnalisisIa[]> {
  return db
    .select()
    .from(analisisIa)
    .where(eq(analisisIa.mascotaId, mascotaId))
    .orderBy(desc(analisisIa.fechaGeneracion))
    .limit(20);
}

/**
 * Guarda los cuidados de especie en el análisis más reciente.
 * Evita llamar a Groq nuevamente para la misma mascota.
 *
 * @param mascotaId - ID de la mascota
 * @param cuidados - Objeto de cuidados de especie a guardar
 */
export async function guardarCuidadosEnUltimoAnalisis(
  mascotaId: string,
  cuidados: unknown
): Promise<void> {
  const ultimo = await obtenerUltimoAnalisis(mascotaId);
  if (!ultimo) return;
  await db
    .update(analisisIa)
    .set({ cuidados: JSON.stringify(cuidados) })
    .where(eq(analisisIa.id, ultimo.id));
}

// ============================================================
// CUIDADOS POR ESPECIE — caché global con expiración de 15 días
// ============================================================

/** Días de vigencia del caché de cuidados por especie */
const DIAS_VIGENCIA_CUIDADOS = 15;

/**
 * Busca una fila de cuidados en la tabla por nombre común O nombre
 * científico (búsqueda insensible a mayúsculas).
 *
 * Buscar en ambas columnas evita crear duplicados cuando el usuario
 * registra la misma especie con nombre diferente (ej: "gecko leopardo"
 * vs "Eublepharis macularius").
 *
 * @param termino - Nombre común o científico de la especie
 * @returns Fila completa de la tabla o null si no existe
 */
async function buscarFilaCuidados(
  termino: string
): Promise<typeof cuidadosEspecie.$inferSelect | null> {
  const t = termino.toLowerCase().trim();
  const [fila] = await db
    .select()
    .from(cuidadosEspecie)
    .where(
      or(
        eq(cuidadosEspecie.especie, t),
        eq(cuidadosEspecie.nombreCientifico, t)
      )
    )
    .limit(1);
  return fila ?? null;
}

/**
 * Devuelve la guía de cuidados de una especie desde la BD si está vigente.
 *
 * Lógica de caducidad:
 * - Si la fila existe y tiene < 15 días → devuelve los datos (caché válido)
 * - Si la fila existe y tiene ≥ 15 días → devuelve null (caché expirado,
 *   el endpoint debe regenerar llamando a Groq y luego actualizar la fila)
 * - Si no existe → devuelve null (primera vez para esta especie)
 *
 * La búsqueda coincide con NOMBRE COMÚN o NOMBRE CIENTÍFICO para evitar
 * duplicados cuando distintos usuarios usan nomenclaturas distintas.
 *
 * @param especie - Nombre común o científico de la especie
 * @returns Guía de cuidados parseada, o null si no existe/expiró
 */
export async function obtenerCuidadosPorEspecie(
  especie: string
): Promise<unknown | null> {
  const fila = await buscarFilaCuidados(especie);
  if (!fila) return null;

  // Verificar si el caché sigue vigente (< DIAS_VIGENCIA_CUIDADOS días)
  const diasTranscurridos =
    (Date.now() - new Date(fila.fechaGeneracion).getTime()) /
    (1000 * 60 * 60 * 24);
  if (diasTranscurridos >= DIAS_VIGENCIA_CUIDADOS) {
    return null; // Caché expirado — regenerar
  }

  return JSON.parse(fila.datos);
}

/**
 * Guarda o actualiza la guía de cuidados de una especie.
 *
 * Estrategia de upsert:
 * 1. Busca la fila existente por nombre común O científico.
 * 2. Si existe → actualiza datos, nombre científico y fecha de generación.
 * 3. Si no existe → inserta nueva fila.
 *
 * La fecha de generación se renueva en cada guardado para reiniciar
 * el contador de caducidad de 15 días.
 *
 * @param especie - Nombre común de la especie (campo principal)
 * @param categoria - Categoría de la mascota
 * @param datos - Objeto de cuidados a serializar y guardar
 * @param nombreCientifico - Nombre científico (opcional, devuelto por Groq)
 */
export async function guardarCuidadosEspecie(
  especie: string,
  categoria: string,
  datos: unknown,
  nombreCientifico?: string | null
): Promise<void> {
  const especieLower = especie.toLowerCase().trim();
  const cientificoLower = nombreCientifico
    ? nombreCientifico.toLowerCase().trim()
    : null;
  const datosJson = JSON.stringify(datos);
  const ahora = new Date();

  // Buscar fila existente por cualquiera de los dos nombres
  const existente = await buscarFilaCuidados(especie);

  if (existente) {
    // Actualizar fila existente — renovar datos, nombre científico y fecha
    await db
      .update(cuidadosEspecie)
      .set({
        datos: datosJson,
        nombreCientifico: cientificoLower ?? existente.nombreCientifico,
        fechaGeneracion: ahora,
      })
      .where(eq(cuidadosEspecie.id, existente.id));
  } else {
    // Insertar nueva fila — primera vez que se genera para esta especie
    await db.insert(cuidadosEspecie).values({
      especie: especieLower,
      nombreCientifico: cientificoLower,
      categoria,
      datos: datosJson,
    });
  }
}
