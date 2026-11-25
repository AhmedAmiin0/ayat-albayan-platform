import { Icon, type IconName, cn } from '@ab/web-kit';

export interface RoundButtonProps {
  label: string;
  icon: IconName;
  tone: 'end' | 'accept' | 'plain';
  onClick: () => void;
  pressed?: boolean;
}

const TONES = {
  end: 'bg-destructive-solid text-destructive-foreground hover:brightness-110',
  accept: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  plain: 'bg-leather-deep text-cover-ink hover:bg-leather-lift aria-pressed:bg-cover-ink aria-pressed:text-cover',
} as const;

/** A call control as WhatsApp draws it: a 64px round button with its word underneath. */
export function RoundButton({ label, icon, tone, onClick, pressed }: RoundButtonProps) {
  return (
    <div className="flex w-20 flex-col items-center gap-2">
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          'grid size-16 place-items-center rounded-full transition-[filter,background-color] duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cover-ink',
          TONES[tone],
        )}
      >
        <Icon name={icon} className={cn('size-7', tone === 'end' && 'rotate-[135deg]')} />
      </button>
      <span aria-hidden="true" className="text-xs text-cover-ink/80">
        {label}
      </span>
    </div>
  );
}
