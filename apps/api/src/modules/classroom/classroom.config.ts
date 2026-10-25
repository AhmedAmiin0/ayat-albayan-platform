import type { LivekitEnv } from '../../config/env/env';
import type { RecordingEnv } from '../../config/env/env.recording';

/** Injection token for the LiveKit settings (overridden in tests). */
export const CLASSROOM_CONFIG = Symbol('CLASSROOM_CONFIG');

/** null = LIVEKIT_* not set: every join answers 503 classroom_not_configured. */
export type ClassroomConfig = LivekitEnv | null;
/**
 * What CLASSROOM_CONFIG holds: a fixed config (tests) or a reader called on every use (the app:
 * env + the database's integration config, so a LIVEKIT_* change applies without a restart).
 */
export type ClassroomConfigSource = ClassroomConfig | (() => ClassroomConfig);
export const classroomConfigOf = (source: ClassroomConfigSource): ClassroomConfig =>
  typeof source === 'function' ? source() : source;

/** Injection token for the recording upload target (RECORDING_S3_*); null = lessons are not recorded. */
export const RECORDING_CONFIG = Symbol('RECORDING_CONFIG');
export type RecordingConfig = RecordingEnv | null;

/** Injection token for the web app's origin (the first of WEB_ORIGIN), the host of /join/:token. */
export const CLASSROOM_WEB_ORIGIN = Symbol('CLASSROOM_WEB_ORIGIN');

/** The first origin of WEB_ORIGIN (a comma list), without a trailing slash. */
export const firstWebOrigin = (webOrigin: string): string => (webOrigin.split(',')[0] ?? '').trim().replace(/\/+$/, '');
