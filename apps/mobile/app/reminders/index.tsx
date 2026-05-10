import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import type { Plant, Reminder } from '@plant-app/shared';

import { plantsApi } from '../../src/api/client';
import { remindersApi } from '../../src/api/reminders';
import { ReminderRow } from '../../src/components/ReminderRow';
import { RequireAuth } from '../../src/components/RequireAuth';
import { Screen } from '../../src/components/Screen';
import { theme } from '../../src/theme';

interface Section {
  title: string;
  data: Array<Reminder & { plantName?: string }>;
}

export default function RemindersScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Reminders' }} />
      <RemindersList />
    </RequireAuth>
  );
}

function RemindersList() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([remindersApi.list(), plantsApi.list()]);
      setReminders(r);
      setPlants(p);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const sections = bucket(reminders, plants);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <ReminderRow reminder={item} plantName={item.plantName} onCompleted={load} />
      )}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      SectionSeparatorComponent={() => <View style={styles.gap} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
      ListEmptyComponent={
        loading ? null : (
          <Screen>
            <Text style={styles.emptyTitle}>Nothing scheduled.</Text>
            <Text style={styles.emptyHint}>
              Open a plant and tap "Schedule a reminder" to set one up.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Screen>
        )
      }
    />
  );
}

function bucket(reminders: Reminder[], plants: Plant[]): Section[] {
  const plantNameById = new Map(plants.map((p) => [p.id, p.nickname]));
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const overdue: Reminder[] = [];
  const today: Reminder[] = [];
  const upcoming: Reminder[] = [];
  const inactive: Reminder[] = [];

  for (const r of reminders) {
    if (!r.active) {
      inactive.push(r);
      continue;
    }
    const due = new Date(r.nextDueAt).getTime();
    const diff = due - now;
    if (diff < -dayMs) overdue.push(r);
    else if (diff <= dayMs) today.push(r);
    else upcoming.push(r);
  }

  const decorate = (list: Reminder[]) =>
    list.map((r) => ({ ...r, plantName: plantNameById.get(r.plantId) }));

  const sections: Section[] = [];
  if (overdue.length) sections.push({ title: 'Overdue', data: decorate(overdue) });
  if (today.length) sections.push({ title: 'Due now', data: decorate(today) });
  if (upcoming.length) sections.push({ title: 'Upcoming', data: decorate(upcoming) });
  if (inactive.length) sections.push({ title: 'Done', data: decorate(inactive) });
  return sections;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  gap: {
    height: theme.spacing.sm,
  },
  sectionHeader: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  emptyHint: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
});
