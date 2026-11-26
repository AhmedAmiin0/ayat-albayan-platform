import { offersAny, type MenuOffers } from '@ab/client-core';
import { useRef, useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { useDismiss } from '@ab/web-kit/components/ui/overlay/use-dismiss';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { ChannelMenuItems } from '@ab/web-kit/components/channel/edit/ChannelMenuItems';
import type { MenuPick } from '@ab/web-kit/components/channel/edit/use-bubble-editing';

interface Props {
  offers: MenuOffers;
  /** Mine sits at the inline end: the menu opens toward the middle. */
  mine: boolean;
  onPick: (what: MenuPick) => void;
}

/** Shown on hover and focus, always on touch; Esc and a pick return focus to the trigger. */
export function ChannelBubbleMenu({ offers, mine, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = (focus: boolean) => {
    if (focus) trigger.current?.focus();
    setOpen(false);
  };
  useDismiss(box, { open, onDismiss: (how) => close(how === 'escape') });
  if (!offersAny(offers)) return null;
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
        className="ab-press rounded-full"
        onClick={() => setOpen(!open)}
      >
        <Icon name="more" />
      </IconButton>
      {open && (
        <ChannelMenuItems
          offers={offers}
          mine={mine}
          onEscape={() => close(true)}
          onPick={(what) => {
            close(true);
            onPick(what);
          }}
        />
      )}
    </div>
  );
}
