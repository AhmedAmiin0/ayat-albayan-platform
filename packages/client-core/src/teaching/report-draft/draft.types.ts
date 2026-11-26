export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'failed' };

/** An unsent body and the server body it was typed against (a copy on another base is stale). */
export interface KeptDraft {
  body: string;
  base: string;
}

/** Keeps the unsent body on the device until the server has it (R-REP-02). */
export interface DraftStore {
  keep: (id: string, kept: KeptDraft) => Promise<void>;
  drop: (id: string) => Promise<void>;
  /** A refusal (4xx) never succeeds on a retry, so its copy goes; a network failure keeps it. */
  dropIfRefused: (id: string, error: unknown) => Promise<void>;
}

/** Calls `listener` whenever a failed save may now go through; returns the unsubscribe. */
export type SubscribeResume = (listener: () => void) => () => void;

export interface DraftPorts<V> {
  store?: DraftStore;
  /** The server's copy after a save, for a cache that holds the form. */
  onSaved?: (view: V) => void;
  subscribeResume?: SubscribeResume;
}

export interface DraftSaveInput<B, V> {
  id: string;
  body: B;
  enabled: boolean;
  save: (body: B) => Promise<V>;
  ports?: DraftPorts<V>;
}

export interface DraftSave {
  state: SaveState;
  saveNow: () => void;
}

/** A body with its JSON text, which is what saves compare. */
export interface DraftText<B> {
  text: string;
  body: B;
}
