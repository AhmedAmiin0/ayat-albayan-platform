import type { ActiveCallView, CallIceServer } from '@ab/shared';
import { requestId } from '@/core/lib/http/request-id';
import { t } from '@/core/lib/i18n/i18n';
import { acceptCall, endCall, startCall } from '../api/calls-api';
import { callErrorText } from '../api/call-error';
import { restorePlayback, routeCallAudio } from '../rtc/audio-route';
import { createCallPeer, type CallPeer } from '../rtc/call-peer';
import { MicError, type RtcDeps } from '../rtc/media';
import type { CallSession, CallTarget } from './call-phase';

/** What the async call steps read and write (CallStore). */
export interface CallRuntime {
  rtc: RtcDeps | null;
  iceServers: readonly CallIceServer[];
  peer: { current: CallPeer | null };
  /** Bumped by every hang-up: a step that awaited across one is cancelled. */
  attempt: { current: number };
  setSession: (update: (s: CallSession | null) => CallSession | null) => void;
  currentSession: () => CallSession | null;
  /** The moment the session learnt its server id (endedOnServer and the 45 s timer count from it). */
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
  ...{ id, direction, startedAt: Date.now() },
  ...{ muted: false, speaker: false, minimised: false, ended: false },
});

/** Closes the media and gives the app its playback audio mode back. */
export function teardown(rt: CallRuntime): void {
  const had = rt.peer.current !== null;
  rt.peer.current?.close();
  rt.peer.current = null;
  if (had) void restorePlayback();
}

/** A new attempt: its token stays current until the next hang-up or attempt. */
function nextAttempt(rt: CallRuntime): () => boolean {
  rt.attempt.current += 1;
  const token = rt.attempt.current;
  return () => rt.attempt.current === token;
}

/** The microphone and the peer; closed again at once (mic stopped) when the attempt was cancelled meanwhile. */
async function peerFor(rt: CallRuntime, live: () => boolean): Promise<CallPeer | null> {
  const peer = await createCallPeer({ deps: rt.rtc, iceServers: rt.iceServers });
  if (!live()) {
    peer.close();
    return null;
  }
  rt.peer.current = peer;
  void routeCallAudio(false);
  // The media dropped for good: say so and end the call (WhatsApp terminate through the API).
  peer.onFailed(() => {
    rt.notify(t.calls.errors.media_failed);
    if (live()) void hangUp(rt, rt.currentSession());
  });
  return peer;
}

function failed(rt: CallRuntime, input: { live: () => boolean; error: unknown }): void {
  if (!input.live()) return;
  teardown(rt);
  rt.setSession(() => null);
  rt.notify(failureText(input.error));
  rt.refresh();
}

/** Outbound: microphone, our offer, then POST /calls (once: a failed connect is never retried). */
export async function beginCall(rt: CallRuntime, target: CallTarget): Promise<void> {
  const live = nextAttempt(rt);
  rt.setSession(() => fresh(target, 'outbound', null));
  try {
    const peer = await peerFor(rt, live);
    const sdp = peer ? await peer.offer() : null;
    if (!sdp || !live()) return;
    const view = await startCall({ phone: target.phone, sdp, clientRequestId: requestId() });
    // Hung up while the request was in flight: the call exists now, so end it.
    if (!live()) return void (await endCall(view.id).catch(() => undefined));
    rt.markId();
    rt.setSession((s) => (s ? { ...s, id: view.id } : s));
    rt.refresh();
  } catch (error) {
    failed(rt, { live, error });
  }
}

/** Inbound «قبول»: our answer to the family's offer, then POST accept (the first one to accept wins). */
export async function acceptRinging(rt: CallRuntime, input: { row: ActiveCallView; name: string }): Promise<void> {
  const { row } = input;
  const live = nextAttempt(rt);
  rt.setSession(() => fresh({ phone: row.phone_e164, name: input.name }, 'inbound', row.id));
  try {
    const peer = await peerFor(rt, live);
    const sdp = peer ? await peer.answer(row.offer_sdp ?? '') : null;
    if (!sdp || !live()) return;
    await acceptCall(row.id, sdp);
    if (!live()) return void (await endCall(row.id).catch(() => undefined));
    rt.markId();
    rt.refresh();
  } catch (error) {
    failed(rt, { live, error });
  }
}

/** «إنهاء» (any phase): cancels an attempt in flight, closes everything local, then WhatsApp terminate. */
export async function hangUp(rt: CallRuntime, session: CallSession | null): Promise<void> {
  rt.attempt.current += 1;
  teardown(rt);
  rt.setSession(() => null);
  if (session?.id) await endCall(session.id).catch(() => undefined);
  rt.refresh();
}
