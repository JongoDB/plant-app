import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, Stack, useFocusEffect, useRouter } from 'expo-router';
import { branding } from '@plant-app/shared';
import type { Plant } from '@plant-app/shared';

import { plantsApi } from '../src/api/client';
import { authClient } from '../src/auth/client';
import { Button } from '../src/components/Button';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';

export default function HomeScreen() {
  return (
    <RequireAuth>
      <Stack.Screen
        options={{
          title: branding.APP_DISPLAY_NAME,
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable style={styles.headerButton} hitSlop={8}>
                <Text style={styles.headerButtonText}>Settings</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <PlantsList />
    </RequireAuth>
  );
}

function PlantsList() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const firstName = session?.user.name?.split(' ')[0] ?? 'friend';

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const list = await plantsApi.list();
      setPlants(list);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // initial load
  useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  // refresh on screen focus (e.g. after returning from add or detail)
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

  return (
    <Screen style={styles.screen}>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hi {firstName} 🌱</Text>
        <Text style={styles.subtitle}>
          {plants.length === 0
            ? "Let's add your first plant."
            : `${plants.length} ${plants.length === 1 ? 'plant' : 'plants'} in your collection.`}
        </Text>
      </View>

      <Button title="+ Add a plant" onPress={() => router.push('/plants/new')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={plants}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PlantCard plant={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No plants yet.</Text>
              <Text style={styles.emptyHint}>Tap "Add a plant" above to get started.</Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

function PlantCard({ plant }: { plant: Plant }) {
  return (
    <Link href={`/plants/${plant.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <Text style={styles.cardName}>{plant.nickname}</Text>
        {plant.commonName ? <Text style={styles.cardSub}>{plant.commonName}</Text> : null}
        {plant.homeLocation ? (
          <Text style={styles.cardSub}>📍 {plant.homeLocation.description}</Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: theme.spacing.sm,
  },
  headerButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  greeting: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  hello: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
  list: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  empty: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardSub: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
