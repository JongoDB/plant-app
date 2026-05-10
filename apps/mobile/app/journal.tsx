import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';

import { journalApi, type JournalEntry } from '../src/api/journal';
import { AuthedImage } from '../src/components/AuthedImage';
import { Button } from '../src/components/Button';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';

export default function JournalScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Garden Journal' }} />
      <Journal />
    </RequireAuth>
  );
}

function Journal() {
  const router = useRouter();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const list = await journalApi.list();
      setEntries(list);
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

  const groups = groupByDay(entries);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  if (entries.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySub}>
          Photos and care events you log on any plant show up here, newest first.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Back to home" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.label}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.group}>
            <Text style={styles.dayLabel}>{item.label}</Text>
            {item.entries.map((e) => (
              <EntryRow
                key={`${e.kind}:${e.id}`}
                entry={e}
                onPress={() => {
                  if (e.plantId) router.push(`/plants/${e.plantId}`);
                }}
              />
            ))}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          error ? <Text style={styles.error}>{error}</Text> : null
        }
      />
    </Screen>
  );
}

function EntryRow({
  entry,
  onPress,
}: {
  entry: JournalEntry;
  onPress: () => void;
}) {
  const plantLabel = entry.plantNickname ?? '(unlinked photo)';
  const time =
    entry.kind === 'photo'
      ? formatTime(entry.takenAt)
      : formatTime(entry.occurredAt);
  if (entry.kind === 'photo') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <AuthedImage photoId={entry.id} style={styles.thumb} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>📸 Photo of {plantLabel}</Text>
          <Text style={styles.rowMeta}>
            {time}
            {entry.mode ? ` · ${entry.mode}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.thumb, styles.iconTile]}>
        <Text style={styles.iconTileText}>{kindEmoji(entry.careKind)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {kindLabel(entry.careKind)} · {plantLabel}
        </Text>
        <Text style={styles.rowMeta}>{time}</Text>
        {entry.notes ? (
          <Text style={styles.rowNotes} numberOfLines={2}>
            {entry.notes}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

interface DayGroup {
  label: string;
  entries: JournalEntry[];
}

function groupByDay(entries: JournalEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of entries) {
    const iso = e.kind === 'photo' ? e.takenAt : e.occurredAt;
    const label = dayLabel(iso);
    let last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      last = { label, entries: [] };
      groups.push(last);
    }
    last.entries.push(e);
  }
  return groups;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() === d.getFullYear() ? undefined : 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function kindEmoji(kind: string): string {
  switch (kind) {
    case 'water':
      return '💧';
    case 'fertilize':
      return '🪴';
    case 'prune':
      return '✂️';
    case 'repot':
      return '🌱';
    case 'rotate':
      return '🔄';
    case 'other':
      return '📝';
    default:
      return '📝';
  }
}

function kindLabel(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptySub: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  list: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  group: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  dayLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowPressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radii.sm,
  },
  iconTile: {
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileText: {
    fontSize: 28,
  },
  rowTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  rowNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
});
