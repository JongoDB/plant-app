import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { branding } from '@plant-app/shared';

import { rootiApi, type ConversationSummary } from '../src/api/rooti';
import { Button } from '../src/components/Button';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';

export default function RootiHistoryScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: `${branding.ASSISTANT_NAME} chats` }} />
      <RootiHistory />
    </RequireAuth>
  );
}

function RootiHistory() {
  const router = useRouter();

  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const list = await rootiApi.listConversations();
      setItems(list);
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

  const open = (item: ConversationSummary) => {
    router.push({
      pathname: '/rooti',
      params: { conversationId: item.id },
    });
  };

  const onDelete = (item: ConversationSummary) => {
    const label = item.preview ?? item.anchorPlantNickname ?? 'this chat';
    Alert.alert('Delete chat?', `Remove "${label}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await rootiApi.deleteConversation(item.id);
            setItems((prev) => prev.filter((c) => c.id !== item.id));
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.emptyTitle}>No chats yet</Text>
        <Text style={styles.emptySub}>
          Open {branding.ASSISTANT_NAME} from home or any plant to start one.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={`Open ${branding.ASSISTANT_NAME}`}
          onPress={() => router.replace('/rooti')}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ConversationRow item={item} onOpen={open} onDelete={onDelete} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Past conversations</Text>
            <Button
              title="Start a new chat"
              onPress={() => router.replace('/rooti')}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
      />
    </Screen>
  );
}

function ConversationRow({
  item,
  onOpen,
  onDelete,
}: {
  item: ConversationSummary;
  onOpen: (item: ConversationSummary) => void;
  onDelete: (item: ConversationSummary) => void;
}) {
  const title =
    item.preview ??
    (item.anchorPlantNickname ? `About ${item.anchorPlantNickname}` : 'New chat');
  return (
    <Pressable
      onPress={() => onOpen(item)}
      onLongPress={() => onDelete(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.rowMeta}>
          {relativeFromIso(item.lastMessageAt)} · {item.messageCount}{' '}
          {item.messageCount === 1 ? 'message' : 'messages'}
          {item.anchorPlantNickname && item.preview
            ? ` · 🌿 ${item.anchorPlantNickname}`
            : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete(item)}
        hitSlop={8}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteText}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

function relativeFromIso(iso: string): string {
  const d = new Date(iso);
  const dayMs = 24 * 60 * 60 * 1000;
  const ms = Date.now() - d.getTime();
  if (ms < 60 * 60 * 1000) return 'Just now';
  if (ms < dayMs) {
    const h = Math.round(ms / (60 * 60 * 1000));
    return `${h}h ago`;
  }
  const days = Math.round(ms / dayMs);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return d.toLocaleDateString();
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
  header: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
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
  rowPressed: {
    opacity: 0.85,
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
  deleteBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  deleteText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
  },
});
