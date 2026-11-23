import type { ChannelMessageKind, ChannelReplyView } from '@ab/shared';
import type { ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChatGlyph } from './ChatGlyph';
import { jumpToMessage } from './jump';

const c = t.studentChannel;

/** A quoted file's glyph before its words. */
const GLYPHS: Readonly<Record<ChannelMessageKind, ReactNode>> = {
  text: null,
  photo: <ChatGlyph name="photo" className="size-3.5" />,
  pdf: <ChatGlyph name="page" className="size-3.5" />,
  voice: <ChatGlyph name="play" className="size-3.5" />,
};

const quoted = (r: ChannelReplyView): string =>
  r.deleted ? c.reply.deleted : r.body || c.kinds[r.kind];

/**
 * The message a reply answers, at the top of the bubble (FamChatWebThread): its sender (else the
 * role) in the brand colour on a start edge, then its first words or its file's kind. A click
 * scrolls to the original and flashes it; an original older than the loaded pages does nothing.
 */
export function QuoteBlock({ reply }: { reply: ChannelReplyView }) {
  const who = reply.sender_name || c.roles[reply.sender_role];
  return (
    <button
      type="button"
      aria-label={`${t.inbox.reply.jump}: ${who}`}
      onClick={(e) => jumpToMessage(e.currentTarget, reply.id)}
      className="ab-press grid gap-0.5 rounded-sm border-s-[3px] border-lapis bg-sunk px-2.5 py-1.5 text-start"
    >
      <span className="text-2xs font-bold text-lapis">{who}</span>
      <span className="flex items-center gap-1 text-xs text-ink-2">
        {reply.deleted ? null : GLYPHS[reply.kind]}
        <span className="line-clamp-2">{quoted(reply)}</span>
      </span>
    </button>
  );
}
