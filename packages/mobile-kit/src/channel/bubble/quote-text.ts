import type { ChannelMessageKind, ChannelReplyView } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';

/** A file's mark before its kind word in a quote. */
export const FILE_ICON: Readonly<Record<ChannelMessageKind, string | null>> = {
  text: null,
  photo: '📷',
  pdf: '📄',
  voice: '🎤',
};

/** The quoted message's line: its first words, a file's kind, or «رسالة محذوفة». */
export function quoteText(reply: Pick<ChannelReplyView, 'body' | 'kind' | 'deleted'>): string {
  if (reply.deleted) return t.studentChannel.reply.deleted;
  return reply.body || t.studentChannel.kinds[reply.kind];
}

/** Who wrote the quoted message: the name, else the role's word. */
export const quoteSender = (reply: Pick<ChannelReplyView, 'sender_name' | 'sender_role'>) =>
  reply.sender_name || t.studentChannel.roles[reply.sender_role];
