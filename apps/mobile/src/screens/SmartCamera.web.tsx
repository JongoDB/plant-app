import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../components/Button';
import { theme } from '../theme';

/**
 * Web stub for the smart-camera screen. vision-camera + fast-tflite are
 * native-only, so on web we just point users back to the device build.
 */
export function SmartCamera() {
  const router = useRouter();
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Smart camera is mobile-only</Text>
      <Text style={styles.body}>
        The on-device plant detector runs through React Native's vision-camera +
        fast-tflite. Build the dev client on iOS or Android to use it. On web
        you can still attach photos to Rooti via the file picker.
      </Text>
      <Button title="Back" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text },
  body: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
