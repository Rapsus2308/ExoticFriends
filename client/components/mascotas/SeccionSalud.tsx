/**
 * @fileoverview Lista de notas de salud de una mascota.
 *
 * Muestra los últimos 10 registros clínicos con ícono por tipo
 * (revisión, veterinario, medicamento, observación), fecha y
 * botón de eliminación.
 */

import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import ItemRegistro from '@/components/ItemRegistro';
import SeccionTitulo from '@/components/SeccionTitulo';
import { NotaSalud, formatearFecha, TIPOS_SALUD } from '@/lib/tipos';
import { apiRequest } from '@/lib/query-client';

interface Props {
  notasSalud: NotaSalud[];
  alAgregar: () => void;
  alActualizar: () => void;
}

export default function SeccionSalud({ notasSalud, alAgregar, alActualizar }: Props) {
  const eliminar = async (id: string) => {
    await apiRequest('DELETE', `/api/salud/${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    alActualizar();
  };

  return (
    <>
      <SeccionTitulo titulo="Notas de salud" iconoAccion="plus" alPresionarAccion={alAgregar} />
      <View style={estilos.contenedor}>
        {notasSalud.length === 0 ? (
          <Text style={estilos.sinRegistros}>Sin notas de salud</Text>
        ) : (
          <View style={estilos.lista}>
            {notasSalud.slice(0, 10).map((n) => {
              const tipo = TIPOS_SALUD.find((t) => t.valor === n.tipo);
              return (
                <ItemRegistro
                  key={n.id}
                  icono={tipo?.icono ?? 'clipboard'}
                  colorIcono={Colors.colores.exito}
                  titulo={n.titulo}
                  subtitulo={`${formatearFecha(n.fecha)} · ${tipo?.etiqueta ?? ''}`}
                  alEliminar={() => eliminar(n.id)}
                />
              );
            })}
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
