/**
 * @fileoverview Barra de acciones rápidas de mascota.
 *
 * Tres botones para abrir los modales de Peso, Alimento y Salud.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface Props {
  alPresionarPeso: () => void;
  alPresionarAlimento: () => void;
  alPresionarSalud: () => void;
}

export default function AccionesRapidas({ alPresionarPeso, alPresionarAlimento, alPresionarSalud }: Props) {
  return (
    <View style={estilos.fila}>
      <Pressable style={estilos.boton} onPress={alPresionarPeso}>
        <View style={[estilos.iconoContenedor, { backgroundColor: Colors.colores.acentoSuave }]}>
          <Feather name="trending-up" size={18} color={Colors.colores.acento} />
        </View>
        <Text style={estilos.texto}>Peso</Text>
      </Pressable>

      <Pressable style={estilos.boton} onPress={alPresionarAlimento}>
        <View style={[estilos.iconoContenedor, { backgroundColor: Colors.colores.primarioSuave }]}>
          <Feather name="coffee" size={18} color={Colors.colores.primario} />
        </View>
        <Text style={estilos.texto}>Alimento</Text>
      </Pressable>

      <Pressable style={estilos.boton} onPress={alPresionarSalud}>
        <View style={[estilos.iconoContenedor, { backgroundColor: '#E8F5E9' }]}>
          <Feather name="clipboard" size={18} color={Colors.colores.exito} />
        </View>
        <Text style={estilos.texto}>Salud</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 8 },
  boton: {
    flex: 1,
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    elevation: 1,
  },
  iconoContenedor: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  texto: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.texto },
});
