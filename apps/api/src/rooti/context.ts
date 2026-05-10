import { and, desc, eq } from 'drizzle-orm';
import type { Id } from '@plant-app/shared';

import { getDb } from '../db/client.js';
import { careEvents, plants } from '../db/schema.js';

/**
 * Per-conversation context for Rooti.
 *
 * Strategy v1 (kept intentionally simple — Slice 3 baseline; we'll refine
 * once we have evidence of how users actually anchor conversations):
 *
 * 1. If the chat is anchored to a plant, include that plant's full record
 *    plus its 5 most recent care events.
 * 2. Always include a brief catalogue of the user's most recent plants so
 *    Rooti can answer "what's my fiddle leaf doing?" without re-asking.
 *
 * The output is a stable text block that gets prepended to the user's
 * message. It is regenerated each request rather than cached at the API
 * level — but on the LLM side it sits inside the cached system+turn prefix
 * (see anthropicLlm.ts), so unchanged blocks stay cache-warm.
 */

export interface RootiContextInput {
  userId: Id;
  anchorPlantId?: Id;
}

export interface RootiContext {
  /** Formatted text. Empty string if there's nothing meaningful to include. */
  text: string;
}

const RECENT_PLANTS_LIMIT = 8;
const RECENT_CARE_LIMIT = 5;

export async function loadRootiContext(input: RootiContextInput): Promise<RootiContext> {
  const db = getDb();

  // Anchor plant (only if it actually belongs to the user — silent guard).
  let anchorPlant: typeof plants.$inferSelect | null = null;
  if (input.anchorPlantId) {
    const rows = await db
      .select()
      .from(plants)
      .where(and(eq(plants.id, input.anchorPlantId), eq(plants.userId, input.userId)))
      .limit(1);
    anchorPlant = rows[0] ?? null;
  }

  // Recent plants overview.
  const recentPlants = await db
    .select({
      id: plants.id,
      nickname: plants.nickname,
      commonName: plants.commonName,
      homeLocationDescription: plants.homeLocationDescription,
    })
    .from(plants)
    .where(eq(plants.userId, input.userId))
    .orderBy(desc(plants.createdAt))
    .limit(RECENT_PLANTS_LIMIT);

  // Anchor plant care history.
  const recentCare = anchorPlant
    ? await db
        .select()
        .from(careEvents)
        .where(
          and(
            eq(careEvents.userId, input.userId),
            eq(careEvents.plantId, anchorPlant.id),
          ),
        )
        .orderBy(desc(careEvents.occurredAt))
        .limit(RECENT_CARE_LIMIT)
    : [];

  const lines: string[] = [];

  if (anchorPlant) {
    lines.push('## Currently focused plant');
    lines.push(`- id: ${anchorPlant.id}`);
    lines.push(`- nickname: ${anchorPlant.nickname}`);
    if (anchorPlant.commonName) lines.push(`- common name: ${anchorPlant.commonName}`);
    if (anchorPlant.scientificName) {
      lines.push(`- scientific name: ${anchorPlant.scientificName}`);
    }
    if (anchorPlant.homeLocationDescription) {
      const lightHint = anchorPlant.homeLocationLight
        ? ` (light: ${anchorPlant.homeLocationLight})`
        : '';
      lines.push(`- location: ${anchorPlant.homeLocationDescription}${lightHint}`);
    }
    if (anchorPlant.acquiredOn) lines.push(`- acquired: ${anchorPlant.acquiredOn}`);
    if (anchorPlant.notes) lines.push(`- notes: ${anchorPlant.notes}`);
    lines.push('');

    if (recentCare.length > 0) {
      lines.push('## Recent care events for this plant');
      for (const e of recentCare) {
        const when = e.occurredAt.toISOString();
        const note = e.notes ? ` — ${e.notes}` : '';
        lines.push(`- ${when}: ${e.kind}${note}`);
      }
      lines.push('');
    } else {
      lines.push('## Recent care events for this plant');
      lines.push('- (none logged yet)');
      lines.push('');
    }
  }

  if (recentPlants.length > 0) {
    lines.push(`## User's plants (${recentPlants.length} most recent)`);
    for (const p of recentPlants) {
      const display = p.commonName ? `${p.nickname} (${p.commonName})` : p.nickname;
      const where = p.homeLocationDescription ? ` — ${p.homeLocationDescription}` : '';
      lines.push(`- ${p.id}: ${display}${where}`);
    }
  } else {
    lines.push("## User's plants");
    lines.push('- (collection is empty)');
  }

  return { text: lines.join('\n') };
}
