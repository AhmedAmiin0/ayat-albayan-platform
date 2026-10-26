import { useId } from 'react';
import { Avatar } from '@/components/ui/display/avatar';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { RoundButton } from './RoundButton';

export interface IncomingCallProps {
  name: string;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * A family calling the academy's chat number (docs/28 §3.2): full screen, «رفض» (red) and «قبول»
 * (green). Every staff member who may answer that chat sees it; the first «قبول» takes the call and
 * the screen closes for the others. An alertdialog: it interrupts, and قبول has the focus.
 */
export function IncomingCall({ name, onAccept, onDecline }: IncomingCallProps) {
  const nameId = useId();
  const whatId = useId();
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={nameId}
      aria-describedby={whatId}
      className="fixed inset-0 z-[60] flex flex-col items-center bg-cover px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-cover-ink"
    >
      <p id={whatId} className="mt-4 inline-flex items-center gap-1.5 text-sm text-cover-ink/80">
        <Icon name="call" className="size-4" />
        {t.calls.status.incoming}
      </p>
      <div className="mt-[12vh] flex flex-col items-center gap-4 text-center">
        <span className="rounded-full motion-safe:animate-pulse">
          <Avatar name={name} size="lg" />
        </span>
        <h2 id={nameId} className="max-w-[18ch] truncate font-display text-2xl font-bold">
          {name}
        </h2>
      </div>
      <div className="mt-auto flex w-full max-w-xs items-start justify-between">
        <RoundButton label={t.calls.controls.decline} icon="call" tone="end" onClick={onDecline} />
        <RoundButton label={t.calls.controls.accept} icon="call" tone="accept" onClick={onAccept} autoFocus />
      </div>
    </div>
  );
}
