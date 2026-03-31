import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, FlatList, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

interface PropsSelectorFecha {
  etiqueta?: string;
  valor: Date | null;
  alCambiar: (fecha: Date) => void;
  error?: string;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ALTO_ITEM = 44;

function obtenerDiasEnMes(mes: number, anio: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

function generarAnios(): number[] {
  const anioActual = new Date().getFullYear();
  const resultado: number[] = [];
  for (let i = anioActual; i >= anioActual - 50; i--) {
    resultado.push(i);
  }
  return resultado;
}

/** Columna individual del selector de fecha con scroll y seleccion */
function ColumnaRueda({
  datos,
  seleccionado,
  alSeleccionar,
  renderizarItem,
}: {
  datos: (string | number)[];
  seleccionado: number;
  alSeleccionar: (indice: number) => void;
  renderizarItem: (item: string | number) => string;
}) {
  return (
    <View style={estilos.columna}>
      <FlatList
        data={datos}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ALTO_ITEM}
        decelerationRate="fast"
        initialScrollIndex={Math.max(0, seleccionado)}
        getItemLayout={(_, indice) => ({
          length: ALTO_ITEM,
          offset: ALTO_ITEM * indice,
          index: indice,
        })}
        renderItem={({ item, index }) => (
          <Pressable
            style={[estilos.itemRueda, index === seleccionado && estilos.itemSeleccionado]}
            onPress={() => alSeleccionar(index)}
          >
            <Text style={[estilos.textoItem, index === seleccionado && estilos.textoSeleccionado]}>
              {renderizarItem(item)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

/** Selector de fecha modal con columnas dia/mes/año estilo rueda */
export default function SelectorFecha({ etiqueta, valor, alCambiar, error }: PropsSelectorFecha) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const fechaActual = valor ?? new Date();
  const [diaTemp, setDiaTemp] = useState(fechaActual.getDate());
  const [mesTemp, setMesTemp] = useState(fechaActual.getMonth());
  const [anioTemp, setAnioTemp] = useState(fechaActual.getFullYear());

  const anios = generarAnios();
  const diasEnMes = obtenerDiasEnMes(mesTemp, anioTemp);

  useEffect(() => {
    if (diaTemp > diasEnMes) {
      setDiaTemp(diasEnMes);
    }
  }, [mesTemp, anioTemp, diasEnMes, diaTemp]);

  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);

  const abrirModal = () => {
    const f = valor ?? new Date();
    setDiaTemp(f.getDate());
    setMesTemp(f.getMonth());
    setAnioTemp(f.getFullYear());
    setModalVisible(true);
  };

  const confirmar = () => {
    const nuevaFecha = new Date(anioTemp, mesTemp, diaTemp);
    alCambiar(nuevaFecha);
    setModalVisible(false);
  };

  const textoMostrar = valor
    ? `${String(valor.getDate()).padStart(2, '0')} ${MESES[valor.getMonth()]} ${valor.getFullYear()}`
    : 'Seleccionar fecha';

  return (
    <View style={estilos.contenedor}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <Pressable
        style={[estilos.campoContenedor, error ? estilos.campoError : null]}
        onPress={abrirModal}
      >
        <View style={estilos.iconoContenedor}>
          <Feather name="calendar" size={18} color={Colors.colores.textoTerciario} />
        </View>
        <Text style={[estilos.textoValor, !valor && estilos.textoPlaceholder]}>
          {textoMostrar}
        </Text>
        <Feather name="chevron-down" size={16} color={Colors.colores.textoTerciario} />
      </Pressable>
      {error ? <Text style={estilos.textoError}>{error}</Text> : null}

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={estilos.overlay} onPress={() => setModalVisible(false)} />
        <View style={[estilos.modalContenedor, { paddingBottom: insets.bottom + 16 }]}>
          <View style={estilos.tiradorContenedor}>
            <View style={estilos.tirador} />
          </View>
          <View style={estilos.modalEncabezado}>
            <Text style={estilos.modalTitulo}>Fecha de nacimiento</Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <Feather name="x" size={24} color={Colors.colores.texto} />
            </Pressable>
          </View>

          <View style={estilos.previewFecha}>
            <Text style={estilos.previewTexto}>
              {String(diaTemp).padStart(2, '0')} de {MESES[mesTemp]} {anioTemp}
            </Text>
          </View>

          <View style={estilos.columnasContenedor}>
            <ColumnaRueda
              datos={dias}
              seleccionado={diaTemp - 1}
              alSeleccionar={(i) => setDiaTemp(i + 1)}
              renderizarItem={(item) => String(item).padStart(2, '0')}
            />
            <ColumnaRueda
              datos={MESES}
              seleccionado={mesTemp}
              alSeleccionar={setMesTemp}
              renderizarItem={(item) => String(item)}
            />
            <ColumnaRueda
              datos={anios}
              seleccionado={anios.indexOf(anioTemp)}
              alSeleccionar={(i) => setAnioTemp(anios[i])}
              renderizarItem={(item) => String(item)}
            />
          </View>

          <Pressable style={estilos.botonConfirmar} onPress={confirmar}>
            <Feather name="check" size={20} color="#fff" />
            <Text style={estilos.botonConfirmarTexto}>Confirmar</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    marginBottom: 16,
  },
  etiqueta: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.texto,
    marginBottom: 6,
  },
  campoContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.colores.borde,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  campoError: {
    borderColor: Colors.colores.error,
  },
  iconoContenedor: {},
  textoValor: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.texto,
  },
  textoPlaceholder: {
    color: Colors.colores.textoTerciario,
  },
  textoError: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.error,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContenedor: {
    backgroundColor: Colors.colores.fondo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  tiradorContenedor: {
    alignItems: 'center',
    paddingTop: 10,
  },
  tirador: {
    width: 40,
    height: 4,
    backgroundColor: Colors.colores.borde,
    borderRadius: 2,
  },
  modalEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitulo: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
  previewFecha: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
    backgroundColor: Colors.colores.primarioSuave,
    borderRadius: 12,
  },
  previewTexto: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.primario,
  },
  columnasContenedor: {
    flexDirection: 'row',
    height: ALTO_ITEM * 5,
    gap: 8,
    marginTop: 8,
  },
  columna: {
    flex: 1,
    overflow: 'hidden',
  },
  itemRueda: {
    height: ALTO_ITEM,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  itemSeleccionado: {
    backgroundColor: Colors.colores.primarioSuave,
  },
  textoItem: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoSecundario,
  },
  textoSeleccionado: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.primario,
  },
  botonConfirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.colores.primario,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 16,
  },
  botonConfirmarTexto: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#fff',
  },
});
