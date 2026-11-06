import {
  EVOLUTION_SYNC_PARTS,
  type EvolutionSyncPart,
  type EvolutionSyncState,
  type EvolutionSyncView,
  type Glyph,
  type Tone,
} from '@ab/shared';

/** The whole push in one word: «متزامن», «غير متزامن» or «لم تُزامن بعد». */
export type SyncWord = 'synced' | 'unsynced' | 'never';

export function syncWordOf(sync: EvolutionSyncView | null): SyncWord {
  if (sync === null) return 'never';
  return sync.synced ? 'synced' : 'unsynced';
}

export const SYNC_WORD_STYLE: Record<SyncWord, { tone: Tone; glyph: Glyph }> = {
  synced: { tone: 'ok', glyph: 'fill' },
  unsynced: { tone: 'bad', glyph: 'struck' },
  never: { tone: 'neutral', glyph: 'hollow' },
};

export const SYNC_STATE_STYLE: Record<EvolutionSyncState, { tone: Tone; glyph: Glyph }> = {
  synced: { tone: 'ok', glyph: 'fill' },
  drift: { tone: 'act', glyph: 'half' },
  failed: { tone: 'bad', glyph: 'struck' },
  skipped: { tone: 'neutral', glyph: 'hollow' },
};

/** Each part pushed (instance, settings, webhook, proxy) with its state, in a fixed order. */
export const syncPartsOf = (sync: EvolutionSyncView) =>
  EVOLUTION_SYNC_PARTS.map((part: EvolutionSyncPart) => ({ part, state: sync.parts[part] }));
