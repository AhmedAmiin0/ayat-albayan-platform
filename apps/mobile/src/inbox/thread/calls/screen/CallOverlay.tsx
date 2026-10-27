import { formatPhone, type ActiveCallView, type CallPermissionState } from '@ab/shared';
import type { ReactNode } from 'react';
import { Modal } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import type { CallSessionApi } from '../state/use-call-session';
import { CallBar } from './CallBar';
import { CallScreen } from './CallScreen';
import { IncomingCall } from './IncomingCall';
import { PermissionDialog } from './PermissionDialog';

export type PermissionAsk = { phone: string; state: Exclude<CallPermissionState, 'granted'> };

interface CallOverlayProps {
  s: CallSessionApi;
  /** Teachers never see a family's number: an unnamed caller is «رقم غير معروف» for them. */
  showsPhone: boolean;
  ask: PermissionAsk | null;
  onAsk: (next: 'closed' | 'sent') => void;
  /** Back on the incoming screen: silence this call's ring. */
  onSilence: (callId: string) => void;
  /** The call notice, shown inside the Modal while it is up (else over the screen). */
  notice: ReactNode;
}

const callerOf = (row: ActiveCallView, showsPhone: boolean): string =>
  row.display_name ?? (showsPhone ? formatPhone(row.phone_e164) : t.inbox.unknownNumber);

/** The full-screen content: the call (unless minimised), else the ring; null when neither is up. */
function hostContent(p: CallOverlayProps): { body: ReactNode; back: () => void } | null {
  const { store, session, phase, incoming } = p.s;
  if (session && phase && !session.minimised) {
    const actions = {
      hangup: () => store.hangup(),
      toggleMute: () => store.toggleMute(),
      toggleSpeaker: () => store.toggleSpeaker(),
      minimise: () => store.setMinimised(true),
    };
    return { body: <CallScreen session={session} row={p.s.row} phase={phase} actions={actions} />, back: actions.minimise };
  }
  if (!incoming || session) return null;
  const caller = callerOf(incoming, p.showsPhone);
  const body = <IncomingCall name={caller} onAccept={() => store.accept(incoming, caller)} onDecline={() => store.reject(incoming)} />;
  return { body, back: () => p.onSilence(incoming.id) };
}

/**
 * What the calls put above every screen: ONE Modal host whose content switches between the ring and
 * the call (two Modals swapped in one commit trip iOS's presentation), the minimised bar, and the
 * permission sheet when no call screen is up. The notice sits inside the host while it is visible.
 */
export function CallOverlay(p: CallOverlayProps) {
  const { store, session, phase } = p.s;
  const host = hostContent(p);
  return (
    <>
      <Modal visible={host !== null} animationType="fade" onRequestClose={host?.back} statusBarTranslucent>
        {host?.body}
        {host ? p.notice : null}
      </Modal>
      {session?.minimised && phase ? <CallBar session={session} row={p.s.row} phase={phase} onExpand={() => store.setMinimised(false)} /> : null}
      {p.ask && !host ? <PermissionDialog {...p.ask} onClose={() => p.onAsk('closed')} onSent={() => p.onAsk('sent')} /> : null}
      {host ? null : p.notice}
    </>
  );
}
