import { StyleSheet, Text, TextInput, View, TextInputProps } from 'react-native';
import Colors from '@/constants/colors';

interface PropsCampoTexto extends TextInputProps {
  etiqueta?: string;
  error?: string;
  icono?: React.ReactNode;
}

/** Campo de texto reutilizable con etiqueta, icono opcional y mensaje de error */
export default function CampoTexto({ etiqueta, error, icono, style, ...props }: PropsCampoTexto) {
  return (
    <View style={estilos.contenedor}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <View style={[estilos.campoContenedor, error ? estilos.campoError : null]}>
        {icono ? <View style={estilos.iconoContenedor}>{icono}</View> : null}
        <TextInput
          style={[estilos.campo, icono ? estilos.campoConIcono : null, style]}
          placeholderTextColor={Colors.colores.textoTerciario}
          {...props}
        />
      </View>
      {error ? <Text style={estilos.textoError}>{error}</Text> : null}
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
  },
  campoError: {
    borderColor: Colors.colores.error,
  },
  iconoContenedor: {
    paddingLeft: 14,
  },
  campo: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.texto,
  },
  campoConIcono: {
    paddingLeft: 10,
  },
  textoError: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.error,
    marginTop: 4,
  },
});
