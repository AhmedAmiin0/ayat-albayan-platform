import { canRetryCode, MAX_SEND_ATTEMPTS, type MessageView } from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { errorText, fullTime } from '@/features/messaging/inbox/format';

export interface NotesInput {
  /** The row's template is not approved yet: the sender leaves it queued (docs/12 §3.3). */
  waitingTemplate: boolean;
  now: Date;
  clock: Clock;
}

const at = (template: string, iso: string, clock: Clock) =>
  template.replace('{time}', fullTime(iso, clock));

type Note = (m: MessageView, o: NotesInput) => string | null;

const errorLine = (m: MessageView): string =>
  t.messages.errorLine.replace('{reason}', errorText(m));
const isLater = (iso: string | null, now: Date): iso is string =>
  !!iso && Date.parse(iso) > now.getTime();
const isText = (line: string | null): line is string => line !== null;

/** A template still waiting on Meta, else a send planned for later. */
const waitLine: Note = (m, o) => {
  const later = isLater(m.scheduled_for, o.now)
    ? at(t.messages.queuedFor, m.scheduled_for, o.clock)
    : null;
  return o.waitingTemplate ? t.messages.waitingTemplate : later;
};

/** Tries so far, the error (a hold, wa_payment_hold, has one with no try counted), the next try. */
const RETRY_LINES: readonly Note[] = [
  (m) =>
    m.attempts > 0
      ? t.messages.attempts
          .replace('{n}', String(m.attempts))
          .replace('{max}', String(MAX_SEND_ATTEMPTS))
      : null,
  (m) => (m.error_code ? errorLine(m) : null),
  (m, o) => {
    const next = m.attempts > 0 || m.error_code ? m.next_attempt_at : null;
    return next ? at(t.messages.nextAttempt, next, o.clock) : null;
  },
];

/** Claimed by the sender now (its lease, not a retry time): no «المحاولة الجاية» then. */
function queuedNotes(m: MessageView, o: NotesInput): string[] {
  const tail =
    m.error_code === 'sending' ? [t.messages.sendingNow] : RETRY_LINES.map((line) => line(m, o));
  return [waitLine(m, o), ...tail].filter(isText);
}

/** Per status, the lines it shows; any other status shows none. */
const STATUS_NOTES: Partial<
  Record<MessageView['status'], (m: MessageView, o: NotesInput) => string[]>
> = {
  failed: (m) => [errorLine(m)],
  sent_manually: (m, o) =>
    m.sent_manually_at ? [at(t.messages.sentManuallyAt, m.sent_manually_at, o.clock)] : [],
  queued: queuedNotes,
};

/**
 * Lines under an outbound bubble that say why it has not arrived (R-MSG-05): the error in words,
 * tries so far, the next try, a template still waiting on Meta, or when it was sent by hand.
 * A hand-off shows none: MessageActions asks «بعتّها؟» instead.
 */
export function outboundNotes(m: MessageView, o: NotesInput): string[] {
  if (m.direction !== 'outbound' || isHandedOff(m)) return [];
  return STATUS_NOTES[m.status]?.(m, o) ?? [];
}

/** «اتبعتت … · وصلت … · اتقرت …»: every delivery time Meta reported, for the status chip's title. */
export function deliveryTitle(m: MessageView, clock: Clock): string {
  const steps: [string, string | null][] = [
    [t.messages.sentAt, m.sent_at],
    [t.messages.deliveredAt, m.delivered_at],
    [t.messages.readAt, m.direction === 'outbound' ? m.read_at : null],
  ];
  return steps.flatMap(([text, iso]) => (iso ? [at(text, iso, clock)] : [])).join(' · ');
}

/** The admin opened wa.me for it (M3): the row waits for their «بعتّها؟» answer. */
export const isHandedOff = (m: MessageView): boolean =>
  m.status === 'failed' && m.error_code === 'handed_off';

/**
 * Retry (M1) is for failed rows where trying again can help (not «not on WhatsApp», a closed 24 h
 * window, too late, or a hand-off); sending by hand (M2) for any outbound row still not out that
 * the API gave a wa.me link: none while the sender holds the row («sending»), so no double send.
 */
export const canRetry = (m: MessageView): boolean =>
  m.direction === 'outbound' && m.status === 'failed' && canRetryCode(m.error_code);
export const canSendByHand = (m: MessageView): boolean =>
  m.direction === 'outbound' &&
  (m.status === 'failed' || m.status === 'queued') &&
  !!m.click_to_chat;
