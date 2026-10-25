import { formatPhone, type ThreadView } from '@ab/shared';
import { useId } from 'react';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { showsPhone, useInboxMode } from './mode';

export interface ForwardListProps {
  threads: ThreadView[];
  /** Picked numbers → the name shown (null: unnamed), in pick order. */
  picked: ReadonlyMap<string, string | null>;
  /** The cap (FORWARD_MAX_TARGETS) is reached: the unpicked rows are disabled. */
  full: boolean;
  onToggle: (thread: ThreadView) => void;
}

/** One chat: its whole 44px row toggles the checkbox; outside the 24 h window a hint (the server decides). */
function Row({ thread: th, checked, disabled, onToggle }: { thread: ThreadView; checked: boolean; disabled: boolean; onToggle: () => void }) {
  const hintId = useId();
  const phone = showsPhone(useInboxMode());
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-sunk has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={th.session_open ? undefined : hintId}
          onChange={onToggle}
          className="size-4 shrink-0 accent-[var(--lapis)]"
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-ink" dir="auto">
              {th.display_name ?? formatPhone(th.phone_e164)}
            </span>
            {phone && th.display_name && <Ltr className="shrink-0 text-2xs text-ink-3">{formatPhone(th.phone_e164)}</Ltr>}
          </span>
          {!th.session_open && (
            <span id={hintId} className="block text-2xs text-ink-2">
              {t.inbox.forward.skip.session_closed}
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

/** The picker's chats, recent first (the GET /threads order), each with its checkbox. */
export function ForwardList({ threads, picked, full, onToggle }: ForwardListProps) {
  return (
    <ul className="grid gap-0.5">
      {threads.map((th) => {
        const checked = picked.has(th.phone_e164);
        return <Row key={th.phone_e164} thread={th} checked={checked} disabled={full && !checked} onToggle={() => onToggle(th)} />;
      })}
    </ul>
  );
}
