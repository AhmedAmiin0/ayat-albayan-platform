import { reactionName, tappedReaction } from '@ab/client-core';
import { REACTION_EMOJIS, type MessageView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

/** «تفاعل بـإعجاب»; an emoji without a name says itself. */
export function emojiLabel(emoji: string): string {
  const name = reactionName(emoji);
  return t.inbox.reactions.withEmoji.replace('{name}', name ? t.inbox.reactions[name] : emoji);
}

interface ReactionRowProps {
  message: MessageView;
  /** The emoji to set, or null to remove ours (a click on our current one). */
  onReact: (emoji: string | null) => void;
}

/**
 * The six quick emoji on top of the bubble's menu (owner 2026-10-27), each a 44px button on touch
 * screens with a spoken name; ours is pressed (aria-pressed) and a click on it removes it.
 */
export function ReactionRow({ message: m, onReact }: ReactionRowProps) {
  const ours = m.reactions?.ours ?? null;
  return (
    <div role="group" aria-label={t.inbox.reactions.bar} className="flex gap-0.5 border-b border-rule pb-1">
      {REACTION_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          aria-label={emojiLabel(e)}
          aria-pressed={e === ours}
          title={emojiLabel(e)}
          onClick={() => onReact(tappedReaction(m.reactions, e))}
          className={cn('grid size-11 place-items-center rounded-full text-xl hover:bg-sunk sm:size-9', e === ours && 'bg-lapis-wash')}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
