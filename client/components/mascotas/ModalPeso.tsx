/**
 * @fileoverview Modal de registro de peso — ExoticFriends
 *
 * Formulario para agregar una nueva medición de peso a la mascota.
 * Gestiona su propio estado local (valor + unidad) y limpia los
 * campos al cerrar exitosamente.
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import ModalFormulario from '@/components/ModalFormulario';
import CampoTexto from '@/components/CampoTexto';
import BotonAccion from '@/components/BotonAccion';
import { apiRequest } from '@/lib/query-client';

interface Props {
  visible: boolean;
  mascotaId: string;
  alCerrar: () => void;
  alGuardar: () => void;
}

export default function ModalPeso({ visible, mascotaId, alCerrar, alGuardar }: Props) {
  const [nuevoPeso, setNuevoPeso] = useState('');
  const [unidadPeso, setUnidadPeso] = useState<'g' | 'kg'>('g');

  const guardar = async () => {
    const pesoNum = parseFloat(nuevoPeso);
    if (isNaN(pesoNum) || pesoNum <= 0) return;
    await apiRequest('POST', `/api/mascotas/${mascotaId}/pesos`, {
      peso: pesoNum,
      unidad: unidadPeso,
      fecha: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNuevoPeso('');
    alCerrar();
    alGuardar();
  };

  return (
    <ModalFormulario visible={visible} titulo="Registrar peso" alCerrar={alCerrar}>
      <CampoTexto
        etiqueta="Peso"
        placeholder="Ej: 250"
        value={nuevoPeso}
        onChangeText={setNuevoPeso}
        keyboardType="decimal-pad"
        icono={<Feather name="trending-up" size={18} color={Colors.colores.textoTerciario} />}
      />
      <View style={estilos.unidadFila}>
        <Pressable
          style={[estilos.unidadBoton, unidadPeso === 'g' && estilos.unidadActiva]}
          onPress={() => setUnidadPeso('g')}
        >
          <Text style={[estilos.unidadTexto, unidadPeso === 'g' && estilos.unidadTextoActivo]}>
            Gramos (g)
          </Text>
        </Pressable>
        <Pressable
          style={[estilos.unidadBoton, unidadPeso === 'kg' && estilos.unidadActiva]}
          onPress={() => setUnidadPeso('kg')}
        >
          <Text style={[estilos.unidadTexto, unidadPeso === 'kg' && estilos.unidadTextoActivo]}>
            Kilogramos (kg)
          </Text>
        </Pressable>
      </View>
      <BotonAccion
        titulo="Guardar"
        icono="check"
        alPresionar={guardar}
        tamano="grande"
        estiloContenedor={{ width: '100%', marginTop: 8 }}
      />
    </ModalFormulario>
  );
}

const estilos = StyleSheet.create({
  unidadFila: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  unidadBoton: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.colores.borde, alignItems: 'center',
  },
  unidadActiva: { borderColor: Colors.colores.primario, backgroundColor: Colors.colores.primarioSuave },
  unidadTexto: { fontSize: 14, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario },
  unidadTextoActivo: { fontFamily: 'Nunito_700Bold', color: Colors.colores.primario },
});
