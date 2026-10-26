import type { Locale } from '../i18n/locale.js';
import { RIYADH_TZ } from '../format/running-head.js';
import { lessonWhenText } from './booking-confirmation.js';
import { quickReplyIntent } from './quick-reply.js';
import type { MessageView } from './views.js';

// The line under an inbound quick reply (R-MSG-05, R-SCH-03): what the system actually did, not
// what the words looked like. Pure; the web and the app fill inbox.quickReply.<key> with `when`.

export type ReplyNoteKey = 'confirmed' | 'notConfirmed' | 'reschedule' | 'rescheduleNoLesson' | 'stop';

export interface ReplyNote {
  key: ReplyNoteKey;
  /** «الأحد 4 أكتوبر 17:00», the academy's (Riyadh) time, like the admin pushes; null without a lesson. */
  when: string | null;
}

type NoteInput = Pick<MessageView, 'direction' | 'body' | 'guardian_id' | 'lead_id' | 'lesson'>;

/**
 * A guardian's «تمام» / button: «اتأكدت حلقة …» only when its lesson is confirmed now, else
 * «مفيش حلقة اتأكدت»; a reschedule names the lesson when one was found; «وقف» from a guardian or a
 * lead. Anything else (a lead's «تمام», plain text) → null. `when` is in the UI language.
 */
export function replyNote(m: NoteInput, locale: Locale = 'ar'): ReplyNote | null {
  if (m.direction !== 'inbound' || !m.body) return null;
  const intent = quickReplyIntent(m.body);
  const when = m.lesson ? lessonWhenText(new Date(m.lesson.starts_at), RIYADH_TZ, locale) : null;
  if (intent === 'stop') return m.guardian_id || m.lead_id ? { key: 'stop', when: null } : null;
  if (!intent || !m.guardian_id) return null;
  if (intent === 'reschedule') return when ? { key: 'reschedule', when } : { key: 'rescheduleNoLesson', when: null };
  return m.lesson?.status === 'confirmed' ? { key: 'confirmed', when } : { key: 'notConfirmed', when: null };
}
