import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/** Tabla de perfiles de usuario */
export const perfiles = pgTable("perfiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombreUsuario: text("nombre_usuario").notNull().unique(),
  contrasena: text("contrasena").notNull(),
  nombreCompleto: text("nombre_completo").notNull(),
  email: text("email"),
  fotoBase64: text("foto_base64"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
});

/** Tabla de mascotas vinculadas a un perfil */
export const mascotas = pgTable("mascotas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  perfilId: varchar("perfil_id").notNull().references(() => perfiles.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  especie: text("especie").notNull(),
  categoria: text("categoria").notNull(),
  fechaNacimiento: text("fecha_nacimiento").notNull(),
  fotoBase64: text("foto_base64"),
  notas: text("notas"),
  creadoEn: text("creado_en").notNull(),
});

/** Tabla de registros de peso vinculados a una mascota */
export const registrosPeso = pgTable("registros_peso", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mascotaId: varchar("mascota_id").notNull().references(() => mascotas.id, { onDelete: "cascade" }),
  peso: real("peso").notNull(),
  unidad: text("unidad").notNull(),
  fecha: text("fecha").notNull(),
});

/** Tabla de registros de alimentacion vinculados a una mascota */
export const registrosAlimentacion = pgTable("registros_alimentacion", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mascotaId: varchar("mascota_id").notNull().references(() => mascotas.id, { onDelete: "cascade" }),
  alimento: text("alimento").notNull(),
  cantidad: text("cantidad").notNull(),
  fecha: text("fecha").notNull(),
  notas: text("notas"),
});

/** Tabla de notas de salud vinculadas a una mascota */
export const notasSalud = pgTable("notas_salud", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mascotaId: varchar("mascota_id").notNull().references(() => mascotas.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull(),
  tipo: text("tipo").notNull(),
  fecha: text("fecha").notNull(),
});

/**
 * Tabla de cuidados de especie generados por el servicio cognitivo Groq.
 *
 * Indexada por `especie` (nombre científico/común de la especie) de forma
 * única. De este modo, si el usuario tiene varias mascotas de la misma
 * especie, la guía de cuidados se genera UNA SOLA VEZ y se reutiliza.
 *
 * Esto evita llamadas repetidas al servicio cognitivo y reduce latencia.
 */
export const cuidadosEspecie = pgTable("cuidados_especie", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** Nombre común de la especie — clave única (ej: "gecko leopardo") */
  especie: text("especie").notNull().unique(),
  /** Nombre científico (ej: "Eublepharis macularius") — también único, nullable */
  nombreCientifico: text("nombre_cientifico"),
  /** Categoría de la mascota (reptil, ave, pez, mamifero, artropodo) */
  categoria: text("categoria").notNull(),
  /** JSON serializado de CuidadosEspecie */
  datos: text("datos").notNull(),
  /**
   * Fecha de última generación. Se usa para determinar si el caché
   * está vigente (< 15 días) o debe refrescarse consultando Groq.
   */
  fechaGeneracion: timestamp("fecha_generacion").defaultNow().notNull(),
});

/**
 * Tabla de análisis IA generados para una mascota.
 *
 * Cada fila representa un análisis completo generado por el pipeline
 * inteligente (regresión lineal + árbol de decisión + Groq).
 * Permite consultar el historial clínico y evitar llamadas repetidas
 * al servicio cognitivo cuando el análisis tiene menos de 7 días.
 *
 * Los campos alertas, regresion y cuidados se almacenan como JSON
 * serializado en columnas de texto.
 */
export const analisisIa = pgTable("analisis_ia", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mascotaId: varchar("mascota_id").notNull().references(() => mascotas.id, { onDelete: "cascade" }),
  /** Fecha y hora de generación del análisis (ISO 8601) */
  fechaGeneracion: timestamp("fecha_generacion").defaultNow().notNull(),
  /** JSON serializado de Alerta[] */
  alertas: text("alertas").notNull(),
  /** Evaluación general en texto libre */
  resumenSalud: text("resumen_salud").notNull(),
  /** Puntuación de salud 0-100 */
  puntuacion: real("puntuacion").notNull(),
  /** JSON serializado de ResultadoRegresion | null */
  regresion: text("regresion"),
  /** JSON serializado de CuidadosEspecie | null (se guarda al consultar /cuidados) */
  cuidados: text("cuidados"),
});

export const insertPerfilSchema = createInsertSchema(perfiles).pick({
  nombreUsuario: true,
  contrasena: true,
  nombreCompleto: true,
  email: true,
});

export const loginSchema = z.object({
  nombreUsuario: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  contrasena: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registroSchema = z.object({
  nombreUsuario: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  contrasena: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombreCompleto: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

export const cambiarContrasenaSchema = z.object({
  contrasenaActual: z.string().min(1, "La contraseña actual es requerida"),
  contrasenaNueva: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
});

/** Schema de validación para actualizar datos del perfil */
export const actualizarPerfilSchema = z.object({
  nombreCompleto: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  fotoBase64: z.string().optional().nullable(),
});

/** Schema de validación para crear o editar una mascota */
export const crearMascotaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(80),
  especie: z.string().min(1, "La especie es requerida").max(100),
  categoria: z.enum(["reptil", "ave", "pez", "mamifero", "artropodo", "otro"], {
    errorMap: () => ({ message: "Categoría inválida" }),
  }),
  fechaNacimiento: z.string().min(1, "La fecha de nacimiento es requerida"),
  fotoBase64: z.string().optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
});

/** Schema de validación para registrar un peso */
export const crearPesoSchema = z.object({
  peso: z.number({ invalid_type_error: "El peso debe ser un número" }).positive("El peso debe ser positivo"),
  unidad: z.enum(["g", "kg"], { errorMap: () => ({ message: "Unidad inválida — usa 'g' o 'kg'" }) }),
  fecha: z.string().min(1, "La fecha es requerida"),
});

/** Schema de validación para registrar una alimentación */
export const crearAlimentacionSchema = z.object({
  alimento: z.string().min(1, "El alimento es requerido").max(200),
  cantidad: z.string().min(1, "La cantidad es requerida").max(100),
  fecha: z.string().min(1, "La fecha es requerida"),
  notas: z.string().max(500).optional().nullable(),
});

/** Schema de validación para registrar una nota de salud */
export const crearSaludSchema = z.object({
  titulo: z.string().min(1, "El título es requerido").max(200),
  descripcion: z.string().min(1, "La descripción es requerida").max(1000),
  tipo: z.enum(["revision", "veterinario", "medicamento", "observacion"], {
    errorMap: () => ({ message: "Tipo de nota inválido" }),
  }),
  fecha: z.string().min(1, "La fecha es requerida"),
});

export type Perfil = typeof perfiles.$inferSelect;
export type InsertPerfil = z.infer<typeof insertPerfilSchema>;
export type InsertMascota = typeof mascotas.$inferInsert;
export type InsertRegistroPeso = typeof registrosPeso.$inferInsert;
export type InsertRegistroAlimentacion = typeof registrosAlimentacion.$inferInsert;
export type InsertNotaSalud = typeof notasSalud.$inferInsert;
export type AnalisisIa = typeof analisisIa.$inferSelect;
export type InsertAnalisisIa = typeof analisisIa.$inferInsert;
export type CuidadosEspecieRow = typeof cuidadosEspecie.$inferSelect;
