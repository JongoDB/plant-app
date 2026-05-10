import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { LightExposure } from '@plant-app/shared';

import { plantsApi, type CreatePlantInput } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { RequireAuth } from '../../src/components/RequireAuth';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { theme } from '../../src/theme';

const LIGHT_OPTIONS: Array<{ value: LightExposure; label: string }> = [
  { value: 'direct', label: 'Direct' },
  { value: 'bright_indirect', label: 'Bright indirect' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function NewPlantScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'New plant', presentation: 'modal' }} />
      <NewPlantForm />
    </RequireAuth>
  );
}

function NewPlantForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [commonName, setCommonName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [light, setLight] = useState<LightExposure | undefined>();
  const [acquiredOn, setAcquiredOn] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    setError(undefined);
    if (!nickname.trim()) {
      setError('Give your plant a nickname.');
      return;
    }
    if (acquiredOn && !ISO_DATE.test(acquiredOn)) {
      setError('Acquired date must look like 2026-04-15.');
      return;
    }
    const input: CreatePlantInput = { nickname: nickname.trim() };
    if (scientificName.trim()) input.scientificName = scientificName.trim();
    if (commonName.trim()) input.commonName = commonName.trim();
    if (locationDescription.trim()) {
      input.homeLocation = { description: locationDescription.trim() };
      if (light) input.homeLocation.lightExposure = light;
    }
    if (acquiredOn) input.acquiredOn = acquiredOn;
    if (notes.trim()) input.notes = notes.trim();

    setSubmitting(true);
    try {
      await plantsApi.create(input);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll style={styles.screen}>
      <TextField
        label="Nickname *"
        value={nickname}
        onChangeText={setNickname}
        placeholder="Fernie"
        autoCapitalize="words"
      />
      <TextField
        label="Scientific name"
        value={scientificName}
        onChangeText={setScientificName}
        placeholder="Nephrolepis exaltata"
        autoCapitalize="words"
      />
      <TextField
        label="Common name"
        value={commonName}
        onChangeText={setCommonName}
        placeholder="Boston Fern"
        autoCapitalize="words"
      />
      <TextField
        label="Where in your home?"
        value={locationDescription}
        onChangeText={setLocationDescription}
        placeholder="South window, living room"
        autoCapitalize="sentences"
      />

      <View style={styles.chipGroup}>
        <Text style={styles.chipLabel}>Light exposure</Text>
        <View style={styles.chips}>
          {LIGHT_OPTIONS.map((opt) => {
            const active = opt.value === light;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setLight(active ? undefined : opt.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label="Acquired on"
        value={acquiredOn}
        onChangeText={setAcquiredOn}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything you want to remember…"
        multiline
        autoCapitalize="sentences"
        style={styles.notes}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button title="Save plant" onPress={submit} loading={submitting} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.md,
  },
  chipGroup: {
    gap: theme.spacing.xs,
  },
  chipLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '500',
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
  notes: {
    minHeight: 100,
    paddingVertical: theme.spacing.sm,
    textAlignVertical: 'top',
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
