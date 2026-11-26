import type { ChannelMessageView } from '@ab/shared';
import { ChannelBubbleBody } from '@ab/web-kit/components/channel/edit/ChannelBubbleBody';
import type { useBubbleEditing } from '@ab/web-kit/components/channel/edit/use-bubble-editing';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { BubbleMeta } from '@ab/web-kit/components/channel/bubble/BubbleMeta';
import { ChatGlyph } from '@ab/web-kit/components/channel/bubble/ChatGlyph';
import { SenderLine } from '@ab/web-kit/components/channel/bubble/SenderLine';

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

function DeletedLine() {
  return (
    <p className="flex items-center gap-1.5 italic text-ink-3">
      <ChatGlyph name="ban" className="size-4" />
      {t.studentChannel.actions.deleted}
    </p>
  );
}

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
