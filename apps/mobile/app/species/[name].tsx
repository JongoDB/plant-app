import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ApiError } from '../../src/api/client';
import { speciesApi, type SpeciesEntry } from '../../src/api/species';
import { Button } from '../../src/components/Button';
import { RequireAuth } from '../../src/components/RequireAuth';
import { Screen } from '../../src/components/Screen';
import { theme } from '../../src/theme';

export default function SpeciesDetailScreen() {
  return (
    <RequireAuth>
      <SpeciesDetail />
    </RequireAuth>
  );
}

function SpeciesDetail() {
  // Route param uses the slug. Variable name `name` matches the file path
  // [name].tsx so the convention reads naturally.
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<SpeciesEntry | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!name) return;
    void (async () => {
      try {
        const e = await speciesApi.get(name);
        setEntry(e);
        setStatus('ready');
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setStatus('not_found');
        } else {
          setStatus('error');
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
  }, [name]);

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
          <Text style={styles.muted}>That species isn't in the library yet.</Text>
          <Button title="Back" variant="secondary" onPress={() => router.back()} />
        </Screen>
      </>
    );
  }

  if (status === 'error' || !entry) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <Screen style={styles.center}>
          <Text style={styles.error}>{error ?? 'Could not load.'}</Text>
          <Button title="Back" variant="secondary" onPress={() => router.back()} />
        </Screen>
      </>
    );
  }

  const display = entry.commonNames[0] ?? entry.scientificName;

  return (
    <>
      <Stack.Screen options={{ title: display }} />
      <Screen scroll>
        <View style={styles.header}>
          <Text style={styles.title}>{display}</Text>
          <Text style={styles.scientific}>{entry.scientificName}</Text>
          {entry.commonNames.length > 1 ? (
            <Text style={styles.muted}>
              Also known as: {entry.commonNames.slice(1).join(', ')}
            </Text>
          ) : null}
        </View>

        <Section label="Light">
          <Text style={styles.body}>
            {entry.light ? prettyLight(entry.light) : '—'}
          </Text>
        </Section>

        <Section label="Water">
          <Text style={styles.body}>
            {entry.waterFrequencyDays
              ? `Every ${entry.waterFrequencyDays.min}–${entry.waterFrequencyDays.max} days`
              : '—'}
          </Text>
        </Section>

        <Section label="Temperature">
          <Text style={styles.body}>
            {entry.temperatureRangeC
              ? `${entry.temperatureRangeC.min}–${entry.temperatureRangeC.max} °C`
              : '—'}
          </Text>
        </Section>

        <Section label="Humidity">
          <Text style={styles.body}>
            {entry.humidityRange
              ? `${entry.humidityRange.minPct}–${entry.humidityRange.maxPct}%`
              : '—'}
          </Text>
        </Section>

        {entry.fertilizerNotes ? (
          <Section label="Fertilizer">
            <Text style={styles.body}>{entry.fertilizerNotes}</Text>
          </Section>
        ) : null}

        {entry.soilNotes ? (
          <Section label="Soil">
            <Text style={styles.body}>{entry.soilNotes}</Text>
          </Section>
        ) : null}

        <Section label="Toxicity">
          <Text style={[styles.body, entry.toxicToPets ? styles.bodyDanger : styles.bodySuccess]}>
            🐾 {entry.toxicToPets ? 'Toxic to pets — keep cats and dogs away.' : 'Safe for pets.'}
          </Text>
          <Text style={[styles.body, entry.toxicToHumans ? styles.bodyDanger : styles.bodySuccess]}>
            🧒 {entry.toxicToHumans ? 'Toxic to humans (especially children).' : 'Non-toxic to humans.'}
          </Text>
        </Section>

        {entry.commonIssues && entry.commonIssues.length > 0 ? (
          <Section label="Common issues">
            {entry.commonIssues.map((issue, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{issue}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {entry.source ? (
          <Text style={styles.footer}>Source: {entry.source}</Text>
        ) : null}
      </Screen>
    </>
  );
}

function prettyLight(light: NonNullable<SpeciesEntry['light']>): string {
  switch (light) {
    case 'low':
      return 'Low light — tolerant of dim spots, even north windows.';
    case 'medium':
      return 'Medium — east window or a few feet from a south/west window.';
    case 'bright_indirect':
      return 'Bright indirect — close to a sunny window without sun on the leaves.';
    case 'direct':
      return 'Direct sun — wants several hours of unfiltered sunlight a day.';
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
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
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  scientific: {
    fontSize: theme.fontSize.md,
    fontStyle: 'italic',
    color: theme.colors.textMuted,
  },
  muted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  bodyDanger: {
    color: theme.colors.danger,
  },
  bodySuccess: {
    color: theme.colors.success,
  },
  bullet: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  bulletDot: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.md,
  },
  footer: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
