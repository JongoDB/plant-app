import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { branding } from '@plant-app/shared';
import type { PhotoEntry, Plant, Reminder } from '@plant-app/shared';

import { ApiError, plantsApi } from '../../src/api/client';
import { uploadPhoto } from '../../src/api/photos';
import { remindersApi } from '../../src/api/reminders';
import { speciesSlug } from '../../src/api/species';
import { AuthedImage } from '../../src/components/AuthedImage';
import { Button } from '../../src/components/Button';
import { ReminderRow } from '../../src/components/ReminderRow';
import { RequireAuth } from '../../src/components/RequireAuth';
import { Screen } from '../../src/components/Screen';
import { theme } from '../../src/theme';
import { pickFromCamera, pickFromLibrary, type PickedImage } from '../../src/utils/imagePicker';

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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [photoList, setPhotoList] = useState<PhotoEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [error, setError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, r, ph] = await Promise.all([
        plantsApi.get(id),
        remindersApi.forPlant(id),
        plantsApi.photos(id),
      ]);
      setPlant(p);
      setReminders(r);
      setPhotoList(ph);
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

  const addPhoto = useCallback(
    async (picker: () => Promise<PickedImage | null>) => {
      if (!plant) return;
      setError(undefined);
      setAdding(true);
      try {
        const picked = await picker();
        if (!picked) return;
        await uploadPhoto({
          uri: picked.uri,
          mimeType: picked.mimeType,
          width: picked.width,
          height: picked.height,
          plantId: plant.id,
          mode: 'growth',
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setAdding(false);
      }
    },
    [plant, load],
  );

  const onAddPhotoPress = () => {
    Alert.alert('Add a photo', undefined, [
      { text: 'Take photo', onPress: () => void addPhoto(pickFromCamera) },
      { text: 'Choose from library', onPress: () => void addPhoto(pickFromLibrary) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

        <View style={styles.photosBlock}>
          <View style={styles.photosHeader}>
            <Text style={styles.sectionLabel}>
              Photos {photoList.length > 0 ? `(${photoList.length})` : ''}
            </Text>
            <Pressable
              onPress={onAddPhotoPress}
              disabled={adding}
              hitSlop={6}
              style={styles.addPhoto}
            >
              {adding ? (
                <ActivityIndicator color={theme.colors.primary} size="small" />
              ) : (
                <Text style={styles.addPhotoText}>+ Add photo</Text>
              )}
            </Pressable>
          </View>
          {photoList.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStrip}
            >
              {photoList.map((p) => (
                <View key={p.id} style={styles.photoTile}>
                  <AuthedImage photoId={p.id} style={styles.photoImage} />
                  <Text style={styles.photoDate}>{relativeDateFromIso(p.takenAt)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>
              No photos yet. Add one to track how this plant changes over time.
            </Text>
          )}
        </View>

        {reminders.filter((r) => r.active).length > 0 ? (
          <View style={styles.reminders}>
            <Text style={styles.sectionLabel}>Reminders</Text>
            {reminders
              .filter((r) => r.active)
              .map((r) => (
                <ReminderRow key={r.id} reminder={r} onCompleted={load} />
              ))}
          </View>
        ) : null}

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
          {plant.scientificName ? (
            <Button
              title={`Care info for ${plant.commonName ?? 'this species'}`}
              variant="secondary"
              onPress={() =>
                router.push(`/species/${speciesSlug(plant.scientificName!)}`)
              }
            />
          ) : null}
          <Button
            title="Check the light here"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/lightmeter',
                params: { plantId: plant.id, plantName: plant.nickname },
              })
            }
          />
          <Button
            title="Schedule a reminder"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/reminders/new',
                params: { plantId: plant.id, plantName: plant.nickname },
              })
            }
          />
          <Button
            title="Edit"
            variant="secondary"
            onPress={() => router.push(`/plants/${plant.id}/edit`)}
          />
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

function relativeDateFromIso(iso: string): string {
  const d = new Date(iso);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((Date.now() - d.getTime()) / dayMs);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return d.toLocaleDateString();
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
  photosBlock: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addPhoto: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  addPhotoText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  photoStrip: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  photoTile: {
    width: 96,
    gap: 4,
  },
  photoImage: {
    width: 96,
    height: 96,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
  },
  photoDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  muted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  reminders: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  danger: {
    // Slight visual cue for the destructive action.
  },
});
