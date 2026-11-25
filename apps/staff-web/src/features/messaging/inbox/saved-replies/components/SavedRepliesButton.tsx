import { useId, useState } from 'react';
import { Icon, IconButton, t, cn } from '@ab/web-kit';

export interface SavedRepliesButtonProps {
  /** Outside the 24 h window: shown but locked, with why. */
  locked?: boolean;
  pressed?: boolean;
  onClick?: () => void;
}

/** Locked after the window but focusable (aria-disabled) so its reason is read. */
export function SavedRepliesButton({ locked = false, pressed = false, onClick }: SavedRepliesButtonProps) {
  const hintId = useId();
  const [hint, setHint] = useState(false);
  return (
    <>
      <IconButton
        label={t.savedReplies.open}
        aria-pressed={locked ? undefined : pressed}
        aria-disabled={locked || undefined}
        aria-describedby={locked ? hintId : undefined}
        aria-expanded={locked ? hint : undefined}
        title={locked ? t.savedReplies.closedHint : t.savedReplies.open}
        className={cn('rounded-full', pressed && 'bg-lapis-wash text-lapis', locked && 'cursor-not-allowed opacity-45 hover:bg-transparent')}
        onClick={locked ? () => setHint((v) => !v) : onClick}
        // The composer keeps its focus (and a «/» trigger its text) when the button is pressed.
        onMouseDown={(e) => e.preventDefault()}
      >
        <Icon name="bolt" className="size-5" />
      </IconButton>
      {locked && (
        <span id={hintId} role="status" hidden={!hint} className="min-w-0 self-center text-2xs text-ink-2">
          {t.savedReplies.closedHint}
        </span>
      )}
    </>
  );
}
