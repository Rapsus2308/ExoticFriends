import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export async function convertirImagenABase64(uri: string): Promise<string | undefined> {
  if (uri.startsWith('data:')) {
    return uri;
  }

  if (Platform.OS === 'web') {
    try {
      const respuesta = await fetch(uri);
      const blob = await respuesta.blob();
      return new Promise((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onloadend = () => resolver(lector.result as string);
        lector.onerror = rechazar;
        lector.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const extension = uri.toLowerCase().includes('.png') ? 'png' : 'jpeg';
    return `data:image/${extension};base64,${base64}`;
  } catch {
    return undefined;
  }
}
