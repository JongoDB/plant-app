import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { PlantIdSpeciesCandidate } from '@plant-app/shared';

import { ApiError } from '../src/api/client';
import { identifyApi } from '../src/api/identify';
import { uploadPhoto } from '../src/api/photos';
import { Button } from '../src/components/Button';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';
import {
  pickFromCamera,
  pickFromLibrary,
  type PickedImage,
} from '../src/utils/imagePicker';

type Phase =
  | { kind: 'choose' }
  | { kind: 'identifying'; localUri: string }
  | { kind: 'results'; localUri: string; candidates: PlantIdSpeciesCandidate[] }
  | { kind: 'no_results'; localUri: string }
  | { kind: 'error'; message: string };

export default function IdentifyScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Identify a plant' }} />
      <IdentifyFlow />
    </RequireAuth>
  );
}

function IdentifyFlow() {
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' });

  // Auto-prompt the library picker on first mount so the user lands on the
  // photo grid rather than an empty screen.
  useEffect(() => {
    void run(pickFromLibrary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (picker: () => Promise<PickedImage | null>) => {
    setPhase({ kind: 'choose' });
    let picked: PickedImage | null;
    try {
      picked = await picker();
    } catch (err) {
      setPhase({ kind: 'error', message: errorMessage(err) });
      return;
    }
    if (!picked) return;
    setPhase({ kind: 'identifying', localUri: picked.uri });
    try {
      const uploaded = await uploadPhoto({
        uri: picked.uri,
        mimeType: picked.mimeType,
        width: picked.width,
        height: picked.height,
      });
      const result = await identifyApi.byPhoto(uploaded.id);
      if (result.species.length === 0) {
        setPhase({ kind: 'no_results', localUri: picked.uri });
      } else {
        setPhase({ kind: 'results', localUri: picked.uri, candidates: result.species });
      }
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 503
          ? "Pl@ntNet isn't configured yet — set PLANTNET_API_KEY in apps/api/.env."
          : errorMessage(err);
      setPhase({ kind: 'error', message });
    }
  };

  if (phase.kind === 'choose') {
    return (
      <Screen>
        <Text style={styles.title}>Got a plant to identify?</Text>
        <Text style={styles.muted}>
          Snap a clear photo of a leaf, flower, or the whole plant. Pl@ntNet does the rest.
        </Text>
        <View style={styles.pickRow}>
          <Button title="Take photo" onPress={() => void run(pickFromCamera)} />
          <Button
            title="Choose from library"
            variant="secondary"
            onPress={() => void run(pickFromLibrary)}
          />
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'identifying') {
    return (
      <Screen>
        <Image source={{ uri: phase.localUri }} style={styles.preview} resizeMode="cover" />
        <View style={styles.workingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Looking it up…</Text>
        </View>
      </Screen>
    );
  }

  if (phase.kind === 'no_results') {
    return (
      <Screen>
        <Image source={{ uri: phase.localUri }} style={styles.preview} resizeMode="cover" />
        <Text style={styles.title}>No matches</Text>
        <Text style={styles.muted}>
          Pl@ntNet didn't recognise this one. Try a closer shot or a different angle.
        </Text>
        <Button
          title="Try another photo"
          variant="secondary"
          onPress={() => setPhase({ kind: 'choose' })}
        />
      </Screen>
    );
  }

  if (phase.kind === 'error') {
    return (
      <Screen>
        <Text style={styles.title}>Couldn't identify</Text>
        <Text style={styles.error}>{phase.message}</Text>
        <Button
          title="Try again"
          variant="secondary"
          onPress={() => setPhase({ kind: 'choose' })}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Image source={{ uri: phase.localUri }} style={styles.preview} resizeMode="cover" />
      <Text style={styles.title}>Best matches</Text>
      <View style={{ gap: theme.spacing.sm }}>
        {phase.candidates.map((c, i) => (
          <CandidateCard key={`${c.scientificName}-${i}`} candidate={c} />
        ))}
      </View>
      <Button
        title="None of these — try another photo"
        variant="ghost"
        onPress={() => setPhase({ kind: 'choose' })}
      />
    </Screen>
  );
}

function CandidateCard({ candidate }: { candidate: PlantIdSpeciesCandidate }) {
  const router = useRouter();
  const pct = Math.round((candidate.confidence ?? 0) * 100);
  const top = candidate.commonNames[0];
  const useThis = () => {
    router.replace({
      pathname: '/plants/new',
      params: {
        scientificName: candidate.scientificName,
        ...(top ? { commonName: top } : {}),
      },
    });
  };
  return (
    <Pressable
      onPress={useThis}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          {top ? <Text style={styles.cardCommon}>{top}</Text> : null}
          <Text style={styles.cardScientific}>{candidate.scientificName}</Text>
        </View>
        <Text style={styles.cardScore}>{pct}%</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.cardCta}>Add as new plant →</Text>
    </Pressable>
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
  pickRow: {
    gap: theme.spacing.sm,
  },
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  cardCommon: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardScientific: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  cardScore: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  cardCta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
});
