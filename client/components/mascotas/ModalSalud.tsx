/**
 * @fileoverview Modal de nota de salud — ExoticFriends
 *
 * Formulario para registrar una nota clínica: revisión, visita al
 * veterinario, medicamento u observación. Cada tipo tiene su ícono.
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import ModalFormulario from '@/components/ModalFormulario';
import CampoTexto from '@/components/CampoTexto';
import BotonAccion from '@/components/BotonAccion';
import { NotaSalud, TIPOS_SALUD } from '@/lib/tipos';
import { apiRequest } from '@/lib/query-client';

interface Props {
  visible: boolean;
  mascotaId: string;
  alCerrar: () => void;
  alGuardar: () => void;
}

export default function ModalSalud({ visible, mascotaId, alCerrar, alGuardar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<NotaSalud['tipo']>('observacion');

  const guardar = async () => {
    if (!titulo.trim()) return;
    await apiRequest('POST', `/api/mascotas/${mascotaId}/salud`, {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tipo,
      fecha: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitulo('');
    setDescripcion('');
    setTipo('observacion');
    alCerrar();
    alGuardar();
  };

  return (
    <ModalFormulario visible={visible} titulo="Nota de salud" alCerrar={alCerrar}>
      <CampoTexto
        etiqueta="Título"
        placeholder="Ej: Revisión rutinaria, Medicamento..."
        value={titulo}
        onChangeText={setTitulo}
        icono={<Feather name="clipboard" size={18} color={Colors.colores.textoTerciario} />}
      />
      <Text style={estilos.etiqueta}>Tipo</Text>
      <View style={estilos.tipoFila}>
        {TIPOS_SALUD.map((t) => (
          <Pressable
            key={t.valor}
            style={[estilos.tipoBoton, tipo === t.valor && estilos.tipoActivo]}
            onPress={() => setTipo(t.valor)}
          >
            <Feather
              name={t.icono as any}
              size={16}
              color={tipo === t.valor ? Colors.colores.primario : Colors.colores.textoTerciario}
            />
            <Text style={[estilos.tipoTexto, tipo === t.valor && estilos.tipoTextoActivo]}>
              {t.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>
      <CampoTexto
        etiqueta="Descripción"
        placeholder="Detalla la observación o evento..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' as const }}
      />
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
  etiqueta: {
    fontSize: 14, fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.texto, marginBottom: 8,
  },
  tipoFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tipoBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: Colors.colores.borde,
    backgroundColor: Colors.colores.fondoTarjeta,
  },
  tipoActivo: { borderColor: Colors.colores.primario, backgroundColor: Colors.colores.primarioSuave },
  tipoTexto: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario },
  tipoTextoActivo: { fontFamily: 'Nunito_700Bold', color: Colors.colores.primario },
});
