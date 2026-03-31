/**
 * @fileoverview Modal de registro de alimentación — ExoticFriends
 *
 * Formulario para registrar qué y cuánto comió la mascota.
 * Gestiona su propio estado local y limpia los campos al guardar.
 */

import { useState } from 'react';
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

export default function ModalAlimentacion({ visible, mascotaId, alCerrar, alGuardar }: Props) {
  const [nuevoAlimento, setNuevoAlimento] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState('');
  const [notaAlimento, setNotaAlimento] = useState('');

  const guardar = async () => {
    if (!nuevoAlimento.trim()) return;
    await apiRequest('POST', `/api/mascotas/${mascotaId}/alimentacion`, {
      alimento: nuevoAlimento.trim(),
      cantidad: nuevaCantidad.trim(),
      fecha: new Date().toISOString(),
      notas: notaAlimento.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNuevoAlimento('');
    setNuevaCantidad('');
    setNotaAlimento('');
    alCerrar();
    alGuardar();
  };

  return (
    <ModalFormulario visible={visible} titulo="Registrar alimentación" alCerrar={alCerrar}>
      <CampoTexto
        etiqueta="Alimento"
        placeholder="Ej: Grillos, Semillas, Escamas..."
        value={nuevoAlimento}
        onChangeText={setNuevoAlimento}
        icono={<Feather name="coffee" size={18} color={Colors.colores.textoTerciario} />}
      />
      <CampoTexto
        etiqueta="Cantidad"
        placeholder="Ej: 5 grillos, 2 cucharadas..."
        value={nuevaCantidad}
        onChangeText={setNuevaCantidad}
      />
      <CampoTexto
        etiqueta="Notas (opcional)"
        placeholder="Observaciones sobre la alimentación..."
        value={notaAlimento}
        onChangeText={setNotaAlimento}
        multiline
        numberOfLines={2}
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
