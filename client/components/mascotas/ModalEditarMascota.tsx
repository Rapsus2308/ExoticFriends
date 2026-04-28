/**
 * @fileoverview Modal de edición de mascota — ExoticFriends
 *
 * Formulario completo para actualizar los datos de una mascota:
 * nombre, especie, categoría, fecha de nacimiento, notas y foto.
 * Se inicializa con los datos actuales de la mascota al abrirse.
 */

import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import ModalFormulario from '@/components/ModalFormulario';
import CampoTexto from '@/components/CampoTexto';
import SelectorCategoria from '@/components/SelectorCategoria';
import SelectorGenero from '@/components/SelectorGenero';
import SelectorFecha from '@/components/SelectorFecha';
import BotonAccion from '@/components/BotonAccion';
import { Mascota, CategoriaMascota, GeneroMascota } from '@/lib/tipos';
import { convertirImagenABase64 } from '@/lib/imagenBase64';
import { apiRequest } from '@/lib/query-client';

interface Props {
  visible: boolean;
  mascota: Mascota | null;
  alCerrar: () => void;
  alGuardar: () => void;
}

function normalizarGenero(valor: unknown): GeneroMascota {
  if (typeof valor !== 'string') return 'desconocido';
  const v = valor.trim().toLowerCase();
  if (v === 'macho' || v === 'hembra' || v === 'desconocido') return v;
  return 'desconocido';
}

export default function ModalEditarMascota({ visible, mascota, alCerrar, alGuardar }: Props) {
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState('');
  const [categoria, setCategoria] = useState<CategoriaMascota | null>(null);
  const [genero, setGenero] = useState<GeneroMascota | null>(null);
  const [fecha, setFecha] = useState<Date | null>(null);
  const [notas, setNotas] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (mascota && visible) {
      setNombre(mascota.nombre);
      setEspecie(mascota.especie);
      setCategoria(mascota.categoria);
      setGenero(normalizarGenero(mascota.genero));
      setFecha(new Date(mascota.fechaNacimiento));
      setNotas(mascota.notas ?? '');
      setFotoBase64(mascota.fotoBase64);
    }
  }, [mascota, visible]);

  const seleccionarFoto = async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!resultado.canceled && resultado.assets[0]) {
        const asset = resultado.assets[0];
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          setFotoBase64(`data:${mimeType};base64,${asset.base64}`);
        } else {
          const base64 = await convertirImagenABase64(asset.uri);
          setFotoBase64(base64);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.log('Error al seleccionar foto:', e);
    }
  };

  const guardar = async () => {
    if (!mascota || !nombre.trim() || !especie.trim() || !categoria || !fecha) return;
    setGuardando(true);
    try {
      await apiRequest('PUT', `/api/mascotas/${mascota.id}`, {
        nombre: nombre.trim(),
        especie: especie.trim(),
        categoria,
        genero: normalizarGenero(genero),
        fechaNacimiento: fecha.toISOString(),
        notas: notas.trim() || undefined,
        fotoBase64,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alCerrar();
      alGuardar();
    } catch (e) {
      console.log('Error guardando mascota:', e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalFormulario visible={visible} titulo="Editar mascota" alCerrar={alCerrar}>
      <View style={estilos.fotoContenedor}>
        <Pressable onPress={seleccionarFoto} style={estilos.fotoBoton}>
          {fotoBase64 ? (
            <Image source={{ uri: fotoBase64 }} style={estilos.fotoPreview} contentFit="cover" />
          ) : (
            <View style={estilos.fotoPlaceholder}>
              <Feather name="camera" size={28} color={Colors.colores.textoTerciario} />
            </View>
          )}
          <View style={estilos.fotoCambioBadge}>
            <Feather name="edit-2" size={12} color="#fff" />
          </View>
        </Pressable>
        <View style={estilos.fotoBotones}>
          <Pressable onPress={seleccionarFoto} style={estilos.fotoAccion}>
            <Feather name="image" size={16} color={Colors.colores.primario} />
          </Pressable>
          {fotoBase64 ? (
            <Pressable onPress={() => setFotoBase64(undefined)} style={[estilos.fotoAccion, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="x" size={16} color={Colors.colores.error} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <CampoTexto
        etiqueta="Nombre"
        placeholder="Nombre de tu mascota"
        value={nombre}
        onChangeText={setNombre}
        icono={<Feather name="heart" size={18} color={Colors.colores.textoTerciario} />}
      />
      <CampoTexto
        etiqueta="Especie"
        placeholder="Ej: Iguana verde, Cacatúa..."
        value={especie}
        onChangeText={setEspecie}
        icono={<Feather name="search" size={18} color={Colors.colores.textoTerciario} />}
      />
      <SelectorCategoria seleccionada={categoria} alSeleccionar={setCategoria} />
      <SelectorGenero seleccionado={genero} alSeleccionar={setGenero} />
      <SelectorFecha etiqueta="Fecha de nacimiento" valor={fecha} alCambiar={setFecha} />
      <CampoTexto
        etiqueta="Notas (opcional)"
        placeholder="Información adicional..."
        value={notas}
        onChangeText={setNotas}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' as const }}
      />
      <BotonAccion
        titulo="Guardar cambios"
        icono="check"
        alPresionar={guardar}
        cargando={guardando}
        tamano="grande"
        estiloContenedor={{ width: '100%', marginTop: 8 }}
      />
    </ModalFormulario>
  );
}

const estilos = StyleSheet.create({
  fotoContenedor: { alignItems: 'center', marginBottom: 20, gap: 12 },
  fotoBoton: { position: 'relative' },
  fotoPreview: { width: 96, height: 96, borderRadius: 24 },
  fotoPlaceholder: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: Colors.colores.bordeSuave,
    borderWidth: 2, borderColor: Colors.colores.borde,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  fotoCambioBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.colores.primario,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  fotoBotones: { flexDirection: 'row', gap: 10 },
  fotoAccion: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: Colors.colores.primarioSuave,
  },
});
