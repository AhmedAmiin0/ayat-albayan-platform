import { formatPhone, type ActiveCallView, type CallPermissionState } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { PermissionDialog } from '../header/PermissionDialog';
import type { CallSessionApi } from '../state/use-call-session';
import { CallBar } from './CallBar';
import { CallScreen } from './CallScreen';
import { IncomingCall } from './IncomingCall';

export interface CallOverlayProps {
  s: CallSessionApi;
  /** Teachers never see a family's number: an unnamed caller is «رقم غير معروف» for them. */
  showsPhone: boolean;
  ask: { phone: string; state: Exclude<CallPermissionState, 'granted'> } | null;
  onAsk: (next: 'closed' | 'sent') => void;
  /** Esc on the incoming call: silence its ring. */
  onSilence: (callId: string) => void;
}

const callerOf = (row: ActiveCallView, showsPhone: boolean): string =>
  row.display_name ?? (showsPhone ? formatPhone(row.phone_e164) : t.inbox.unknownNumber);

/** The call this device is in: full screen, or the bar on top once minimised. */
function SessionView({ s }: { s: CallSessionApi }) {
  const { store, session, phase } = s;
  if (!session || !phase) return null;
  if (session.minimised) return <CallBar session={session} row={s.row} phase={phase} onExpand={() => store.setMinimised(false)} />;
  const actions = { hangup: () => store.hangup(), toggleMute: () => store.toggleMute(), minimise: () => store.setMinimised(true) };
  return <CallScreen session={session} row={s.row} phase={phase} actions={actions} />;
}

/** What the calls put above every page: the ring, the call or its bar, and the permission dialog. */
export function CallOverlay({ s, showsPhone, ask, onAsk, onSilence }: CallOverlayProps) {
  const { store, incoming } = s;
  const caller = incoming ? callerOf(incoming, showsPhone) : '';
  return (
    <>
      {incoming && (
        <IncomingCall
          name={caller}
          phone={incoming.phone_e164}
          onAccept={() => store.accept(incoming, caller)}
          onDecline={() => store.reject(incoming)}
          onSilence={() => onSilence(incoming.id)}
        />
      )}
      <SessionView s={s} />
      {ask && <PermissionDialog {...ask} onClose={() => onAsk('closed')} onSent={() => onAsk('sent')} />}
    </>
  );
}
