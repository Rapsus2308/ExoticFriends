import { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import CampoTexto from '@/components/CampoTexto';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

type Modo = 'login' | 'registro';

export default function PantallaLogin() {
  const insets = useSafeAreaInsets();
  const { iniciarSesion, registrarse } = useAuth();

  const [modo, setModo] = useState<Modo>('login');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alternarModo = () => {
    setModo(modo === 'login' ? 'registro' : 'login');
    setError('');
    setNombreUsuario('');
    setContrasena('');
    setNombreCompleto('');
    setEmail('');
  };

  const manejarEnvio = async () => {
    setError('');
    if (!nombreUsuario.trim() || !contrasena.trim()) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }
    if (modo === 'registro' && !nombreCompleto.trim()) {
      setError('El nombre completo es requerido.');
      return;
    }
    if (modo === 'registro' && contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      if (modo === 'login') {
        await iniciarSesion({ nombreUsuario: nombreUsuario.trim(), contrasena });
      } else {
        await registrarse({
          nombreUsuario: nombreUsuario.trim(),
          contrasena,
          nombreCompleto: nombreCompleto.trim(),
          email: email.trim() || undefined,
        });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const mensaje = err?.message || 'Ocurrió un error. Intenta de nuevo.';
      setError(mensaje.replace(/^\d+:\s*/, ''));
    } finally {
      setEnviando(false);
    }
  };

  const esRegistro = modo === 'registro';

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          estilos.contenido,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo y título */}
        <View style={estilos.encabezado}>
          <View style={estilos.iconoContenedor}>
            <MaterialCommunityIcons name="paw" size={48} color={Colors.colores.fondoTarjeta} />
          </View>
          <Text style={estilos.titulo}>ExoticFriends</Text>
          <Text style={estilos.subtitulo}>
            {esRegistro
              ? 'Crea tu cuenta y comienza'
              : 'Inicia sesión para cuidar a tus mascotas'}
          </Text>
        </View>

        {/* Selector de modo (tabs) */}
        <View style={estilos.modoSelector}>
          <Pressable
            style={[estilos.modoBoton, !esRegistro && estilos.modoBotonActivo]}
            onPress={() => { if (esRegistro) alternarModo(); }}
          >
            <Text style={[estilos.modoBotonTexto, !esRegistro && estilos.modoBotonTextoActivo]}>
              Iniciar sesión
            </Text>
          </Pressable>
          <Pressable
            style={[estilos.modoBoton, esRegistro && estilos.modoBotonActivo]}
            onPress={() => { if (!esRegistro) alternarModo(); }}
          >
            <Text style={[estilos.modoBotonTexto, esRegistro && estilos.modoBotonTextoActivo]}>
              Crear cuenta
            </Text>
          </Pressable>
        </View>

        {/* Formulario */}
        <View style={estilos.formulario}>

          {esRegistro && (
            <CampoTexto
              etiqueta="Nombre completo"
              placeholder="Tu nombre completo"
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
              autoCapitalize="words"
            />
          )}

          <CampoTexto
            etiqueta="Nombre de usuario"
            placeholder="Sin espacios ni caracteres especiales"
            value={nombreUsuario}
            onChangeText={setNombreUsuario}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {esRegistro && (
            <CampoTexto
              etiqueta="Email (opcional)"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          <CampoTexto
            etiqueta="Contraseña"
            placeholder={esRegistro ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? (
            <View style={estilos.errorContenedor}>
              <Feather name="alert-circle" size={15} color={Colors.colores.error} />
              <Text style={estilos.errorTexto}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              estilos.botonPrincipal,
              enviando && estilos.botonDeshabilitado,
              pressed && !enviando && estilos.botonPresionado,
            ]}
            onPress={manejarEnvio}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color={Colors.colores.fondoTarjeta} />
            ) : (
              <Text style={estilos.botonPrincipalTexto}>
                {esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Enlace de alternancia */}
        <View style={estilos.alternarContenedor}>
          <Text style={estilos.alternarTexto}>
            {esRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          </Text>
          <Pressable onPress={alternarModo} hitSlop={8}>
            <Text style={estilos.alternarEnlace}>
              {esRegistro ? 'Inicia sesión' : 'Regístrate'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: Colors.colores.fondo,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconoContenedor: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0px 8px 16px rgba(11, 61, 46, 0.25)',
    elevation: 8,
  },
  titulo: {
    fontSize: 30,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.primario,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoSecundario,
    textAlign: 'center',
  },
  modoSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.colores.bordeSuave,
  },
  modoBoton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  modoBotonActivo: {
    backgroundColor: Colors.colores.primario,
    boxShadow: '0px 2px 4px rgba(11, 61, 46, 0.2)',
    elevation: 3,
  },
  modoBotonTexto: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.textoTerciario,
  },
  modoBotonTextoActivo: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  formulario: {
    marginBottom: 20,
  },
  errorContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorTexto: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.error,
  },
  botonPrincipal: {
    backgroundColor: Colors.colores.primario,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(11, 61, 46, 0.2)',
    elevation: 4,
    marginTop: 4,
  },
  botonPresionado: {
    opacity: 0.85,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonPrincipalTexto: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.fondoTarjeta,
  },
  alternarContenedor: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  alternarTexto: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoSecundario,
  },
  alternarEnlace: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.acento,
  },
});
