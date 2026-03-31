/**
 * @fileoverview Componente AsistenteIA — Sistema Inteligente de ExoticFriends
 *
 * Implementa la capa de presentación del sistema inteligente (Módulo 2).
 * Consume tres endpoints del servidor:
 *
 * 1. GET /api/mascotas/:id/analisis
 *    Carga instantánea desde BD del último análisis guardado.
 *    No invoca al servicio cognitivo — respuesta inmediata.
 *
 * 2. POST /api/mascotas/:id/analizar
 *    Ejecuta el pipeline completo: regresión lineal + árbol de decisión
 *    + servicio cognitivo Groq. Guarda resultado en BD.
 *    Solo se llama cuando el usuario presiona "Actualizar" o cuando
 *    el análisis tiene más de 7 días.
 *
 * 3. GET /api/mascotas/:id/cuidados
 *    Devuelve la guía de cuidados de la especie (BD o Groq según caché).
 *
 * 4. GET /api/mascotas/:id/historial-analisis
 *    Historial clínico completo con evolución de la puntuación de salud.
 *
 * Flujo principal:
 *   Abrir → GET /analisis → mostrar último análisis (instantáneo)
 *   Actualizar → POST /analizar → nuevo análisis IA → guardar en BD
 *   Si análisis > 7 días → badge "Desactualizado" visible
 */

import { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';

// ============================================================
// TIPOS
// ============================================================

interface ResultadoRegresion {
  pendiente: number;
  intercepto: number;
  r2: number;
  prediccionProximoPeso: number;
  tendencia: 'alza' | 'baja' | 'estable';
}

interface CuidadosEspecie {
  /** Nombre científico (taxonomía) — devuelto por Groq y guardado en BD */
  nombreCientifico?: string;
  resumen: string;
  alimentacion: { frecuencia: string; alimentos: string[]; evitar: string[] };
  peso: { rangoNormal: string; alertaBajo: number; alertaAlto: number };
  salud: { checkupFrecuencia: string; signosAlerta: string[] };
  cuidados: string[];
}

interface Alerta {
  nivel: 'critico' | 'advertencia' | 'info';
  categoria: 'peso' | 'alimentacion' | 'salud';
  titulo: string;
  mensaje: string;
  accion: string;
}

/** Respuesta de GET /analisis y POST /analizar */
interface Analisis {
  id: string;
  fechaGeneracion: string;
  /** Días desde que se generó (calculado en servidor) */
  diasDesdeGeneracion: number;
  alertas: Alerta[];
  resumenSalud: string;
  puntuacion: number;
  regresion: ResultadoRegresion | null;
  cuidados?: CuidadosEspecie | null;
}

/** Fila resumida del historial clínico */
interface FilaHistorial {
  id: string;
  fechaGeneracion: string;
  resumenSalud: string;
  puntuacion: number;
  totalAlertas: number;
  regresion: ResultadoRegresion | null;
}

interface Props {
  mascotaId: string;
  nombreMascota: string;
}

// ============================================================
// CONSTANTES VISUALES
// ============================================================

const ESTILOS_NIVEL: Record<string, { fondo: string; borde: string; texto: string; icono: string }> = {
  critico:     { fondo: '#FFF0F0', borde: '#FFCDD2', texto: '#C62828', icono: 'alert-circle' },
  advertencia: { fondo: '#FFF8E1', borde: '#FFE082', texto: '#F57F17', icono: 'alert-triangle' },
  info:        { fondo: '#E8F5E9', borde: '#C8E6C9', texto: '#2E7D32', icono: 'info' },
};

const ICONOS_CATEGORIA: Record<string, string> = {
  peso: 'trending-up', alimentacion: 'coffee', salud: 'heart',
};

const COLORES_TENDENCIA: Record<string, string> = {
  alza: '#2E7D4F', baja: '#C0392B', estable: '#F57F17',
};

// ============================================================
// HELPERS
// ============================================================

/** Formatea la fecha de generación en texto relativo amigable */
function formatearFecha(isoString: string, dias: number): string {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  const fecha = new Date(isoString);
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function colorPuntuacion(p: number): string {
  return p >= 75 ? Colors.colores.exito : p >= 50 ? '#F57F17' : Colors.colores.error;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function AsistenteIA({ mascotaId, nombreMascota }: Props) {
  const [expandido, setExpandido]               = useState(false);
  const [tab, setTab]                           = useState<'alertas' | 'cuidados' | 'historial'>('alertas');
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);
  const [cargandoCuidados, setCargandoCuidados] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [analisis, setAnalisis]                 = useState<Analisis | null>(null);
  const [cuidados, setCuidados]                 = useState<CuidadosEspecie | null>(null);
  const [historial, setHistorial]               = useState<FilaHistorial[]>([]);
  const [error, setError]                       = useState<string | null>(null);
  const [sinAnalisisPrevio, setSinAnalisisPrevio] = useState(false);

  /**
   * Carga el último análisis desde BD (instantáneo, sin llamar a Groq).
   * Si no hay análisis guardado, marca sinAnalisisPrevio = true.
   */
  const cargarDesdeDB = async () => {
    setCargandoAnalisis(true);
    setError(null);
    setSinAnalisisPrevio(false);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(
        new URL(`/api/mascotas/${mascotaId}/analisis`, baseUrl).toString(),
        { credentials: 'include' }
      );
      if (res.status === 404) {
        setSinAnalisisPrevio(true);
        return;
      }
      if (!res.ok) throw new Error('Error al cargar análisis');
      const datos: Analisis = await res.json();
      setAnalisis(datos);
      // Si el análisis tiene cuidados guardados, usarlos directamente
      if (datos.cuidados) setCuidados(datos.cuidados);
    } catch {
      setError('No se pudo cargar el análisis guardado.');
    } finally {
      setCargandoAnalisis(false);
    }
  };

  /**
   * Genera un nuevo análisis completo (regresión + árbol decisión + Groq)
   * y lo guarda en BD. Solo se llama al presionar "Actualizar" o si
   * el análisis tiene más de 7 días.
   */
  const generarNuevoAnalisis = async () => {
    setCargandoAnalisis(true);
    setError(null);
    setSinAnalisisPrevio(false);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(
        new URL(`/api/mascotas/${mascotaId}/analizar`, baseUrl).toString(),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) throw new Error('Error al analizar');
      setAnalisis(await res.json());
    } catch {
      setError('No se pudo obtener el análisis. Verifica tu conexión.');
    } finally {
      setCargandoAnalisis(false);
    }
  };

  /** Carga la guía de cuidados (desde BD si está disponible, si no llama a Groq) */
  const cargarCuidados = async () => {
    if (cuidados) return; // ya cargados
    setCargandoCuidados(true);
    setError(null);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(
        new URL(`/api/mascotas/${mascotaId}/cuidados`, baseUrl).toString(),
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Error al cargar cuidados');
      setCuidados(await res.json());
    } catch {
      setError('No se pudieron cargar los cuidados. Verifica tu conexión.');
    } finally {
      setCargandoCuidados(false);
    }
  };

  /** Carga el historial completo de análisis de la mascota */
  const cargarHistorial = async () => {
    if (historial.length > 0) return;
    setCargandoHistorial(true);
    setError(null);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(
        new URL(`/api/mascotas/${mascotaId}/historial-analisis`, baseUrl).toString(),
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Error al cargar historial');
      setHistorial(await res.json());
    } catch {
      setError('No se pudo cargar el historial clínico.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  /** Abre la tarjeta y carga el análisis desde BD */
  const alAbrir = () => {
    if (!expandido) {
      setExpandido(true);
      if (!analisis && !sinAnalisisPrevio) cargarDesdeDB();
    } else {
      setExpandido(false);
    }
  };

  /** Cambia pestaña y carga datos si es necesario */
  const alCambiarTab = (nuevaTab: typeof tab) => {
    setTab(nuevaTab);
    if (nuevaTab === 'cuidados') cargarCuidados();
    if (nuevaTab === 'historial') cargarHistorial();
  };

  const desactualizado = analisis ? analisis.diasDesdeGeneracion >= 7 : false;

  return (
    <View style={estilos.contenedor}>
      {/* ---- CABECERA ---- */}
      <Pressable onPress={alAbrir} style={estilos.cabecera}>
        <View style={estilos.cabeceraIzq}>
          <View style={estilos.iconoIA}>
            <Feather name="cpu" size={18} color={Colors.colores.primario} />
          </View>
          <View>
            <Text style={estilos.cabeceraTitulo}>Asistente IA</Text>
            <Text style={estilos.cabeceraSubtitulo}>
              {analisis
                ? `Análisis: ${formatearFecha(analisis.fechaGeneracion, analisis.diasDesdeGeneracion)}`
                : 'Análisis y recomendaciones'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {desactualizado ? (
            <View style={estilos.badgeDesact}>
              <Text style={estilos.badgeDesactTexto}>Desactualizado</Text>
            </View>
          ) : analisis ? (
            <View style={estilos.badgeOk}>
              <Feather name="check" size={10} color={Colors.colores.exito} />
            </View>
          ) : null}
          <Feather
            name={expandido ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.colores.textoSecundario}
          />
        </View>
      </Pressable>

      {expandido ? (
        <View style={estilos.cuerpo}>
          {/* ---- TABS ---- */}
          <View style={estilos.tabs}>
            {(['alertas', 'cuidados', 'historial'] as const).map((t) => (
              <Pressable
                key={t}
                style={[estilos.tab, tab === t && estilos.tabActivo]}
                onPress={() => alCambiarTab(t)}
              >
                <Feather
                  name={t === 'alertas' ? 'bell' : t === 'cuidados' ? 'book-open' : 'clock'}
                  size={13}
                  color={tab === t ? Colors.colores.primario : Colors.colores.textoTerciario}
                />
                <Text style={[estilos.tabTexto, tab === t && estilos.tabTextoActivo]}>
                  {t === 'alertas' ? 'Alertas' : t === 'cuidados' ? 'Cuidados' : 'Historial'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ---- ERROR ---- */}
          {error ? (
            <View style={estilos.centrado}>
              <Feather name="wifi-off" size={22} color={Colors.colores.error} />
              <Text style={estilos.errorTexto}>{error}</Text>
              <Pressable
                style={estilos.botonSecundario}
                onPress={() => {
                  setError(null);
                  if (tab === 'alertas') cargarDesdeDB();
                  else if (tab === 'cuidados') { setCuidados(null); cargarCuidados(); }
                  else { setHistorial([]); cargarHistorial(); }
                }}
              >
                <Text style={estilos.botonSecundarioTexto}>Reintentar</Text>
              </Pressable>
            </View>

          ) : tab === 'alertas' ? (
            /* ==================== TAB: ALERTAS ==================== */
            cargandoAnalisis ? (
              <View style={estilos.centrado}>
                <ActivityIndicator color={Colors.colores.primario} size="large" />
                <Text style={estilos.cargandoTexto}>
                  {sinAnalisisPrevio ? 'Generando primer análisis…' : 'Analizando a ' + nombreMascota + '…'}
                </Text>
                <Text style={estilos.cargandoSub}>Regresión lineal + análisis IA</Text>
              </View>
            ) : sinAnalisisPrevio ? (
              /* Sin análisis previo: invitar a generar el primero */
              <View style={estilos.centrado}>
                <Feather name="cpu" size={28} color={Colors.colores.primario} />
                <Text style={estilos.sinAnalisisTitulo}>Sin análisis previo</Text>
                <Text style={estilos.sinAnalisisDesc}>
                  Genera el primer análisis de salud para {nombreMascota}.
                </Text>
                <Pressable style={estilos.botonPrimario} onPress={generarNuevoAnalisis}>
                  <Feather name="zap" size={15} color="#fff" />
                  <Text style={estilos.botonPrimarioTexto}>Analizar ahora</Text>
                </Pressable>
              </View>
            ) : analisis ? (
              <View style={{ gap: 12 }}>
                {/* Aviso de análisis desactualizado */}
                {desactualizado ? (
                  <View style={estilos.avisoDesact}>
                    <Feather name="alert-circle" size={13} color="#F57F17" />
                    <Text style={estilos.avisoDesactTexto}>
                      Análisis de hace {analisis.diasDesdeGeneracion} días — se recomienda actualizar
                    </Text>
                  </View>
                ) : null}

                {/* Puntuación de salud */}
                <View style={estilos.puntuacionFila}>
                  <View style={estilos.puntuacionCirculo}>
                    <Text style={[estilos.puntuacionNum, { color: colorPuntuacion(analisis.puntuacion) }]}>
                      {analisis.puntuacion}
                    </Text>
                    <Text style={estilos.puntuacionSub}>/ 100</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.puntuacionTitulo}>Estado general</Text>
                    <Text style={estilos.puntuacionResumen}>{analisis.resumenSalud}</Text>
                  </View>
                </View>

                {/* Tendencia de peso */}
                {analisis.regresion ? (
                  <View style={estilos.regresionCard}>
                    <View style={estilos.regresionTituloFila}>
                      <Feather name="bar-chart-2" size={14} color={Colors.colores.primario} />
                      <Text style={estilos.regresionTitulo}>Tendencia de peso</Text>
                    </View>
                    <View style={estilos.regresionFila}>
                      <View style={estilos.regresionItem}>
                        <Text style={estilos.regresionLabel}>Estado</Text>
                        <Text style={[estilos.regresionValor, { color: COLORES_TENDENCIA[analisis.regresion.tendencia] }]}>
                          {analisis.regresion.tendencia === 'alza' ? '↑ Subiendo' :
                           analisis.regresion.tendencia === 'baja' ? '↓ Bajando' : '→ Estable'}
                        </Text>
                      </View>
                      <View style={[estilos.regresionItem, estilos.regresionItemBorde]}>
                        <Text style={estilos.regresionLabel}>Predicción 7d</Text>
                        <Text style={estilos.regresionValor}>
                          {analisis.regresion.prediccionProximoPeso} g
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Alertas */}
                {analisis.alertas.length === 0 ? (
                  <View style={estilos.centrado}>
                    <Feather name="check-circle" size={24} color={Colors.colores.exito} />
                    <Text style={estilos.sinAlertasTexto}>Todo bien con {nombreMascota}</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {analisis.alertas.map((alerta, i) => {
                      const est = ESTILOS_NIVEL[alerta.nivel] ?? ESTILOS_NIVEL.info;
                      return (
                        <View key={i} style={[estilos.alertaItem, { backgroundColor: est.fondo, borderColor: est.borde }]}>
                          <View style={estilos.alertaHeader}>
                            <Feather name={est.icono as any} size={15} color={est.texto} />
                            <Text style={[estilos.alertaTitulo, { color: est.texto }]}>{alerta.titulo}</Text>
                            <View style={[estilos.categoriaTag, { backgroundColor: est.borde }]}>
                              <Feather name={ICONOS_CATEGORIA[alerta.categoria] as any} size={10} color={est.texto} />
                            </View>
                          </View>
                          <Text style={estilos.alertaMensaje}>{alerta.mensaje}</Text>
                          {alerta.accion ? (
                            <View style={estilos.alertaAccionFila}>
                              <Feather name="arrow-right" size={12} color={est.texto} />
                              <Text style={[estilos.alertaAccionTexto, { color: est.texto }]}>{alerta.accion}</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}

                <Pressable style={estilos.botonSecundario} onPress={generarNuevoAnalisis}>
                  <Feather name="refresh-cw" size={13} color={Colors.colores.primario} />
                  <Text style={estilos.botonSecundarioTexto}>Actualizar análisis</Text>
                </Pressable>
              </View>
            ) : null

          ) : tab === 'cuidados' ? (
            /* ==================== TAB: CUIDADOS ==================== */
            cargandoCuidados ? (
              <View style={estilos.centrado}>
                <ActivityIndicator color={Colors.colores.primario} size="large" />
                <Text style={estilos.cargandoTexto}>Cargando guía de cuidados…</Text>
              </View>
            ) : cuidados ? (
              <View style={{ gap: 10 }}>
                {/* Nombre científico de la especie */}
                {cuidados.nombreCientifico ? (
                  <View style={estilos.tagCientifico}>
                    <Feather name="tag" size={11} color={Colors.colores.primario} />
                    <Text style={estilos.tagCientificoTexto}>
                      {cuidados.nombreCientifico}
                    </Text>
                  </View>
                ) : null}
                <Text style={estilos.resumen}>{cuidados.resumen}</Text>
                <SeccionCuidado icono="coffee" color={Colors.colores.acento} titulo="Alimentación">
                  <Text style={estilos.dato}><Text style={estilos.datoLabel}>Frecuencia: </Text>{cuidados.alimentacion.frecuencia}</Text>
                  <Text style={[estilos.datoLabel, { marginTop: 8 }]}>Recomendados:</Text>
                  {cuidados.alimentacion.alimentos.map((a, i) => <ItemLista key={i} color={Colors.colores.exito} texto={a} />)}
                  {cuidados.alimentacion.evitar.length > 0 ? (
                    <>
                      <Text style={[estilos.datoLabel, { marginTop: 8 }]}>Evitar:</Text>
                      {cuidados.alimentacion.evitar.map((a, i) => <ItemLista key={i} color={Colors.colores.error} texto={a} />)}
                    </>
                  ) : null}
                </SeccionCuidado>
                <SeccionCuidado icono="trending-up" color={Colors.colores.primario} titulo="Peso saludable">
                  <Text style={estilos.dato}><Text style={estilos.datoLabel}>Rango normal: </Text>{cuidados.peso.rangoNormal}</Text>
                </SeccionCuidado>
                <SeccionCuidado icono="heart" color={Colors.colores.error} titulo="Salud">
                  <Text style={estilos.dato}><Text style={estilos.datoLabel}>Checkup: </Text>{cuidados.salud.checkupFrecuencia}</Text>
                  <Text style={[estilos.datoLabel, { marginTop: 8 }]}>Signos de alerta:</Text>
                  {cuidados.salud.signosAlerta.map((s, i) => <ItemLista key={i} color="#F57F17" texto={s} />)}
                </SeccionCuidado>
                <SeccionCuidado icono="star" color={Colors.colores.acento} titulo="Cuidados esenciales">
                  {cuidados.cuidados.map((c, i) => <ItemLista key={i} color={Colors.colores.primario} texto={c} />)}
                </SeccionCuidado>
              </View>
            ) : (
              <View style={estilos.centrado}>
                <Text style={estilos.sinAlertasTexto}>Primero genera un análisis en la pestaña Alertas.</Text>
              </View>
            )

          ) : (
            /* ==================== TAB: HISTORIAL ==================== */
            cargandoHistorial ? (
              <View style={estilos.centrado}>
                <ActivityIndicator color={Colors.colores.primario} size="large" />
                <Text style={estilos.cargandoTexto}>Cargando historial clínico…</Text>
              </View>
            ) : historial.length === 0 ? (
              <View style={estilos.centrado}>
                <Feather name="clock" size={24} color={Colors.colores.textoTerciario} />
                <Text style={estilos.sinAlertasTexto}>Sin historial aún</Text>
                <Text style={estilos.cargandoSub}>Los análisis generados aparecerán aquí</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={estilos.historialTitulo}>Evolución clínica</Text>
                {historial.map((item, i) => {
                  const fecha = new Date(item.fechaGeneracion);
                  const etiqueta = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <View key={item.id} style={estilos.historialItem}>
                      <View style={estilos.historialIzq}>
                        <View style={[estilos.historialCirculo, { borderColor: colorPuntuacion(item.puntuacion) }]}>
                          <Text style={[estilos.historialPuntuacion, { color: colorPuntuacion(item.puntuacion) }]}>
                            {item.puntuacion}
                          </Text>
                        </View>
                        {i < historial.length - 1 ? <View style={estilos.historialLinea} /> : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 16 }}>
                        <Text style={estilos.historialFecha}>{etiqueta}</Text>
                        <Text style={estilos.historialResumen} numberOfLines={2}>{item.resumenSalud}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                          <Text style={estilos.historialMeta}>
                            {item.totalAlertas} {item.totalAlertas === 1 ? 'alerta' : 'alertas'}
                          </Text>
                          {item.regresion ? (
                            <Text style={[estilos.historialMeta, { color: COLORES_TENDENCIA[item.regresion.tendencia] }]}>
                              Peso: {item.regresion.tendencia === 'alza' ? '↑' : item.regresion.tendencia === 'baja' ? '↓' : '→'} {item.regresion.tendencia}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          )}
        </View>
      ) : null}
    </View>
  );
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function SeccionCuidado({ icono, color, titulo, children }: { icono: string; color: string; titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <View style={estilos.seccionTituloFila}>
        <Feather name={icono as any} size={14} color={color} />
        <Text style={estilos.seccionTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function ItemLista({ color, texto }: { color: string; texto: string }) {
  return (
    <View style={estilos.listItem}>
      <View style={[estilos.listDot, { backgroundColor: color }]} />
      <Text style={estilos.listTexto}>{texto}</Text>
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 12px rgba(0,0,0,0.06)' } : { elevation: 3 }),
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cabeceraIzq: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconoIA: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.colores.primarioSuave,
    alignItems: 'center', justifyContent: 'center',
  },
  cabeceraTitulo: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto },
  cabeceraSubtitulo: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario, marginTop: 1 },
  badgeDesact: { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDesactTexto: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: '#F57F17' },
  badgeOk: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
  },
  cuerpo: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: Colors.colores.bordeSuave },
  tabs: { flexDirection: 'row', gap: 6, paddingTop: 14, paddingBottom: 10 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 12, backgroundColor: Colors.colores.fondo,
  },
  tabActivo: { backgroundColor: Colors.colores.primarioSuave },
  tabTexto: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.textoTerciario },
  tabTextoActivo: { color: Colors.colores.primario },
  centrado: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  cargandoTexto: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.texto },
  cargandoSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario },
  errorTexto: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario, textAlign: 'center' },
  sinAnalisisTitulo: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto },
  sinAnalisisDesc: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario, textAlign: 'center', paddingHorizontal: 16 },
  botonPrimario: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14,
    backgroundColor: Colors.colores.primario,
  },
  botonPrimarioTexto: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#fff' },
  botonSecundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.colores.fondo,
  },
  botonSecundarioTexto: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.primario },
  avisoDesact: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10,
  },
  avisoDesactTexto: { flex: 1, fontSize: 12, fontFamily: 'Nunito_400Regular', color: '#F57F17' },
  puntuacionFila: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.colores.fondo, borderRadius: 14, padding: 14,
  },
  puntuacionCirculo: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.colores.fondoTarjeta,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' } : { elevation: 2 }),
  },
  puntuacionNum: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  puntuacionSub: { fontSize: 10, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario },
  puntuacionTitulo: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto, marginBottom: 4 },
  puntuacionResumen: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario, lineHeight: 17 },
  regresionCard: { backgroundColor: Colors.colores.fondo, borderRadius: 14, padding: 14, gap: 8 },
  regresionTituloFila: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  regresionTitulo: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto },
  regresionFila: { flexDirection: 'row', marginTop: 4 },
  regresionItem: { flex: 1, alignItems: 'center' },
  regresionItemBorde: { borderLeftWidth: 1, borderRightWidth: 1, borderLeftColor: Colors.colores.bordeSuave, borderRightColor: Colors.colores.bordeSuave },
  regresionLabel: { fontSize: 10, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario, marginBottom: 2 },
  regresionValor: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto },
  alertaItem: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  alertaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertaTitulo: { flex: 1, fontSize: 14, fontFamily: 'Nunito_700Bold' },
  categoriaTag: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  alertaMensaje: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario, lineHeight: 18 },
  alertaAccionFila: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  alertaAccionTexto: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  sinAlertasTexto: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.textoSecundario },
  tagCientifico: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: Colors.colores.primarioSuave,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  tagCientificoTexto: {
    fontSize: 12, fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.primario, fontStyle: 'italic',
  },
  resumen: { fontSize: 14, fontFamily: 'Nunito_400Regular', fontStyle: 'italic', color: Colors.colores.textoSecundario, lineHeight: 20 },
  seccion: { backgroundColor: Colors.colores.fondo, borderRadius: 14, padding: 14, gap: 4 },
  seccionTituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  seccionTitulo: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto },
  dato: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario, lineHeight: 18 },
  datoLabel: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.texto },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 },
  listDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  listTexto: { flex: 1, fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario, lineHeight: 18 },
  historialTitulo: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto, marginBottom: 4 },
  historialItem: { flexDirection: 'row', gap: 12 },
  historialIzq: { alignItems: 'center', width: 40 },
  historialCirculo: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2,
    backgroundColor: Colors.colores.fondoTarjeta,
    alignItems: 'center', justifyContent: 'center',
  },
  historialPuntuacion: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  historialLinea: { flex: 1, width: 2, backgroundColor: Colors.colores.bordeSuave, marginTop: 4 },
  historialFecha: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.texto },
  historialResumen: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario, lineHeight: 17, marginTop: 2 },
  historialMeta: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario },
});
