import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import {
  Mascota, RegistroPeso as TipoRegistroPeso, RegistroAlimentacion as TipoRegistroAlimentacion,
  NotaSalud as TipoNotaSalud, obtenerColorCategoria, formatearFecha
} from '@/lib/tipos';
import { fetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';
import EstadoVacio from '@/components/EstadoVacio';
import IconoCategoria from '@/components/IconoCategoria';

export default function PantallaInicio() {
  const insets = useSafeAreaInsets();
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [pesos, setPesos] = useState<TipoRegistroPeso[]>([]);
  const [alimentaciones, setAlimentaciones] = useState<TipoRegistroAlimentacion[]>([]);
  const [notasSalud, setNotasSalud] = useState<TipoNotaSalud[]>([]);
  const [refrescando, setRefrescando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const [resMascotas, resPesos, resAlimentacion, resSalud] = await Promise.all([
        fetch(new URL('/api/mascotas', baseUrl).toString(), { credentials: 'include' }),
        fetch(new URL('/api/todos-pesos', baseUrl).toString(), { credentials: 'include' }),
        fetch(new URL('/api/toda-alimentacion', baseUrl).toString(), { credentials: 'include' }),
        fetch(new URL('/api/toda-salud', baseUrl).toString(), { credentials: 'include' }),
      ]);
      const [m, p, a, n] = await Promise.all([
        resMascotas.json(),
        resPesos.json(),
        resAlimentacion.json(),
        resSalud.json(),
      ]);
      setMascotas(m);
      setPesos(p);
      setAlimentaciones(a);
      setNotasSalud(n);
    } catch (e) {
      console.log('Error al cargar datos:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    cargarDatos();
  }, [cargarDatos]));

  const alRefrescar = async () => {
    setRefrescando(true);
    await cargarDatos();
    setRefrescando(false);
  };

  const actividadReciente = [...alimentaciones, ...notasSalud]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5);

  const obtenerUltimoPesoPorMascota = (mascotaId: string) => {
    const pesosMascota = pesos.filter(p => p.mascotaId === mascotaId);
    if (pesosMascota.length === 0) return null;
    return pesosMascota[pesosMascota.length - 1];
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={estilos.contenedor}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={alRefrescar} tintColor={Colors.colores.primario} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.colores.primario, Colors.colores.primarioClaro]}
          style={[estilos.encabezado, { paddingTop: insets.top + webTopInset + 16 }]}
        >
          <View style={estilos.encabezadoContenido}>
            <View>
              <Text style={estilos.saludo}>ExoticFriends</Text>
              <Text style={estilos.subtitulo}>
                {mascotas.length === 0
                  ? 'Agrega tu primera mascota'
                  : `${mascotas.length} ${mascotas.length === 1 ? 'mascota' : 'mascotas'} registradas`
                }
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/agregar-mascota')}
              style={estilos.botonAgregar}
            >
              <Feather name="plus" size={22} color={Colors.colores.primario} />
            </Pressable>
          </View>
        </LinearGradient>

        {mascotas.length === 0 ? (
          <EstadoVacio
            icono="heart"
            titulo="Sin mascotas aun"
            descripcion="Registra tu primera mascota exotica para empezar a llevar un control de su salud y alimentacion"
            textoBoton="Agregar mascota"
            alPresionarBoton={() => router.push('/agregar-mascota')}
          />
        ) : (
          <>
            <View style={estilos.estadisticasFila}>
              <View style={estilos.tarjetaEstadistica}>
                <Ionicons name="paw" size={20} color={Colors.colores.primario} />
                <Text style={estilos.estadisticaNumero}>{mascotas.length}</Text>
                <Text style={estilos.estadisticaEtiqueta}>Mascotas</Text>
              </View>
              <View style={estilos.tarjetaEstadistica}>
                <Feather name="trending-up" size={20} color={Colors.colores.acento} />
                <Text style={estilos.estadisticaNumero}>{pesos.length}</Text>
                <Text style={estilos.estadisticaEtiqueta}>Pesajes</Text>
              </View>
              <View style={estilos.tarjetaEstadistica}>
                <Feather name="activity" size={20} color={Colors.colores.exito} />
                <Text style={estilos.estadisticaNumero}>{notasSalud.length}</Text>
                <Text style={estilos.estadisticaEtiqueta}>Notas</Text>
              </View>
            </View>

            <Text style={estilos.seccionTitulo}>Tus mascotas</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.mascotasScroll}
            >
              {mascotas.map((mascota) => {
                const colorCat = obtenerColorCategoria(mascota.categoria);
                const ultimoPeso = obtenerUltimoPesoPorMascota(mascota.id);
                return (
                  <Pressable
                    key={mascota.id}
                    onPress={() => router.push({ pathname: '/detalle-mascota', params: { id: mascota.id } })}
                    style={({ pressed }) => [estilos.tarjetaMiniMascota, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    {mascota.fotoBase64 ? (
                      <Image source={{ uri: mascota.fotoBase64 }} style={estilos.miniFoto} contentFit="cover" />
                    ) : (
                      <View style={[estilos.miniIcono, { backgroundColor: colorCat + '20' }]}>
                        <IconoCategoria categoria={mascota.categoria} size={24} color={colorCat} />
                      </View>
                    )}
                    <Text style={estilos.miniNombre} numberOfLines={1}>{mascota.nombre}</Text>
                    <Text style={estilos.miniEspecie} numberOfLines={1}>{mascota.especie}</Text>
                    {ultimoPeso ? (
                      <View style={estilos.miniPeso}>
                        <Text style={estilos.miniPesoTexto}>{ultimoPeso.peso} {ultimoPeso.unidad}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            {actividadReciente.length > 0 ? (
              <>
                <Text style={estilos.seccionTitulo}>Actividad reciente</Text>
                <View style={estilos.actividadLista}>
                  {actividadReciente.map((item) => {
                    const esAlimentacion = 'alimento' in item;
                    const mascota = mascotas.find(m => m.id === item.mascotaId);
                    return (
                      <View key={item.id} style={estilos.actividadItem}>
                        <View style={[estilos.actividadIcono, {
                          backgroundColor: esAlimentacion ? Colors.colores.acentoSuave : Colors.colores.primarioSuave
                        }]}>
                          <Feather
                            name={esAlimentacion ? 'coffee' : 'clipboard'}
                            size={16}
                            color={esAlimentacion ? Colors.colores.acento : Colors.colores.primario}
                          />
                        </View>
                        <View style={estilos.actividadInfo}>
                          <Text style={estilos.actividadTitulo} numberOfLines={1}>
                            {esAlimentacion ? (item as TipoRegistroAlimentacion).alimento : (item as TipoNotaSalud).titulo}
                          </Text>
                          <Text style={estilos.actividadSub} numberOfLines={1}>
                            {mascota?.nombre} · {formatearFecha(item.fecha)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: Colors.colores.fondo,
  },
  encabezado: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  encabezadoContenido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saludo: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  subtitulo: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  botonAgregar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadisticasFila: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -12,
    gap: 10,
  },
  tarjetaEstadistica: {
    flex: 1,
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  estadisticaNumero: {
    fontSize: 22,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
  estadisticaEtiqueta: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
  },
  seccionTitulo: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  mascotasScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tarjetaMiniMascota: {
    width: 130,
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  miniFoto: {
    width: 50,
    height: 50,
    borderRadius: 14,
  },
  miniIcono: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniNombre: {
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
    textAlign: 'center',
  },
  miniEspecie: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    textAlign: 'center',
  },
  miniPeso: {
    backgroundColor: Colors.colores.primarioSuave,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniPesoTexto: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.primario,
  },
  actividadLista: {
    paddingHorizontal: 16,
    gap: 8,
  },
  actividadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.colores.fondoTarjeta,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
    elevation: 1,
  },
  actividadIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actividadInfo: {
    flex: 1,
  },
  actividadTitulo: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.texto,
  },
  actividadSub: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    marginTop: 1,
  },
});
