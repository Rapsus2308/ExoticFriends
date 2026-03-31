/**
 * @fileoverview Pantalla de lista de mascotas — ExoticFriends
 *
 * Muestra todas las mascotas del perfil con búsqueda y filtro por categoría.
 * La búsqueda es local (sobre los datos ya cargados) para máxima fluidez.
 */

import { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, FlatList, RefreshControl,
  Platform, TextInput, Pressable, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Mascota, RegistroPeso as TipoRegistroPeso, CATEGORIAS, CategoriaMascota } from '@/lib/tipos';
import { fetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';
import TarjetaMascota from '@/components/TarjetaMascota';
import EstadoVacio from '@/components/EstadoVacio';
import BotonAccion from '@/components/BotonAccion';

export default function PantallaMascotas() {
  const insets = useSafeAreaInsets();
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [pesos, setPesos] = useState<TipoRegistroPeso[]>([]);
  const [refrescando, setRefrescando] = useState(false);

  // Estado de búsqueda y filtro por categoría
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaMascota | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const [resMascotas, resPesos] = await Promise.all([
        fetch(new URL('/api/mascotas', baseUrl).toString(), { credentials: 'include' }),
        fetch(new URL('/api/todos-pesos', baseUrl).toString(), { credentials: 'include' }),
      ]);
      const [m, p] = await Promise.all([resMascotas.json(), resPesos.json()]);
      setMascotas(m);
      setPesos(p);
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

  const obtenerUltimoPeso = (mascotaId: string): string | undefined => {
    const pesosMascota = pesos.filter(p => p.mascotaId === mascotaId);
    if (pesosMascota.length === 0) return undefined;
    const ultimo = pesosMascota[pesosMascota.length - 1];
    return `${ultimo.peso} ${ultimo.unidad}`;
  };

  /** Filtra las mascotas por texto de búsqueda (nombre o especie) y por categoría */
  const mascotasFiltradas = mascotas.filter((m) => {
    const terminoBusqueda = busqueda.toLowerCase().trim();
    const coincideTexto =
      !terminoBusqueda ||
      m.nombre.toLowerCase().includes(terminoBusqueda) ||
      m.especie.toLowerCase().includes(terminoBusqueda);
    const coincideCategoria = !categoriaFiltro || m.categoria === categoriaFiltro;
    return coincideTexto && coincideCategoria;
  });

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Categorías que tienen al menos una mascota en la lista actual
  const categoriasConMascotas = CATEGORIAS.filter((c) =>
    mascotas.some((m) => m.categoria === c.valor)
  );

  return (
    <View style={estilos.contenedor}>
      {/* Encabezado con título y botón agregar */}
      <View style={[estilos.encabezado, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={estilos.titulo}>Mascotas</Text>
        <BotonAccion
          icono="plus"
          alPresionar={() => router.push('/agregar-mascota')}
          variante="secundario"
          tamano="pequeno"
        />
      </View>

      {/* Campo de búsqueda — visible solo cuando hay mascotas */}
      {mascotas.length > 0 ? (
        <View style={estilos.busquedaContenedor}>
          <View style={estilos.busquedaInput}>
            <Feather name="search" size={16} color={Colors.colores.textoTerciario} />
            <TextInput
              style={estilos.busquedaTexto}
              placeholder="Buscar por nombre o especie..."
              placeholderTextColor={Colors.colores.textoTerciario}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCorrect={false}
              returnKeyType="search"
            />
            {busqueda.length > 0 ? (
              <Pressable onPress={() => setBusqueda('')} hitSlop={8}>
                <Feather name="x" size={16} color={Colors.colores.textoTerciario} />
              </Pressable>
            ) : null}
          </View>

          {/* Filtros de categoría (chips horizontales) */}
          {categoriasConMascotas.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.chipsContenedor}
            >
              <Pressable
                onPress={() => setCategoriaFiltro(null)}
                style={[estilos.chip, !categoriaFiltro && estilos.chipActivo]}
              >
                <Text style={[estilos.chipTexto, !categoriaFiltro && estilos.chipTextoActivo]}>
                  Todas
                </Text>
              </Pressable>
              {categoriasConMascotas.map((cat) => (
                <Pressable
                  key={cat.valor}
                  onPress={() =>
                    setCategoriaFiltro(categoriaFiltro === cat.valor ? null : cat.valor)
                  }
                  style={[estilos.chip, categoriaFiltro === cat.valor && estilos.chipActivo]}
                >
                  <Text
                    style={[
                      estilos.chipTexto,
                      categoriaFiltro === cat.valor && estilos.chipTextoActivo,
                    ]}
                  >
                    {cat.etiqueta}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={mascotasFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TarjetaMascota
            mascota={item}
            alPresionar={() => router.push({ pathname: '/detalle-mascota', params: { id: item.id } })}
            ultimoPeso={obtenerUltimoPeso(item.id)}
          />
        )}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alRefrescar}
            tintColor={Colors.colores.primario}
          />
        }
        ListEmptyComponent={
          mascotas.length === 0 ? (
            <EstadoVacio
              icono="heart"
              titulo="Sin mascotas"
              descripcion="Agrega tu primera mascota exótica"
              textoBoton="Agregar mascota"
              alPresionarBoton={() => router.push('/agregar-mascota')}
            />
          ) : (
            // La búsqueda no encontró resultados
            <View style={estilos.sinResultados}>
              <Feather name="search" size={32} color={Colors.colores.textoTerciario} />
              <Text style={estilos.sinResultadosTexto}>Sin resultados</Text>
              <Text style={estilos.sinResultadosSub}>
                No hay mascotas que coincidan con "{busqueda}"
              </Text>
            </View>
          )
        }
      />
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
  busquedaContenedor: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  busquedaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.colores.fondoTarjeta,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.colores.borde,
  },
  busquedaTexto: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.texto,
  },
  chipsContenedor: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.colores.fondoTarjeta,
    borderWidth: 1,
    borderColor: Colors.colores.borde,
  },
  chipActivo: {
    backgroundColor: Colors.colores.primario,
    borderColor: Colors.colores.primario,
  },
  chipTexto: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.textoSecundario,
  },
  chipTextoActivo: {
    color: '#FFFFFF',
  },
  lista: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  sinResultados: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  sinResultadosTexto: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.colores.textoSecundario,
    marginTop: 8,
  },
  sinResultadosSub: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.colores.textoTerciario,
    textAlign: 'center',
  },
});
