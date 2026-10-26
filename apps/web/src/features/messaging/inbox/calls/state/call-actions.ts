import type { ActiveCallView, CallIceServer } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { acceptCall, endCall, startCall } from '../api/calls-api';
import { callErrorText } from '../api/call-error';
import { createCallPeer, type CallPeer } from '../rtc/call-peer';
import { MicError, type RtcDeps } from '../rtc/media';
import type { CallSession, CallTarget } from './call-phase';

/** What the async call steps read and write (held by useCallSession). */
export interface CallRuntime {
  rtc: RtcDeps | null;
  iceServers: readonly CallIceServer[];
  peer: { current: CallPeer | null };
  /** Plays the family's audio (the provider's <audio>). */
  play: (stream: MediaStream) => void;
  setSession: (update: (s: CallSession | null) => CallSession | null) => void;
  /** The moment the session learnt its server id (endedOnServer compares polls with it). */
  markId: () => void;
  notify: (text: string) => void;
  /** Re-reads /calls/active now. */
  refresh: () => void;
}

/** The sentence for a failed step: the microphone's own words, else the API's code. */
export function failureText(e: unknown): string {
  if (e instanceof MicError) return e.problem === 'denied' ? t.calls.mic.denied : t.calls.mic.unsupported;
  return callErrorText(e);
}

const fresh = (target: CallTarget, direction: CallSession['direction'], id: string | null): CallSession => ({
  ...target,
  id,
  direction,
  startedAt: Date.now(),
  muted: false,
  minimised: false,
  ended: false,
});

export function teardown(rt: CallRuntime): void {
  rt.peer.current?.close();
  rt.peer.current = null;
}

async function peerFor(rt: CallRuntime): Promise<CallPeer> {
  const peer = await createCallPeer({ deps: rt.rtc, iceServers: rt.iceServers });
  rt.peer.current = peer;
  peer.onRemote(rt.play);
  peer.onFailed(() => rt.notify(t.calls.errors.media_failed));
  return peer;
}

/** Outbound: microphone, our offer, then POST /calls (once: a failed connect is never retried). */
export async function beginCall(rt: CallRuntime, target: CallTarget): Promise<void> {
  rt.setSession(() => fresh(target, 'outbound', null));
  try {
    const sdp = await (await peerFor(rt)).offer();
    const view = await startCall({ phone: target.phone, sdp, clientRequestId: crypto.randomUUID() });
    rt.markId();
    rt.setSession((s) => (s ? { ...s, id: view.id } : s));
    rt.refresh();
  } catch (e) {
    teardown(rt);
    rt.setSession(() => null);
    rt.notify(failureText(e));
  }
}

/** Inbound «قبول»: our answer to the family's offer, then POST accept (the first one to accept wins). */
export async function acceptRinging(rt: CallRuntime, input: { row: ActiveCallView; name: string }): Promise<void> {
  const { row } = input;
  rt.setSession(() => fresh({ phone: row.phone_e164, name: input.name }, 'inbound', row.id));
  try {
    const sdp = await (await peerFor(rt)).answer(row.offer_sdp ?? '');
    await acceptCall(row.id, sdp);
    rt.markId();
    rt.refresh();
  } catch (e) {
    teardown(rt);
    rt.setSession(() => null);
    rt.notify(failureText(e));
    rt.refresh();
  }
}

/** «إنهاء»: WhatsApp terminate through the API (best effort), then everything local closes. */
export async function hangUp(rt: CallRuntime, session: CallSession | null): Promise<void> {
  teardown(rt);
  rt.setSession(() => null);
  if (session?.id) await endCall(session.id).catch(() => undefined);
  rt.refresh();
}
