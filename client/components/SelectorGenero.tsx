import { StyleSheet, Text, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { GeneroMascota, GENEROS } from '@/lib/tipos';

interface PropsSelectorGenero {
  seleccionado: GeneroMascota | null;
  alSeleccionar: (genero: GeneroMascota) => void;
}

export default function SelectorGenero({ seleccionado, alSeleccionar }: PropsSelectorGenero) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>Género</Text>
      <View style={estilos.fila}>
        {GENEROS.map((item) => {
          const activo = seleccionado === item.valor;
          return (
            <Pressable
              key={item.valor}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                alSeleccionar(item.valor);
              }}
              style={[estilos.opcion, activo && estilos.opcionActiva]}
            >
              <Text style={[estilos.texto, activo && estilos.textoActivo]}>{item.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>
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
    marginBottom: 8,
  },
  fila: {
    flexDirection: 'row',
    gap: 8,
  },
  opcion: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.colores.borde,
    borderRadius: 12,
    backgroundColor: Colors.colores.fondoTarjeta,
    paddingVertical: 12,
    alignItems: 'center',
  },
  opcionActiva: {
    borderColor: Colors.colores.primario,
    backgroundColor: Colors.colores.primarioSuave,
  },
  texto: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoSecundario,
  },
  textoActivo: {
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.primario,
  },
});
