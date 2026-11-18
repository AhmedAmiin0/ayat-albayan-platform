import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { cn } from '@ab/web-kit/lib/utils';

interface Props {
  on: boolean;
  busy: boolean;
  /** The row title's id: the switch's name («إشعارات المتصفح»); aria-checked says the state. */
  labelledBy: string;
  onToggle: () => void;
}

const TRACK = {
  on: 'justify-end bg-lapis-fill',
  off: 'justify-start bg-rule',
} as const;

/** The family look's on/off switch (boards: «إشعارات المتصفح»): 44 px tap area, a round thumb. */
export function PushSwitch({ on, busy, labelledBy, onToggle }: Props) {
  const state = on ? 'on' : 'off';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      disabled={busy}
      onClick={onToggle}
      className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full
        disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={cn('flex h-8 w-[54px] items-center rounded-full p-1',
        'motion-safe:transition-colors', TRACK[state])}>
        <span className="grid size-6 place-items-center rounded-full bg-white
          text-[var(--lapis-fill)] shadow-sm">
          {on && <Icon name="check" className="size-3.5" />}
        </span>
      </span>
    </button>
  );
}
