import { canRetryCode, MAX_SEND_ATTEMPTS, type MessageView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { errorText, fullTime } from './format';

export interface NotesInput {
  /** The row's template is not approved yet: the sender leaves it queued (docs/12 §3.3). */
  waitingTemplate: boolean;
  now: Date;
}

const at = (template: string, iso: string) => template.replace('{time}', fullTime(iso));

/**
 * Lines under an outbound bubble that say why it has not arrived (R-MSG-05): the error in words,
 * tries so far, the next try, a template still waiting on Meta, or when it was sent by hand.
 */
export function outboundNotes(m: MessageView, o: NotesInput): string[] {
  if (m.direction !== 'outbound') return [];
  if (isHandedOff(m)) return []; // MessageActions asks «بعتّها؟» instead
  if (m.status === 'failed') return [t.messages.errorLine.replace('{reason}', errorText(m))];
  if (m.status === 'sent_manually') return m.sent_manually_at ? [at(t.messages.sentManuallyAt, m.sent_manually_at)] : [];
  return m.status === 'queued' ? queuedNotes(m, o) : [];
}

function queuedNotes(m: MessageView, o: NotesInput): string[] {
  const notes: string[] = [];
  if (o.waitingTemplate) notes.push(t.messages.waitingTemplate);
  else if (m.scheduled_for && Date.parse(m.scheduled_for) > o.now.getTime()) {
    notes.push(at(t.messages.queuedFor, m.scheduled_for));
  }
  // Claimed by the sender right now (its lease, not a retry time): say so instead of «المحاولة الجاية».
  if (m.error_code === 'sending') return [...notes, t.messages.sendingNow];
  if (m.attempts > 0) {
    notes.push(t.messages.attempts.replace('{n}', String(m.attempts)).replace('{max}', String(MAX_SEND_ATTEMPTS)));
    if (m.error_code) notes.push(t.messages.errorLine.replace('{reason}', errorText(m)));
    if (m.next_attempt_at) notes.push(at(t.messages.nextAttempt, m.next_attempt_at));
  }
  return notes;
}

/** «اتبعتت … · وصلت … · اتقرت …»: every delivery time Meta reported, for the status chip's title. */
export function deliveryTitle(m: MessageView): string {
  const steps: [string, string | null][] = [
    [t.messages.sentAt, m.sent_at],
    [t.messages.deliveredAt, m.delivered_at],
    [t.messages.readAt, m.direction === 'outbound' ? m.read_at : null],
  ];
  return steps.flatMap(([text, iso]) => (iso ? [at(text, iso)] : [])).join(' · ');
}

/** The admin opened wa.me for it (M3): the row waits for their «بعتّها؟» answer. */
export const isHandedOff = (m: MessageView): boolean => m.status === 'failed' && m.error_code === 'handed_off';

/**
 * Retry (M1) is for failed rows where trying again can help (not «not on WhatsApp», a closed 24 h
 * window, too late, or a hand-off); sending by hand (M2) for any outbound row still not out that
 * the API gave a wa.me link: none while the sender holds the row («sending»), so no double send.
 */
export const canRetry = (m: MessageView): boolean =>
  m.direction === 'outbound' && m.status === 'failed' && canRetryCode(m.error_code);
export const canSendByHand = (m: MessageView): boolean =>
  m.direction === 'outbound' && (m.status === 'failed' || m.status === 'queued') && !!m.click_to_chat;
