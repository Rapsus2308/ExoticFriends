import { StyleSheet, Text, View, Modal, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

interface PropsModalFormulario {
  visible: boolean;
  titulo: string;
  alCerrar: () => void;
  children: React.ReactNode;
}

/** Modal inferior con scroll y soporte de teclado para formularios */
export default function ModalFormulario({ visible, titulo, alCerrar, children }: PropsModalFormulario) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const esTablet = width >= 768;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent presentationStyle="overFullScreen">
      <View style={estilos.overlay}>
        {/* Fondo siempre cubre toda la pantalla con absoluteFill */}
        <Pressable style={estilos.fondo} onPress={alCerrar} />
        <View
          style={[
            estilos.contenedor,
            { paddingBottom: insets.bottom + 16, maxHeight: height * 0.9 },
            esTablet && estilos.contenedorTablet,
          ]}
        >
          <View style={estilos.tiradorContenedor}>
            <View style={estilos.tirador} />
          </View>
          <View style={estilos.encabezado}>
            <Text style={estilos.titulo}>{titulo}</Text>
            <Pressable onPress={alCerrar} hitSlop={12}>
              <Feather name="x" size={24} color={Colors.colores.texto} />
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat
            style={estilos.scroll}
            contentContainerStyle={estilos.scrollContenido}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            bottomOffset={16}
          >
            {children}
            <View style={{ height: 20 }} />
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fondo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contenedor: {
    width: '100%',
    backgroundColor: Colors.colores.fondo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 200,
  },
  contenedorTablet: {
    maxWidth: 600,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titulo: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContenido: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
