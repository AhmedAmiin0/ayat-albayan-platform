import { googleErrorKey, intlLocale, type GoogleAccountStatus, type GoogleSkipReason, type GoogleSyncState, type Glyph, type Tone } from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { dateAndClock } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// Display helpers of the Google section. DB times are UTC; they read in the viewer's zone
// (docs/34), 12 or 24 h as the viewer chose, Western digits.

/** The time with its date in `clock.tz`, the viewer's zone (useViewerTz()). */
export function formatAt(iso: string, clock: Clock & { tz: string }): string {
  return dateAndClock(new Date(iso), clock, { dateStyle: 'medium' });
}

const LIST = new Intl.ListFormat(intlLocale(locale), { style: 'long', type: 'conjunction' });

/** «أ، ب و ج» / «A, B and C» in the page's language. */
export const listOf = (names: readonly string[]): string => LIST.format(names);

/** «{n} عناصر…» → the template with every {key} replaced. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

export interface ChipStyle {
  tone: Tone;
  glyph: Glyph;
}

export const accountStyle: Record<GoogleAccountStatus, ChipStyle> = {
  connected: { tone: 'ok', glyph: 'fill' },
  disconnected: { tone: 'neutral', glyph: 'struck' },
  error: { tone: 'bad', glyph: 'struck' },
};

export const stateStyle: Record<GoogleSyncState, ChipStyle> = {
  pending: { tone: 'neutral', glyph: 'hollow' },
  synced: { tone: 'ok', glyph: 'fill' },
  gone: { tone: 'neutral', glyph: 'struck' },
  failed: { tone: 'bad', glyph: 'struck' },
  skipped: { tone: 'neutral', glyph: 'hollow' },
};

/** The states an admin can send back to the queue (never `gone`: deleted in Google stays deleted, docs/24 §2.4). */
export const RETRYABLE: ReadonlySet<GoogleSyncState> = new Set(['failed', 'skipped']);

/** Why an item was skipped, in words (the import guard has its own web string). */
export function skipLabel(reason: GoogleSkipReason): string {
  if (reason === 'not_platform_origin') return t.googleSync.web.notPlatformOrigin;
  return t.googleSync.log.skip[reason];
}

/** A stored error code in MSA words (unknown codes keep the code for support). */
export const errorText = (code: string): string => fill(t.googleSync.errors[googleErrorKey(code)], { code });

/** The OAuth return (?google=connected | ?google=error&reason=…) as a toast, or null. */
export function oauthReturnNote(search: string): { message: string; tone: 'info' | 'error' } | null {
  const params = new URLSearchParams(search);
  const google = params.get('google');
  if (google === 'connected') return { message: t.googleSync.connection.connected, tone: 'info' };
  if (google !== 'error') return null;
  const code = params.get('reason') ?? '';
  const reasons = t.googleSync.connection.reasons;
  const reason = Object.hasOwn(reasons, code) ? reasons[code as keyof typeof reasons] : reasons.exchange;
  return { message: fill(t.googleSync.connection.failed, { reason }), tone: 'error' };
}
