/** Paleta de colores de ExoticFriends - tema inspirado en naturaleza con verde esmeralda y ambar */
const colores = {
  primario: '#0B3D2E',
  primarioClaro: '#1A5C45',
  primarioSuave: '#E8F5EE',
  acento: '#E8983E',
  acentoClaro: '#F5C27A',
  acentoSuave: '#FFF3E0',
  fondo: '#F7F9F8',
  fondoTarjeta: '#FFFFFF',
  texto: '#1A2B23',
  textoSecundario: '#5A7068',
  textoTerciario: '#8FA39B',
  borde: '#D4E0DA',
  bordeSuave: '#E8EDE9',
  exito: '#2E7D4F',
  advertencia: '#E8983E',
  error: '#C0392B',
  reptil: '#4CAF50',
  ave: '#2196F3',
  pez: '#00BCD4',
  mamifero: '#FF9800',
  artropodo: '#9C27B0',
  otro: '#607D8B',
};

export default {
  light: {
    text: colores.texto,
    background: colores.fondo,
    tint: colores.primario,
    tabIconDefault: colores.textoTerciario,
    tabIconSelected: colores.primario,
  },
  colores,
};
