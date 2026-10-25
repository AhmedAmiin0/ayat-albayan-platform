import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface SavedRepliesButtonProps {
  /** Outside the 24 h window: shown but locked, with why. */
  locked?: boolean;
  pressed?: boolean;
  onClick?: () => void;
}

/**
 * «الردود السريعة» beside the message box. Locked after the window (templates only): it stays
 * focusable (aria-disabled) so its reason is read and shown as a tooltip.
 */
export function SavedRepliesButton({ locked = false, pressed = false, onClick }: SavedRepliesButtonProps) {
  const hintId = useId();
  return (
    <>
      <IconButton
        label={t.savedReplies.open}
        aria-pressed={locked ? undefined : pressed}
        aria-disabled={locked || undefined}
        aria-describedby={locked ? hintId : undefined}
        title={locked ? t.savedReplies.closedHint : t.savedReplies.open}
        className={cn('rounded-full', pressed && 'bg-lapis-wash text-lapis', locked && 'cursor-not-allowed opacity-45 hover:bg-transparent')}
        onClick={locked ? undefined : onClick}
        // The composer keeps its focus (and a «/» trigger its text) when the button is pressed.
        onMouseDown={(e) => e.preventDefault()}
      >
        <Icon name="bolt" className="size-5" />
      </IconButton>
      {locked && (
        <span id={hintId} hidden>
          {t.savedReplies.closedHint}
        </span>
      )}
    </>
  );
}
