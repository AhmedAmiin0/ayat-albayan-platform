import { type ChannelMessageView, splitLinks } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';

const whoOf = (m: ChannelMessageView): string => {
  const c = t.studentChannel;
  return m.mine ? c.you : [m.sender_name, c.roles[m.sender_role]].filter(Boolean).join(' · ');
};

const whatOf = (m: ChannelMessageView): string =>
  m.deleted ? t.studentChannel.actions.deleted : m.body || t.studentChannel.kinds[m.kind];

/** A bubble as one screen-reader stop. */
export const bubbleLabel = (m: ChannelMessageView, meta: string): string =>
  `${whoOf(m)}: ${whatOf(m)} · ${meta}`;

/**
 * Whether the bubble is one stop for a screen reader (its label, the menu's hint and action): a
 * plain text with a menu. A file, a quote or a link keeps its own controls reachable instead.
 */
export const speaksAsOne = (m: ChannelMessageView): boolean =>
  m.kind === 'text' && m.reply_to === null && !splitLinks(m.body).some((part) => part.href);
