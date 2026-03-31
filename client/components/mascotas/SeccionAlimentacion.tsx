/**
 * @fileoverview Lista de registros de alimentación de una mascota.
 *
 * Muestra los últimos 10 registros con ícono, nombre del alimento,
 * fecha y cantidad. Incluye botón de eliminación por registro.
 */

import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import ItemRegistro from '@/components/ItemRegistro';
import SeccionTitulo from '@/components/SeccionTitulo';
import { RegistroAlimentacion, formatearFecha } from '@/lib/tipos';
import { apiRequest } from '@/lib/query-client';

interface Props {
  alimentaciones: RegistroAlimentacion[];
  alAgregar: () => void;
  alActualizar: () => void;
}

export default function SeccionAlimentacion({ alimentaciones, alAgregar, alActualizar }: Props) {
  const eliminar = async (id: string) => {
    await apiRequest('DELETE', `/api/alimentacion/${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    alActualizar();
  };

  return (
    <>
      <SeccionTitulo titulo="Alimentación" iconoAccion="plus" alPresionarAccion={alAgregar} />
      <View style={estilos.contenedor}>
        {alimentaciones.length === 0 ? (
          <Text style={estilos.sinRegistros}>Sin registros de alimentación</Text>
        ) : (
          <View style={estilos.lista}>
            {alimentaciones.slice(0, 10).map((a) => (
              <ItemRegistro
                key={a.id}
                icono="coffee"
                colorIcono={Colors.colores.primario}
                titulo={a.alimento}
                subtitulo={formatearFecha(a.fecha)}
                detalle={a.cantidad}
                alEliminar={() => eliminar(a.id)}
              />
            ))}
          </View>
        )}
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  contenedor: { paddingHorizontal: 16, marginBottom: 8 },
  sinRegistros: {
    fontSize: 14, fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario, textAlign: 'center', paddingVertical: 20,
  },
  lista: { gap: 6 },
});
