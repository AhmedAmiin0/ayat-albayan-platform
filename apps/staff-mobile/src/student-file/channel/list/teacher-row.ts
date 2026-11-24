import type { ChannelSenderLabel, TeacherChannelRow } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** The teacher's own messages are prefixed "you", others with the role's word. */
const prefixOf = (role: ChannelSenderLabel): string =>
  role === 'teacher' ? t.studentChannel.you : t.studentChannel.roles[role];

/** A deleted message reads as deleted; a wordless file reads as a message. */
const wordsOf = (m: NonNullable<TeacherChannelRow['last_message']>): string => {
  const c = t.studentChannel;
  return m.deleted ? c.actions.deleted : m.body || c.kinds.text;
};

export function previewOf(r: TeacherChannelRow): string {
  const m = r.last_message;
  if (!m) return t.studentChannel.noMessageYet;
  return `${prefixOf(m.sender_role)}: ${wordsOf(m)}`;
}
