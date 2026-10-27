import type { ActiveCallView, CallIceServer } from '@ab/shared';
import { acceptRinging, beginCall, hangUp, teardown, type CallRuntime } from './call-actions.js';
import type { CallPeer } from './call-peer.js';
import type { CallDerived, CallSession, CallTarget } from './call-phase.js';
import type { CallPlatform, NoticeAction, PeerMaker } from './call-platform.js';

export interface CallStoreState {
  session: CallSession | null;
  notice: string | null;
  /** The notice's action button («افتح الإعدادات»), if any. */
  noticeAction: NoticeAction | null;
  /** Inbound calls declined here: they stop ringing at once, before the next poll. */
  dismissed: ReadonlySet<string>;
  /** When the session learnt its server id (endedOnServer compares polls with it). */
  idAt: number;
}

/**
 * The one call of this device (docs/28 §3), outside React: WebRTC is imperative, so the steps run
 * here and the components read the state with useSyncExternalStore. `refresh` re-reads the calls queries.
 */
export class CallStore implements CallRuntime {
  makePeer: PeerMaker | null = null;
  iceServers: readonly CallIceServer[] = [];
  readonly peer: { current: CallPeer | null } = { current: null };
  readonly attempt = { current: 0 };
  private state: CallStoreState = { session: null, notice: null, noticeAction: null, dismissed: new Set(), idAt: 0 };
  private readonly listeners = new Set<() => void>();
  private clearTimer: ReturnType<typeof setTimeout> | null = null;
  private deadline: { at: number; timer: ReturnType<typeof setTimeout> } | null = null;
  private answered: string | null = null;

  readonly platform: CallPlatform;
  readonly refresh: () => void;

  constructor(platform: CallPlatform, refresh: () => void) {
    this.platform = platform;
    this.refresh = refresh;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  readonly get = (): CallStoreState => this.state;

  notify = (notice: string | null, action?: NoticeAction) => this.set({ notice, noticeAction: notice ? (action ?? null) : null });
  markId = () => this.set({ idAt: Date.now() });
  currentSession = () => this.state.session;
  setSession = (update: (s: CallSession | null) => CallSession | null) => this.set({ session: update(this.state.session) });

  /** The device's WebRTC (null = none here) and the academy's ICE servers (from /calls/config). */
  configure(makePeer: PeerMaker | null, iceServers: readonly CallIceServer[]): void {
    this.makePeer = makePeer;
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
    void this.platform.sends.rejectCall(row.id).catch(() => undefined).finally(this.refresh);
  }
  hangup(): void {
    void hangUp(this, this.state.session);
  }
  /** WhatsApp's answer could not be applied: never a silent «active» call, end it and say so. */
  applyAnswer(sdp: string): void {
    void this.peer.current?.applyAnswer(sdp).catch(() => {
      this.notify(this.platform.text().errors.media_failed);
      this.hangup();
    });
  }
  toggleMute(): void {
    const s = this.state.session;
    if (!s) return;
    this.peer.current?.setMuted(!s.muted);
    this.set({ session: { ...s, muted: !s.muted } });
  }
  /** «مكبر الصوت» (mobile): the loudspeaker or back to the earpiece. */
  toggleSpeaker(): void {
    const s = this.state.session;
    if (!s) return;
    void this.platform.audio?.route(!s.speaker);
    this.set({ session: { ...s, speaker: !s.speaker } });
  }
  setMinimised(minimised: boolean): void {
    this.setSession((s) => (s ? { ...s, minimised } : s));
  }

  /**
   * Follows one poll's verdict (call it when `answer`, `gone` or `deadline` change): WhatsApp's answer to
   * our offer (the connect webhook) is applied once; a call the server stopped listing ended (hung up,
   * rejected, missed, swept); unanswered for 45 s from the server id, it is ended here too; calls switched
   * off (or this user lost inbox.send) during a live call (`off`): it is ended, the mic released.
   */
  follow(d: Pick<CallDerived, 'answer' | 'gone' | 'deadline' | 'off'>): void {
    if (d.off) return this.hangup();
    if (d.answer && d.answer !== this.answered) this.applyAnswer((this.answered = d.answer));
    if (d.gone && this.state.session?.ended === false) this.serverEnded();
    this.schedule(d.deadline);
  }

  /** The server stopped listing the call: close the media, end it there too, say «انتهت المكالمة», then close. */
  serverEnded(): void {
    const id = this.state.session?.id;
    this.attempt.current += 1;
    teardown(this);
    if (id) void this.platform.sends.endCall(id).catch(() => undefined);
    this.setSession((s) => (s ? { ...s, ended: true } : s));
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => this.setSession(() => null), 1_500);
  }

  /** The provider goes away (sign-out, calls off): cancel a start in flight and end a live call on WhatsApp too. */
  dispose(): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    if (this.deadline) clearTimeout(this.deadline.timer);
    this.deadline = null;
    const id = this.state.session?.ended ? null : this.state.session?.id;
    this.attempt.current += 1;
    teardown(this);
    if (id) void this.platform.sends.endCall(id).catch(() => undefined);
  }

  /** The unanswered call's end (Date.now() ms), replaced when it moves; null = no timer. */
  private schedule(at: number | null): void {
    if (this.deadline?.at === at) return;
    if (this.deadline) clearTimeout(this.deadline.timer);
    this.deadline = at === null ? null : { at, timer: setTimeout(() => this.hangup(), Math.max(0, at - Date.now())) };
  }

  private set(patch: Partial<CallStoreState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }
}
