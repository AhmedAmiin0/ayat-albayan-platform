import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { callErrorText } from '../api/call-error';
import { callConfigQuery, callPermissionQuery } from '../api/calls-api';
import { useCallsRealtime } from '../api/use-calls-realtime';
import { useForeground } from '../api/use-foreground';
import type { RtcDeps } from '../rtc/media';
import { nativeRtc } from '../rtc/native-rtc';
import { CallNotice } from '../screen/CallNotice';
import { CallOverlay, type PermissionAsk } from '../screen/CallOverlay';
import { CallsContext, type CallsUi } from './call-context';
import type { CallTarget } from './call-phase';
import { useCallSession, type CallSessionApi } from './use-call-session';
import { useIncomingRing } from './use-incoming-ring';

/** Calls are on for this user: the setting, and allowed to call (inbox.send). */
const callsOn = (config: CallsUi['config'] | undefined): boolean => config?.enabled === true && config.canCall;

/** An inbound call rings here unless the user silenced it (back on the incoming screen). */
const ringsHere = (id: string | undefined, silenced: string | null): boolean => id !== undefined && id !== silenced;

/** The session's notice, if any (CallOverlay places it inside its Modal while that is up). */
function SessionNotice({ s }: { s: CallSessionApi }) {
  return s.notice ? <CallNotice text={s.notice} action={s.noticeAction} onDismiss={() => s.store.notify(null)} /> : null;
}

export interface CallProviderProps {
  children: ReactNode;
  /** A staff tree that may call; false (assistant, signed out) = a plain wrapper, no query at all. */
  enabled?: boolean;
  /** Teachers never see a family's number: an unnamed caller is «رقم غير معروف» for them. */
  showsPhone?: boolean;
  /** Tests inject fakes; the app uses react-native-webrtc. */
  rtc?: RtcDeps | null;
}

/**
 * WhatsApp voice calls for a signed-in staff tree (docs/28 §5, PR 2): the config, the realtime nudge,
 * the one call of this device, the incoming ring on any screen (foreground only, no push), the
 * full-screen call and its minimised bar. Dormant (no poll, no subscription) while calls are off.
 */
export function CallProvider({ children, enabled = true, showsPhone = true, rtc }: CallProviderProps) {
  const client = useQueryClient();
  const config = useQuery({ ...callConfigQuery, enabled }).data;
  const live = enabled ? config : undefined;
  const foreground = useForeground();
  const deps = useMemo(() => (rtc === undefined ? nativeRtc() : rtc), [rtc]);
  const s = useCallSession({ config: live, rtc: deps, foreground });
  const [ask, setAsk] = useState<PermissionAsk | null>(null);
  const [silenced, setSilenced] = useState<string | null>(null);
  // A second tap while the permission check runs does nothing (one call, one peer, one microphone).
  const starting = useRef(false);
  const on = callsOn(live);
  useCallsRealtime({ enabled: Boolean(live?.enabled), active: foreground });
  useIncomingRing(on && foreground && ringsHere(s.incoming?.id, silenced));

  const call = async (target: CallTarget) => {
    if (starting.current || s.store.currentSession()) return;
    starting.current = true;
    try {
      const p = await client.fetchQuery(callPermissionQuery(target.phone));
      if (p.state === 'granted') s.store.begin(target);
      else setAsk({ phone: target.phone, state: p.state });
    } catch (e) {
      s.store.notify(callErrorText(e));
    } finally {
      starting.current = false;
    }
  };
  const ui: CallsUi | null = live ? { config: live, busy: s.session !== null, call: (target) => void call(target) } : null;
  const onAsk = (next: 'closed' | 'sent') => {
    setAsk(null);
    if (next === 'sent') s.store.notify(t.calls.permission.requestSent);
  };
  const notice = <SessionNotice s={s} />;
  return (
    <CallsContext.Provider value={ui}>
      <View style={{ flex: 1 }}>
        {children}
        {on ? <CallOverlay s={s} showsPhone={showsPhone} ask={ask} onAsk={onAsk} onSilence={setSilenced} notice={notice} /> : null}
      </View>
    </CallsContext.Provider>
  );
}
