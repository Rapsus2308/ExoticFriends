/**
 * @fileoverview Gráfico de frecuencia de alimentación — ExoticFriends
 *
 * Muestra un gráfico de barras con los registros de alimentación
 * de los últimos 14 días. Cada barra representa un día y su altura
 * refleja cuántas veces fue alimentada la mascota ese día.
 *
 * Métricas que calcula:
 *   - Total de registros en el período
 *   - Días con al menos un registro (días "activos")
 *   - Días consecutivos sin registro (racha actual)
 */

import { StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { RegistroAlimentacion, formatearFecha } from '@/lib/tipos';
import Colors from '@/constants/colors';
import { Feather } from '@expo/vector-icons';

interface PropsGraficoAlimentacion {
  registros: RegistroAlimentacion[];
}

/** Formatea solo el día y mes corto para las etiquetas del eje X */
function formatearDiaCorto(fecha: Date): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
}

export default function GraficoAlimentacion({ registros }: PropsGraficoAlimentacion) {
  /**
   * Construye un mapa de fecha → cantidad de alimentaciones para los últimos 14 días.
   * Agrupa por la fecha local (YYYY-MM-DD) para evitar desfases de zona horaria.
   */
  const datos = useMemo(() => {
    const hoy = new Date();
    const dias: { fecha: Date; etiqueta: string; cantidad: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const dia = new Date(hoy);
      dia.setDate(hoy.getDate() - i);
      dia.setHours(0, 0, 0, 0);
      dias.push({ fecha: dia, etiqueta: formatearDiaCorto(dia), cantidad: 0 });
    }

    // Contar registros por día usando la fecha local
    registros.forEach((r) => {
      const fechaReg = new Date(r.fecha);
      fechaReg.setHours(0, 0, 0, 0);
      const idx = dias.findIndex((d) => d.fecha.getTime() === fechaReg.getTime());
      if (idx !== -1) dias[idx].cantidad++;
    });

    return dias;
  }, [registros]);

  // Estadísticas del período
  const totalRegistros = datos.reduce((sum, d) => sum + d.cantidad, 0);
  const diasActivos = datos.filter((d) => d.cantidad > 0).length;
  const maxCantidad = Math.max(...datos.map((d) => d.cantidad), 1);

  // Días consecutivos sin alimentar (streak actual)
  let diasSinAlimentar = 0;
  for (let i = datos.length - 1; i >= 0; i--) {
    if (datos[i].cantidad === 0) diasSinAlimentar++;
    else break;
  }

  const ultimoRegistro = [...registros]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

  if (registros.length === 0) {
    return (
      <View style={estilos.vacio}>
        <View style={estilos.vacioIcono}>
          <Feather name="coffee" size={28} color={Colors.colores.textoTerciario} />
        </View>
        <Text style={estilos.textoVacio}>Sin registros de alimentación</Text>
        <Text style={estilos.textoVacioSub}>Agrega el primer registro para ver la gráfica</Text>
      </View>
    );
  }

  // Dimensiones del SVG
  const chartW = 300;
  const chartH = 110;
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const graphW = chartW - padL - padR;
  const graphH = chartH - padT - padB;
  const barAncho = graphW / datos.length;
  const barPadding = 2;

  // Etiquetas del eje X (solo 4 de los 14 días para no saturar)
  const indicesEtiqueta = [0, 4, 9, 13];

  return (
    <View style={estilos.contenedor}>
      {/* Encabezado con último registro */}
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.encabezadoLabel}>Último registro</Text>
          <Text style={estilos.encabezadoValor}>
            {ultimoRegistro ? formatearFecha(ultimoRegistro.fecha) : '—'}
          </Text>
        </View>
        {diasSinAlimentar > 0 ? (
          <View style={[estilos.badge, diasSinAlimentar >= 3 ? estilos.badgeAlerta : estilos.badgeNormal]}>
            <Feather
              name="alert-circle"
              size={12}
              color={diasSinAlimentar >= 3 ? '#C0392B' : Colors.colores.acento}
            />
            <Text style={[estilos.badgeTexto, diasSinAlimentar >= 3 ? estilos.badgeTextoAlerta : estilos.badgeTextoNormal]}>
              {diasSinAlimentar} {diasSinAlimentar === 1 ? 'día sin alim.' : 'días sin alim.'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Gráfico de barras SVG */}
      <View style={estilos.graficoContenedor}>
        <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
          <Defs>
            <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.colores.acento} stopOpacity="1" />
              <Stop offset="1" stopColor={Colors.colores.acento} stopOpacity="0.6" />
            </LinearGradient>
            <LinearGradient id="barGradientVacio" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.colores.bordeSuave} stopOpacity="1" />
              <Stop offset="1" stopColor={Colors.colores.bordeSuave} stopOpacity="0.5" />
            </LinearGradient>
          </Defs>

          {/* Línea base */}
          <Line
            x1={padL}
            y1={padT + graphH}
            x2={chartW - padR}
            y2={padT + graphH}
            stroke={Colors.colores.bordeSuave}
            strokeWidth={1}
          />

          {/* Barras por día */}
          {datos.map((dia, i) => {
            const barAltura = dia.cantidad > 0
              ? Math.max((dia.cantidad / maxCantidad) * graphH, 4)
              : 3;
            const x = padL + i * barAncho + barPadding;
            const y = padT + graphH - barAltura;
            const ancho = barAncho - barPadding * 2;

            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={ancho}
                height={barAltura}
                rx={3}
                fill={dia.cantidad > 0 ? 'url(#barGradient)' : 'url(#barGradientVacio)'}
              />
            );
          })}

          {/* Etiqueta del eje Y (máximo) */}
          <SvgText
            x={padL - 4}
            y={padT + 6}
            textAnchor="end"
            fontSize={8}
            fill={Colors.colores.textoTerciario}
            fontFamily="Nunito_400Regular"
          >
            {maxCantidad}
          </SvgText>

          {/* Etiquetas del eje X */}
          {indicesEtiqueta.map((idx) => (
            <SvgText
              key={`fecha-${idx}`}
              x={padL + idx * barAncho + barAncho / 2}
              y={chartH - 4}
              textAnchor="middle"
              fontSize={8}
              fill={Colors.colores.textoTerciario}
              fontFamily="Nunito_400Regular"
            >
              {datos[idx].etiqueta}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Estadísticas del período (últimos 14 días) */}
      <View style={estilos.estadisticas}>
        <View style={estilos.stat}>
          <Text style={estilos.statValor}>{totalRegistros}</Text>
          <Text style={estilos.statLabel}>Total (14 días)</Text>
        </View>
        <View style={[estilos.stat, estilos.statCentro]}>
          <Text style={estilos.statValor}>{diasActivos}</Text>
          <Text style={estilos.statLabel}>Días activos</Text>
        </View>
        <View style={estilos.stat}>
          <Text style={estilos.statValor}>
            {diasActivos > 0 ? (totalRegistros / diasActivos).toFixed(1) : '0'}
          </Text>
          <Text style={estilos.statLabel}>Prom. / día activo</Text>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 2px 12px rgba(0,0,0,0.06)',
    elevation: 3,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  encabezadoLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.textoTerciario,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  encabezadoValor: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 2,
  },
  badgeNormal: { backgroundColor: Colors.colores.acentoSuave },
  badgeAlerta: { backgroundColor: '#FFEBEE' },
  badgeTexto: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  badgeTextoNormal: { color: Colors.colores.acento },
  badgeTextoAlerta: { color: '#C0392B' },
  graficoContenedor: {
    marginBottom: 4,
  },
  estadisticas: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.colores.bordeSuave,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statCentro: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: Colors.colores.bordeSuave,
    borderRightColor: Colors.colores.bordeSuave,
  },
  statValor: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    textAlign: 'center',
  },
  vacio: {
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  vacioIcono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.colores.bordeSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  textoVacio: {
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.textoSecundario,
    marginBottom: 4,
  },
  textoVacioSub: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    textAlign: 'center',
  },
});
