import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface PropsSeccionTitulo {
  titulo: string;
  iconoAccion?: string;
  alPresionarAccion?: () => void;
}

/** Encabezado de seccion con titulo y boton de accion opcional */
export default function SeccionTitulo({ titulo, iconoAccion, alPresionarAccion }: PropsSeccionTitulo) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>{titulo}</Text>
      {iconoAccion && alPresionarAccion ? (
        <Pressable onPress={alPresionarAccion} hitSlop={12}>
          <Feather name={iconoAccion as any} size={20} color={Colors.colores.primario} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
});
