import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
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
import { useCallSession } from './use-call-session';
import { useIncomingRing } from './use-incoming-ring';

/** Calls are on for this user: the setting, and allowed to call (inbox.send). */
const callsOn = (config: CallsUi['config'] | undefined): boolean => config?.enabled === true && config.canCall;

export interface CallProviderProps {
  children: ReactNode;
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
export function CallProvider({ children, showsPhone = true, rtc }: CallProviderProps) {
  const client = useQueryClient();
  const config = useQuery(callConfigQuery).data;
  const foreground = useForeground();
  const deps = useMemo(() => (rtc === undefined ? nativeRtc() : rtc), [rtc]);
  const s = useCallSession({ config, rtc: deps, foreground });
  const [ask, setAsk] = useState<PermissionAsk | null>(null);
  const [silenced, setSilenced] = useState<string | null>(null);
  const on = callsOn(config);
  useCallsRealtime({ enabled: Boolean(config?.enabled), active: foreground });
  const ringing = s.incoming ? s.incoming.id !== silenced : false;
  useIncomingRing(on && foreground && ringing);

  const call = async (target: CallTarget) => {
    try {
      const p = await client.fetchQuery(callPermissionQuery(target.phone));
      if (p.state === 'granted') s.store.begin(target);
      else setAsk({ phone: target.phone, state: p.state });
    } catch (e) {
      s.store.notify(callErrorText(e));
    }
  };
  const ui: CallsUi | null = config ? { config, busy: s.session !== null, call: (target) => void call(target) } : null;
  const onAsk = (next: 'closed' | 'sent') => {
    setAsk(null);
    if (next === 'sent') s.store.notify(t.calls.permission.requestSent);
  };
  return (
    <CallsContext.Provider value={ui}>
      <View style={{ flex: 1 }}>
        {children}
        {on ? <CallOverlay s={s} showsPhone={showsPhone} ask={ask} onAsk={onAsk} onSilence={setSilenced} /> : null}
        {on && s.notice ? <CallNotice text={s.notice} onDismiss={() => s.store.notify(null)} /> : null}
      </View>
    </CallsContext.Provider>
  );
}
