import { StyleSheet, Text, Pressable, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface PropsBotonAccion {
  titulo?: string;
  icono?: string;
  alPresionar: () => void;
  variante?: 'primario' | 'secundario' | 'fantasma' | 'peligro';
  tamano?: 'grande' | 'mediano' | 'pequeno';
  cargando?: boolean;
  deshabilitado?: boolean;
  estiloContenedor?: ViewStyle;
}

/** Boton de accion reutilizable con variantes (primario, secundario, fantasma, peligro) y tamaños */
export default function BotonAccion({
  titulo,
  icono,
  alPresionar,
  variante = 'primario',
  tamano = 'mediano',
  cargando = false,
  deshabilitado = false,
  estiloContenedor,
}: PropsBotonAccion) {
  const manejarPresion = () => {
    if (!deshabilitado && !cargando) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      alPresionar();
    }
  };

  const estilosVariante = obtenerEstilosVariante(variante);
  const estilosTamano = obtenerEstilosTamano(tamano);

  return (
    <Pressable
      onPress={manejarPresion}
      disabled={deshabilitado || cargando}
      style={({ pressed }) => [
        estilos.base,
        estilosTamano.boton,
        estilosVariante.boton,
        (deshabilitado || cargando) && estilos.deshabilitado,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        estiloContenedor,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={estilosVariante.textoColor} size="small" />
      ) : (
        <>
          {icono ? <Feather name={icono as any} size={estilosTamano.iconoTamano} color={estilosVariante.textoColor} /> : null}
          {titulo ? (
            <Text style={[estilos.texto, estilosTamano.texto, { color: estilosVariante.textoColor }]}>
              {titulo}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

function obtenerEstilosVariante(variante: string) {
  switch (variante) {
    case 'secundario':
      return {
        boton: { backgroundColor: Colors.colores.primarioSuave, borderWidth: 0 } as ViewStyle,
        textoColor: Colors.colores.primario,
      };
    case 'fantasma':
      return {
        boton: { backgroundColor: 'transparent', borderWidth: 0 } as ViewStyle,
        textoColor: Colors.colores.primario,
      };
    case 'peligro':
      return {
        boton: { backgroundColor: Colors.colores.error } as ViewStyle,
        textoColor: '#FFFFFF',
      };
    default:
      return {
        boton: { backgroundColor: Colors.colores.primario } as ViewStyle,
        textoColor: '#FFFFFF',
      };
  }
}

function obtenerEstilosTamano(tamano: string) {
  switch (tamano) {
    case 'grande':
      return {
        boton: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14 } as ViewStyle,
        texto: { fontSize: 17 } as TextStyle,
        iconoTamano: 22,
      };
    case 'pequeno':
      return {
        boton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 } as ViewStyle,
        texto: { fontSize: 13 } as TextStyle,
        iconoTamano: 16,
      };
    default:
      return {
        boton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 } as ViewStyle,
        texto: { fontSize: 15 } as TextStyle,
        iconoTamano: 18,
      };
  }
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  texto: {
    fontFamily: 'Nunito_700Bold',
  },
  deshabilitado: {
    opacity: 0.5,
  },
});
