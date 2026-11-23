import type { ChannelMessageView } from '@ab/shared';
import { ChannelBubbleBody } from '#/components/channel/edit/ChannelBubbleBody.tsx';
import type { useBubbleEditing } from '#/components/channel/edit/use-bubble-editing.ts';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';
import { BubbleMeta } from './BubbleMeta';
import { ChatGlyph } from './ChatGlyph';
import { SenderLine } from './SenderLine';

interface Props {
  message: ChannelMessageView;
  /** The same sender again, nothing between: no name line. */
  followUp: boolean;
  tools: ReturnType<typeof useBubbleEditing>;
  /** The time on the viewer's clock. */
  time: string;
}

const SHAPE = 'grid max-w-[85%] gap-1 rounded-lg border px-3 py-2 text-sm';
/** A flashed original (a tapped quote) rings for a moment. */
const FLASH = 'transition-shadow duration-(--duration-quick) group-data-[flash]:ring-2 ring-lapis';

/** The bubble's own look: dashed once deleted, the brand wash for mine, raised for the others'. */
const toneOf = (m: ChannelMessageView): string => {
  if (m.deleted) return 'border-dashed border-rule bg-transparent';
  return m.mine ? 'border-lapis/25 bg-accent' : 'border-rule bg-raised';
};

/** «تم حذف هذه الرسالة» in place of the text and file. */
function DeletedLine() {
  return (
    <p className="flex items-center gap-1.5 italic text-ink-3">
      <ChatGlyph name="ban" className="size-4" />
      {t.studentChannel.actions.deleted}
    </p>
  );
}

/**
 * The bubble itself: the others' name and role over the first message of a run, the quote, the
 * file and the text (or «تم حذف هذه الرسالة»), then the time and my ticks.
 */
export function BubbleCard({ message: m, followUp, tools, time }: Props) {
  const named = !m.mine && !followUp;
  return (
    <div className={cn(SHAPE, FLASH, toneOf(m))}>
      {named && <SenderLine name={m.sender_name} role={m.sender_role} />}
      {m.deleted ? <DeletedLine /> : <ChannelBubbleBody message={m} tools={tools} />}
      <BubbleMeta message={m} time={time} />
    </div>
  );
}
