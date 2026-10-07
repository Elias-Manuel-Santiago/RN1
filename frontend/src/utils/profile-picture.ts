import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function pickProfilePicture(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > 800) {
    context.resize(
      asset.width >= asset.height ? { width: 800 } : { height: 800 },
    );
  }
  const image = await context.renderAsync();
  try {
    const saved = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.8,
      base64: true,
    });
    if (!saved.base64) throw new Error('No se pudo leer la imagen.');
    const data = `data:image/jpeg;base64,${saved.base64}`;
    if (data.length > 2 * 1024 * 1024)
      throw new Error('Selecciona una imagen más pequeña (máximo 1.5 MB).');
    return data;
  } finally {
    image.release();
    context.release();
  }
}
