import { z } from 'zod';

// The last push of a number's Evolution options, read back (owner 2026-11-06: «متزامن / غير
// متزامن»); wa_numbers.evolution_sync.

/** The four things pushed to Evolution, each read back after the push. */
export const EVOLUTION_SYNC_PARTS = ['instance', 'settings', 'webhook', 'proxy'] as const;
export type EvolutionSyncPart = (typeof EVOLUTION_SYNC_PARTS)[number];
/** synced = read back equal; drift = read back different; failed = refused / unreachable. */
export const EVOLUTION_SYNC_STATES = ['synced', 'drift', 'failed', 'skipped'] as const;
export type EvolutionSyncState = (typeof EVOLUTION_SYNC_STATES)[number];

/** The last push (wa_numbers.evolution_sync): «متزامن / غير متزامن» per part. */
export const evolutionSyncSchema = z.object({
  synced: z.boolean(),
  checked_at: z.string(),
  parts: z.record(z.enum(EVOLUTION_SYNC_PARTS), z.enum(EVOLUTION_SYNC_STATES)),
});
export type EvolutionSyncView = z.infer<typeof evolutionSyncSchema>;
export const evolutionSyncOf = (raw: unknown): EvolutionSyncView | null =>
  evolutionSyncSchema.safeParse(raw).data ?? null;
