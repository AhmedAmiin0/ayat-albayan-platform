import type { QueryClient } from '@tanstack/react-query';

// What the branded startup screen says while the first connection is pending (session + /auth/me).

/** quiet: saved data is on disk (or still being read), the app opens on it in a moment: the mark only.
 *  loading: nothing to show yet: «جارٍ الاتصال» from the start, «إعادة المحاولة» after 10 s. */
export type StartupMode = 'quiet' | 'loading';
export type StartupStage = 'mark' | 'connecting' | 'retry';

/** Approved design (2026-10-26): with nothing saved the status shows from the first frame. */
export const TEXT_AFTER_MS = 0;
/** Saved data should open within ~1 s; if it has not by now, say why after all. */
export const QUIET_TEXT_AFTER_MS = 3000;
export const RETRY_AFTER_MS = 10_000;

export function startupMode({ restoring, hasSaved }: { restoring: boolean; hasSaved: boolean }): StartupMode {
  return restoring || hasSaved ? 'quiet' : 'loading';
}

/** The stage `elapsed` ms after the screen appeared (or after the last «إعادة المحاولة»). */
export function startupStage(mode: StartupMode, elapsed: number): StartupStage {
  if (elapsed >= RETRY_AFTER_MS) return 'retry';
  return elapsed >= (mode === 'quiet' ? QUIET_TEXT_AFTER_MS : TEXT_AFTER_MS) ? 'connecting' : 'mark';
}

/** Anything restored from the persisted cache that a screen could show. */
export function hasSavedData(client: QueryClient): boolean {
  return client.getQueryCache().getAll().some((query) => query.state.data !== undefined);
}
