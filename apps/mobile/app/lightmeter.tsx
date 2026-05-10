import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { LightExposure } from '@plant-app/shared';

import { plantsApi } from '../src/api/client';
import { Button } from '../src/components/Button';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';
import { pickFromCamera, pickFromLibrary, type PickedImage } from '../src/utils/imagePicker';
import { measureLightFromUri, type LightReading } from '../src/utils/lightMeter';

const LIGHT_LABEL: Record<LightExposure, string> = {
  low: 'Low light',
  medium: 'Medium light',
  bright_indirect: 'Bright indirect',
  direct: 'Direct sun',
};

const LIGHT_HINT: Record<LightExposure, string> = {
  low: 'Good for low-light tolerant plants — pothos, ZZ, snake plant.',
  medium: 'Most houseplants will be content here.',
  bright_indirect: "Many tropicals' sweet spot — fiddle leaf, monstera, calatheas.",
  direct: 'Great for sun lovers — succulents, cacti, citrus, herbs.',
};

type Phase =
  | { kind: 'choose' }
  | { kind: 'measuring'; uri: string }
  | { kind: 'result'; uri: string; reading: LightReading }
  | { kind: 'error'; message: string };

export default function LightMeterScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Light meter' }} />
      <LightMeter />
    </RequireAuth>
  );
}

function LightMeter() {
  const router = useRouter();
  const { plantId, plantName } = useLocalSearchParams<{
    plantId?: string;
    plantName?: string;
  }>();
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' });
  const [saving, setSaving] = useState(false);

  const measure = async (picker: () => Promise<PickedImage | null>) => {
    setPhase({ kind: 'choose' });
    let picked: PickedImage | null = null;
    try {
      picked = await picker();
    } catch (err) {
      setPhase({ kind: 'error', message: errorMessage(err) });
      return;
    }
    if (!picked) return;
    setPhase({ kind: 'measuring', uri: picked.uri });
    try {
      const reading = await measureLightFromUri(picked.uri);
      setPhase({ kind: 'result', uri: picked.uri, reading });
    } catch (err) {
      setPhase({ kind: 'error', message: errorMessage(err) });
    }
  };

  const saveToPlant = async (category: LightExposure) => {
    if (!plantId) return;
    setSaving(true);
    try {
      await plantsApi.update(plantId, {
        homeLocation: { lightExposure: category },
      });
      router.back();
    } catch (err) {
      setPhase({ kind: 'error', message: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  if (phase.kind === 'choose') {
    return (
      <Screen>
        <Text style={styles.title}>How much light is here?</Text>
        <Text style={styles.muted}>
          Hold the camera where you'd put the plant — facing roughly the same direction
          and angle as a leaf would. Take one picture and we'll estimate the light
          level from the image's brightness.
        </Text>
        <Button title="Take a photo" onPress={() => void measure(pickFromCamera)} />
        <Button
          title="Pick from library"
          variant="secondary"
          onPress={() => void measure(pickFromLibrary)}
        />
        <Text style={styles.smallMuted}>
          Heads-up: phone cameras auto-expose, which softens contrast. The reading is a
          rough category (low / medium / bright / direct), not a lux number.
        </Text>
      </Screen>
    );
  }

  if (phase.kind === 'measuring') {
    return (
      <Screen>
        <Image source={{ uri: phase.uri }} style={styles.preview} resizeMode="cover" />
        <View style={styles.workingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Reading the light…</Text>
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'error') {
    return (
      <Screen>
        <Text style={styles.title}>Couldn't measure</Text>
        <Text style={styles.error}>{phase.message}</Text>
        <Button
          title="Try again"
          variant="secondary"
          onPress={() => setPhase({ kind: 'choose' })}
        />
      </Screen>
    );
  }

  const { reading, uri } = phase;
  return (
    <Screen scroll>
      <Image source={{ uri }} style={styles.preview} resizeMode="cover" />

      <View style={styles.resultCard}>
        <Text style={styles.bigCategory}>{LIGHT_LABEL[reading.category]}</Text>
        <Text style={styles.muted}>{LIGHT_HINT[reading.category]}</Text>
        <Text style={styles.smallMuted}>
          Average brightness: {Math.round(reading.averageLuminance)} / 255
        </Text>
      </View>

      {plantId ? (
        <Button
          title={`Save as ${plantName ?? 'plant'}'s light`}
          onPress={() => void saveToPlant(reading.category)}
          loading={saving}
        />
      ) : null}
      <Button
        title="Measure another spot"
        variant="secondary"
        onPress={() => setPhase({ kind: 'choose' })}
      />
    </Screen>
  );
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const styles = StyleSheet.create({
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  muted: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  smallMuted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  error: {
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  workingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  resultCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  bigCategory: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
