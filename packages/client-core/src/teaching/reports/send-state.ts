import type { ReportStatus } from '@ab/shared';

/**
 * Where a report stands on its way to the family, now (docs/46 D5, B5): `window` while the
 * teacher may still edit it (it goes when edit_until passes); `sending` once the window has closed
 * and the PDF job is about to send it (1–2 minutes); `sent` once the family's message went out
 * (sent_at); `none` for a draft, an old cached row, or one closed long ago and never sent (the
 * report_ready rule off, a failed PDF).
 */
export type SendState = 'window' | 'sending' | 'sent' | 'none';

/** The fields it reads; the window ones are absent in an old cache. */
export interface SendReport {
  status: ReportStatus;
  sent_at?: string | null;
  edit_until?: string | null;
}

const MINUTE = 60_000;
/** How long after the close «يُرسل الآن» stays believable before the line is dropped. */
export const SENDING_FOR_MS = 10 * MINUTE;

const ms = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : Number.NaN);

const RULES: readonly (readonly [SendState, (r: SendReport, now: number) => boolean])[] = [
  ['none', (r) => r.status !== 'submitted'],
  ['sent', (r) => typeof r.sent_at === 'string'],
  ['window', (r, now) => now < ms(r.edit_until)],
  ['sending', (r, now) => now < ms(r.edit_until) + SENDING_FOR_MS],
];

/** The first rule that holds, in order; `none` when none does. */
export function reportSendState(report: SendReport, now: Date): SendState {
  return RULES.find(([, holds]) => holds(report, now.getTime()))?.[0] ?? 'none';
}

/** Whole minutes left until edit_until (at least 1 while it is ahead), 0 once it has passed. */
export function minutesLeft(editUntil: string | null | undefined, now: Date): number {
  const left = ms(editUntil) - now.getTime();
  return left > 0 ? Math.ceil(left / MINUTE) : 0;
}

/** Milliseconds until edit_until (for a refetch at zero), null when there is no future close. */
export function msUntilClose(editUntil: string | null | undefined, now: Date): number | null {
  const left = ms(editUntil) - now.getTime();
  return left > 0 ? left : null;
}
