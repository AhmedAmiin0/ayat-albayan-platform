import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';

export interface JumpToLatestProps {
  /** Messages that arrived after the reader scrolled up; 0 shows the arrow alone. */
  count: number;
  onJump: () => void;
}

/**
 * «الانتقال إلى أحدث رسالة» (W4): while the reader is up in the history, a round button sticks to the
 * bottom of the log at the inline end, with how many new messages wait below, like WhatsApp.
 */
export function JumpToLatest({ count, onJump }: JumpToLatestProps) {
  const label = count > 0 ? t.inbox.jumpLatestCount.replace('{count}', String(count)) : t.inbox.jumpLatest;
  return (
    <div className="pointer-events-none sticky bottom-2 flex justify-end">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onJump}
        className="pointer-events-auto relative grid size-11 cursor-pointer place-items-center rounded-full border border-rule bg-raised text-ink-2 shadow-pop hover:bg-sunk"
      >
        <Icon name="arrow-down" />
        {count > 0 && (
          <span aria-hidden="true" className="absolute -top-1.5 -start-1.5 min-w-5 rounded-full bg-primary px-1 text-center text-2xs font-semibold tabular-nums text-primary-foreground">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
