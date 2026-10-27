import { callEntryKind, type CallView } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { clockText, fullTime } from '../../format';
import { BUBBLE_ROW } from '../../messages/lib/bubble-side';
import { useInboxMode } from '../../shared/mode';
import { useCalls } from '../state/call-context';
import { callEntryText, callerName, callGlyph, callTone } from './call-text';
import { useClock } from '@/lib/clock';

export interface CallEntryProps {
  call: CallView;
  /** May this user call from this chat (the header icon's rule)? */
  canCall: boolean;
}

/**
 * A call in the chat log, at its own time among the messages (docs/28 §5), on the side of whoever
 * called, like WhatsApp: the glyph, «مكالمة صوتية صادرة · 2:14» / «مكالمة فائتة» (red) and the time.
 * Tapping it calls back while calls are on and the user may call.
 */
export function CallEntry({ call, canCall }: CallEntryProps) {
  const ui = useCalls();
  const name = callerName(call, useInboxMode());
  const kind = callEntryKind(call);
  const text = callEntryText(call);
  const clock = useClock();
  const back = ui && canCall && ui.config.available && !ui.busy && kind !== 'live';
  const body = (
    <>
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full bg-sunk', callTone(kind))}>
        <Icon name={callGlyph(call)} className="size-[18px]" />
      </span>
      <span className="min-w-0 text-start">
        <span className={cn('block text-sm font-semibold', kind === 'missed' ? 'text-danger' : 'text-ink')}>{text}</span>
        <time dateTime={call.started_at} title={fullTime(call.started_at, clock)} className="block text-2xs text-ink-3 tabular-nums">
          {clockText(call.started_at, clock)}
        </time>
      </span>
    </>
  );
  const box = 'flex items-center gap-2.5 rounded-lg border border-rule bg-raised px-3 py-2';
  return (
    <li data-call-id={call.id} className={cn('flex', BUBBLE_ROW[call.direction])}>
      {back ? (
        <button
          type="button"
          onClick={() => ui.call({ phone: call.phone_e164, name })}
          aria-label={`${text}. ${t.calls.callBack}`}
          className={cn(box, 'hover:bg-sunk')}
        >
          {body}
        </button>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  );
}
