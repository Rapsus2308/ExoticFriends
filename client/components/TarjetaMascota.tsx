import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Mascota, obtenerColorCategoria, obtenerEtiquetaCategoria, calcularEdad } from '@/lib/tipos';
import Colors from '@/constants/colors';
import IconoCategoria from '@/components/IconoCategoria';

interface PropsTarjetaMascota {
  mascota: Mascota;
  alPresionar: () => void;
  ultimoPeso?: string;
}

/** Tarjeta de mascota para listados - muestra foto/icono, nombre, especie, categoria y ultimo peso */
export default function TarjetaMascota({ mascota, alPresionar, ultimoPeso }: PropsTarjetaMascota) {
  const colorCategoria = obtenerColorCategoria(mascota.categoria);

  return (
    <Pressable
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.contenedor,
        { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={estilos.contenido}>
        {mascota.fotoBase64 ? (
          <Image source={{ uri: mascota.fotoBase64 }} style={estilos.foto} contentFit="cover" />
        ) : (
          <View style={[estilos.fotoPlaceholder, { backgroundColor: colorCategoria + '20' }]}>
            <IconoCategoria categoria={mascota.categoria} size={28} color={colorCategoria} />
          </View>
        )}
        <View style={estilos.info}>
          <Text style={estilos.nombre} numberOfLines={1}>{mascota.nombre}</Text>
          <Text style={estilos.especie} numberOfLines={1}>{mascota.especie}</Text>
          <View style={estilos.metaFila}>
            <View style={[estilos.etiquetaCategoria, { backgroundColor: colorCategoria + '18' }]}>
              <IconoCategoria categoria={mascota.categoria} size={11} color={colorCategoria} />
              <Text style={[estilos.textoCategoria, { color: colorCategoria }]}>
                {obtenerEtiquetaCategoria(mascota.categoria)}
              </Text>
            </View>
            <Text style={estilos.edad}>{calcularEdad(mascota.fechaNacimiento)}</Text>
          </View>
        </View>
        <View style={estilos.derecha}>
          {ultimoPeso ? (
            <View style={estilos.pesoBadge}>
              <Feather name="trending-up" size={12} color={Colors.colores.primario} />
              <Text style={estilos.pesoTexto}>{ultimoPeso}</Text>
            </View>
          ) : null}
          <Feather name="chevron-right" size={20} color={Colors.colores.textoTerciario} />
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  foto: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  fotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  nombre: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
  especie: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoSecundario,
    marginTop: 1,
  },
  metaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  etiquetaCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  textoCategoria: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  edad: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
  },
  derecha: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pesoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.colores.primarioSuave,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pesoTexto: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.primario,
  },
});
