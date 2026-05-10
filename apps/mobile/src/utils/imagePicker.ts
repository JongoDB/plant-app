import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Image picking + on-device resize helpers.
 *
 * Resize policy: long edge <= 1568px, JPEG @ quality 0.85. Anthropic's
 * vision sweet spot is roughly 1568px and ~1.5 MB; bigger inputs cost
 * tokens with diminishing accuracy gains and our upload bandwidth scales
 * linearly. We always strip EXIF (cheap privacy win + smaller payload).
 */

export interface PickedImage {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
}

const MAX_LONG_EDGE = 1568;

export async function pickFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return processAsset(asset);
}

export async function pickFromCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return processAsset(asset);
}

async function processAsset(asset: ImagePicker.ImagePickerAsset): Promise<PickedImage> {
  const longEdge = Math.max(asset.width, asset.height);
  if (longEdge <= MAX_LONG_EDGE) {
    return {
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    };
  }
  const resize =
    asset.width >= asset.height
      ? { width: MAX_LONG_EDGE }
      : { height: MAX_LONG_EDGE };
  const result = await ImageManipulator.manipulateAsync(asset.uri, [{ resize }], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return {
    uri: result.uri,
    mimeType: 'image/jpeg',
    width: result.width,
    height: result.height,
  };
}
