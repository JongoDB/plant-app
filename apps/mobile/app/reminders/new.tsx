import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReminderKind } from '@plant-app/shared';

import { remindersApi } from '../../src/api/reminders';
import { Button } from '../../src/components/Button';
import { RequireAuth } from '../../src/components/RequireAuth';
import { Screen } from '../../src/components/Screen';
import { theme } from '../../src/theme';

const KINDS: Array<{ value: ReminderKind; label: string; emoji: string }> = [
  { value: 'water', label: 'Water', emoji: '💧' },
  { value: 'fertilize', label: 'Fertilize', emoji: '🌿' },
  { value: 'prune', label: 'Prune', emoji: '✂️' },
  { value: 'repot', label: 'Repot', emoji: '🪴' },
  { value: 'rotate', label: 'Rotate', emoji: '↻' },
];

const WHEN_PRESETS: Array<{ label: string; daysFromNow: number }> = [
  { label: 'Today', daysFromNow: 0 },
  { label: 'Tomorrow', daysFromNow: 1 },
  { label: 'In 3 days', daysFromNow: 3 },
  { label: 'In a week', daysFromNow: 7 },
];

const REPEAT_PRESETS: Array<{ label: string; intervalDays?: number }> = [
  { label: "Don't repeat" },
  { label: 'Every 3 days', intervalDays: 3 },
  { label: 'Every week', intervalDays: 7 },
  { label: 'Every 2 weeks', intervalDays: 14 },
  { label: 'Every month', intervalDays: 30 },
];

export default function NewReminderScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'New reminder', presentation: 'modal' }} />
      <NewReminderForm />
    </RequireAuth>
  );
}

function NewReminderForm() {
  const router = useRouter();
  const { plantId, plantName } = useLocalSearchParams<{ plantId?: string; plantName?: string }>();
  const [kind, setKind] = useState<ReminderKind>('water');
  const [whenDays, setWhenDays] = useState(0);
  const [intervalDays, setIntervalDays] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!plantId) {
      setError('Missing plant.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const due = new Date();
      due.setUTCDate(due.getUTCDate() + whenDays);
      // Land at 9am local of that date — small UX nicety vs. firing at "now+0s".
      due.setHours(9, 0, 0, 0);
      await remindersApi.create({
        plantId,
        kind,
        nextDueAt: due.toISOString(),
        intervalDays,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      {plantName ? <Text style={styles.subtitle}>For {plantName}</Text> : null}

      <Section label="What">
        <View style={styles.chips}>
          {KINDS.map((k) => {
            const active = k.value === kind;
            return (
              <Pressable
                key={k.value}
                onPress={() => setKind(k.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {k.emoji} {k.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section label="When">
        <View style={styles.chips}>
          {WHEN_PRESETS.map((w) => {
            const active = w.daysFromNow === whenDays;
            return (
              <Pressable
                key={w.label}
                onPress={() => setWhenDays(w.daysFromNow)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{w.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section label="Repeat">
        <View style={styles.chips}>
          {REPEAT_PRESETS.map((r) => {
            const active = r.intervalDays === intervalDays;
            return (
              <Pressable
                key={r.label}
                onPress={() => setIntervalDays(r.intervalDays)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button title="Schedule" onPress={submit} loading={submitting} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
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
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  chipTextActive: {
    color: theme.colors.surface,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
