/** Categorias de mascotas exoticas soportadas por la app */
export type CategoriaMascota = 'reptil' | 'ave' | 'pez' | 'mamifero' | 'artropodo' | 'otro';

/** Datos principales de una mascota registrada */
export interface Mascota {
  id: string;
  nombre: string;
  especie: string;
  categoria: CategoriaMascota;
  fechaNacimiento: string;
  fotoBase64?: string;
  notas?: string;
  creadoEn: string;
}

/** Registro individual de peso de una mascota */
export interface RegistroPeso {
  id: string;
  mascotaId: string;
  peso: number;
  unidad: 'g' | 'kg';
  fecha: string;
}

/** Registro de alimentacion de una mascota */
export interface RegistroAlimentacion {
  id: string;
  mascotaId: string;
  alimento: string;
  cantidad: string;
  fecha: string;
  notas?: string;
}

/** Nota de salud asociada a una mascota */
export interface NotaSalud {
  id: string;
  mascotaId: string;
  titulo: string;
  descripcion: string;
  tipo: 'revision' | 'veterinario' | 'medicamento' | 'observacion';
  fecha: string;
}

/** Configuracion de categorias con etiqueta, icono y color */
export const CATEGORIAS: { valor: CategoriaMascota; etiqueta: string; icono: string; color: string }[] = [
  { valor: 'reptil', etiqueta: 'Reptil', icono: 'leaf', color: '#4CAF50' },
  { valor: 'ave', etiqueta: 'Ave', icono: 'feather', color: '#2196F3' },
  { valor: 'pez', etiqueta: 'Pez', icono: 'droplet', color: '#00BCD4' },
  { valor: 'mamifero', etiqueta: 'Mamifero', icono: 'heart', color: '#FF9800' },
  { valor: 'artropodo', etiqueta: 'Artropodo', icono: 'hexagon', color: '#9C27B0' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'alien', color: '#607D8B' },
];

/** Tipos de notas de salud disponibles */
export const TIPOS_SALUD: { valor: NotaSalud['tipo']; etiqueta: string; icono: string }[] = [
  { valor: 'revision', etiqueta: 'Revision', icono: 'eye' },
  { valor: 'veterinario', etiqueta: 'Veterinario', icono: 'activity' },
  { valor: 'medicamento', etiqueta: 'Medicamento', icono: 'plus-circle' },
  { valor: 'observacion', etiqueta: 'Observacion', icono: 'edit-3' },
];

/** Obtiene el color asociado a una categoria */
export function obtenerColorCategoria(categoria: CategoriaMascota): string {
  const cat = CATEGORIAS.find(c => c.valor === categoria);
  return cat?.color ?? '#0B3D2E';
}

/** Obtiene el nombre del icono para una categoria */
export function obtenerIconoCategoria(categoria: CategoriaMascota): string {
  const cat = CATEGORIAS.find(c => c.valor === categoria);
  return cat?.icono ?? 'circle';
}

/** Obtiene la etiqueta legible de una categoria */
export function obtenerEtiquetaCategoria(categoria: CategoriaMascota): string {
  const cat = CATEGORIAS.find(c => c.valor === categoria);
  return cat?.etiqueta ?? 'Otro';
}

/** Genera un identificador unico basado en timestamp y aleatorio */
export function generarId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/** Formatea una fecha ISO a formato legible (ej: 8 Feb 2026) */
export function formatearFecha(fecha: string): string {
  const d = new Date(fecha);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

/** Calcula la edad en años o meses desde una fecha de nacimiento */
export function calcularEdad(fechaNacimiento: string): string {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();
  if (meses < 0) {
    anios--;
    meses += 12;
  }
  if (anios > 0) {
    return `${anios} ${anios === 1 ? 'año' : 'años'}`;
  }
  return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}
