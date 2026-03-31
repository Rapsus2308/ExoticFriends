import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import BotonAccion from './BotonAccion';

interface PropsEstadoVacio {
  icono: string;
  titulo: string;
  descripcion: string;
  textoBoton?: string;
  alPresionarBoton?: () => void;
}

/** Pantalla de estado vacio con icono, titulo, descripcion y boton opcional */
export default function EstadoVacio({ icono, titulo, descripcion, textoBoton, alPresionarBoton }: PropsEstadoVacio) {
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.iconoContenedor}>
        <Feather name={icono as any} size={40} color={Colors.colores.textoTerciario} />
      </View>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.descripcion}>{descripcion}</Text>
      {textoBoton && alPresionarBoton ? (
        <BotonAccion
          titulo={textoBoton}
          icono="plus"
          alPresionar={alPresionarBoton}
          estiloContenedor={{ marginTop: 16 }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconoContenedor: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.colores.bordeSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
    textAlign: 'center',
  },
  descripcion: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
