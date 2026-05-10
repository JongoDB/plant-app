import { Stack } from 'expo-router';

import { RequireAuth } from '../src/components/RequireAuth';
import { SmartCamera } from '../src/screens/SmartCamera';

/**
 * Smart-camera route. The actual screen body lives in
 * src/screens/SmartCamera.{tsx,web.tsx} — Metro picks the right one per
 * platform so the web bundle never has to import vision-camera or
 * fast-tflite (both native-only).
 */
export default function CameraScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Smart camera', headerShown: false }} />
      <SmartCamera />
    </RequireAuth>
  );
}
