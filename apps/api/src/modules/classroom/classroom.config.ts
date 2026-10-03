import type { LivekitEnv } from '../../env';

/** Injection token for the LiveKit settings (overridden in tests). */
export const CLASSROOM_CONFIG = Symbol('CLASSROOM_CONFIG');

/** null = LIVEKIT_* not set: every join answers 503 classroom_not_configured. */
export type ClassroomConfig = LivekitEnv | null;

/** Injection token for the web app's origin (the first of WEB_ORIGIN), the host of /join/:token. */
export const CLASSROOM_WEB_ORIGIN = Symbol('CLASSROOM_WEB_ORIGIN');
