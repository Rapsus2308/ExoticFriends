import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { CategoriaMascota } from '@/lib/tipos';
import { apiRequest } from '@/lib/query-client';
import { convertirImagenABase64 } from '@/lib/imagenBase64';
import CampoTexto from '@/components/CampoTexto';
import SelectorCategoria from '@/components/SelectorCategoria';
import SelectorFecha from '@/components/SelectorFecha';
import BotonAccion from '@/components/BotonAccion';

export default function PantallaAgregarMascota() {
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState('');
  const [categoria, setCategoria] = useState<CategoriaMascota | null>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(null);
  const [notas, setNotas] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<{ [key: string]: string }>({});

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

  const validar = (): boolean => {
    const nuevosErrores: { [key: string]: string } = {};
    if (!nombre.trim()) nuevosErrores.nombre = 'El nombre es requerido';
    if (!especie.trim()) nuevosErrores.especie = 'La especie es requerida';
    if (!categoria) nuevosErrores.categoria = 'Selecciona una categoría';
    if (!fechaNacimiento) nuevosErrores.fechaNacimiento = 'La fecha es requerida';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);

    await apiRequest("POST", "/api/mascotas", {
      nombre: nombre.trim(),
      especie: especie.trim(),
      categoria: categoria!,
      fechaNacimiento: fechaNacimiento!.toISOString(),
      fotoBase64,
      notas: notas.trim() || undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGuardando(false);
    router.back();
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.encabezado, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={Colors.colores.texto} />
        </Pressable>
        <Text style={estilos.tituloEncabezado}>Nueva mascota</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={estilos.formulario}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Pressable onPress={seleccionarFoto} style={estilos.fotoContenedor}>
            {fotoBase64 ? (
              <Image source={{ uri: fotoBase64 }} style={estilos.fotoPreview} contentFit="cover" />
            ) : (
              <View style={estilos.fotoPlaceholder}>
                <Feather name="camera" size={28} color={Colors.colores.textoTerciario} />
                <Text style={estilos.fotoTexto}>Agregar foto</Text>
              </View>
            )}
          </Pressable>

          <CampoTexto
            etiqueta="Nombre"
            placeholder="Ej: Rex, Pluma, Nemo..."
            value={nombre}
            onChangeText={setNombre}
            error={errores.nombre}
            icono={<Feather name="heart" size={18} color={Colors.colores.textoTerciario} />}
          />

          <CampoTexto
            etiqueta="Especie"
            placeholder="Ej: Iguana verde, Cacatúa, Pez payaso..."
            value={especie}
            onChangeText={setEspecie}
            error={errores.especie}
            icono={<Feather name="search" size={18} color={Colors.colores.textoTerciario} />}
          />

          <SelectorCategoria seleccionada={categoria} alSeleccionar={setCategoria} />
          {errores.categoria ? <Text style={estilos.errorCategoria}>{errores.categoria}</Text> : null}

          <SelectorFecha
            etiqueta="Fecha de nacimiento (estimada)"
            valor={fechaNacimiento}
            alCambiar={setFechaNacimiento}
            error={errores.fechaNacimiento}
          />

          <CampoTexto
            etiqueta="Notas (opcional)"
            placeholder="Información adicional sobre tu mascota..."
            value={notas}
            onChangeText={setNotas}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' as const }}
          />

          <BotonAccion
            titulo="Guardar mascota"
            icono="check"
            alPresionar={guardar}
            cargando={guardando}
            tamano="grande"
            estiloContenedor={{ marginTop: 8, width: '100%' }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: Colors.colores.fondo,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.colores.fondo,
  },
  tituloEncabezado: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
  formulario: {
    padding: 20,
    paddingBottom: 60,
  },
  fotoContenedor: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  fotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  fotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: Colors.colores.bordeSuave,
    borderWidth: 2,
    borderColor: Colors.colores.borde,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fotoTexto: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
  },
  errorCategoria: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.error,
    marginTop: -12,
    marginBottom: 12,
  },
});
