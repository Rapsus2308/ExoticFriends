import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useState } from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg';
import { RegistroPeso, formatearFecha } from '@/lib/tipos';
import Colors from '@/constants/colors';
import { Feather } from '@expo/vector-icons';

interface PropsGraficoPeso {
  registros: RegistroPeso[];
}

function formatearFechaCorta(fecha: string): string {
  const d = new Date(fecha);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}

export default function GraficoPeso({ registros }: PropsGraficoPeso) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (registros.length === 0) {
    return (
      <View style={estilos.vacio}>
        <View style={estilos.vacioIcono}>
          <Feather name="trending-up" size={28} color={Colors.colores.textoTerciario} />
        </View>
        <Text style={estilos.textoVacio}>Sin registros de peso</Text>
        <Text style={estilos.textoVacioSub}>Agrega el primer registro para ver la gráfica</Text>
      </View>
    );
  }

  const ordenados = [...registros].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const ultimosRegistros = ordenados.slice(-12);
  const pesos = ultimosRegistros.map(r => r.peso);
  const pesoMin = Math.min(...pesos);
  const pesoMax = Math.max(...pesos);
  const margen = (pesoMax - pesoMin) * 0.15 || 5;
  const rangoMin = pesoMin - margen;
  const rangoMax = pesoMax + margen;
  const rango = rangoMax - rangoMin || 1;

  const ultimoPeso = ultimosRegistros[ultimosRegistros.length - 1];
  const penultimoPeso = ultimosRegistros.length > 1 ? ultimosRegistros[ultimosRegistros.length - 2] : null;
  const diferencia = penultimoPeso ? ultimoPeso.peso - penultimoPeso.peso : 0;
  const porcentajeCambio = penultimoPeso ? ((diferencia / penultimoPeso.peso) * 100).toFixed(1) : '0';
  const subio = diferencia >= 0;

  const chartW = 300;
  const chartH = 140;
  const padL = 40;
  const padR = 16;
  const padT = 20;
  const padB = 28;
  const graphW = chartW - padL - padR;
  const graphH = chartH - padT - padB;

  const puntos = ultimosRegistros.map((r, i) => ({
    x: padL + (ultimosRegistros.length > 1 ? (i / (ultimosRegistros.length - 1)) * graphW : graphW / 2),
    y: padT + graphH - ((r.peso - rangoMin) / rango) * graphH,
    peso: r.peso,
    fecha: r.fecha,
    unidad: r.unidad,
  }));

  let linePath = '';
  let areaPath = '';
  if (puntos.length === 1) {
    linePath = `M ${puntos[0].x} ${puntos[0].y} L ${puntos[0].x} ${puntos[0].y}`;
    areaPath = `M ${puntos[0].x} ${padT + graphH} L ${puntos[0].x} ${puntos[0].y} L ${puntos[0].x} ${padT + graphH} Z`;
  } else {
    linePath = `M ${puntos[0].x} ${puntos[0].y}`;
    areaPath = `M ${puntos[0].x} ${padT + graphH} L ${puntos[0].x} ${puntos[0].y}`;
    for (let i = 1; i < puntos.length; i++) {
      const prev = puntos[i - 1];
      const curr = puntos[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
      linePath += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
      areaPath += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
    }
    areaPath += ` L ${puntos[puntos.length - 1].x} ${padT + graphH} Z`;
  }

  const numLineas = 4;
  const lineasGuia = Array.from({ length: numLineas }, (_, i) => {
    const valor = rangoMin + (rango / (numLineas - 1)) * i;
    const y = padT + graphH - ((valor - rangoMin) / rango) * graphH;
    return { valor, y };
  });

  const etiquetasFecha: { texto: string; x: number }[] = [];
  if (ultimosRegistros.length <= 4) {
    puntos.forEach((p, i) => {
      etiquetasFecha.push({ texto: formatearFechaCorta(ultimosRegistros[i].fecha), x: p.x });
    });
  } else {
    const indices = [0, Math.floor(ultimosRegistros.length / 2), ultimosRegistros.length - 1];
    indices.forEach(i => {
      etiquetasFecha.push({ texto: formatearFechaCorta(ultimosRegistros[i].fecha), x: puntos[i].x });
    });
  }

  const seleccionado = selectedIndex !== null ? ultimosRegistros[selectedIndex] : null;
  const puntoSel = selectedIndex !== null ? puntos[selectedIndex] : null;

  const handlePress = (i: number) => {
    setSelectedIndex(selectedIndex === i ? null : i);
  };

  const pesoMinRegistrado = Math.min(...pesos);
  const pesoMaxRegistrado = Math.max(...pesos);
  const pesoPromedio = (pesos.reduce((a, b) => a + b, 0) / pesos.length).toFixed(1);

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <View style={estilos.encabezadoIzq}>
          <Text style={estilos.pesoLabel}>Peso actual</Text>
          <View style={estilos.pesoFila}>
            <Text style={estilos.pesoActual}>{ultimoPeso.peso}</Text>
            <Text style={estilos.pesoUnidad}>{ultimoPeso.unidad}</Text>
          </View>
          <Text style={estilos.fechaActual}>{formatearFecha(ultimoPeso.fecha)}</Text>
        </View>
        {penultimoPeso ? (
          <View style={[estilos.cambioContenedor, subio ? estilos.cambioSubio : estilos.cambioBajo]}>
            <Feather
              name={subio ? 'trending-up' : 'trending-down'}
              size={14}
              color={subio ? '#2E7D4F' : '#C0392B'}
            />
            <Text style={[estilos.textoCambio, subio ? estilos.textoSubio : estilos.textoBajo]}>
              {subio ? '+' : ''}{porcentajeCambio}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={estilos.graficoContenedor}>
        <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.colores.primario} stopOpacity="0.25" />
              <Stop offset="1" stopColor={Colors.colores.primario} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {lineasGuia.map((linea, i) => (
            <Line
              key={i}
              x1={padL}
              y1={linea.y}
              x2={chartW - padR}
              y2={linea.y}
              stroke={Colors.colores.bordeSuave}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {lineasGuia.map((linea, i) => (
            <SvgText
              key={`label-${i}`}
              x={padL - 6}
              y={linea.y + 4}
              textAnchor="end"
              fontSize={9}
              fill={Colors.colores.textoTerciario}
              fontFamily="Nunito_400Regular"
            >
              {linea.valor.toFixed(0)}
            </SvgText>
          ))}

          <Path d={areaPath} fill="url(#areaGradient)" />
          <Path d={linePath} stroke={Colors.colores.primario} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {puntos.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={selectedIndex === i ? 6 : (i === puntos.length - 1 ? 5 : 3)}
              fill={selectedIndex === i ? Colors.colores.acento : (i === puntos.length - 1 ? Colors.colores.primario : Colors.colores.primarioClaro)}
              stroke="#fff"
              strokeWidth={selectedIndex === i ? 3 : (i === puntos.length - 1 ? 2.5 : 1.5)}
              onPress={() => handlePress(i)}
            />
          ))}

          {etiquetasFecha.map((et, i) => (
            <SvgText
              key={`fecha-${i}`}
              x={et.x}
              y={chartH - 4}
              textAnchor="middle"
              fontSize={9}
              fill={Colors.colores.textoTerciario}
              fontFamily="Nunito_400Regular"
            >
              {et.texto}
            </SvgText>
          ))}
        </Svg>

        {puntoSel && seleccionado ? (
          <View style={[estilos.tooltip, { left: Math.min(Math.max(puntoSel.x - 45, 0), chartW - 90), top: Math.max(puntoSel.y - 48, 0) }]}>
            <Text style={estilos.tooltipPeso}>{seleccionado.peso} {seleccionado.unidad}</Text>
            <Text style={estilos.tooltipFecha}>{formatearFechaCorta(seleccionado.fecha)}</Text>
          </View>
        ) : null}

        {puntos.map((p, i) => (
          <Pressable
            key={`touch-${i}`}
            onPress={() => handlePress(i)}
            style={{
              position: 'absolute',
              left: `${(p.x / chartW) * 100}%`,
              top: `${(p.y / chartH) * 100}%`,
              width: 36,
              height: 36,
              marginLeft: -18,
              marginTop: -18,
              backgroundColor: 'transparent',
            }}
          />
        ))}
      </View>

      {ultimosRegistros.length > 1 ? (
        <View style={estilos.estadisticas}>
          <View style={estilos.stat}>
            <Text style={estilos.statLabel}>Min</Text>
            <Text style={estilos.statValor}>{pesoMinRegistrado} {ultimoPeso.unidad}</Text>
          </View>
          <View style={[estilos.stat, estilos.statCentro]}>
            <Text style={estilos.statLabel}>Promedio</Text>
            <Text style={estilos.statValor}>{pesoPromedio} {ultimoPeso.unidad}</Text>
          </View>
          <View style={estilos.stat}>
            <Text style={estilos.statLabel}>Max</Text>
            <Text style={estilos.statValor}>{pesoMaxRegistrado} {ultimoPeso.unidad}</Text>
          </View>
        </View>
      ) : null}
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
    marginBottom: 16,
  },
  encabezadoIzq: {},
  pesoLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.textoTerciario,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pesoFila: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pesoActual: {
    fontSize: 32,
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.colores.texto,
  },
  pesoUnidad: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.textoSecundario,
  },
  fechaActual: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    marginTop: 2,
  },
  cambioContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  cambioSubio: {
    backgroundColor: '#E8F5E9',
  },
  cambioBajo: {
    backgroundColor: '#FFEBEE',
  },
  textoCambio: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  textoSubio: {
    color: '#2E7D4F',
  },
  textoBajo: {
    color: '#C0392B',
  },
  graficoContenedor: {
    position: 'relative',
    marginBottom: 4,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: Colors.colores.texto,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 80,
  },
  tooltipPeso: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: '#fff',
  },
  tooltipFecha: {
    fontSize: 10,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.7)',
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
  statLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    marginBottom: 2,
  },
  statValor: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
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
