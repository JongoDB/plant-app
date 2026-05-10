import { and, asc, eq } from 'drizzle-orm';
import type {
  Id,
  LlmContentBlock,
  LlmMessage,
  RootiContentBlock,
  RootiMessage,
  RootiRole,
  StorageProvider,
} from '@plant-app/shared';

import { getDb } from '../db/client.js';
import { rootiConversations, rootiMessages } from '../db/schema.js';

/**
 * Persistence helpers for Rooti conversations and messages.
 *
 * Translation lives here because storage and LLM-wire shapes are close but
 * not identical: stored "tool" messages become user messages with
 * tool_result blocks for Anthropic's API.
 */

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function findOrCreateConversation(opts: {
  userId: Id;
  conversationId?: Id;
  anchorPlantId?: Id;
}): Promise<{ id: Id; isNew: boolean }> {
  const db = getDb();

  if (opts.conversationId) {
    const rows = await db
      .select({ id: rootiConversations.id })
      .from(rootiConversations)
      .where(
        and(
          eq(rootiConversations.id, opts.conversationId),
          eq(rootiConversations.userId, opts.userId),
        ),
      )
      .limit(1);
    if (rows[0]) return { id: rows[0].id, isNew: false };
  }

  const inserted = await db
    .insert(rootiConversations)
    .values({
      userId: opts.userId,
      anchorPlantId: opts.anchorPlantId,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('Failed to create conversation.');
  return { id: row.id, isNew: true };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function loadMessages(conversationId: Id): Promise<RootiMessage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(rootiMessages)
    .where(eq(rootiMessages.conversationId, conversationId))
    .orderBy(asc(rootiMessages.createdAt));
  return rows.map(rowToRootiMessage);
}

export async function appendMessage(opts: {
  conversationId: Id;
  role: RootiRole;
  content: RootiContentBlock[];
}): Promise<RootiMessage> {
  const db = getDb();
  const inserted = await db
    .insert(rootiMessages)
    .values({
      conversationId: opts.conversationId,
      role: opts.role,
      content: opts.content,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('Failed to append message.');
  return rowToRootiMessage(row);
}

function rowToRootiMessage(row: typeof rootiMessages.$inferSelect): RootiMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content as RootiContentBlock[],
    createdAt: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Translation: stored RootiMessage[] -> wire LlmMessage[] for Claude
// ---------------------------------------------------------------------------

/**
 * Async because image blocks need their bytes loaded from storage and
 * base64-encoded inline. Anthropic's API only accepts inline image data on
 * the wire, so the storage round-trip happens here.
 */
export async function toLlmMessages(
  messages: RootiMessage[],
  storage: StorageProvider,
): Promise<LlmMessage[]> {
  return Promise.all(
    messages.map(async (msg) => {
      // Stored 'tool' role becomes a 'user' role on the wire (Anthropic's
      // tool_result blocks always live in user messages).
      const role: 'user' | 'assistant' = msg.role === 'assistant' ? 'assistant' : 'user';
      const content = await Promise.all(msg.content.map((b) => toLlmContent(b, storage)));
      return { role, content };
    }),
  );
}

async function toLlmContent(
  block: RootiContentBlock,
  storage: StorageProvider,
): Promise<LlmContentBlock> {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text };
    case 'image': {
      const bytes = await storage.get(block.storageKey);
      const base64 = Buffer.from(bytes).toString('base64');
      return { type: 'image', mediaType: block.mimeType, base64Data: base64 };
    }
    case 'tool_use':
      return {
        type: 'tool_use',
        id: block.toolUseId,
        name: block.toolName,
        input: block.input,
      };
    case 'tool_result':
      return {
        type: 'tool_result',
        toolUseId: block.toolUseId,
        content:
          typeof block.output === 'string' ? block.output : JSON.stringify(block.output),
        ...(block.isError ? { isError: true as const } : {}),
      };
  }
}
