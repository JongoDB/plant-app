import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { speciesApi, type SpeciesEntry } from '../../src/api/species';
import { RequireAuth } from '../../src/components/RequireAuth';
import { Screen } from '../../src/components/Screen';
import { theme } from '../../src/theme';

export default function SpeciesIndexScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Plant info' }} />
      <SpeciesList />
    </RequireAuth>
  );
}

function SpeciesList() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SpeciesEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (q: string) => {
    try {
      const list = await speciesApi.list(q || undefined);
      setResults(list);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load(debouncedQuery);
      setLoading(false);
    })();
  }, [debouncedQuery, load]);

  return (
    <Screen style={styles.screen}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search plants by name…"
        placeholderTextColor={theme.colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {loading && results.length === 0 ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(s) => s.slug}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/species/${item.slug}`)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.commonName}>{item.commonNames[0] ?? item.scientificName}</Text>
            <Text style={styles.scientificName}>{item.scientificName}</Text>
            <View style={styles.tags}>
              {item.light ? <Tag label={lightLabel(item.light)} /> : null}
              {item.toxicToPets ? (
                <Tag label="🐾 toxic" tone="danger" />
              ) : (
                <Tag label="🐾 safe" tone="success" />
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading || error ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No matches{debouncedQuery ? ` for "${debouncedQuery}"` : ''}.
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

function lightLabel(light: NonNullable<SpeciesEntry['light']>): string {
  switch (light) {
    case 'low':
      return '🌑 low light';
    case 'medium':
      return '☁️ medium';
    case 'bright_indirect':
      return '🌤 bright indirect';
    case 'direct':
      return '☀️ direct sun';
  }
}

function Tag({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'danger' }) {
  return (
    <View
      style={[
        styles.tag,
        tone === 'success' && styles.tagSuccess,
        tone === 'danger' && styles.tagDanger,
      ]}
    >
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
    flex: 1,
  },
  search: {
    minHeight: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  cardPressed: {
    opacity: 0.85,
  },
  commonName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scientificName: {
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
    color: theme.colors.textMuted,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  tag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagSuccess: {
    borderColor: theme.colors.success,
  },
  tagDanger: {
    borderColor: theme.colors.danger,
  },
  tagText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
  },
  empty: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
});
