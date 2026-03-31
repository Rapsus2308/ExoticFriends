import { StyleSheet, Text, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CategoriaMascota, CATEGORIAS } from '@/lib/tipos';
import Colors from '@/constants/colors';
import IconoCategoria from '@/components/IconoCategoria';

interface PropsSelectorCategoria {
  seleccionada: CategoriaMascota | null;
  alSeleccionar: (categoria: CategoriaMascota) => void;
}

/** Selector visual de categoria de mascota con iconos y colores */
export default function SelectorCategoria({ seleccionada, alSeleccionar }: PropsSelectorCategoria) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>Categoria</Text>
      <View style={estilos.fila}>
        {CATEGORIAS.map((cat) => {
          const activa = seleccionada === cat.valor;
          return (
            <Pressable
              key={cat.valor}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                alSeleccionar(cat.valor);
              }}
              style={[
                estilos.opcion,
                activa && { backgroundColor: cat.color + '20', borderColor: cat.color },
              ]}
            >
              <IconoCategoria categoria={cat.valor} size={20} color={activa ? cat.color : Colors.colores.textoTerciario} />
              <Text style={[estilos.textoOpcion, activa && { color: cat.color, fontFamily: 'Nunito_700Bold' }]}>
                {cat.etiqueta}
              </Text>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  opcion: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.colores.borde,
    backgroundColor: Colors.colores.fondoTarjeta,
    minWidth: 80,
    gap: 4,
  },
  textoOpcion: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoSecundario,
  },
});
