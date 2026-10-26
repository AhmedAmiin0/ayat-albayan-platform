import { ConfigConflictError, type ConfigChange, type ConfigSnapshot } from '../config-store/config-store.types';

/** The bit of ConfigStore the alias write needs. */
interface WriteStore {
  fresh(): Promise<ConfigSnapshot>;
  set(changes: readonly ConfigChange[], actorId: string): Promise<void>;
}

interface LatestWrite {
  values: Readonly<Record<string, unknown>>;
  actorId: string;
}

async function changesAt(store: WriteStore, values: Readonly<Record<string, unknown>>): Promise<ConfigChange[]> {
  const versions = new Map((await store.fresh()).rows.map((r) => [r.key, r.version]));
  return Object.entries(values)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ key, value, expectedVersion: versions.get(key) ?? 0 }));
}

/**
 * The PATCH /settings alias and the module writers (gate, comms_source) are last-writer-wins: read
 * the current versions, then ONE config_set for every key (null stored as JSON null). When a
 * concurrent write moved a version in between, once more with fresh versions; then the conflict is
 * thrown.
 */
export async function writeLatest(store: WriteStore, w: LatestWrite): Promise<void> {
  const first = await changesAt(store, w.values);
  if (first.length === 0) return;
  try {
    await store.set(first, w.actorId);
  } catch (e) {
    if (!(e instanceof ConfigConflictError)) throw e;
    await store.set(await changesAt(store, w.values), w.actorId);
  }
}
