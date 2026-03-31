import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import {
  Mascota, RegistroPeso as TipoRegistroPeso, RegistroAlimentacion as TipoRegistroAlimentacion,
  NotaSalud as TipoNotaSalud, formatearFecha, obtenerColorCategoria
} from '@/lib/tipos';
import { fetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';
import EstadoVacio from '@/components/EstadoVacio';

type ItemActividad = {
  id: string;
  tipo: 'peso' | 'alimentacion' | 'salud';
  fecha: string;
  mascotaId: string;
  descripcion: string;
  detalle?: string;
};

export default function PantallaActividad() {
  const insets = useSafeAreaInsets();
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [actividades, setActividades] = useState<ItemActividad[]>([]);
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

      const items: ItemActividad[] = [
        ...p.map((r: any): ItemActividad => ({
          id: r.id, tipo: 'peso', fecha: r.fecha, mascotaId: r.mascotaId,
          descripcion: 'Registro de peso', detalle: `${r.peso} ${r.unidad}`,
        })),
        ...a.map((r: any): ItemActividad => ({
          id: r.id, tipo: 'alimentacion', fecha: r.fecha, mascotaId: r.mascotaId,
          descripcion: r.alimento, detalle: r.cantidad,
        })),
        ...n.map((r: any): ItemActividad => ({
          id: r.id, tipo: 'salud', fecha: r.fecha, mascotaId: r.mascotaId,
          descripcion: r.titulo, detalle: r.tipo,
        })),
      ];

      items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setActividades(items);
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

  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'peso': return 'trending-up';
      case 'alimentacion': return 'coffee';
      case 'salud': return 'clipboard';
      default: return 'circle';
    }
  };

  const obtenerColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'peso': return Colors.colores.acento;
      case 'alimentacion': return Colors.colores.primario;
      case 'salud': return Colors.colores.exito;
      default: return Colors.colores.textoTerciario;
    }
  };

  const obtenerEtiquetaTipo = (tipo: string) => {
    switch (tipo) {
      case 'peso': return 'Peso';
      case 'alimentacion': return 'Alimentacion';
      case 'salud': return 'Salud';
      default: return '';
    }
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const agruparPorFecha = (items: ItemActividad[]) => {
    const grupos: { [key: string]: ItemActividad[] } = {};
    items.forEach(item => {
      const fecha = formatearFecha(item.fecha);
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(item);
    });
    return Object.entries(grupos);
  };

  const grupos = agruparPorFecha(actividades);

  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.encabezado, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={estilos.titulo}>Actividad</Text>
        <Text style={estilos.conteo}>{actividades.length} registros</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={alRefrescar} tintColor={Colors.colores.primario} />}
        showsVerticalScrollIndicator={false}
      >
        {actividades.length === 0 ? (
          <EstadoVacio
            icono="activity"
            titulo="Sin actividad"
            descripcion="Los registros de peso, alimentacion y salud de tus mascotas apareceran aqui"
          />
        ) : (
          grupos.map(([fecha, items]) => (
            <View key={fecha}>
              <Text style={estilos.fechaGrupo}>{fecha}</Text>
              {items.map((item) => {
                const mascota = mascotas.find(m => m.id === item.mascotaId);
                const color = obtenerColorTipo(item.tipo);
                return (
                  <View key={item.id} style={estilos.itemActividad}>
                    <View style={[estilos.itemIcono, { backgroundColor: color + '18' }]}>
                      <Feather name={obtenerIconoTipo(item.tipo) as any} size={18} color={color} />
                    </View>
                    <View style={estilos.itemInfo}>
                      <Text style={estilos.itemDescripcion} numberOfLines={1}>{item.descripcion}</Text>
                      <Text style={estilos.itemMascota} numberOfLines={1}>
                        {mascota?.nombre ?? 'Mascota'} · {obtenerEtiquetaTipo(item.tipo)}
                      </Text>
                    </View>
                    {item.detalle ? (
                      <Text style={[estilos.itemDetalle, { color }]}>{item.detalle}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.colores.fondo,
  },
  titulo: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.texto,
  },
  conteo: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
  },
  fechaGrupo: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: Colors.colores.textoSecundario,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  itemActividad: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: Colors.colores.fondoTarjeta,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
    elevation: 1,
  },
  itemIcono: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemDescripcion: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.texto,
  },
  itemMascota: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    marginTop: 1,
  },
  itemDetalle: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
});
