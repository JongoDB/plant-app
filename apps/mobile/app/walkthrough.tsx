import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { branding } from '@plant-app/shared';
import type { Plant } from '@plant-app/shared';

import { plantsApi } from '../src/api/client';
import { uploadPhoto } from '../src/api/photos';
import { streamRootiMessage } from '../src/api/rooti';
import { AuthedImage } from '../src/components/AuthedImage';
import { Button } from '../src/components/Button';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';
import {
  pickFromCamera,
  pickFromLibrary,
  type PickedImage,
} from '../src/utils/imagePicker';
import { getLocation, type LatLng } from '../src/utils/location';

/**
 * Walkthrough mode. The user picks plants, takes a photo of each in turn,
 * and at the end Rooti gets every photo in a single message and returns a
 * per-plant report. Bridges the camera, photo upload, and Rooti chat
 * surfaces that already exist — no new backend pieces beyond bumping the
 * Rooti photoIds cap to 12.
 */

const MAX_PLANTS = 12;

type Phase = 'select' | 'capture' | 'analyze' | 'report';

interface Capture {
  plantId: string;
  photoId: string;
  localUri: string;
}

export default function WalkthroughScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Walkthrough' }} />
      <Walkthrough />
    </RequireAuth>
  );
}

function Walkthrough() {
  const router = useRouter();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState<string | undefined>();

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Capture
  const [order, setOrder] = useState<Plant[]>([]);
  const [index, setIndex] = useState(0);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [busy, setBusy] = useState(false);

  // Analyze / Report
  const [report, setReport] = useState('');
  const locationRef = useRef<LatLng | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const list = await plantsApi.list();
        setPlants(list);
        setSelected(new Set(list.slice(0, MAX_PLANTS).map((p) => p.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
    void (async () => {
      const loc = await getLocation();
      if (loc) locationRef.current = loc;
    })();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_PLANTS) {
          Alert.alert(
            'Limit reached',
            `Walkthroughs cap at ${MAX_PLANTS} plants per turn so Rooti has room to think about each one.`,
          );
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const startWalking = () => {
    const ordered = plants.filter((p) => selected.has(p.id));
    if (ordered.length === 0) return;
    setOrder(ordered);
    setIndex(0);
    setCaptures([]);
    setReport('');
    setError(undefined);
    setPhase('capture');
  };

  const currentPlant: Plant | undefined = order[index];

  const advance = useCallback(() => {
    setBusy(false);
    setIndex((i) => i + 1);
  }, []);

  const capturePhoto = useCallback(
    async (picker: () => Promise<PickedImage | null>) => {
      if (!currentPlant) return;
      setError(undefined);
      setBusy(true);
      try {
        const picked = await picker();
        if (!picked) {
          setBusy(false);
          return;
        }
        const uploaded = await uploadPhoto({
          uri: picked.uri,
          mimeType: picked.mimeType,
          width: picked.width,
          height: picked.height,
          plantId: currentPlant.id,
          mode: 'health',
        });
        setCaptures((prev) => [
          ...prev,
          {
            plantId: currentPlant.id,
            photoId: uploaded.id,
            localUri: picked.uri,
          },
        ]);
        advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBusy(false);
      }
    },
    [currentPlant, advance],
  );

  const skipPlant = () => {
    if (busy) return;
    advance();
  };

  // After we've stepped past the last plant in `order`, kick off analysis.
  useEffect(() => {
    if (phase !== 'capture') return;
    if (index < order.length) return;
    if (captures.length === 0) {
      // Nothing photographed; bail back to select.
      setPhase('select');
      return;
    }
    setPhase('analyze');
  }, [phase, index, order.length, captures.length]);

  // Run the Rooti turn once we're in 'analyze'.
  useEffect(() => {
    if (phase !== 'analyze') return;
    if (captures.length === 0) return;

    let cancelled = false;
    const ac = new AbortController();

    void (async () => {
      const lines: string[] = [];
      lines.push(
        `Walkthrough check-in: I just took a photo of each of ${captures.length} ${captures.length === 1 ? 'plant' : 'plants'} in my collection.`,
      );
      lines.push('');
      lines.push('Photos correspond, in order, to:');
      captures.forEach((c, i) => {
        const plant = plants.find((p) => p.id === c.plantId);
        const name = plant
          ? plant.commonName
            ? `${plant.nickname} (${plant.commonName})`
            : plant.nickname
          : 'unknown plant';
        lines.push(`${i + 1}. ${name}`);
      });
      lines.push('');
      lines.push(
        'For each plant, give me a short status (one line) and a recommendation (one line). Use this format exactly:',
      );
      lines.push('');
      lines.push('## {plant name}');
      lines.push('Status: …');
      lines.push('Recommendation: …');
      lines.push('');
      lines.push(
        'Be concrete and direct — flag anything that looks off (yellowing, droop, pests, light/water issues). If everything looks healthy, say so.',
      );

      try {
        await streamRootiMessage({
          text: lines.join('\n'),
          photoIds: captures.map((c) => c.photoId),
          location: locationRef.current
            ? { lat: locationRef.current.lat, lng: locationRef.current.lng }
            : undefined,
          onTextDelta: (delta) => {
            if (cancelled) return;
            setReport((prev) => prev + delta);
          },
          onError: (msg) => {
            if (!cancelled) setError(msg);
          },
          onDone: () => {
            if (!cancelled) setPhase('report');
          },
          signal: ac.signal,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase('report');
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [phase, captures, plants]);

  const restart = () => {
    setPhase('select');
    setOrder([]);
    setIndex(0);
    setCaptures([]);
    setReport('');
    setError(undefined);
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  if (plants.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.empty}>
          You'll need at least one plant in your collection to do a walkthrough.
        </Text>
        <Button
          title="Add a plant"
          onPress={() => router.replace('/plants/new')}
        />
      </Screen>
    );
  }

  if (phase === 'select') {
    return (
      <Screen scroll>
        <View style={styles.intro}>
          <Text style={styles.title}>Walk through your plants</Text>
          <Text style={styles.subtitle}>
            Take one photo per plant. {branding.ASSISTANT_NAME} reviews
            them all together and flags anything that looks off.
          </Text>
        </View>
        <Text style={styles.sectionLabel}>
          {selected.size}/{Math.min(plants.length, MAX_PLANTS)} selected
        </Text>
        <View style={styles.list}>
          {plants.map((p) => {
            const on = selected.has(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => toggle(p.id)}
                style={({ pressed }) => [
                  styles.row,
                  on && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
              >
                {p.primaryPhotoId ? (
                  <AuthedImage photoId={p.primaryPhotoId} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbEmoji}>🌿</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{p.nickname}</Text>
                  {p.commonName ? (
                    <Text style={styles.rowSub}>{p.commonName}</Text>
                  ) : null}
                </View>
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button
            title={
              selected.size === 0
                ? 'Select at least one plant'
                : `Start walking (${selected.size})`
            }
            onPress={startWalking}
            disabled={selected.size === 0}
          />
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (phase === 'capture' && currentPlant) {
    return (
      <Screen scroll>
        <View style={styles.intro}>
          <Text style={styles.progress}>
            Plant {index + 1} of {order.length}
          </Text>
          <Text style={styles.title}>{currentPlant.nickname}</Text>
          {currentPlant.commonName ? (
            <Text style={styles.subtitle}>{currentPlant.commonName}</Text>
          ) : null}
          {currentPlant.homeLocation ? (
            <Text style={styles.subtitle}>
              📍 {currentPlant.homeLocation.description}
            </Text>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button
            title="Take photo"
            onPress={() => void capturePhoto(pickFromCamera)}
            loading={busy}
          />
          <Button
            title="Choose from library"
            variant="secondary"
            onPress={() => void capturePhoto(pickFromLibrary)}
            disabled={busy}
          />
          <Button
            title="Skip this plant"
            variant="ghost"
            onPress={skipPlant}
            disabled={busy}
          />
          <Button
            title="Cancel walkthrough"
            variant="ghost"
            onPress={restart}
            disabled={busy}
          />
        </View>
      </Screen>
    );
  }

  if (phase === 'analyze') {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.analyzeText}>
          {branding.ASSISTANT_NAME} is reviewing {captures.length}{' '}
          {captures.length === 1 ? 'photo' : 'photos'}…
        </Text>
        {report.length > 0 ? (
          <ScrollView style={styles.streamPreview}>
            <Text style={styles.streamPreviewText}>{report}</Text>
          </ScrollView>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  }

  // phase === 'report'
  return (
    <Screen scroll>
      <Text style={styles.title}>Walkthrough report</Text>
      <Text style={styles.subtitle}>
        {captures.length} {captures.length === 1 ? 'plant' : 'plants'}{' '}
        reviewed by {branding.ASSISTANT_NAME}.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.reportCard}>
        <Text style={styles.reportText}>
          {report.trim() || 'No report — try again.'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Walk through again" onPress={restart} />
        <Button title="Done" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  intro: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  progress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowSelected: {
    borderColor: theme.colors.primary,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  rowSub: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.sm,
  },
  thumbPlaceholder: {
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 22,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxMark: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
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
  analyzeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
  streamPreview: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  streamPreviewText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  reportCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reportText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
});
