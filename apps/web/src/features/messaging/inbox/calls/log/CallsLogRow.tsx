import { callEntryKind, formatCallDuration, type CallView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { listTime } from '../../format';
import { inboxBase, useInboxMode } from '../../shared/mode';
import { callerName, callGlyph, callTone } from '../entries/call-text';
import { useClock } from '@/lib/clock';

/** One call of «المكالمات»: name, the direction glyph and word, the time and the talk time; opens the chat. */
export function CallsLogRow({ call }: { call: CallView }) {
  const mode = useInboxMode();
  const kind = callEntryKind(call);
  const name = callerName(call, mode);
  const clock = useClock();
  return (
    <li>
      <Link
        to={inboxBase(mode)}
        search={{ page: 1, calls: true, phone: call.phone_e164 }}
        className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-sunk"
      >
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full bg-sunk', callTone(kind))}>
          <Icon name={callGlyph(call)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-semibold', kind === 'missed' ? 'text-danger' : 'text-ink')}>{name}</span>
          <span className="block text-2xs text-ink-3">{t.calls.entry[kind]}</span>
        </span>
        <span className="shrink-0 text-end text-2xs text-ink-3 tabular-nums">
          <span className="block">{listTime(call.started_at, clock)}</span>
          {call.duration_seconds !== null && <span className="block" dir="ltr">{formatCallDuration(call.duration_seconds)}</span>}
        </span>
      </Link>
    </li>
  );
}
