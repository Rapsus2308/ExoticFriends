import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

interface PropsModalFormulario {
  visible: boolean;
  titulo: string;
  alCerrar: () => void;
  children: React.ReactNode;
}

const { height: ALTO_PANTALLA } = Dimensions.get('window');

/** Modal inferior con scroll y soporte de teclado para formularios */
export default function ModalFormulario({ visible, titulo, alCerrar, children }: PropsModalFormulario) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={estilos.overlay}>
        <Pressable style={estilos.fondo} onPress={alCerrar} />
        <KeyboardAvoidingView
          style={estilos.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <View style={[estilos.contenedor, { paddingBottom: insets.bottom + 16, maxHeight: ALTO_PANTALLA * 0.9 }]}>
            <View style={estilos.tiradorContenedor}>
              <View style={estilos.tirador} />
            </View>
            <View style={estilos.encabezado}>
              <Text style={estilos.titulo}>{titulo}</Text>
              <Pressable onPress={alCerrar} hitSlop={12}>
                <Feather name="x" size={24} color={Colors.colores.texto} />
              </Pressable>
            </View>
            <ScrollView
              style={estilos.scroll}
              contentContainerStyle={estilos.scrollContenido}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bounces={true}
              nestedScrollEnabled={true}
            >
              {children}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  contenedor: {
    backgroundColor: Colors.colores.fondo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 200,
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
