import type { ChannelSenderLabel, TeacherChannelRow } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/**
 * Who wrote the last message, before it (ChatXTeacherList): «أنت: » for the teacher's own (the
 * list is hers), else the role's word.
 */
const prefixOf = (role: ChannelSenderLabel): string =>
  role === 'teacher' ? t.studentChannel.you : t.studentChannel.roles[role];

/** The last message's words: «تم حذف هذه الرسالة» once deleted, a file's «رسالة» when wordless. */
const wordsOf = (m: NonNullable<TeacherChannelRow['last_message']>): string => {
  const c = t.studentChannel;
  return m.deleted ? c.actions.deleted : m.body || c.kinds.text;
};

/** The row's second line: «ولي الأمر: متى الحلقة؟», or «لا رسائل بعد». */
export function previewOf(r: TeacherChannelRow): string {
  const m = r.last_message;
  if (!m) return t.studentChannel.noMessageYet;
  return `${prefixOf(m.sender_role)}: ${wordsOf(m)}`;
}
