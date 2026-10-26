import type { ActiveCallView, CallIceServer } from '@ab/shared';
import { rejectCall } from '../api/calls-api';
import type { CallPeer } from '../rtc/call-peer';
import type { RtcDeps } from '../rtc/media';
import { acceptRinging, beginCall, hangUp, teardown, type CallRuntime } from './call-actions';
import type { CallSession, CallTarget } from './call-phase';

export interface CallStoreState {
  session: CallSession | null;
  notice: string | null;
  /** Inbound calls declined here: they stop ringing at once, before the next poll. */
  dismissed: ReadonlySet<string>;
  /** When the session learnt its server id (endedOnServer compares polls with it). */
  idAt: number;
}

/** How the store reaches the page: the family's audio and a re-read of the calls queries. */
export interface CallStoreEnv {
  play: (stream: MediaStream) => void;
  refresh: () => void;
}

/**
 * The one call of this device (docs/28 §3), outside React: WebRTC is imperative, so the steps run
 * here and the components read the state with useSyncExternalStore.
 */
export class CallStore implements CallRuntime {
  rtc: RtcDeps | null = null;
  iceServers: readonly CallIceServer[] = [];
  readonly peer: { current: CallPeer | null } = { current: null };
  private state: CallStoreState = { session: null, notice: null, dismissed: new Set(), idAt: 0 };
  private readonly listeners = new Set<() => void>();
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly env: CallStoreEnv) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly get = (): CallStoreState => this.state;

  play = (stream: MediaStream) => this.env.play(stream);
  refresh = () => this.env.refresh();
  notify = (notice: string | null) => this.set({ notice });
  markId = () => this.set({ idAt: Date.now() });
  setSession = (update: (s: CallSession | null) => CallSession | null) => this.set({ session: update(this.state.session) });

  /** The device's WebRTC and the academy's ICE servers (from /calls/config). */
  configure(rtc: RtcDeps | null, iceServers: readonly CallIceServer[]): void {
    this.rtc = rtc;
    this.iceServers = iceServers;
  }

  begin(target: CallTarget): void {
    void beginCall(this, target);
  }
  accept(row: ActiveCallView, name: string): void {
    void acceptRinging(this, { row, name });
  }
  reject(row: ActiveCallView): void {
    this.set({ dismissed: new Set([...this.state.dismissed, row.id]) });
    void rejectCall(row.id).catch(() => undefined).finally(this.refresh);
  }
  hangup(): void {
    void hangUp(this, this.state.session);
  }
  applyAnswer(sdp: string): void {
    void this.peer.current?.applyAnswer(sdp).catch(() => undefined);
  }
  toggleMute(): void {
    const s = this.state.session;
    if (!s) return;
    this.peer.current?.setMuted(!s.muted);
    this.set({ session: { ...s, muted: !s.muted } });
  }
  setMinimised(minimised: boolean): void {
    this.setSession((s) => (s ? { ...s, minimised } : s));
  }

  /** The server stopped listing the call: close the media, say «انتهت المكالمة», then close the screen. */
  serverEnded(): void {
    teardown(this);
    this.setSession((s) => (s ? { ...s, ended: true } : s));
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => this.setSession(() => null), 1_500);
  }

  dispose(): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    teardown(this);
  }

  private set(patch: Partial<CallStoreState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }
}
