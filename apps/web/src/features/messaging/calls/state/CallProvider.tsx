import { askOf, ringWhile, type CallTarget, type CallsUi, type PermissionAsk } from '@ab/client-core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n/i18n';
import { callErrorText } from '@/features/messaging/calls/api/call-error';
import { callConfigQuery, callPermissionQuery } from '@/features/messaging/calls/api/calls-api';
import { useCallsRealtime } from '@/features/messaging/calls/api/use-calls-realtime';
import { browserRtc, type RtcDeps } from '@/features/messaging/calls/rtc/media';
import { CallOverlay } from '@/features/messaging/calls/screen/CallOverlay';
import { CallsContext } from './call-context';
import { useCallSession } from './use-call-session';
import { startRingtone } from '@/features/messaging/calls/rtc/ringtone';

/** Plays the family's voice on the provider's <audio> (the device's output). */
function playOn(el: HTMLAudioElement | null, stream: MediaStream): void {
  if (el) el.srcObject = stream;
}

export interface CallProviderProps {
  children: ReactNode;
  /** Teachers never see a family's number: an unnamed caller is «رقم غير معروف» for them. */
  showsPhone?: boolean;
  /** Tests inject fakes; the app uses the browser's WebRTC. */
  rtc?: RtcDeps | null;
}

/**
 * WhatsApp voice calls for a signed-in staff shell (docs/28 §5): the config, the realtime nudge, the
 * one call of this device, the incoming ring on any page, the full-screen call and its minimised bar.
 * Everything stays dormant (no poll, no subscription) while whatsapp_calls_enabled is off.
 */
export function CallProvider({ children, showsPhone = true, rtc }: CallProviderProps) {
  const client = useQueryClient();
  const config = useQuery(callConfigQuery).data;
  const audio = useRef<HTMLAudioElement>(null);
  const deps = rtc === undefined ? browserRtc() : rtc;
  const play = (stream: MediaStream) => playOn(audio.current, stream);
  const s = useCallSession({ config, rtc: deps, play });
  const [ask, setAsk] = useState<PermissionAsk | null>(null);
  const [sent, setSent] = useState(false);
  const [silenced, setSilenced] = useState<string | null>(null);
  const on = config?.enabled === true && config.canCall;
  useCallsRealtime(config?.enabled === true);
  const ringing = on && !!s.incoming && s.incoming.id !== silenced;
  useEffect(() => ringWhile(ringing, startRingtone), [ringing]);

  const call = async (target: CallTarget) => {
    try {
      const p = await client.fetchQuery(callPermissionQuery(target.phone));
      const sheet = askOf(target.phone, p);
      if (sheet) setAsk(sheet);
      else s.store.begin(target);
    } catch (e) {
      s.store.notify(callErrorText(e));
    }
  };
  const ui: CallsUi | null = config ? { config, busy: s.session !== null, call: (target) => void call(target) } : null;
  const overlay = (
    <>
      <CallOverlay s={s} showsPhone={showsPhone} ask={ask} onAsk={(next) => (setAsk(null), setSent(next === 'sent'))} onSilence={setSilenced} />
      {sent && <Toast message={t.calls.permission.requestSent} onDismiss={() => setSent(false)} />}
      {s.notice && <Toast tone="error" message={s.notice} onDismiss={() => s.store.notify(null)} />}
      {/* The family's voice (the device's output; the web has no speaker switch). */}
      <audio ref={audio} autoPlay hidden />
    </>
  );
  return (
    <CallsContext.Provider value={ui}>
      {children}
      {on && createPortal(overlay, document.body)}
    </CallsContext.Provider>
  );
}
