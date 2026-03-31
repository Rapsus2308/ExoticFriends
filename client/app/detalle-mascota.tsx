/**
 * @fileoverview Pantalla de detalle de mascota — ExoticFriends
 *
 * Orquesta los datos y el estado de la pantalla, delegando el renderizado
 * a componentes especializados en `components/mascotas/`.
 *
 * Responsabilidades de esta pantalla:
 *   - Carga de datos desde la API (mascota, pesos, alimentación, salud)
 *   - Gestión de visibilidad de modales
 *   - Eliminación de la mascota con confirmación
 */

import { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  RefreshControl, Alert, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import {
  Mascota,
  RegistroPeso as TipoRegistroPeso,
  RegistroAlimentacion as TipoRegistroAlimentacion,
  NotaSalud as TipoNotaSalud,
} from '@/lib/tipos';
import { fetch } from 'expo/fetch';
import { apiRequest, getApiUrl } from '@/lib/query-client';
import GraficoPeso from '@/components/GraficoPeso';
import GraficoAlimentacion from '@/components/GraficoAlimentacion';
import SeccionTitulo from '@/components/SeccionTitulo';
import AsistenteIA from '@/components/AsistenteIA';
import PerfilMascota from '@/components/mascotas/PerfilMascota';
import AccionesRapidas from '@/components/mascotas/AccionesRapidas';
import SeccionAlimentacion from '@/components/mascotas/SeccionAlimentacion';
import SeccionSalud from '@/components/mascotas/SeccionSalud';
import ModalEditarMascota from '@/components/mascotas/ModalEditarMascota';
import ModalPeso from '@/components/mascotas/ModalPeso';
import ModalAlimentacion from '@/components/mascotas/ModalAlimentacion';
import ModalSalud from '@/components/mascotas/ModalSalud';

export default function PantallaDetalleMascota() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [pesos, setPesos] = useState<TipoRegistroPeso[]>([]);
  const [alimentaciones, setAlimentaciones] = useState<TipoRegistroAlimentacion[]>([]);
  const [notasSalud, setNotasSalud] = useState<TipoNotaSalud[]>([]);
  const [refrescando, setRefrescando] = useState(false);

  const [modalPeso, setModalPeso] = useState(false);
  const [modalAlimento, setModalAlimento] = useState(false);
  const [modalSalud, setModalSalud] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!id) return;
    try {
      const baseUrl = getApiUrl();
      const [resMascota, resPesos, resAlimentacion, resSalud] = await Promise.all([
        fetch(new URL(`/api/mascotas/${id}`, baseUrl).toString(), { credentials: 'include' }),
        fetch(new URL(`/api/mascotas/${id}/pesos`, baseUrl).toString(), { credentials: 'include' }),
        fetch(new URL(`/api/mascotas/${id}/alimentacion`, baseUrl).toString(), { credentials: 'include' }),
        fetch(new URL(`/api/mascotas/${id}/salud`, baseUrl).toString(), { credentials: 'include' }),
      ]);
      const [m, p, a, n] = await Promise.all([
        resMascota.json(),
        resPesos.json(),
        resAlimentacion.json(),
        resSalud.json(),
      ]);
      setMascota(m ?? null);
      setPesos(p);
      setAlimentaciones(a);
      setNotasSalud(n);
    } catch (e) {
      console.log('Error al cargar datos:', e);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { cargarDatos(); }, [cargarDatos]));

  const alRefrescar = async () => {
    setRefrescando(true);
    await cargarDatos();
    setRefrescando(false);
  };

  const confirmarEliminar = () => {
    Alert.alert(
      'Eliminar mascota',
      `¿Estás seguro de eliminar a ${mascota?.nombre}? Se eliminarán todos los registros asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await apiRequest('DELETE', `/api/mascotas/${id}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  if (!mascota) {
    return (
      <View style={[estilos.contenedor, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={estilos.cargandoTexto}>Cargando...</Text>
      </View>
    );
  }

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={estilos.contenedor}>
      {/* Barra superior */}
      <View style={[estilos.encabezado, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={Colors.colores.texto} />
        </Pressable>
        <Text style={estilos.titulo} numberOfLines={1}>{mascota.nombre}</Text>
        <View style={estilos.encabezadoAcciones}>
          <Pressable onPress={() => setModalEditar(true)} hitSlop={12}>
            <Feather name="edit-2" size={20} color={Colors.colores.primario} />
          </Pressable>
          <Pressable onPress={confirmarEliminar} hitSlop={12}>
            <Feather name="trash-2" size={20} color={Colors.colores.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 60 : 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alRefrescar}
            tintColor={Colors.colores.primario}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Perfil de la mascota */}
        <PerfilMascota mascota={mascota} alPresionar={() => setModalEditar(true)} />

        {/* Notas generales */}
        {mascota.notas ? (
          <View style={estilos.notasContenedor}>
            <Text style={estilos.notasTexto}>{mascota.notas}</Text>
          </View>
        ) : null}

        {/* Acciones rápidas */}
        <AccionesRapidas
          alPresionarPeso={() => setModalPeso(true)}
          alPresionarAlimento={() => setModalAlimento(true)}
          alPresionarSalud={() => setModalSalud(true)}
        />

        {/* Asistente IA */}
        <View style={estilos.seccion}>
          <AsistenteIA mascotaId={mascota.id} nombreMascota={mascota.nombre} />
        </View>

        {/* Gráfico de peso */}
        <SeccionTitulo titulo="Control de peso" iconoAccion="plus" alPresionarAccion={() => setModalPeso(true)} />
        <View style={estilos.seccion}>
          <GraficoPeso registros={pesos} />
        </View>

        {/* Gráfico de frecuencia de alimentación (últimos 14 días) */}
        <SeccionTitulo titulo="Frecuencia de alimentación" />
        <View style={estilos.seccion}>
          <GraficoAlimentacion registros={alimentaciones} />
        </View>

        {/* Lista de registros de alimentación con botón agregar */}
        <SeccionAlimentacion
          alimentaciones={alimentaciones}
          alAgregar={() => setModalAlimento(true)}
          alActualizar={cargarDatos}
        />

        {/* Lista de salud */}
        <SeccionSalud
          notasSalud={notasSalud}
          alAgregar={() => setModalSalud(true)}
          alActualizar={cargarDatos}
        />
      </ScrollView>

      {/* Modales */}
      <ModalEditarMascota
        visible={modalEditar}
        mascota={mascota}
        alCerrar={() => setModalEditar(false)}
        alGuardar={cargarDatos}
      />
      <ModalPeso
        visible={modalPeso}
        mascotaId={id!}
        alCerrar={() => setModalPeso(false)}
        alGuardar={cargarDatos}
      />
      <ModalAlimentacion
        visible={modalAlimento}
        mascotaId={id!}
        alCerrar={() => setModalAlimento(false)}
        alGuardar={cargarDatos}
      />
      <ModalSalud
        visible={modalSalud}
        mascotaId={id!}
        alCerrar={() => setModalSalud(false)}
        alGuardar={cargarDatos}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: Colors.colores.fondo },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.colores.fondo,
  },
  titulo: {
    fontSize: 18, fontFamily: 'Nunito_700Bold', color: Colors.colores.texto,
    flex: 1, textAlign: 'center', marginHorizontal: 12,
  },
  encabezadoAcciones: { flexDirection: 'row', gap: 16 },
  cargandoTexto: {
    fontSize: 16, fontFamily: 'Nunito_400Regular', color: Colors.colores.textoTerciario,
  },
  notasContenedor: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.colores.primarioSuave,
    padding: 14, borderRadius: 12,
  },
  notasTexto: {
    fontSize: 13, fontFamily: 'Nunito_400Regular',
    color: Colors.colores.primarioClaro, lineHeight: 20,
  },
  seccion: { paddingHorizontal: 16, marginBottom: 8 },
});
