/**
 * @fileoverview Pantalla de perfil y configuración — ExoticFriends
 *
 * Sin Alert.alert — usa UI inline para confirmaciones y errores,
 * compatible con web e iframes.
 */

import { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable,
  Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient } from '@/lib/query-client';
import { convertirImagenABase64 } from '@/lib/imagenBase64';

type SeccionActiva = 'ninguna' | 'editar' | 'contrasena' | 'logout' | 'eliminar';

/** Mensaje de error o éxito en línea */
function MensajeInline({ texto, tipo }: { texto: string; tipo: 'error' | 'exito' }) {
  if (!texto) return null;
  const esError = tipo === 'error';
  return (
    <View style={[estilos.mensajeInline, esError ? estilos.mensajeError : estilos.mensajeExito]}>
      <Feather
        name={esError ? 'alert-circle' : 'check-circle'}
        size={14}
        color={esError ? Colors.colores.error : Colors.colores.primario}
      />
      <Text style={[estilos.mensajeTexto, { color: esError ? Colors.colores.error : Colors.colores.primario }]}>
        {texto}
      </Text>
    </View>
  );
}

/** Sección con título */
function SeccionConfig({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.seccionTitulo}>{titulo}</Text>
      <View style={estilos.seccionContenido}>{children}</View>
    </View>
  );
}

/** Fila de configuración */
function FilaConfig({
  icono, label, valor, alPresionar, peligro = false, activa = false,
}: {
  icono: string; label: string; valor?: string;
  alPresionar: () => void; peligro?: boolean; activa?: boolean;
}) {
  return (
    <Pressable
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.fila,
        pressed && estilos.filaPresionada,
        activa && estilos.filaActiva,
      ]}
    >
      <View style={[estilos.filaIcono, peligro && estilos.filaIconoPeligro]}>
        <Feather
          name={icono as any}
          size={18}
          color={peligro ? Colors.colores.error : Colors.colores.primario}
        />
      </View>
      <View style={estilos.filaTextos}>
        <Text style={[estilos.filaLabel, peligro && estilos.filaLabelPeligro]}>{label}</Text>
        {valor ? <Text style={estilos.filaValor} numberOfLines={1}>{valor}</Text> : null}
      </View>
      <Feather
        name={activa ? 'chevron-down' : 'chevron-right'}
        size={18}
        color={Colors.colores.textoTerciario}
      />
    </Pressable>
  );
}

/** Campo de texto etiquetado */
function Campo({
  label, value, onChange, placeholder, secureTextEntry, keyboardType, autoCapitalize,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={estilos.campoContenedor}>
      <Text style={estilos.campoLabel}>{label}</Text>
      <TextInput
        style={estilos.campoInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.colores.textoTerciario}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export default function PantallaPerfil() {
  const insets = useSafeAreaInsets();
  const { perfil, cerrarSesion } = useAuth();

  const [seccionActiva, setSeccionActiva] = useState<SeccionActiva>('ninguna');
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'error' | 'exito' } | null>(null);

  // Editar perfil
  const [nombreCompleto, setNombreCompleto] = useState(perfil?.nombreCompleto ?? '');
  const [email, setEmail] = useState(perfil?.email ?? '');

  // Cambiar contraseña
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [contrasenaConfirm, setContrasenaConfirm] = useState('');

  // Eliminar cuenta
  const [contrasenaEliminar, setContrasenaEliminar] = useState('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const mostrarMensaje = (texto: string, tipo: 'error' | 'exito') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 3500);
  };

  const alternarSeccion = (nueva: SeccionActiva) => {
    setMensaje(null);
    if (seccionActiva === nueva) {
      setSeccionActiva('ninguna');
    } else {
      if (nueva === 'editar') {
        setNombreCompleto(perfil?.nombreCompleto ?? '');
        setEmail(perfil?.email ?? '');
      }
      setSeccionActiva(nueva);
    }
  };

  /** Cambia la foto de perfil */
  const cambiarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      mostrarMensaje('Necesitamos acceso a la galería para cambiar la foto', 'error');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (resultado.canceled || !resultado.assets?.[0]) return;

    const asset = resultado.assets[0];

    // Mismo patrón que mascotas: base64 directo → fallback a convertirImagenABase64
    let dataUri: string | undefined;
    if (asset.base64) {
      const mimeType = asset.mimeType || 'image/jpeg';
      dataUri = `data:${mimeType};base64,${asset.base64}`;
    } else {
      dataUri = await convertirImagenABase64(asset.uri);
    }

    if (!dataUri) {
      mostrarMensaje('No se pudo leer la imagen', 'error');
      return;
    }

    try {
      setSubiendoFoto(true);
      const res = await apiRequest('PUT', '/api/auth/perfil', {
        nombreCompleto: perfil?.nombreCompleto ?? '',
        email: perfil?.email ?? '',
        fotoBase64: dataUri,
      });
      const actualizado = await res.json();
      queryClient.setQueryData(['/api/auth/perfil'], actualizado);
      mostrarMensaje('Foto actualizada', 'exito');
    } catch {
      mostrarMensaje('Error al guardar la foto', 'error');
    } finally {
      setSubiendoFoto(false);
    }
  };

  /** Guarda nombre y email */
  const guardarPerfil = async () => {
    if (!nombreCompleto.trim()) { mostrarMensaje('El nombre es requerido', 'error'); return; }
    try {
      setGuardando(true);
      const res = await apiRequest('PUT', '/api/auth/perfil', {
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim() || '',
        fotoBase64: perfil?.fotoBase64 ?? null,
      });
      if (!res.ok) {
        const err = await res.json();
        mostrarMensaje(err.message || 'No se pudo actualizar', 'error');
        return;
      }
      const actualizado = await res.json();
      queryClient.setQueryData(['/api/auth/perfil'], actualizado);
      setSeccionActiva('ninguna');
      mostrarMensaje('Perfil actualizado', 'exito');
    } catch {
      mostrarMensaje('Error de conexión', 'error');
    } finally {
      setGuardando(false);
    }
  };

  /** Cambia la contraseña */
  const guardarContrasena = async () => {
    if (contrasenaNueva !== contrasenaConfirm) {
      mostrarMensaje('Las contraseñas nuevas no coinciden', 'error'); return;
    }
    if (contrasenaNueva.length < 6) {
      mostrarMensaje('Mínimo 6 caracteres', 'error'); return;
    }
    try {
      setGuardando(true);
      const res = await apiRequest('POST', '/api/auth/cambiar-contrasena', {
        contrasenaActual, contrasenaNueva,
      });
      if (!res.ok) {
        const err = await res.json();
        mostrarMensaje(err.message || 'No se pudo cambiar', 'error');
        return;
      }
      setContrasenaActual(''); setContrasenaNueva(''); setContrasenaConfirm('');
      setSeccionActiva('ninguna');
      mostrarMensaje('Contraseña actualizada', 'exito');
    } catch {
      mostrarMensaje('Error de conexión', 'error');
    } finally {
      setGuardando(false);
    }
  };

  /** Cierra sesión */
  const ejecutarLogout = async () => {
    await cerrarSesion();
    router.replace('/login');
  };

  /** Elimina la cuenta */
  const eliminarCuenta = async () => {
    if (!contrasenaEliminar.trim()) {
      mostrarMensaje('Ingresa tu contraseña para confirmar', 'error'); return;
    }
    try {
      setGuardando(true);
      const res = await apiRequest('DELETE', '/api/auth/cuenta', {
        contrasena: contrasenaEliminar,
      });
      if (!res.ok) {
        const err = await res.json();
        mostrarMensaje(err.message || 'No se pudo eliminar', 'error');
        return;
      }
      queryClient.setQueryData(['/api/auth/perfil'], null);
      router.replace('/login');
    } catch {
      mostrarMensaje('Error de conexión', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 60 : 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <LinearGradient
          colors={[Colors.colores.primario, Colors.colores.primarioClaro]}
          style={[estilos.encabezado, { paddingTop: insets.top + webTopInset + 16 }]}
        >
          <Pressable onPress={cambiarFoto} style={estilos.avatarContenedor}>
            <View style={estilos.avatar}>
              {perfil?.fotoBase64 ? (
                <Image source={{ uri: perfil.fotoBase64 }} style={estilos.avatarImagen} contentFit="cover" />
              ) : (
                <Feather name="user" size={48} color={Colors.colores.primario} />
              )}
            </View>
            <View style={estilos.avatarBotonEditar}>
              {subiendoFoto
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="camera" size={13} color="#fff" />
              }
            </View>
          </Pressable>

          <Text style={estilos.nombreCompleto}>{perfil?.nombreCompleto ?? '—'}</Text>
          <Text style={estilos.nombreUsuario}>@{perfil?.nombreUsuario ?? '—'}</Text>
          {perfil?.email ? <Text style={estilos.emailTexto}>{perfil.email}</Text> : null}
        </LinearGradient>

        {/* Mensaje global */}
        {mensaje && (
          <View style={estilos.mensajeGlobal}>
            <MensajeInline texto={mensaje.texto} tipo={mensaje.tipo} />
          </View>
        )}

        {/* Datos personales */}
        <SeccionConfig titulo="Datos personales">
          <FilaConfig
            icono="edit-2"
            label="Editar nombre y email"
            valor={perfil?.email || 'Sin email configurado'}
            alPresionar={() => alternarSeccion('editar')}
            activa={seccionActiva === 'editar'}
          />
          {seccionActiva === 'editar' && (
            <View style={estilos.panelInline}>
              <Campo label="Nombre completo" value={nombreCompleto} onChange={setNombreCompleto}
                placeholder="Tu nombre completo" autoCapitalize="words" />
              <Campo label="Email (opcional)" value={email} onChange={setEmail}
                placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" />
              <View style={estilos.botonesInline}>
                <Pressable style={estilos.botonCancelar} onPress={() => setSeccionActiva('ninguna')}>
                  <Text style={estilos.botonCancelarTexto}>Cancelar</Text>
                </Pressable>
                <Pressable style={estilos.botonGuardar} onPress={guardarPerfil} disabled={guardando}>
                  {guardando
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={estilos.botonGuardarTexto}>Guardar</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}
        </SeccionConfig>

        {/* Seguridad */}
        <SeccionConfig titulo="Seguridad">
          <FilaConfig
            icono="lock"
            label="Cambiar contraseña"
            alPresionar={() => alternarSeccion('contrasena')}
            activa={seccionActiva === 'contrasena'}
          />
          {seccionActiva === 'contrasena' && (
            <View style={estilos.panelInline}>
              <Campo label="Contraseña actual" value={contrasenaActual} onChange={setContrasenaActual}
                placeholder="Tu contraseña actual" secureTextEntry />
              <Campo label="Nueva contraseña" value={contrasenaNueva} onChange={setContrasenaNueva}
                placeholder="Mínimo 6 caracteres" secureTextEntry />
              <Campo label="Confirmar contraseña" value={contrasenaConfirm} onChange={setContrasenaConfirm}
                placeholder="Repite la nueva contraseña" secureTextEntry />
              <View style={estilos.botonesInline}>
                <Pressable style={estilos.botonCancelar} onPress={() => {
                  setSeccionActiva('ninguna');
                  setContrasenaActual(''); setContrasenaNueva(''); setContrasenaConfirm('');
                }}>
                  <Text style={estilos.botonCancelarTexto}>Cancelar</Text>
                </Pressable>
                <Pressable style={estilos.botonGuardar} onPress={guardarContrasena} disabled={guardando}>
                  {guardando
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={estilos.botonGuardarTexto}>Actualizar</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}
        </SeccionConfig>

        {/* Sesión */}
        <SeccionConfig titulo="Sesión">
          <FilaConfig
            icono="log-out"
            label="Cerrar sesión"
            alPresionar={() => alternarSeccion('logout')}
            activa={seccionActiva === 'logout'}
          />
          {seccionActiva === 'logout' && (
            <View style={estilos.panelInline}>
              <Text style={estilos.panelAviso}>
                ¿Deseas cerrar la sesión? Tendrás que volver a iniciar sesión para acceder a la app.
              </Text>
              <View style={estilos.botonesInline}>
                <Pressable style={estilos.botonCancelar} onPress={() => setSeccionActiva('ninguna')}>
                  <Text style={estilos.botonCancelarTexto}>Cancelar</Text>
                </Pressable>
                <Pressable style={estilos.botonLogout} onPress={ejecutarLogout}>
                  <Text style={estilos.botonGuardarTexto}>Cerrar sesión</Text>
                </Pressable>
              </View>
            </View>
          )}
        </SeccionConfig>

        {/* Zona peligrosa */}
        <SeccionConfig titulo="Zona peligrosa">
          <FilaConfig
            icono="trash-2"
            label="Eliminar cuenta"
            alPresionar={() => alternarSeccion('eliminar')}
            peligro
            activa={seccionActiva === 'eliminar'}
          />
          {seccionActiva === 'eliminar' && (
            <View style={[estilos.panelInline, estilos.panelPeligro]}>
              <Text style={estilos.panelAvisoPeligro}>
                Esta acción es permanente. Se eliminarán todas tus mascotas, registros y datos de IA.
                Ingresa tu contraseña para confirmar.
              </Text>
              <Campo label="Contraseña de confirmación" value={contrasenaEliminar}
                onChange={setContrasenaEliminar} placeholder="Tu contraseña actual" secureTextEntry />
              <View style={estilos.botonesInline}>
                <Pressable style={estilos.botonCancelar} onPress={() => {
                  setSeccionActiva('ninguna'); setContrasenaEliminar('');
                }}>
                  <Text style={estilos.botonCancelarTexto}>Cancelar</Text>
                </Pressable>
                <Pressable style={estilos.botonEliminar} onPress={eliminarCuenta} disabled={guardando}>
                  {guardando
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={estilos.botonGuardarTexto}>Eliminar todo</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}
        </SeccionConfig>

        <Text style={estilos.version}>ExoticFriends · v1.0</Text>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: Colors.colores.fondo },
  encabezado: {
    paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 8,
  },
  avatarContenedor: { marginBottom: 12, position: 'relative' },
  avatar: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImagen: { width: 112, height: 112, borderRadius: 56 },
  avatarBotonEditar: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.colores.acento,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  nombreCompleto: { fontSize: 22, fontFamily: 'Nunito_700Bold', color: '#FFFFFF', marginBottom: 2 },
  nombreUsuario: { fontSize: 14, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  emailTexto: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: 'rgba(255,255,255,0.65)' },

  mensajeGlobal: { marginHorizontal: 16, marginTop: 12 },
  mensajeInline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  mensajeError: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCDD2' },
  mensajeExito: { backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#C8E6C9' },
  mensajeTexto: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', flex: 1 },

  seccion: { marginHorizontal: 16, marginTop: 20 },
  seccionTitulo: {
    fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.textoTerciario,
    textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 8,
  },
  seccionContenido: {
    backgroundColor: Colors.colores.fondoTarjeta, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.colores.bordeSuave,
  },
  fila: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.colores.bordeSuave,
  },
  filaPresionada: { backgroundColor: Colors.colores.fondo },
  filaActiva: { backgroundColor: Colors.colores.primarioSuave },
  filaIcono: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.colores.primarioSuave,
    alignItems: 'center', justifyContent: 'center',
  },
  filaIconoPeligro: { backgroundColor: '#FFEBEE' },
  filaTextos: { flex: 1 },
  filaLabel: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.texto },
  filaLabelPeligro: { color: Colors.colores.error },
  filaValor: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario, marginTop: 1 },

  panelInline: {
    paddingBottom: 4, borderTopWidth: 1, borderTopColor: Colors.colores.bordeSuave,
    backgroundColor: Colors.colores.fondo,
  },
  panelPeligro: { backgroundColor: '#FFF8F8' },
  panelAviso: {
    fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoSecundario,
    lineHeight: 20, marginHorizontal: 16, marginTop: 14, marginBottom: 4,
  },
  panelAvisoPeligro: {
    fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.colores.error,
    lineHeight: 20, marginHorizontal: 16, marginTop: 14, marginBottom: 4,
  },

  campoContenedor: { paddingHorizontal: 16, paddingTop: 12 },
  campoLabel: {
    fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.textoTerciario,
    marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },
  campoInput: {
    backgroundColor: Colors.colores.fondoTarjeta, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.colores.borde,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, fontFamily: 'Nunito_400Regular', color: Colors.colores.texto,
  },

  botonesInline: { flexDirection: 'row', gap: 10, padding: 14 },
  botonCancelar: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.colores.fondoTarjeta,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.colores.borde,
  },
  botonCancelarTexto: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: Colors.colores.textoSecundario },
  botonGuardar: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.colores.primario, alignItems: 'center' },
  botonLogout: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E67E22', alignItems: 'center' },
  botonEliminar: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.colores.error, alignItems: 'center' },
  botonGuardarTexto: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#FFFFFF' },

  version: {
    textAlign: 'center', fontSize: 12, fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario, marginTop: 24, marginBottom: 8,
  },
});
