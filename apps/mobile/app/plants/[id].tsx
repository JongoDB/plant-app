import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { branding } from '@plant-app/shared';
import type { Plant } from '@plant-app/shared';

import { ApiError, plantsApi } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { RequireAuth } from '../../src/components/RequireAuth';
import { Screen } from '../../src/components/Screen';
import { theme } from '../../src/theme';

const LIGHT_LABEL: Record<string, string> = {
  direct: 'Direct sun',
  bright_indirect: 'Bright indirect',
  medium: 'Medium',
  low: 'Low',
};

export default function PlantDetailScreen() {
  return (
    <RequireAuth>
      <PlantDetail />
    </RequireAuth>
  );
}

function PlantDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [error, setError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const p = await plantsApi.get(id);
      setPlant(p);
      setStatus('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus('not_found');
      } else {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = () => {
    if (!plant) return;
    Alert.alert('Delete plant?', `Remove "${plant.nickname}" from your collection?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  const doDelete = async () => {
    if (!plant) return;
    setDeleting(true);
    try {
      await plantsApi.remove(plant.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  };

  if (status === 'loading') {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </Screen>
      </>
    );
  }

  if (status === 'not_found') {
    return (
      <>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Screen style={styles.center}>
          <Text style={styles.empty}>That plant isn't in your collection.</Text>
          <Button title="Back" variant="secondary" onPress={() => router.back()} />
        </Screen>
      </>
    );
  }

  if (!plant) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <Screen style={styles.center}>
          <Text style={styles.error}>{error ?? 'Could not load plant.'}</Text>
          <Button title="Retry" variant="secondary" onPress={() => void load()} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: plant.nickname }} />
      <Screen scroll>
        <View style={styles.header}>
          <Text style={styles.name}>{plant.nickname}</Text>
          {plant.commonName ? <Text style={styles.commonName}>{plant.commonName}</Text> : null}
          {plant.scientificName ? (
            <Text style={styles.scientificName}>{plant.scientificName}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <DetailRow label="Where" value={plant.homeLocation?.description} />
          <DetailRow
            label="Light"
            value={
              plant.homeLocation?.lightExposure
                ? LIGHT_LABEL[plant.homeLocation.lightExposure]
                : undefined
            }
          />
          <DetailRow label="Acquired" value={plant.acquiredOn} />
          <DetailRow label="Notes" value={plant.notes} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button
            title={`Ask ${branding.ASSISTANT_NAME} about this plant`}
            onPress={() =>
              router.push({
                pathname: '/rooti',
                params: { plantId: plant.id, plantName: plant.nickname },
              })
            }
          />
          <Button title="Edit" variant="secondary" disabled subtitle="Coming soon" />
          <Button
            title="Delete plant"
            variant="ghost"
            onPress={confirmDelete}
            loading={deleting}
            style={styles.danger}
          />
        </View>
      </Screen>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, !value && styles.rowMissing]}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  name: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  commonName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  scientificName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
  },
  row: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '500',
    width: 80,
  },
  rowValue: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'right',
  },
  rowMissing: {
    color: theme.colors.textMuted,
  },
  empty: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  danger: {
    // Slight visual cue for the destructive action.
  },
});
