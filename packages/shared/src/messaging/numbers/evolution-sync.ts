import { z } from 'zod';

// The last push of a number's Evolution options, read back (wa_numbers.evolution_sync).

/** The four things pushed to Evolution, each read back after the push. */
export const EVOLUTION_SYNC_PARTS = ['instance', 'settings', 'webhook', 'proxy'] as const;
export type EvolutionSyncPart = (typeof EVOLUTION_SYNC_PARTS)[number];
/** Only `synced` counts as in sync (evolutionSynced). */
export const EVOLUTION_SYNC_STATES = ['synced', 'drift', 'failed', 'skipped', 'disabled'] as const;
export type EvolutionSyncState = (typeof EVOLUTION_SYNC_STATES)[number];

/** The last push (wa_numbers.evolution_sync), sync state per part. */
export const evolutionSyncSchema = z.object({
  synced: z.boolean(),
  checked_at: z.string(),
  parts: z.record(z.enum(EVOLUTION_SYNC_PARTS), z.enum(EVOLUTION_SYNC_STATES)),
});
export type EvolutionSyncView = z.infer<typeof evolutionSyncSchema>;
export const evolutionSyncOf = (raw: unknown): EvolutionSyncView | null =>
  evolutionSyncSchema.safeParse(raw).data ?? null;

/** In sync only when every part read back as pushed. */
export const evolutionSynced = (
  parts: Partial<Record<EvolutionSyncPart, EvolutionSyncState>>,
): boolean =>
  EVOLUTION_SYNC_PARTS.every((p) => parts[p] === 'synced');

/** A push or read-back that threw (unconfigured, refused, unreachable): every part failed. */
export const evolutionSyncFailed = (now: Date): EvolutionSyncView => ({
  synced: false,
  checked_at: now.toISOString(),
  parts: { instance: 'failed', settings: 'failed', webhook: 'failed', proxy: 'failed' },
});
