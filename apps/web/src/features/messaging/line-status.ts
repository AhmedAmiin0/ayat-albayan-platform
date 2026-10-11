import type { Glyph, LineCheckView, Tone } from '@ab/shared';

/** The Graph fields of a phone number whose raw word gets a tone (docs/12 §13.10). */
export type LineField = 'status' | 'quality_rating' | 'name_status' | 'code_verification_status';

export interface LineTone {
  tone: Tone;
  glyph: Glyph;
  /** False when Meta answered a word this table does not know: shown raw, neutral-hollow. */
  known: boolean;
}

const ACT: LineTone = { tone: 'act', glyph: 'struck', known: true };
const OK: LineTone = { tone: 'ok', glyph: 'fill', known: true };
const HALF: LineTone = { tone: 'neutral', glyph: 'half', known: true };
const HOLLOW: LineTone = { tone: 'neutral', glyph: 'hollow', known: true };

/** The admin must act (saffron) only on these; the same word means different things per field. */
const MUST_ACT: Record<LineField, readonly string[]> = {
  status: ['DISCONNECTED', 'FLAGGED', 'RESTRICTED', 'UNVERIFIED', 'DELETED'],
  quality_rating: ['RED'],
  name_status: ['DECLINED', 'EXPIRED'],
  // A Meta test number can report NOT_VERIFIED while sending fine: never the admin's turn.
  code_verification_status: [],
};
const SETTLED = ['APPROVED', 'AVAILABLE_WITHOUT_REVIEW', 'VERIFIED', 'CONNECTED', 'GREEN'];
const UNDERWAY = ['YELLOW', 'NONE'];
const WAITING: Partial<Record<LineField, readonly string[]>> = { code_verification_status: ['NOT_VERIFIED', 'EXPIRED'] };

/** Tone + glyph of one raw Graph word (CONNECTED, GREEN, PENDING_REVIEW, …) for its field. */
export function lineTone(field: LineField, value: string): LineTone {
  const word = value.toUpperCase();
  if (MUST_ACT[field].includes(word)) return ACT;
  if (WAITING[field]?.includes(word)) return HOLLOW;
  if (SETTLED.includes(word)) return OK;
  if (UNDERWAY.includes(word) || word.startsWith('PENDING')) return HALF;
  return { tone: 'neutral', glyph: 'hollow', known: false };
}

/**
 * Will inbound webhooks reach us? From the WABA's subscribed apps and the line's own app id:
 * unknown (not asked / failed: row hidden), none (no app: act), ours (ok), other (act),
 * unverified (an app is there but the server has no app id to compare: neutral).
 */
export type WebhookState = 'unknown' | 'none' | 'ours' | 'other' | 'unverified';

export function webhookState(view: Pick<LineCheckView, 'app_id' | 'subscribed_apps'>): WebhookState {
  const apps = view.subscribed_apps;
  if (apps === null) return 'unknown';
  if (apps.length === 0) return 'none';
  if (view.app_id === null) return 'unverified';
  return apps.some((a) => a.id === view.app_id) ? 'ours' : 'other';
}
