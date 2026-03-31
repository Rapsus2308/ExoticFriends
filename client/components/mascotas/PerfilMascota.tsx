/**
 * @fileoverview Tarjeta de perfil de mascota — encabezado del detalle.
 *
 * Muestra foto (o ícono de categoría), nombre, especie, categoría y edad
 * calculada. El toque abre el modal de edición.
 */

import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import IconoCategoria from '@/components/IconoCategoria';
import {
  Mascota,
  obtenerColorCategoria,
  obtenerEtiquetaCategoria,
  calcularEdad,
} from '@/lib/tipos';

interface Props {
  mascota: Mascota;
  alPresionar: () => void;
}

export default function PerfilMascota({ mascota, alPresionar }: Props) {
  const colorCat = obtenerColorCategoria(mascota.categoria);
  return (
    <Pressable style={estilos.contenedor} onPress={alPresionar}>
      <View>
        {mascota.fotoBase64 ? (
          <Image source={{ uri: mascota.fotoBase64 }} style={estilos.foto} contentFit="cover" />
        ) : (
          <View style={[estilos.icono, { backgroundColor: colorCat + '20' }]}>
            <IconoCategoria categoria={mascota.categoria} size={40} color={colorCat} />
          </View>
        )}
        <View style={estilos.camaraBadge}>
          <Feather name="camera" size={12} color="#fff" />
        </View>
      </View>

      <View style={estilos.info}>
        <Text style={estilos.nombre}>{mascota.nombre}</Text>
        <Text style={estilos.especie}>{mascota.especie}</Text>
        <View style={estilos.metaFila}>
          <View style={[estilos.etiqueta, { backgroundColor: colorCat + '18' }]}>
            <IconoCategoria categoria={mascota.categoria} size={12} color={colorCat} />
            <Text style={[estilos.etiquetaTexto, { color: colorCat }]}>
              {obtenerEtiquetaCategoria(mascota.categoria)}
            </Text>
          </View>
          <Text style={estilos.edad}>{calcularEdad(mascota.fechaNacimiento)}</Text>
        </View>
      </View>

      <Feather name="chevron-right" size={20} color={Colors.colores.textoTerciario} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  foto: { width: 72, height: 72, borderRadius: 20 },
  icono: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  camaraBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.colores.primario,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.colores.fondo,
  },
  info: { flex: 1 },
  nombre: { fontSize: 24, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto },
  especie: {
    fontSize: 14, fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoSecundario, marginTop: 1,
  },
  metaFila: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  etiqueta: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4,
  },
  etiquetaTexto: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  edad: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario },
});
