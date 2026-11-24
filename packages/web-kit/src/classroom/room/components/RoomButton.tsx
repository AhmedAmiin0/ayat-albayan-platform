import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@ab/web-kit/components/ui/form/button';
import { cn } from '@ab/web-kit/lib/utils';
import { RoomIcon, type RoomIconName } from './room-icons';

export interface RoomButtonProps extends Omit<ButtonProps, 'children'> {
  icon: RoomIconName;
  label: string;
  /** A toggle: the pressed state (and a filled look) instead of colour alone. */
  on?: boolean;
  /** Phones: a 56px round button with its short word under it (the family room, the app's look). */
  round?: boolean;
  /** The word under a round button; the label stays the button's name. */
  short?: string;
  /** Not on phones (the round row keeps the app's few buttons). */
  wideOnly?: boolean;
  badge?: ReactNode;
}

interface Look {
  on: boolean | undefined;
  variant: ButtonProps['variant'];
  round: boolean;
  hide: boolean;
  className: string | undefined;
}

const ROUND = 'max-sm:size-14 max-sm:rounded-full max-sm:px-0';
const PRESSED = 'border-lapis bg-lapis-wash text-lapis';

const isPressed = (look: Look): boolean => look.on === true && look.variant === 'secondary';

function lookClass(look: Look): string {
  return cn(
    'relative min-h-11 min-w-11 px-2.5 sm:px-3.5',
    isPressed(look) && PRESSED,
    look.round ? ROUND : look.hide && 'max-sm:hidden',
    look.className,
  );
}

/** The round button with its word under it (the word is hidden from screen readers: a repeat). */
function RoundSlot({ word, hide, children }: { word: string; hide: boolean; children: ReactNode }) {
  return (
    <span className={cn('flex flex-col items-center gap-1', hide && 'max-sm:hidden')}>
      {children}
      <span aria-hidden="true" className="text-xs text-ink-2 sm:hidden">{word}</span>
    </span>
  );
}

/**
 * A control-bar button: icon + words; on phones the words go visually hidden (still the button's
 * name for screen readers and tests). 44px touch floor on every screen.
 */
export function RoomButton(props: RoomButtonProps) {
  const { icon, label, on, round = false, short, wideOnly = false, badge, ...rest } = props;
  const { variant = 'secondary', className, ...button } = rest;
  const look = { on, variant, round, hide: wideOnly, className };
  const body = (
    <Button
      type="button"
      variant={variant}
      size="md"
      aria-pressed={on}
      className={lookClass(look)}
      {...button}
    >
      <RoomIcon name={icon} />
      <span className="max-sm:sr-only">{label}</span>
      {badge}
    </Button>
  );
  return round ? <RoundSlot word={short ?? label} hide={wideOnly}>{body}</RoundSlot> : body;
}
