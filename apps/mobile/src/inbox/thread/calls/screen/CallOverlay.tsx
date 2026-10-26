import { formatPhone, type ActiveCallView, type CallPermissionState } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import type { CallSessionApi } from '../state/use-call-session';
import { CallBar } from './CallBar';
import { CallScreen } from './CallScreen';
import { IncomingCall } from './IncomingCall';
import { PermissionDialog } from './PermissionDialog';

export type PermissionAsk = { phone: string; state: Exclude<CallPermissionState, 'granted'> };

export interface CallOverlayProps {
  s: CallSessionApi;
  /** Teachers never see a family's number: an unnamed caller is «رقم غير معروف» for them. */
  showsPhone: boolean;
  ask: PermissionAsk | null;
  onAsk: (next: 'closed' | 'sent') => void;
  /** Back on the incoming screen: silence this call's ring. */
  onSilence: (callId: string) => void;
}

const callerOf = (row: ActiveCallView, showsPhone: boolean): string =>
  row.display_name ?? (showsPhone ? formatPhone(row.phone_e164) : t.inbox.unknownNumber);

/** The call this device is in: full screen, or the bar once minimised. */
function SessionView({ s }: { s: CallSessionApi }) {
  const { store, session, phase } = s;
  if (!session || !phase) return null;
  if (session.minimised) return <CallBar session={session} row={s.row} phase={phase} onExpand={() => store.setMinimised(false)} />;
  const actions = {
    hangup: () => store.hangup(),
    toggleMute: () => store.toggleMute(),
    toggleSpeaker: () => store.toggleSpeaker(),
    minimise: () => store.setMinimised(true),
  };
  return <CallScreen session={session} row={s.row} phase={phase} actions={actions} />;
}

/** What the calls put above every screen: the ring, the call or its bar, and the permission sheet. */
export function CallOverlay({ s, showsPhone, ask, onAsk, onSilence }: CallOverlayProps) {
  const { store, incoming } = s;
  const caller = incoming ? callerOf(incoming, showsPhone) : '';
  return (
    <>
      {incoming ? (
        <IncomingCall
          name={caller}
          onAccept={() => store.accept(incoming, caller)}
          onDecline={() => store.reject(incoming)}
          onSilence={() => onSilence(incoming.id)}
        />
      ) : null}
      <SessionView s={s} />
      {ask ? <PermissionDialog {...ask} onClose={() => onAsk('closed')} onSent={() => onAsk('sent')} /> : null}
    </>
  );
}
