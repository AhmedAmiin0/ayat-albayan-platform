import { t } from '@/lib/i18n/i18n';

/** livekit-client's ConnectionError reasons that mean «the server could not be reached at all». */
const UNREACHABLE: ReadonlySet<string> = new Set(['ServerUnreachable', 'WebSocket', 'Timeout', 'ServiceNotFound']);

/** A ws:// signalling URL on an https page: every browser blocks it (mixed content) before it is sent. */
export const isInsecureRoomUrl = (url: string, pageProtocol: string): boolean => pageProtocol === 'https:' && /^ws:/i.test(url);

const reasonOf = (e: unknown): string =>
  typeof e === 'object' && e !== null && 'reasonName' in e && typeof e.reasonName === 'string' ? e.reasonName : '';

export interface ConnectFailure {
  /** The join's LiveKit URL (LIVEKIT_URL on the API). */
  url: string;
  error: unknown;
  /** location.protocol of this page. */
  pageProtocol: string;
}

/**
 * The words for a room that would not connect, so the cause is clear instead of a generic retry:
 * a server misconfiguration (ws:// on https, docs/09 §LiveKit) or a server that cannot be reached.
 */
export function connectFailureText({ url, error, pageProtocol }: ConnectFailure): string {
  if (isInsecureRoomUrl(url, pageProtocol)) return t.classroom.error.insecure_url;
  if (UNREACHABLE.has(reasonOf(error))) return t.classroom.error.server_unreachable;
  return t.classroom.error.connect_failed;
}
