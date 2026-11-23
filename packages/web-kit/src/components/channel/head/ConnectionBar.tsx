import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { useConnectionPhase, type ConnectionPhase } from './use-connection';

const words = t.mobile.connection;

/** Each shown phase: its tone and its line(s). */
const LOOK: Readonly<Record<Exclude<ConnectionPhase, 'hidden'>, { tone: string; hint: boolean }>> =
  {
    connecting: { tone: 'bg-gold-wash text-ink', hint: false },
    slow: { tone: 'bg-gold-wash text-ink', hint: true },
    back: { tone: 'bg-ok-soft text-ok', hint: false },
  };

/** Still dots: the bar itself is the live sign. */
function Dots() {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 rounded-full bg-gold" />
      ))}
    </span>
  );
}

/** The hint follows after 10 s offline; messages and the draft stay. */
export function ConnectionBar() {
  const phase = useConnectionPhase();
  if (phase === 'hidden') return null;
  const look = LOOK[phase];
  const back = phase === 'back';
  return (
    <div
      role="status"
      className={cn('flex animate-fade-in items-center gap-3 rounded-md px-3 py-2', look.tone)}
    >
      {back ? <Icon name="check" className="size-4" /> : <Dots />}
      <div className="grid gap-0.5">
        <p className="text-sm font-semibold">{back ? words.connected : words.connecting}</p>
        {look.hint && <p className="text-xs font-semibold text-act">{words.checkInternet}</p>}
      </div>
    </div>
  );
}
