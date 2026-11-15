import { Button, type ButtonProps } from '@/components/ui/form/button';
import { cn } from '@/lib/utils';
import { RoomIcon, type RoomIconName } from './room-icons';

export interface RoomButtonProps extends Omit<ButtonProps, 'children'> {
  icon: RoomIconName;
  label: string;
  /** A toggle: the pressed state (and a filled look) instead of colour alone. */
  on?: boolean;
}

/**
 * A control-bar button: icon + words; on phones the words go visually hidden (still the button's
 * name for screen readers and tests). 44px touch floor on every screen.
 */
export function RoomButton({ icon, label, on, className, variant = 'secondary', ...props }: RoomButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="md"
      aria-pressed={on}
      className={cn('min-h-11 min-w-11 px-2.5 sm:px-3.5', on && variant === 'secondary' && 'border-lapis bg-lapis-wash text-lapis', className)}
      {...props}
    >
      <RoomIcon name={icon} />
      <span className="max-sm:sr-only">{label}</span>
    </Button>
  );
}
