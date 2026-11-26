import { EMOJI } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { escapeCloses } from '@ab/web-kit/components/channel/composer/use-composer';

interface Props {
  onPick: (emoji: string) => void;
  /** Esc in the grid: closes it (focus back on the box), never the panel around the chat. */
  onClose: () => void;
}

/**
 * The composer's emoji grid (the shared ~80 built-in emoji, no library): it pops in above the
 * box; a pick goes in at the caret and the grid stays open for another.
 */
export function EmojiPanel({ onPick, onClose }: Props) {
  const onKeyDown = escapeCloses(onClose);
  return (
    <div
      role="group"
      aria-label={t.studentChannel.emoji}
      className="absolute bottom-full z-30 mb-2 grid max-h-60 w-[min(20rem,calc(100vw-2rem))] animate-pop-in grid-cols-8 gap-0.5 overflow-y-auto rounded-md border border-rule bg-card p-2 shadow-pop start-0"
    >
      {EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={emoji}
          onClick={() => onPick(emoji)}
          onKeyDown={onKeyDown}
          className="ab-press grid size-9 place-items-center rounded-sm text-xl hover:bg-sunk"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
