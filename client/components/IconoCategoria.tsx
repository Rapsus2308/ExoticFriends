import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CategoriaMascota } from '@/lib/tipos';

interface PropsIconoCategoria {
  categoria: CategoriaMascota;
  size: number;
  color: string;
}

/** Mapeo de categoria a nombre de icono MaterialCommunityIcons */
const ICONOS: Record<CategoriaMascota, string> = {
  reptil: 'snake',
  ave: 'bird',
  pez: 'fish',
  mamifero: 'rabbit',
  artropodo: 'spider',
  otro: 'alien',
};

/** Renderiza el icono correspondiente a la categoria de mascota usando MaterialCommunityIcons */
export default function IconoCategoria({ categoria, size, color }: PropsIconoCategoria) {
  const nombre = ICONOS[categoria] ?? 'help-circle';
  return <MaterialCommunityIcons name={nombre as any} size={size} color={color} />;
}
