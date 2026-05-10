import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  type CameraDevice,
  type Frame,
  type PhotoFile,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Worklets, useSharedValue } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

import { Button } from '../components/Button';
import { uploadPhoto } from '../api/photos';
import { theme } from '../theme';
import {
  decodeTopClass,
  type ClassificationResult,
} from '../services/vision/plantClasses';

/**
 * Live "smart camera" — runs EfficientNet-Lite0 on every frame to detect
 * whether what the camera sees looks plant-y. Capture button takes a still
 * and routes to Rooti chat with the photo attached.
 *
 * Native-only by construction (vision-camera + fast-tflite + worklets-core
 * have no web equivalents). The web sibling SmartCamera.web.tsx is a
 * graceful stub.
 */
export function SmartCamera() {
  const router = useRouter();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const model = useTensorflowModel(
    require('../../assets/models/efficientnet_lite0_int8.tflite'),
  );
  const { resize } = useResizePlugin();

  const lastResult = useSharedValue<ClassificationResult | null>(null);
  const [uiResult, setUiResult] = useState<ClassificationResult | null>(null);
  const [capturing, setCapturing] = useState(false);

  const updateUi = Worklets.createRunOnJS((r: ClassificationResult) => {
    setUiResult(r);
  });

  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      if (model.state !== 'loaded') return;
      const resized = resize(frame, {
        scale: { width: 224, height: 224 },
        pixelFormat: 'rgb',
        dataType: 'uint8',
        rotation: '0deg',
      });
      const outputs = model.model.runSync([resized as unknown as Uint8Array]);
      const out = outputs[0];
      if (!out) return;
      const result = decodeTopClass(out as unknown as Uint8Array);
      lastResult.value = result;
      updateUi(result);
    },
    [model.state, updateUi],
  );

  const capture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      const uri = `file://${photo.path}`;
      const uploaded = await uploadPhoto({
        uri,
        mimeType: 'image/jpeg',
        width: photo.width,
        height: photo.height,
      });
      router.replace({
        pathname: '/rooti',
        params: { photoId: uploaded.id },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('camera capture failed', err);
    } finally {
      setCapturing(false);
    }
  }, [capturing, router]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission needed</Text>
        <Button title="Grant access" onPress={() => void requestPermission()} />
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No camera available.</Text>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device as CameraDevice}
        isActive={true}
        photo
        frameProcessor={frameProcessor}
      />
      <View style={styles.overlayTop} pointerEvents="none">
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {model.state !== 'loaded'
              ? 'Loading model…'
              : uiResult?.isPlantLike
                ? `🌿 plant detected (${Math.round((uiResult.topConfidence ?? 0) * 100)}%)`
                : 'Looking…'}
          </Text>
        </View>
      </View>
      <View style={styles.overlayBottom}>
        <Pressable onPress={() => router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.shutter, capturing && styles.shutterDisabled]}
          onPress={capture}
          disabled={capturing}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.cancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  overlayTop: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '600' },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cancel: { minWidth: 70 },
  cancelText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '500' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
