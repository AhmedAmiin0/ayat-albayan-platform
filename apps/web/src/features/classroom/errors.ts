import { CLASSROOM_ERRORS } from '@ab/shared';
import { errorCode } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import type { MediaDevice } from './room-types';

const KNOWN: ReadonlySet<string> = new Set<string>([...CLASSROOM_ERRORS, 'forbidden', 'duplicate']);
const TEXT: Readonly<Record<string, string>> = t.classroom.error;

/** `classroom.error.<code>` for an API error code, else `unknown`. */
export function classroomErrorKey(code: string | null): string {
  return code !== null && KNOWN.has(code) && code in TEXT ? code : 'unknown';
}

/** The words for a failed join / send-link call. */
export function classroomErrorText(error: unknown): string {
  return TEXT[classroomErrorKey(errorCode(error))] ?? t.classroom.error.unknown;
}

const nameOf = (e: unknown): string => (typeof e === 'object' && e !== null && 'name' in e ? String(e.name) : '');

/** Permission denied / no device, worded for the device that failed (getUserMedia and screen share). */
export function mediaErrorText(device: MediaDevice | 'share', error: unknown): string {
  const name = nameOf(error);
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesetNotFoundError') return t.classroom.error.device_missing;
  if (device === 'share') return t.classroom.error.share_failed;
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return device === 'mic' ? t.classroom.error.mic_denied : t.classroom.error.cam_denied;
  }
  return t.classroom.error.device_missing;
}

/** The `opens_at` of a 403 join_not_open_yet, if the body carries one. */
export function opensAtOf(error: unknown): string | null {
  const body = (error as { body?: { opens_at?: unknown } | null }).body;
  return typeof body?.opens_at === 'string' ? body.opens_at : null;
}
