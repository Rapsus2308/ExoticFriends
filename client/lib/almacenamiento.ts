/** Capa de persistencia local usando AsyncStorage para gestionar mascotas y sus registros asociados (peso, alimentacion, salud) */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mascota, RegistroPeso, RegistroAlimentacion, NotaSalud } from './tipos';

/** Claves de almacenamiento en AsyncStorage */
const CLAVES = {
  mascotas: 'exoticfriends_mascotas',
  pesos: 'exoticfriends_pesos',
  alimentacion: 'exoticfriends_alimentacion',
  salud: 'exoticfriends_salud',
};

/** Lee y parsea datos genericos desde AsyncStorage */
async function obtenerDatos<T>(clave: string): Promise<T[]> {
  try {
    const datos = await AsyncStorage.getItem(clave);
    return datos ? JSON.parse(datos) : [];
  } catch {
    return [];
  }
}

/** Serializa y guarda datos genericos en AsyncStorage */
async function guardarDatos<T>(clave: string, datos: T[]): Promise<void> {
  await AsyncStorage.setItem(clave, JSON.stringify(datos));
}

/** Obtiene la lista completa de mascotas registradas */
export async function obtenerMascotas(): Promise<Mascota[]> {
  return obtenerDatos<Mascota>(CLAVES.mascotas);
}

/** Busca y devuelve una mascota por su identificador */
export async function obtenerMascotaPorId(id: string): Promise<Mascota | undefined> {
  const mascotas = await obtenerMascotas();
  return mascotas.find(m => m.id === id);
}

/** Agrega una nueva mascota al almacenamiento */
export async function agregarMascota(mascota: Mascota): Promise<void> {
  const mascotas = await obtenerMascotas();
  mascotas.push(mascota);
  await guardarDatos(CLAVES.mascotas, mascotas);
}

/** Actualiza los datos de una mascota existente */
export async function actualizarMascota(mascota: Mascota): Promise<void> {
  const mascotas = await obtenerMascotas();
  const indice = mascotas.findIndex(m => m.id === mascota.id);
  if (indice >= 0) {
    mascotas[indice] = mascota;
    await guardarDatos(CLAVES.mascotas, mascotas);
  }
}

/** Elimina una mascota y todos sus registros asociados */
export async function eliminarMascota(id: string): Promise<void> {
  const mascotas = await obtenerMascotas();
  await guardarDatos(CLAVES.mascotas, mascotas.filter(m => m.id !== id));
  const pesos = await obtenerRegistrosPeso(id);
  await guardarDatos(CLAVES.pesos, (await obtenerDatos<RegistroPeso>(CLAVES.pesos)).filter(p => p.mascotaId !== id));
  const alimentos = await obtenerRegistrosAlimentacion(id);
  await guardarDatos(CLAVES.alimentacion, (await obtenerDatos<RegistroAlimentacion>(CLAVES.alimentacion)).filter(a => a.mascotaId !== id));
  const salud = await obtenerNotasSalud(id);
  await guardarDatos(CLAVES.salud, (await obtenerDatos<NotaSalud>(CLAVES.salud)).filter(s => s.mascotaId !== id));
}

/** Obtiene los registros de peso de una mascota ordenados por fecha */
export async function obtenerRegistrosPeso(mascotaId: string): Promise<RegistroPeso[]> {
  const todos = await obtenerDatos<RegistroPeso>(CLAVES.pesos);
  return todos.filter(p => p.mascotaId === mascotaId).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

/** Agrega un nuevo registro de peso */
export async function agregarRegistroPeso(registro: RegistroPeso): Promise<void> {
  const todos = await obtenerDatos<RegistroPeso>(CLAVES.pesos);
  todos.push(registro);
  await guardarDatos(CLAVES.pesos, todos);
}

/** Elimina un registro de peso por su identificador */
export async function eliminarRegistroPeso(id: string): Promise<void> {
  const todos = await obtenerDatos<RegistroPeso>(CLAVES.pesos);
  await guardarDatos(CLAVES.pesos, todos.filter(p => p.id !== id));
}

/** Obtiene los registros de alimentacion de una mascota ordenados por fecha */
export async function obtenerRegistrosAlimentacion(mascotaId: string): Promise<RegistroAlimentacion[]> {
  const todos = await obtenerDatos<RegistroAlimentacion>(CLAVES.alimentacion);
  return todos.filter(a => a.mascotaId === mascotaId).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

/** Agrega un nuevo registro de alimentacion */
export async function agregarRegistroAlimentacion(registro: RegistroAlimentacion): Promise<void> {
  const todos = await obtenerDatos<RegistroAlimentacion>(CLAVES.alimentacion);
  todos.push(registro);
  await guardarDatos(CLAVES.alimentacion, todos);
}

/** Elimina un registro de alimentacion por su identificador */
export async function eliminarRegistroAlimentacion(id: string): Promise<void> {
  const todos = await obtenerDatos<RegistroAlimentacion>(CLAVES.alimentacion);
  await guardarDatos(CLAVES.alimentacion, todos.filter(a => a.id !== id));
}

/** Obtiene las notas de salud de una mascota ordenadas por fecha */
export async function obtenerNotasSalud(mascotaId: string): Promise<NotaSalud[]> {
  const todos = await obtenerDatos<NotaSalud>(CLAVES.salud);
  return todos.filter(s => s.mascotaId === mascotaId).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

/** Agrega una nueva nota de salud */
export async function agregarNotaSalud(nota: NotaSalud): Promise<void> {
  const todos = await obtenerDatos<NotaSalud>(CLAVES.salud);
  todos.push(nota);
  await guardarDatos(CLAVES.salud, todos);
}

/** Elimina una nota de salud por su identificador */
export async function eliminarNotaSalud(id: string): Promise<void> {
  const todos = await obtenerDatos<NotaSalud>(CLAVES.salud);
  await guardarDatos(CLAVES.salud, todos.filter(s => s.id !== id));
}

/** Obtiene todos los registros de peso de todas las mascotas */
export async function obtenerTodosLosPesos(): Promise<RegistroPeso[]> {
  return obtenerDatos<RegistroPeso>(CLAVES.pesos);
}

/** Obtiene todos los registros de alimentacion de todas las mascotas */
export async function obtenerTodaLaAlimentacion(): Promise<RegistroAlimentacion[]> {
  return obtenerDatos<RegistroAlimentacion>(CLAVES.alimentacion);
}

/** Obtiene todas las notas de salud de todas las mascotas */
export async function obtenerTodasLasNotasSalud(): Promise<NotaSalud[]> {
  return obtenerDatos<NotaSalud>(CLAVES.salud);
}
