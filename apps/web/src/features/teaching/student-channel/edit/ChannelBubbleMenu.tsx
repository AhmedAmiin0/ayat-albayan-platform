import type { ChannelActions } from '@ab/shared';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { useDismiss } from '@/components/ui/overlay/use-dismiss';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { ChannelMenuItems } from './ChannelMenuItems';

interface Props {
  offers: ChannelActions;
  /** Mine sits at the inline start: the menu opens toward the middle. */
  mine: boolean;
  onPick: (what: 'edit' | 'delete') => void;
}

/**
 * «خيارات الرسالة» beside a bubble (as the inbox's): shown on hover and keyboard focus, always on
 * touch screens; «تعديل» / «حذف للجميع» only where the rule allows now. Esc and a pick put focus
 * back on ⋯.
 */
export function ChannelBubbleMenu({ offers, mine, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = (focus: boolean) => {
    if (focus) trigger.current?.focus();
    setOpen(false);
  };
  useDismiss(box, { open, onDismiss: (how) => close(how === 'escape') });
  if (!offers.edit && !offers.delete) return null;
  return (
    <div
      ref={box}
      className={cn(
        'relative shrink-0 self-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        'pointer-coarse:opacity-100',
        open && 'opacity-100',
      )}
    >
      <IconButton
        ref={trigger}
        label={t.studentChannel.actions.menu}
        aria-expanded={open}
        className="rounded-full"
        onClick={() => setOpen(!open)}
      >
        <Icon name="more" />
      </IconButton>
      {open && (
        <ChannelMenuItems
          offers={offers}
          mine={mine}
          onPick={(what) => {
            close(true);
            onPick(what);
          }}
        />
      )}
    </div>
  );
}
