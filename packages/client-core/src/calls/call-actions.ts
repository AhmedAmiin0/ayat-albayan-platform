import type { ActiveCallView, CallIceServer } from '@ab/shared';
import { MicError, type CallPeer } from './call-peer.js';
import type { CallSession, CallTarget } from './call-phase.js';
import type { CallPlatform, NoticeAction, PeerMaker } from './call-platform.js';
import { callErrorText } from './call-words.js';

/** What the async call steps read and write (CallStore). */
export interface CallRuntime {
  platform: CallPlatform;
  /** The device's WebRTC; null = none here (the call says «لا يدعم المكالمات»). */
  makePeer: PeerMaker | null;
  iceServers: readonly CallIceServer[];
  peer: { current: CallPeer | null };
  /** Bumped by every attempt and hang-up: a step that awaited across one is cancelled. */
  attempt: { current: number };
  setSession: (update: (s: CallSession | null) => CallSession | null) => void;
  currentSession: () => CallSession | null;
  /** The moment the session learnt its server id (endedOnServer and the 45 s timer count from it). */
  markId: () => void;
  notify: (text: string | null, action?: NoticeAction) => void;
  /** Re-reads /calls/active now. */
  refresh: () => void;
}

/** The sentence for a failed step: the microphone's own words, else the API's code. */
function failureText(e: unknown, platform: CallPlatform): string {
  const text = platform.text();
  if (e instanceof MicError) return e.problem === 'unsupported' ? text.mic.unsupported : text.mic.denied;
  return callErrorText(e, text);
}

const fresh = (target: CallTarget, direction: CallSession['direction'], id: string | null): CallSession => ({
  ...target,
  ...{ id, direction, startedAt: Date.now() },
  ...{ muted: false, speaker: false, minimised: false, ended: false },
});

/** Closes the media (the mic released) and, if a call routed the audio, gives the app its playback mode back. */
export function teardown(rt: CallRuntime): void {
  rt.peer.current?.close();
  rt.peer.current = null;
  void rt.platform.audio?.restore();
}

/** A new attempt: whatever an earlier one left is closed; its token stays current until the next hang-up or attempt. */
function nextAttempt(rt: CallRuntime): () => boolean {
  teardown(rt);
  rt.attempt.current += 1;
  const token = rt.attempt.current;
  return () => rt.attempt.current === token;
}

/** The microphone and the peer, with the mute and speaker chosen meanwhile; closed at once if cancelled. */
async function peerFor(rt: CallRuntime, live: () => boolean): Promise<CallPeer | null> {
  if (!rt.makePeer) throw new MicError('unsupported');
  const peer = await rt.makePeer(rt.iceServers);
  if (!live()) {
    peer.close();
    return null;
  }
  rt.peer.current = peer;
  const session = rt.currentSession();
  peer.setMuted(session?.muted ?? false);
  void rt.platform.audio?.route(session?.speaker ?? false);
  // The media dropped for good: say so and end the call (WhatsApp terminate through the API).
  peer.onFailed(() => {
    rt.notify(rt.platform.text().errors.media_failed);
    if (live()) void hangUp(rt, rt.currentSession());
  });
  return peer;
}

/** Cancelled after the peer existed: close ours if the hang-up did not (it closes only the current one). */
function dropLocal(rt: CallRuntime, peer: CallPeer | null): void {
  if (peer && rt.peer.current !== peer) peer.close();
}

function failed(rt: CallRuntime, input: { live: () => boolean; error: unknown }): void {
  if (!input.live()) return;
  teardown(rt);
  rt.setSession(() => null);
  const blocked = input.error instanceof MicError && input.error.problem === 'blocked';
  rt.notify(failureText(input.error, rt.platform), blocked ? 'settings' : undefined);
  rt.refresh();
}

/** Outbound: microphone, our offer, then POST /calls (once: a failed connect is never retried). */
export async function beginCall(rt: CallRuntime, target: CallTarget): Promise<void> {
  const live = nextAttempt(rt);
  const { sends } = rt.platform;
  rt.setSession(() => fresh(target, 'outbound', null));
  try {
    const peer = await peerFor(rt, live);
    const sdp = peer ? await peer.offer() : null;
    if (!sdp || !live()) return dropLocal(rt, peer);
    const view = await sends.startCall({ phone: target.phone, sdp, clientRequestId: rt.platform.requestId() });
    // Hung up while the request was in flight: the call exists now, so end it.
    if (!live()) return void (dropLocal(rt, peer), await sends.endCall(view.id).catch(() => undefined));
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
  const { sends } = rt.platform;
  const live = nextAttempt(rt);
  rt.setSession(() => fresh({ phone: row.phone_e164, name: input.name }, 'inbound', row.id));
  try {
    const peer = await peerFor(rt, live);
    const sdp = peer ? await peer.answer(row.offer_sdp ?? '') : null;
    if (!sdp || !live()) return dropLocal(rt, peer);
    await sends.acceptCall(row.id, sdp);
    if (!live()) return void (dropLocal(rt, peer), await sends.endCall(row.id).catch(() => undefined));
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
  if (session?.id) await rt.platform.sends.endCall(session.id).catch(() => undefined);
  rt.refresh();
}
