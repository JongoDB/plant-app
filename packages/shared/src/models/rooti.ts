import type { Id, IsoDateTime } from './common.js';

export interface RootiConversation {
  id: Id;
  userId: Id;
  title?: string;
  /** Most chats are anchored to a specific plant. */
  anchorPlantId?: Id;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type RootiRole = 'user' | 'assistant' | 'tool';

/**
 * A piece of a message: text, an attached image, a tool call, or a tool result.
 * Modelled loosely on Anthropic's content block shape so backend translation
 * is straightforward.
 */
export type RootiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; storageKey: string; mimeType: string }
  | { type: 'tool_use'; toolUseId: string; toolName: string; input: unknown }
  | { type: 'tool_result'; toolUseId: string; output: unknown; isError?: boolean };

export interface RootiMessage {
  id: Id;
  conversationId: Id;
  role: RootiRole;
  content: RootiContentBlock[];
  createdAt: IsoDateTime;
}
