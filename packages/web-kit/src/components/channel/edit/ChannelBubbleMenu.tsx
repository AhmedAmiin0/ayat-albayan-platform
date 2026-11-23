import { offersAny, type MenuOffers } from '@ab/client-core';
import { useRef, useState } from 'react';
import { Icon } from '#/components/ui/display/index.ts';
import { IconButton } from '#/components/ui/form/index.ts';
import { useDismiss } from '#/components/ui/overlay/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';
import { ChannelMenuItems } from './ChannelMenuItems';
import type { MenuPick } from './use-bubble-editing';

interface Props {
  offers: MenuOffers;
  /** Mine sits at the inline end: the menu opens toward the middle. */
  mine: boolean;
  onPick: (what: MenuPick) => void;
}

/**
 * «خيارات الرسالة» beside a bubble (as the inbox's): shown on hover and keyboard focus, always on
 * touch screens; only what is offered now. Esc and a pick put focus back on ⋯.
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
