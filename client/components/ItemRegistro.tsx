import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface PropsItemRegistro {
  icono: string;
  colorIcono: string;
  titulo: string;
  subtitulo: string;
  detalle?: string;
  alEliminar?: () => void;
}

/** Item de lista para registros de alimentacion o salud con opcion de eliminar */
export default function ItemRegistro({ icono, colorIcono, titulo, subtitulo, detalle, alEliminar }: PropsItemRegistro) {
  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.iconoContenedor, { backgroundColor: colorIcono + '18' }]}>
        <Feather name={icono as any} size={18} color={colorIcono} />
      </View>
      <View style={estilos.info}>
        <Text style={estilos.titulo} numberOfLines={1}>{titulo}</Text>
        <Text style={estilos.subtitulo} numberOfLines={1}>{subtitulo}</Text>
      </View>
      {detalle ? (
        <Text style={estilos.detalle}>{detalle}</Text>
      ) : null}
      {alEliminar ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            alEliminar();
          }}
          hitSlop={12}
        >
          <Feather name="trash-2" size={16} color={Colors.colores.error} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.colores.fondoTarjeta,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
    elevation: 1,
  },
  iconoContenedor: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titulo: {
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.texto,
  },
  subtitulo: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    marginTop: 1,
  },
  detalle: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.primario,
  },
});
