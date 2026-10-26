import type { ActiveCallView } from '@ab/shared';
import { useId, useRef } from 'react';
import { Avatar } from '@/components/ui/display/avatar';
import { Icon } from '@/components/ui/display/icon';
import { useFocusTrap } from '@/components/ui/overlay/use-focus-trap';
import { t } from '@/lib/i18n/i18n';
import type { CallPhase, CallSession } from '../state/call-phase';
import { callPhaseText, callStatusText } from './call-status';
import { RoundButton } from './RoundButton';
import { useNow } from './use-now';

export interface CallScreenProps {
  session: CallSession;
  row: ActiveCallView | undefined;
  phase: CallPhase;
  actions: { hangup: () => void; toggleMute: () => void; minimise: () => void };
}

/**
 * The call, full screen like WhatsApp's (docs/28 §5): the big initials, the name, «جارٍ الاتصال…» →
 * «يرنّ…» → the mm:ss timer, and كتم / إنهاء (red). A modal: focus stays inside, Esc and «تصغير» keep
 * the call in the bar while the user goes on working, focus returns where it was. The live region
 * announces the phase only; the ticking timer is shown, not read out. The web has no speaker switch.
 */
export function CallScreen({ session, row, phase, actions }: CallScreenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const now = useNow(phase === 'active');
  useFocusTrap(ref, actions.minimise);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={nameId}
      className="fixed inset-0 z-[60] flex flex-col items-center bg-cover px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-cover-ink"
    >
      <div className="flex w-full max-w-md items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-cover-ink/75">
          <Icon name="call" className="size-4" />
          {t.calls.voiceCall}
        </span>
        <button
          type="button"
          onClick={actions.minimise}
          aria-label={t.calls.controls.minimise}
          className="grid size-11 place-items-center rounded-full text-cover-ink/80 hover:bg-leather-deep"
        >
          <Icon name="chevron-down" className="size-5" />
        </button>
      </div>
      <div className="mt-[12vh] flex flex-col items-center gap-4 text-center">
        <Avatar name={session.name} size="lg" />
        <h2 id={nameId} tabIndex={-1} data-autofocus className="max-w-[18ch] truncate font-display text-2xl font-bold outline-none">
          {session.name}
        </h2>
        <p aria-hidden="true" className="text-sm text-cover-ink/80 tabular-nums" dir={phase === 'active' ? 'ltr' : undefined}>
          {callStatusText(phase, { row, now })}
        </p>
        <p role="status" className="sr-only">
          {callPhaseText(phase)}
        </p>
      </div>
      {phase !== 'ended' && (
        <div className="mt-auto flex items-start justify-center gap-10">
          <RoundButton
            label={session.muted ? t.calls.controls.unmute : t.calls.controls.mute}
            icon={session.muted ? 'mic-off' : 'mic'}
            tone="plain"
            pressed={session.muted}
            onClick={actions.toggleMute}
          />
          <RoundButton label={t.calls.controls.end} icon="call" tone="end" onClick={actions.hangup} />
        </div>
      )}
    </div>
  );
}
